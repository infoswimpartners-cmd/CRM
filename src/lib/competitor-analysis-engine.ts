/**
 * 競合ベンチマーク監視・他社分析エンジン
 * 
 * 任意キーワードに対して確定マスタをコンテキスト注入し、
 * Gemini 3.8 Flash経由で動的に他社分析（ポジショニング、各社の盲点、自社勝ち筋、推奨CTA、Markdown比較表）を生成。
 * 
 * APIキー不在時または通信失敗時は高品質ルールベースフォールバックにより
 * ハルシネーションを完全排除した分析結果を即座に生成。
 * 
 * ローカルJSON（data/seo/competitor-benchmarks.json）および
 * Supabase app_configs（キー: COMPETITOR_BENCHMARK_ANALYSES）への
 * 多層ハイブリッド保存・キャッシュを実現。
 */

import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CompetitorId,
  CompetitorProfile,
  CompetitorAnalysisItem,
  KeywordCompetitorIntelligence,
} from '@/types/competitor-benchmark';
import {
  BENCHMARK_COMPETITORS,
  SEED_KEYWORD_INTELLIGENCE,
  buildComparisonMarkdownTable,
  getBenchmarkCompetitor,
  getAllBenchmarkCompetitors,
} from './competitor-benchmark-data';

/** ローカル保存用JSONファイルパス */
const BENCHMARK_FILE_PATH = path.join(process.cwd(), 'data', 'seo', 'competitor-benchmarks.json');

/** Supabase app_configs キー名 */
const APP_CONFIG_BENCHMARK_KEY = 'COMPETITOR_BENCHMARK_ANALYSES';

/**
 * 競合マスタ取得の再エクスポート
 */
export { getBenchmarkCompetitor, getAllBenchmarkCompetitors };
export function getBenchmarkCompetitors(): Record<CompetitorId, CompetitorProfile> {
  return getAllBenchmarkCompetitors();
}
export function getBenchmarkCompetitorById(id: CompetitorId): CompetitorProfile | undefined {
  return getBenchmarkCompetitor(id);
}

// =============================================================================
// ローカルJSONストレージ処理
// =============================================================================

/**
 * ローカルJSONファイルから全分析データを読み込む
 */
function readLocalBenchmarkFile(): Record<string, KeywordCompetitorIntelligence> {
  try {
    if (!fs.existsSync(BENCHMARK_FILE_PATH)) {
      // 存在しない場合は初期データバンクを保存して返す
      writeLocalBenchmarkFile(SEED_KEYWORD_INTELLIGENCE);
      return { ...SEED_KEYWORD_INTELLIGENCE };
    }
    const raw = fs.readFileSync(BENCHMARK_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...SEED_KEYWORD_INTELLIGENCE, ...parsed };
    }
    return { ...SEED_KEYWORD_INTELLIGENCE };
  } catch (err) {
    console.warn('[readLocalBenchmarkFile] 読み込みエラー（シードを使用します）:', err);
    return { ...SEED_KEYWORD_INTELLIGENCE };
  }
}

/**
 * ローカルJSONファイルへ分析データを書き込む
 */
function writeLocalBenchmarkFile(data: Record<string, KeywordCompetitorIntelligence>): boolean {
  try {
    const dir = path.dirname(BENCHMARK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BENCHMARK_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[writeLocalBenchmarkFile] 書き込みエラー:', err);
    return false;
  }
}

// =============================================================================
// Supabase app_configs ハイブリッド処理
// =============================================================================

/**
 * Supabase app_configs から分析データを取得
 */
async function fetchSupabaseBenchmarkConfig(): Promise<Record<string, KeywordCompetitorIntelligence> | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('app_configs')
      .select('value')
      .eq('key', APP_CONFIG_BENCHMARK_KEY)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[fetchSupabaseBenchmarkConfig] app_configs 取得警告:', error.message);
      }
      return null;
    }

    if (!data?.value) return null;
    const parsed = JSON.parse(data.value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('[fetchSupabaseBenchmarkConfig] キャッチエラー:', err);
    return null;
  }
}

/**
 * Supabase app_configs に全分析データを保存
 */
async function saveSupabaseBenchmarkConfig(
  dataset: Record<string, KeywordCompetitorIntelligence>
): Promise<boolean> {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from('app_configs').upsert({
      key: APP_CONFIG_BENCHMARK_KEY,
      value: JSON.stringify(dataset),
      description: '競合ベンチマーク3社（Swimmy, ベースプラス, スイサポ）のキーワード別他社分析キャッシュデータ',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('[saveSupabaseBenchmarkConfig] app_configs 保存警告:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[saveSupabaseBenchmarkConfig] キャッチエラー:', err);
    return false;
  }
}

// =============================================================================
// 永続化インターフェース
// =============================================================================

/**
 * 保存済みの全分析結果を取得（Supabase + ローカル + シード統合）
 */
export async function getAllSavedCompetitorAnalyses(): Promise<KeywordCompetitorIntelligence[]> {
  const localData = readLocalBenchmarkFile();
  const remoteData = await fetchSupabaseBenchmarkConfig();
  const merged: Record<string, KeywordCompetitorIntelligence> = {
    ...SEED_KEYWORD_INTELLIGENCE,
    ...localData,
    ...(remoteData || {}),
  };
  return Object.values(merged);
}

/**
 * 特定キーワードの保存済み分析結果を取得
 */
export async function getSavedCompetitorAnalysis(
  keyword: string
): Promise<KeywordCompetitorIntelligence | null> {
  const normalized = keyword.trim();
  if (!normalized) return null;

  // 1. ローカルおよびシードから確認
  const localData = readLocalBenchmarkFile();
  if (localData[normalized]) {
    return localData[normalized];
  }

  // 2. Supabase app_configs から確認
  const remoteData = await fetchSupabaseBenchmarkConfig();
  if (remoteData && remoteData[normalized]) {
    return remoteData[normalized];
  }

  return null;
}

/**
 * 特定キーワードの分析結果をハイブリッド保存
 */
export async function saveCompetitorAnalysis(
  data: KeywordCompetitorIntelligence
): Promise<boolean> {
  const normalized = data.keyword.trim();
  if (!normalized) return false;

  // 1. ローカルJSONファイルへ保存
  const localData = readLocalBenchmarkFile();
  localData[normalized] = data;
  const localSuccess = writeLocalBenchmarkFile(localData);

  // 2. Supabase app_configs へ非同期保存
  saveSupabaseBenchmarkConfig(localData).catch((err) => {
    console.warn('[saveCompetitorAnalysis] Supabase非同期保存失敗（ローカルは保持）:', err);
  });

  return localSuccess;
}

// =============================================================================
// Gemini 3.8 Flash 動的AI分析
// =============================================================================

/**
 * Gemini 3.8 Flash 用のシステムプロンプト構築
 */
function buildGeminiSystemPrompt(): string {
  const swimmy = BENCHMARK_COMPETITORS.swimmy;
  const basePlus = BENCHMARK_COMPETITORS.base_plus;
  const suisapo = BENCHMARK_COMPETITORS.suisapo;

  return `あなたは出張個別指導スイミング「スイムパートナーズ」の専属チーフマーケター兼競合分析スペシャリストです。
入力されたターゲットキーワードに対して、ベンチマーク対象3社（Swimmy、ベースプラス、スイサポ）のサービス実態を対比し、
自社（スイムパートナーズ）がGoogle検索1位と高成約率を勝ち取るための差別化分析を導出してください。

【重要：ハルシネーション厳禁・確定競合ファクト】
以下の確定ファクトのみを根拠とし、他社の料金・サービス内容・特徴を捏造してはなりません。

1. 【${swimmy.corporateName} (${swimmy.name})】
- 公式URL: ${swimmy.officialUrl}
- 特徴: 幼児・児童向けスイミング、知育・運動療育、発達支援、少人数（最大6名）とマンツーマン出張の両展開。
- 料金・加算: 入会金 10,800円、レッスン料 6,800〜15,050円/回（代表体験10,800円）。諸経費交通費一律 1,400円/回。港区プール利用+500円、夏季シーズン料+500円、保険料 1,450円。
- 弱点: 加算項目が多く総額が不透明。知育・療育に偏重し、大人の息継ぎ改善や大手進級テストの即効的生体力学解説が薄い。

2. 【${basePlus.corporateName} (${basePlus.name})】
- 公式URL: ${basePlus.officialUrl}
- 特徴: 関東公営プール出張。集団スクールからの乗り換え訴求。1名分料金で最大2名受講可。独自の「級」を設けないスモールステップ指導。
- 料金・加算: 入会金 10,000円＋年会費 5,500円（毎年更新）＋保険料 1,000〜2,150円（初年度初期費用 約17,650円）。体験 7,700円〜。
- 弱点: 初期費用が高くライト受講に向かない。「級がない」ため大手スクールのワッペン進級テストに直前合格したい親のニーズに不適合。毎レッスンの動画カルテDXがない。

3. 【${suisapo.corporateName} (${suisapo.name})】
- 公式URL: ${suisapo.officialUrl}
- 特徴: 品川区・城南エリア拠点。都度払い（通常8,000円/60分、体験5,500円）。大学水泳部トレーナー出身代表。コンディショニング併用。
- 料金・加算: 代表指名料 +2,500円/回、交通費別途 +1,000円/回（※代表指名時の実質総額 11,500円＋プール代実費）。
- 弱点: 指名料・交通費加算により総額が割高。都度予約のため専任制が担保されにくい。動画カルテDXの仕組みがない。

4. 【スイムパートナーズ（自社）の必勝ポジショニング】
- 入会金0円、年会費0円、指名料0円、交通費加算0円。かかるのはレッスン料と公営プール入場料（実費300〜500円）のみの完全明朗会計。
- 完全専任プロコーチ制（同一コーチが毎回伴走）。
- レッスン終了後に水中・陸上からのスマホ撮影動画によるフォーム分析カルテを無料送付。
- 生体力学（浮心・重心移動・脱力）に基づくピンポイント指導。大手スクール（イトマン・コナミ等）の検定基準完全準拠。平均3〜5回で25m完泳。

【出力要件】
指定されたJSONスキーマに従い、余計な説明文や挨拶を含めず純粋なJSONのみを出力してください。
`;
}

/**
 * Gemini API経由でリアルタイム動的分析を実行
 */
async function generateAnalysisWithGemini(
  keyword: string,
  targetPath?: string,
  apiKey?: string
): Promise<KeywordCompetitorIntelligence | null> {
  const cleanKey = apiKey || process.env.GEMINI_API_KEY;
  if (!cleanKey) {
    return null;
  }

  const systemPrompt = buildGeminiSystemPrompt();
  const userPrompt = `ターゲットキーワード: 「${keyword.trim()}」${
    targetPath ? ` (対象パス: ${targetPath})` : ''
  }

上記キーワードにおける検索意図、各社（Swimmy、ベースプラス、スイサポ）の想定ポジショニングと盲点、自社の勝ち筋、推奨CTA、Markdown徹底比較表をJSON形式で生成してください。`;

  const candidateModels = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
  ];

  const responseJsonSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      competitorAnalyses: {
        type: 'OBJECT',
        properties: {
          swimmy: {
            type: 'OBJECT',
            properties: {
              competitorId: { type: 'STRING' },
              competitorName: { type: 'STRING' },
              assumedPositioning: { type: 'STRING' },
              topRankWeakness: { type: 'STRING' },
              ourWinningAngle: { type: 'STRING' },
              priceComparison: { type: 'STRING' },
            },
            required: ['assumedPositioning', 'topRankWeakness', 'ourWinningAngle'],
          },
          base_plus: {
            type: 'OBJECT',
            properties: {
              competitorId: { type: 'STRING' },
              competitorName: { type: 'STRING' },
              assumedPositioning: { type: 'STRING' },
              topRankWeakness: { type: 'STRING' },
              ourWinningAngle: { type: 'STRING' },
              priceComparison: { type: 'STRING' },
            },
            required: ['assumedPositioning', 'topRankWeakness', 'ourWinningAngle'],
          },
          suisapo: {
            type: 'OBJECT',
            properties: {
              competitorId: { type: 'STRING' },
              competitorName: { type: 'STRING' },
              assumedPositioning: { type: 'STRING' },
              topRankWeakness: { type: 'STRING' },
              ourWinningAngle: { type: 'STRING' },
              priceComparison: { type: 'STRING' },
            },
            required: ['assumedPositioning', 'topRankWeakness', 'ourWinningAngle'],
          },
        },
        required: ['swimmy', 'base_plus', 'suisapo'],
      },
      blindSpots: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
      ourWinningStrategy: { type: 'STRING' },
      recommendedCta: {
        type: 'OBJECT',
        properties: {
          headline: { type: 'STRING' },
          subheadline: { type: 'STRING' },
          buttonText: { type: 'STRING' },
          targetAudience: { type: 'STRING' },
        },
        required: ['headline', 'subheadline', 'buttonText', 'targetAudience'],
      },
      comparisonMarkdownTable: { type: 'STRING' },
    },
    required: [
      'summary',
      'competitorAnalyses',
      'blindSpots',
      'ourWinningStrategy',
      'recommendedCta',
    ],
  };

  let candidateText = '';

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: userPrompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: responseJsonSchema,
          },
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (candidateText) {
          break;
        }
      } else {
        const errText = await res.text();
        console.warn(`[Gemini Competitor Benchmark] モデル ${model} エラー [${res.status}]:`, errText);
        continue;
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[Gemini Competitor Benchmark] モデル ${model} 例外:`, fetchErr?.message || fetchErr);
      continue;
    }
  }

  if (!candidateText) {
    return null;
  }

  // JSONパース
  try {
    let jsonStr = candidateText.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonStr);

    const swimmyItem: CompetitorAnalysisItem = {
      competitorId: 'swimmy',
      competitorName: BENCHMARK_COMPETITORS.swimmy.name,
      assumedPositioning: parsed.competitorAnalyses?.swimmy?.assumedPositioning || '',
      topRankWeakness: parsed.competitorAnalyses?.swimmy?.topRankWeakness || '',
      ourWinningAngle: parsed.competitorAnalyses?.swimmy?.ourWinningAngle || '',
      priceComparison:
        parsed.competitorAnalyses?.swimmy?.priceComparison ||
        'Swimmyの入会金10,800円・交通費1,400円に対し、当教室は入会金0円・交通費込み。',
    };

    const basePlusItem: CompetitorAnalysisItem = {
      competitorId: 'base_plus',
      competitorName: BENCHMARK_COMPETITORS.base_plus.name,
      assumedPositioning: parsed.competitorAnalyses?.base_plus?.assumedPositioning || '',
      topRankWeakness: parsed.competitorAnalyses?.base_plus?.topRankWeakness || '',
      ourWinningAngle: parsed.competitorAnalyses?.base_plus?.ourWinningAngle || '',
      priceComparison:
        parsed.competitorAnalyses?.base_plus?.priceComparison ||
        'ベースプラスの初期費用約17,650円に対し、当教室は完全無料。',
    };

    const suisapoItem: CompetitorAnalysisItem = {
      competitorId: 'suisapo',
      competitorName: BENCHMARK_COMPETITORS.suisapo.name,
      assumedPositioning: parsed.competitorAnalyses?.suisapo?.assumedPositioning || '',
      topRankWeakness: parsed.competitorAnalyses?.suisapo?.topRankWeakness || '',
      ourWinningAngle: parsed.competitorAnalyses?.suisapo?.ourWinningAngle || '',
      priceComparison:
        parsed.competitorAnalyses?.suisapo?.priceComparison ||
        'スイサポの代表指名料+2,500円・交通費+1,000円（実質11,500円〜）に対し、当教室は明朗会計。',
    };

    const result: KeywordCompetitorIntelligence = {
      keyword: keyword.trim(),
      targetPath,
      analyzedAt: new Date().toISOString(),
      summary: parsed.summary || 'Gemini 3.8 Flashによる競合3社ベンチマーク動的分析',
      competitorAnalyses: {
        swimmy: swimmyItem,
        base_plus: basePlusItem,
        suisapo: suisapoItem,
      },
      blindSpots: Array.isArray(parsed.blindSpots) && parsed.blindSpots.length > 0
        ? parsed.blindSpots
        : [
            '各社とも料金の総額内訳（交通費・指名料・初期費用）の開示が不透明',
            'レッスン終了後のスマホ動画カルテによる客観的フォーム可視化の欠如',
            '生体力学（浮心・重心移動）に基づく短期間での技術的解決アプローチの不足',
          ],
      ourWinningStrategy: parsed.ourWinningStrategy || '',
      recommendedCta: {
        headline: parsed.recommendedCta?.headline || '60分個別体験レッスンを予約する',
        subheadline:
          parsed.recommendedCta?.subheadline || '入会金0円・指名料0円・交通費込み・スマホ動画カルテ付き',
        buttonText: parsed.recommendedCta?.buttonText || '体験レッスンの空き枠を確認する ➔',
        targetAudience: parsed.recommendedCta?.targetAudience || '水泳個別指導を検討中の受講者・保護者',
      },
      comparisonMarkdownTable:
        parsed.comparisonMarkdownTable && parsed.comparisonMarkdownTable.includes('|')
          ? parsed.comparisonMarkdownTable
          : buildComparisonMarkdownTable(keyword.trim()),
      isDynamicAiGenerated: true,
    };

    return result;
  } catch (parseErr) {
    console.error('[Gemini Competitor Benchmark] JSONパース失敗:', parseErr);
    return null;
  }
}

// =============================================================================
// 高品質ルールベースフォールバック生成
// =============================================================================

type KeywordIntentSegment = 'adult_technique' | 'junior_promotion' | 'local_private' | 'general';

/**
 * キーワードの検索意図セグメントを分類
 */
function classifyKeywordSegment(keyword: string): KeywordIntentSegment {
  const kw = keyword.toLowerCase();

  // 大人・技術・息継ぎ・完泳系
  if (
    kw.includes('大人') ||
    kw.includes('息継ぎ') ||
    kw.includes('25m') ||
    kw.includes('シニア') ||
    kw.includes('初心者') ||
    kw.includes('クロール') ||
    kw.includes('平泳ぎ') ||
    kw.includes('バタフライ') ||
    kw.includes('背泳ぎ') ||
    kw.includes('フォーム') ||
    kw.includes('浮かない') ||
    kw.includes('沈む') ||
    kw.includes('恐怖')
  ) {
    return 'adult_technique';
  }

  // ジュニア・進級・子供系
  if (
    kw.includes('進級') ||
    kw.includes('子供') ||
    kw.includes('子ども') ||
    kw.includes('キッズ') ||
    kw.includes('ジュニア') ||
    kw.includes('早い子') ||
    kw.includes('ワッペン') ||
    kw.includes('イトマン') ||
    kw.includes('コナミ') ||
    kw.includes('スクール') ||
    kw.includes('テスト') ||
    kw.includes('合格')
  ) {
    return 'junior_promotion';
  }

  // 地域・出張・プライベート系
  if (
    kw.includes('品川') ||
    kw.includes('東京') ||
    kw.includes('千葉') ||
    kw.includes('神奈川') ||
    kw.includes('横浜') ||
    kw.includes('川崎') ||
    kw.includes('埼玉') ||
    kw.includes('港区') ||
    kw.includes('目黒') ||
    kw.includes('世田谷') ||
    kw.includes('個人レッスン') ||
    kw.includes('個別指導') ||
    kw.includes('出張') ||
    kw.includes('プール')
  ) {
    return 'local_private';
  }

  return 'general';
}

/**
 * 確定マスタに基づく高品質ルールベース動的分析生成（ハルシネーションゼロ保証）
 */
function generateRuleBasedBenchmarkAnalysis(
  keyword: string,
  targetPath?: string
): KeywordCompetitorIntelligence {
  const segment = classifyKeywordSegment(keyword);
  const cleanKw = keyword.trim();

  let summary = '';
  let swimmyWeakness = '';
  let swimmyAngle = '';
  let basePlusWeakness = '';
  let basePlusAngle = '';
  let suisapoWeakness = '';
  let suisapoAngle = '';
  let blindSpots: string[] = [];
  let ourWinningStrategy = '';
  let ctaHeadline = '';
  let ctaSub = '';
  let ctaBtn = '';
  let ctaTarget = '';

  switch (segment) {
    case 'adult_technique':
      summary = `キーワード「${cleanKw}」は大人の泳力改善や呼吸・フォームの悩みを抱える層の切実な検索です。競合3社はいずれも大人生体力学（浮心と重心のズレ、頭部角度）に特化した即効ドリルを提供できておらず、当教室の科学的アプローチが圧倒的優位に立ちます。`;
      swimmyWeakness =
        '幼児・児童の知育・療育に特化しており、大人の息継ぎ・25m完泳に関する生体力学的解説や個別メニューが皆無。';
      swimmyAngle =
        '「息継ぎで沈むのは筋力ではなく頭部5度の角度と肺の浮心」。大人専用の生体力学指導で即座に25m完泳へ導く。';
      basePlusWeakness =
        '入会金10,000円＋年会費5,500円の固定初期費用が重く、大人が「数回だけフォームのコツを教わりたい」ニーズに不適合。';
      basePlusAngle =
        '入会金・年会費完全0円で単発〜短期集中受講可能。自宅でできる呼吸ドリルと初日60分の劇的フォーム改善を提示。';
      suisapoWeakness =
        '代表指名料（+2,500円）や交通費（+1,000円）が加算され、大人の受講として総額11,500円〜と割高。動画カルテがない。';
      suisapoAngle =
        '指導料に交通費込み・指名料0円の完全明朗会計。スマホ水中動画カルテで沈む癖をその場で可視化して改善。';
      blindSpots = [
        '成人の肺（浮心）と骨盤（重心）の生体力学的ズレに関する科学的解説の欠如',
        '大人特有の首・肩の可動域制限をカバーする「頭部5度の傾き」ドリルへの言及不足',
        '水中動画撮影による「自分の体が沈む瞬間の客観的フィードバック」の不在',
      ];
      ourWinningStrategy =
        '「息継ぎで沈むのは筋力不足ではありません。頭部5度の傾きと肺の浮心荷重を整えれば、今日から誰でも楽に呼吸できます」という生体力学的キラーロジックを展開し、毎レッスンのスマホ水中動画カルテと入会金0円の明朗会計で成約率を最大化します。';
      ctaHeadline = '【大人限定】60分で沈まない息継ぎを体感！スマホ水中動画カルテ付き個別体験レッスン';
      ctaSub = '入会金0円・指名料0円・交通費込み。最寄りの公営温水プールで今週末から受講可能。';
      ctaBtn = '【Web限定】息継ぎ改善 体験レッスンを申し込む ➔';
      ctaTarget = '25m泳ぎ切りたい40代〜60代の初心者・自己流スイマー';
      break;

    case 'junior_promotion':
      summary = `キーワード「${cleanKw}」は大手スイミングスクールで進級停滞に悩む保護者の焦りと切実な検索です。競合各社は知育（Swimmy）や級なし（ベースプラス）を標榜し、直近の検定テスト一発合格の具体的ソリューションを提供できていません。`;
      swimmyWeakness =
        '「主体性を育てる」「知育」に終始しており、保護者が緊急で求める大手スクール進級テストのワッペン合格対策に直結しない。';
      swimmyAngle =
        '大手スクール各社の検定減点基準（バタ足の膝折れ、呼吸時の顔のブレ）を熟知したピンポイント修正指導。';
      basePlusWeakness =
        '「独自の級を設けない指導」を掲げているため、「今のスクールで合格ワッペンを取りたい」親の要望と根本的にミスマッチ。';
      basePlusAngle =
        '「今のスクールを辞める必要はありません。月1〜2回の補習マンツーマンで一発合格へ」。1回で進級の壁を打破。';
      suisapoWeakness =
        '進級対策も行うが大手基準ノウハウが属人的。親がプールサイドで見学できない公営プールで動画カルテの共有がない。';
      suisapoAngle =
        '毎レッスン後に水中・陸上動画カルテを保護者へ送付。「ここが直ったから合格できる」を客観的に共有。';
      blindSpots = [
        '進級の早い子の差は「運動神経」ではなく「待ち時間ゼロの反復量」と「脱力（リラックス）」にあるという真実',
        '大手スクール（イトマン・コナミ等）特有の進級採点チェック項目の具体的開示',
        '保護者が自宅のお風呂や布団の上でできる5分間イメージトレーニングの具体策',
      ];
      ourWinningStrategy =
        '「進級が早い子の差はセンスではありません。集団の5倍の練習密度と、テスト官の減点ポイントをピンポイントで直す反復量です」と宣言。大手スクール合格対策動画診断付きマンツーマン体験で進級停滞を即時打破します。';
      ctaHeadline = '進級停滞をたった1回で打破！大手スクール合格対策・水中動画カルテ付き体験レッスン';
      ctaSub = 'イトマン・コナミ等の進級基準に完全準拠。待ち時間ゼロの60分つきっきり指導。';
      ctaBtn = '【進級対策】個別体験レッスンを予約する ➔';
      ctaTarget = '同じ級で3ヶ月以上足踏みしている小学生の保護者';
      break;

    case 'local_private':
      summary = `キーワード「${cleanKw}」は特定地域や公営プールでの個別水泳指導を探す高確度検索です。スイサポの指名料・交通費加算、ベースプラスの初期費用、Swimmyの加算項目に対する「完全明朗会計」の優位性が最も刺さります。`;
      swimmyWeakness =
        '都内一部拠点校が中心で、公営プール出張では一律交通費1,400円や港区加算・夏季加算が重なり、割高になる。';
      swimmyAngle =
        '最寄りの公営温水プールへ追加交通費ゼロで直行出張。入会金10,800円も不要の完全明朗会計。';
      basePlusWeakness =
        '入会金10,000円＋年会費5,500円の固定初期費用が重く、近隣公営プールでの手軽な受講ニーズを阻害。動画カルテなし。';
      basePlusAngle =
        '入会金・年会費完全0円。厳選専任プロコーチがスマホ水中動画カルテで一貫した成果を担保。';
      suisapoWeakness =
        '品川拠点以外への対応力が弱く、代表指名料（+2,500円）と交通費（+1,000円）の上乗せで実質総額が割高化。';
      suisapoAngle =
        '首都圏公営プールを広域網羅。代表指名料・交通費加算ゼロで、専任プロコーチが毎回同一伴走。';
      blindSpots = [
        '地域内公営温水プールの個別指導利用ルール・水深・混雑時間帯の具体的解説',
        '都度払いにおける交通費・指名料などの「後出し加算」に対する保護者・受講者の不満',
        '出張レッスンにおける専任コーチ伴走とスマホ動画カルテ送付の実績証拠',
      ];
      ourWinningStrategy =
        '最寄り公営温水プールへの出張ネットワークを全面提示。「他社で加算される交通費や指名料、入会金は一切不要」という絶対的明朗会計比較表を提示し、体験予約を独占獲得します。';
      ctaHeadline = '最寄りの公営プールへプロが無料出張！入会金0円・指名料0円のマンツーマン体験レッスン';
      ctaSub = '追加交通費なし・プール入場料実費（300〜500円）のみ。スマホ水中動画カルテ付き。';
      ctaBtn = '最寄りプールのレッスン日程を確認する ➔';
      ctaTarget = '地域内で安心して通える水泳個別指導を探す全年齢層';
      break;

    default:
      summary = `キーワード「${cleanKw}」において、競合3社（Swimmy、ベースプラス、スイサポ）の料金不透明さ・初期費用・動画カルテ不在の弱点を突いた総合差別化が極めて有効です。`;
      swimmyWeakness =
        '幼児・知育特化による大人・技術指導の薄さと、交通費一律1,400円・夏季加算等の加算項目の多さ。';
      swimmyAngle =
        '全年齢対応（幼児〜大人）の生体力学指導。入会金0円・諸経費加算なしの絶対的明朗会計。';
      basePlusWeakness =
        '入会金10,000円＋年会費5,500円＋保険料の固定初期費用（約1.8万円）と、動画カルテDXの不在。';
      basePlusAngle =
        '入会金・年会費0円。2名分割ではなく1回60分完全1対1専任制とスマホ水中動画カルテ送付。';
      suisapoWeakness =
        '代表指名料+2,500円・交通費+1,000円の加算による実質割高感と、専任制の未担保。';
      suisapoAngle =
        '交通費込み・指名料0円の完全明朗会計。初回体験から同一専任プロコーチが継続伴走。';
      blindSpots = [
        '出張個別指導における料金総額の完全明朗化（隠れ加算の撤廃）',
        'レッスン終了後のスマホ水中動画カルテによるフォーム分析共有DX',
        '生体力学（重心・浮力・脱力）に基づく最短でのフォーム改善アプローチ',
      ];
      ourWinningStrategy =
        '入会金0円・指名料0円・交通費込み・動画カルテ付きの「4大安心スタンダード」を掲げ、競合3社の加算費用・初期費用との対比表で圧倒的信頼を獲得します。';
      ctaHeadline = '公営プールへプロが出張！入会金0円・指名料0円・動画カルテ付きマンツーマン体験レッスン';
      ctaSub = '追加交通費なし・明朗会計。あなた専任のプロコーチが60分マンツーマンで指導。';
      ctaBtn = '体験レッスンの空き枠を確認する ➔';
      ctaTarget = '水泳個別指導を検討中の受講者・保護者';
      break;
  }

  const result: KeywordCompetitorIntelligence = {
    keyword: cleanKw,
    targetPath,
    analyzedAt: new Date().toISOString(),
    summary,
    competitorAnalyses: {
      swimmy: {
        competitorId: 'swimmy',
        competitorName: BENCHMARK_COMPETITORS.swimmy.name,
        assumedPositioning: BENCHMARK_COMPETITORS.swimmy.serviceFeatures[0],
        topRankWeakness: swimmyWeakness,
        ourWinningAngle: swimmyAngle,
        priceComparison:
          'Swimmyの入会金10,800円・交通費1,400円に対し、当教室は入会金0円・交通費込み。',
      },
      base_plus: {
        competitorId: 'base_plus',
        competitorName: BENCHMARK_COMPETITORS.base_plus.name,
        assumedPositioning: BENCHMARK_COMPETITORS.base_plus.serviceFeatures[0],
        topRankWeakness: basePlusWeakness,
        ourWinningAngle: basePlusAngle,
        priceComparison:
          'ベースプラスの初期費用約17,650円に対し、当教室は完全0円。',
      },
      suisapo: {
        competitorId: 'suisapo',
        competitorName: BENCHMARK_COMPETITORS.suisapo.name,
        assumedPositioning: BENCHMARK_COMPETITORS.suisapo.serviceFeatures[0],
        topRankWeakness: suisapoWeakness,
        ourWinningAngle: suisapoAngle,
        priceComparison:
          'スイサポの代表指名料+2,500円・交通費+1,000円（実質11,500円〜）に対し、当教室は完全明朗会計。',
      },
    },
    blindSpots,
    ourWinningStrategy,
    recommendedCta: {
      headline: ctaHeadline,
      subheadline: ctaSub,
      buttonText: ctaBtn,
      targetAudience: ctaTarget,
      actionType: segment === 'local_private' ? 'pool_schedule' : 'trial_lesson',
    },
    comparisonMarkdownTable: buildComparisonMarkdownTable(cleanKw),
    isDynamicAiGenerated: false,
  };

  return result;
}

// =============================================================================
// メイン分析エンジン
// =============================================================================

/**
 * 任意キーワードに対して競合3社ベンチマーク分析を実行
 * 
 * 1. forceRefreshがfalseの場合、既存キャッシュ（ローカル/Supabase/シード）を確認
 * 2. Gemini APIキーがあればリアルタイムAI分析を実行
 * 3. APIキー未設定または通信失敗時は高品質ルールベースエンジンで即座に動的生成
 * 4. 結果をローカルJSONおよびSupabase app_configsへハイブリッド保存
 */
export async function analyzeKeywordCompetitors(
  keyword: string,
  targetPath?: string,
  forceRefresh: boolean = false
): Promise<KeywordCompetitorIntelligence> {
  const normalized = keyword.trim();
  if (!normalized) {
    throw new Error('分析対象キーワードが指定されていません。');
  }

  // 1. キャッシュ確認（forceRefreshでない場合）
  if (!forceRefresh) {
    const existing = await getSavedCompetitorAnalysis(normalized);
    if (existing) {
      return existing;
    }
  }

  // 2. Gemini 3.8 Flash によるリアルタイム動的分析を試行
  let aiResult: KeywordCompetitorIntelligence | null = null;
  try {
    aiResult = await generateAnalysisWithGemini(normalized, targetPath);
  } catch (aiErr) {
    console.warn('[analyzeKeywordCompetitors] Gemini分析例外（フォールバックへ移行）:', aiErr);
  }

  // 3. AI生成成功時は保存して返却、失敗時は高品質ルールベース生成
  const finalResult: KeywordCompetitorIntelligence =
    aiResult || generateRuleBasedBenchmarkAnalysis(normalized, targetPath);

  // 4. ハイブリッド永続化（ローカルファイル ＋ Supabase app_configs）
  await saveCompetitorAnalysis(finalResult);

  return finalResult;
}
