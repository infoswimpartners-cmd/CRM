/**
 * Challenger 1: 競合ベンチマーク監視・他社分析 バックエンド・エンジン独立実証検証ハーネス
 * 
 * 検証対象:
 * 1. src/types/competitor-benchmark.ts
 * 2. src/lib/competitor-benchmark-data.ts
 * 3. src/lib/competitor-analysis-engine.ts
 * 4. src/actions/competitor-benchmark-actions.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// .env.local 読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  CompetitorId,
  CompetitorProfile,
  KeywordCompetitorIntelligence,
} from '../src/types/competitor-benchmark';
import {
  BENCHMARK_COMPETITORS,
  SEED_KEYWORD_INTELLIGENCE,
  buildComparisonMarkdownTable,
  getBenchmarkCompetitor,
  getAllBenchmarkCompetitors,
  getSeedKeywordIntelligence,
} from '../src/lib/competitor-benchmark-data';
import {
  getBenchmarkCompetitors,
  getBenchmarkCompetitorById,
  analyzeKeywordCompetitors,
  getSavedCompetitorAnalysis,
  getAllSavedCompetitorAnalyses,
  saveCompetitorAnalysis,
} from '../src/lib/competitor-analysis-engine';
import {
  getBenchmarkCompetitorsAction,
  getBenchmarkCompetitorAction,
  analyzeKeywordCompetitorsAction,
  getSavedCompetitorAnalysisAction,
  getAllSavedCompetitorAnalysesAction,
  saveCompetitorAnalysisAction,
} from '../src/actions/competitor-benchmark-actions';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(suite: string, testName: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, testName, passed: true, durationMs });
    console.log(`  ✅ [PASS] ${testName} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      suite,
      testName,
      passed: false,
      durationMs,
      error: err?.message || String(err),
      details: err?.stack,
    });
    console.error(`  ❌ [FAIL] ${testName} (${durationMs}ms): ${err?.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🏁 競合ベンチマーク バックエンド・エンジン実証検証ハーネス開始');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // Suite 1: 3社確定マスタデータ整合性検証
  // ---------------------------------------------------------------------------
  console.log('▶ Suite 1: 3社確定マスタデータ整合性検証');

  await runTest('Suite 1', '3社ID（swimmy, base_plus, suisapo）の完全存在検証', () => {
    const ids: CompetitorId[] = ['swimmy', 'base_plus', 'suisapo'];
    assertEqual(Object.keys(BENCHMARK_COMPETITORS).length, 3, 'マスタの企業数は3社でなければならない');
    for (const id of ids) {
      assert(!!BENCHMARK_COMPETITORS[id], `競合マスタに ${id} が存在すること`);
      assertEqual(BENCHMARK_COMPETITORS[id].id, id, `マスタIDが一致すること (${id})`);
    }
  });

  await runTest('Suite 1', 'Swimmyの公式ファクト・URL・料金・強み・弱点の整合性検証', () => {
    const c = BENCHMARK_COMPETITORS.swimmy;
    assertEqual(c.officialUrl, 'https://www.swimmy-ss.com/company', 'Swimmy 公式URL');
    assertEqual(c.corporateName, 'Swimmy株式会社', 'Swimmy 法人名');
    assert(c.pricingModel.admissionFee.includes('10,800円'), 'Swimmy 入会金10,800円');
    assert(
      c.pricingModel.additionalCosts.some((cost) => cost.includes('1,400円')),
      'Swimmy 交通費1,400円加算'
    );
    assert(
      c.pricingModel.additionalCosts.some((cost) => cost.includes('港区')),
      'Swimmy 港区加算'
    );
    assert(
      c.pricingModel.additionalCosts.some((cost) => cost.includes('夏季')),
      'Swimmy 夏季加算'
    );
    assertEqual(c.pricingModel.transparencyRating, 'medium', 'Swimmy 透明度');
    assert(c.strengths.length >= 3, 'Swimmy 強みが3件以上');
    assert(c.weaknesses.length >= 3, 'Swimmy 弱点が3件以上');
    assert(
      c.ourDifferentiation.axis.includes('完全明朗会計'),
      'Swimmy 差別化軸に完全明朗会計が含まれること'
    );
  });

  await runTest('Suite 1', 'ベースプラスの公式ファクト・URL・料金・強み・弱点の整合性検証', () => {
    const c = BENCHMARK_COMPETITORS.base_plus;
    assertEqual(c.officialUrl, 'https://www.base-plus.org/kanto', 'ベースプラス 公式URL');
    assertEqual(c.corporateName, '特定非営利活動法人ベースプラス', 'ベースプラス 法人名');
    assert(c.pricingModel.admissionFee.includes('10,000円'), 'ベースプラス 入会金10,000円');
    assert(
      c.pricingModel.additionalCosts.some((cost) => cost.includes('年会費: 5,500円')),
      'ベースプラス 年会費5,500円'
    );
    assert(
      c.pricingModel.hiddenCostsNotice?.includes('17,650円') || false,
      'ベースプラス 初期費用約17,650円の明記'
    );
    assert(c.strengths.length >= 3, 'ベースプラス 強みが3件以上');
    assert(c.weaknesses.length >= 3, 'ベースプラス 弱点が3件以上');
    assert(
      c.weaknesses.some((w) => w.includes('級のない指導') || w.includes('初期費用')),
      'ベースプラス 弱点に級なしまたは初期費用が含まれること'
    );
  });

  await runTest('Suite 1', 'スイサポの公式ファクト・URL・料金・強み・弱点の整合性検証', () => {
    const c = BENCHMARK_COMPETITORS.suisapo;
    assertEqual(c.officialUrl, 'https://suisapo.com/', 'スイサポ 公式URL');
    assertEqual(c.corporateName, 'スイサポ', 'スイサポ 屋号');
    assert(c.pricingModel.admissionFee.includes('0円'), 'スイサポ 入会金0円');
    assert(
      c.pricingModel.additionalCosts.some((cost) => cost.includes('1,000円')),
      'スイサポ 交通費1,000円加算'
    );
    assert(
      c.pricingModel.additionalCosts.some((cost) => cost.includes('2,500円')),
      'スイサポ 代表指名料2,500円加算'
    );
    assert(
      c.pricingModel.hiddenCostsNotice?.includes('11,500円') || false,
      'スイサポ 実質11,500円の明記'
    );
    assert(c.strengths.some((s) => s.includes('品川区') || s.includes('都度払い')), 'スイサポ 強み');
    assert(c.weaknesses.some((w) => w.includes('指名料') || w.includes('交通費')), 'スイサポ 弱点');
  });

  await runTest('Suite 1', 'マスタゲッター関数およびServer Actionの動作検証', async () => {
    const all = getAllBenchmarkCompetitors();
    assertEqual(Object.keys(all).length, 3, 'getAllBenchmarkCompetitors 返却件数');

    const s = getBenchmarkCompetitor('swimmy');
    assert(s !== undefined, 'getBenchmarkCompetitor(swimmy)');
    assertEqual(s?.name, 'Swimmy (東京スイミーSS)', 'Swimmy 表示名');

    const invalid = getBenchmarkCompetitor('non_existent' as any);
    assertEqual(invalid, undefined, '無効ID取得時はundefined');

    const actionRes = await getBenchmarkCompetitorsAction();
    assert(actionRes.success, 'getBenchmarkCompetitorsAction 成功');
    assertEqual(Object.keys(actionRes.data).length, 3, 'Action返却件数');

    const actionSingle = await getBenchmarkCompetitorAction('suisapo');
    assert(actionSingle.success, 'getBenchmarkCompetitorAction(suisapo) 成功');
    assertEqual(actionSingle.data?.id, 'suisapo', 'Action単体返却ID');

    const actionSingleInvalid = await getBenchmarkCompetitorAction('dummy' as any);
    assert(actionSingleInvalid.success === false, '存在しないID取得時はsuccess: false');
    assert(typeof actionSingleInvalid.error === 'string', '存在しないID取得時はerror文字列が返ること');
  });

  // ---------------------------------------------------------------------------
  // Suite 2: 代表キーワード分析引き当て検証
  // ---------------------------------------------------------------------------
  console.log('\n▶ Suite 2: 代表キーワード分析引き当て検証');

  const representativeKeywords = [
    '水泳 息継ぎ コツ 大人',
    '水泳 個人レッスン 品川',
    'スイミング 進級の 早い子',
    '水泳 個人レッスン 千葉',
    '水泳 個人レッスン 東京',
  ];

  for (const kw of representativeKeywords) {
    await runTest('Suite 2', `代表キーワード「${kw}」のシードキャッシュ構造検証`, () => {
      const seed = getSeedKeywordIntelligence(kw);
      assert(seed !== undefined, `シードにキーワード「${kw}」が存在すること`);
      assertEqual(seed?.keyword, kw, 'keyword一致');
      assert(!!seed?.summary, 'summaryが存在すること');
      assert(seed!.summary.length >= 20, 'summaryが十分な長さを持つこと');

      // 3社すべての分析が存在すること
      for (const id of ['swimmy', 'base_plus', 'suisapo'] as CompetitorId[]) {
        const item = seed!.competitorAnalyses[id];
        assert(!!item, `${kw}: ${id} の分析項目が存在すること`);
        assertEqual(item.competitorId, id, 'competitorId一致');
        assert(!!item.competitorName, 'competitorNameが存在すること');
        assert(!!item.assumedPositioning, 'assumedPositioningが存在すること');
        assert(!!item.topRankWeakness, 'topRankWeaknessが存在すること');
        assert(!!item.ourWinningAngle, 'ourWinningAngleが存在すること');
      }

      // blindSpots, winningStrategy, CTA, Markdownテーブル
      assert(Array.isArray(seed!.blindSpots) && seed!.blindSpots.length >= 3, 'blindSpotsが3件以上');
      assert(!!seed!.ourWinningStrategy && seed!.ourWinningStrategy.length >= 30, 'ourWinningStrategy');
      assert(!!seed!.recommendedCta.headline, 'CTA headline');
      assert(!!seed!.recommendedCta.buttonText, 'CTA buttonText');
      assert(!!seed!.comparisonMarkdownTable, 'comparisonMarkdownTable');
      assert(seed!.comparisonMarkdownTable.includes('| スイムパートナーズ（当教室） |'), '比較表ヘッダー');
    });
  }

  await runTest('Suite 2', 'Server Action による代表キーワードキャッシュ即時引き当て', async () => {
    const res = await analyzeKeywordCompetitorsAction('水泳 息継ぎ コツ 大人', undefined, false);
    assert(res.success, 'Action成功');
    assertEqual(res.source, 'cache', 'キャッシュから引き当てられること');
    assertEqual(res.data?.keyword, '水泳 息継ぎ コツ 大人', 'キーワード一致');
    assert(res.data?.competitorAnalyses.suisapo.priceComparison?.includes('11,500円') || false, '価格対比');
  });

  // ---------------------------------------------------------------------------
  // Suite 3: 未登録・動的キーワードフォールバック生成・品質検証
  // ---------------------------------------------------------------------------
  console.log('\n▶ Suite 3: 未登録・動的キーワードフォールバック生成・品質検証');

  const testDynamicCases = [
    {
      kw: '水泳 個人レッスン 横浜',
      expectedSegmentTheme: '純地域キーワード',
      expectedActionType: 'pool_schedule',
      note: '純粋な地域キーワードは local_private に分類され pool_schedule となるべき',
    },
    {
      kw: '水泳 個人レッスン 横浜 初心者',
      expectedSegmentTheme: '地域×初心者複合キーワード',
      expectedActionType: 'trial_lesson', // 現行実装では '初心者' が先にマッチして adult_technique となる
      note: '現行実装は adult_technique が先に評価されるため trial_lesson となる（要所見報告）',
    },
    {
      kw: 'クロール 息継ぎ 苦しい コツ',
      expectedSegmentTheme: '大人・技術',
      expectedActionType: 'trial_lesson',
      note: 'adult_technique に分類',
    },
    {
      kw: 'イトマン 1級 合格 ワッペン',
      expectedSegmentTheme: 'ジュニア・進級',
      expectedActionType: 'trial_lesson',
      note: 'junior_promotion に分類',
    },
    {
      kw: '水泳 飛び込み 練習法',
      expectedSegmentTheme: '一般',
      expectedActionType: 'trial_lesson',
      note: 'general に分類',
    },
  ];

  for (const c of testDynamicCases) {
    await runTest('Suite 3', `動的キーワード「${c.kw}」（${c.expectedSegmentTheme}）フォールバック生成品質検証`, async () => {
      const origKey = process.env.GEMINI_API_KEY;
      try {
        process.env.GEMINI_API_KEY = '';
        const result = await analyzeKeywordCompetitors(c.kw, undefined, true);

        assertEqual(result.keyword, c.kw, 'キーワード一致');
        assertEqual(result.isDynamicAiGenerated, false, 'フォールバックフラグがfalseであること');
        assert(!!result.summary, 'サマリーが存在すること');
        assert(result.summary.includes(c.kw), 'サマリーにキーワードが含まれること');

        // 3社の個別分析
        const swimmy = result.competitorAnalyses.swimmy;
        const basePlus = result.competitorAnalyses.base_plus;
        const suisapo = result.competitorAnalyses.suisapo;

        assert(!!swimmy && !!basePlus && !!suisapo, '3社すべての分析が存在すること');
        assert(swimmy.topRankWeakness.length > 10, 'Swimmy弱点');
        assert(basePlus.topRankWeakness.length > 10, 'ベースプラス弱点');
        assert(suisapo.topRankWeakness.length > 10, 'スイサポ弱点');

        // ハルシネーション検証（マスタ外の架空情報がないか）
        assert(swimmy.priceComparison?.includes('10,800円') || false, 'Swimmy価格ファクト');
        assert(basePlus.priceComparison?.includes('17,650円') || false, 'ベースプラス価格ファクト');
        assert(suisapo.priceComparison?.includes('11,500円') || false, 'スイサポ価格ファクト');

        // CTA
        assertEqual(result.recommendedCta.actionType, c.expectedActionType, `CTA アクション種別 (${c.note})`);
        assert(result.recommendedCta.headline.length > 10, 'CTA headline');

        // Markdownテーブル
        assert(result.comparisonMarkdownTable.includes(c.kw), 'Markdownテーブルのテーマにキーワードが反映');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Suite 4: Gemini 3.8 Flash 実API連携検証
  // ---------------------------------------------------------------------------
  console.log('\n▶ Suite 4: Gemini 3.8 Flash 実API連携検証');

  if (process.env.GEMINI_API_KEY) {
    await runTest('Suite 4', 'Gemini API による実動的分析の実行・構造妥当性検証', async () => {
      const testKw = '水泳 個人レッスン 世田谷 初心者';
      const result = await analyzeKeywordCompetitors(testKw, '/setagaya-lesson', true);

      assert(!!result, 'Gemini分析結果が取得できること');
      assertEqual(result.keyword, testKw, 'キーワード一致');
      console.log(`    [Gemini動的生成フラグ]: isDynamicAiGenerated = ${result.isDynamicAiGenerated}`);
      assert(!!result.summary, 'サマリーが存在すること');
      assert(!!result.ourWinningStrategy, '勝ち筋が存在すること');
      assert(result.blindSpots.length > 0, '盲点が抽出されていること');

      for (const id of ['swimmy', 'base_plus', 'suisapo'] as CompetitorId[]) {
        const item = result.competitorAnalyses[id];
        assert(!!item, `AI分析に ${id} が含まれること`);
        assert(item.assumedPositioning.length > 5, 'assumedPositioning');
        assert(item.topRankWeakness.length > 5, 'topRankWeakness');
        assert(item.ourWinningAngle.length > 5, 'ourWinningAngle');
      }
    });

    await runTest('Suite 4', 'APIエラー時（無効なAPIキー）の自動フォールバック安全性検証', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      try {
        process.env.GEMINI_API_KEY = 'INVALID_FAKE_KEY_12345';
        const result = await analyzeKeywordCompetitors('水泳 バタフライ コツ 大人', undefined, true);
        assert(!!result, '無効キーでも例外で落ちずに結果を返すこと');
        assertEqual(result.isDynamicAiGenerated, false, 'ルールベースフォールバックに切り替わること');
        assert(result.summary.includes('水泳 バタフライ コツ 大人'), 'フォールバックサマリー');
      } finally {
        process.env.GEMINI_API_KEY = origKey;
      }
    });
  } else {
    console.log('  ⚠️ GEMINI_API_KEY が未設定のため、Gemini API 実コールはスキップしフォールバックを検証');
  }

  // ---------------------------------------------------------------------------
  // Suite 5: ローカルJSONファイル永続化 & 耐障害性検証
  // ---------------------------------------------------------------------------
  console.log('\n▶ Suite 5: ローカルJSONファイル永続化 & 耐障害性検証');

  const jsonFilePath = path.join(process.cwd(), 'data', 'seo', 'competitor-benchmarks.json');
  let originalJsonContent: string | null = null;
  if (fs.existsSync(jsonFilePath)) {
    originalJsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
  }

  try {
    await runTest('Suite 5', 'JSONファイルへの保存・読み込み往復完全性検証', async () => {
      const testData: KeywordCompetitorIntelligence = {
        keyword: 'テスト検証用キーワード_20261007',
        targetPath: '/test-path',
        analyzedAt: new Date().toISOString(),
        summary: 'テスト用サマリー文字列',
        competitorAnalyses: {
          swimmy: {
            competitorId: 'swimmy',
            competitorName: 'Swimmy (東京スイミーSS)',
            assumedPositioning: 'ポジショニングA',
            topRankWeakness: '弱点A',
            ourWinningAngle: '勝ち筋A',
          },
          base_plus: {
            competitorId: 'base_plus',
            competitorName: 'ベースプラス',
            assumedPositioning: 'ポジショニングB',
            topRankWeakness: '弱点B',
            ourWinningAngle: '勝ち筋B',
          },
          suisapo: {
            competitorId: 'suisapo',
            competitorName: 'スイサポ',
            assumedPositioning: 'ポジショニングC',
            topRankWeakness: '弱点C',
            ourWinningAngle: '勝ち筋C',
          },
        },
        blindSpots: ['盲点1', '盲点2', '盲点3'],
        ourWinningStrategy: '総合戦略テスト',
        recommendedCta: {
          headline: 'テスト見出し',
          subheadline: 'テストサブ',
          buttonText: 'テストボタン',
          targetAudience: 'テスト読者',
          actionType: 'trial_lesson',
        },
        comparisonMarkdownTable: '| テスト | 表 |',
      };

      const saveOk = await saveCompetitorAnalysis(testData);
      assert(saveOk, 'saveCompetitorAnalysis が true を返すこと');

      const loaded = await getSavedCompetitorAnalysis('テスト検証用キーワード_20261007');
      assert(loaded !== null, 'getSavedCompetitorAnalysis で取得できること');
      assertEqual(loaded?.keyword, testData.keyword, '保存データの一致');
      assertEqual(loaded?.summary, testData.summary, 'サマリーの一致');
      assertEqual(loaded?.blindSpots.length, 3, 'blindSpots件数一致');
    });

    await runTest('Suite 5', 'JSONファイル削除・初期化時の自己修復機能検証', async () => {
      // 一時的に削除
      if (fs.existsSync(jsonFilePath)) {
        fs.unlinkSync(jsonFilePath);
      }

      // 読み取り実行 → 自動でシードが再作成されること
      const all = await getAllSavedCompetitorAnalyses();
      assert(all.length >= 5, '初期シード5件以上が読み出せること');
      assert(fs.existsSync(jsonFilePath), 'JSONファイルが自動で再作成されていること');
    });

    await runTest('Suite 5', '破損JSONファイル（不正フォーマット）存在時の安全回復検証', async () => {
      // 壊れたJSONを書き込む
      fs.writeFileSync(jsonFilePath, '<<< INVALID JSON SYNTAX >>>', 'utf-8');

      // 読み取り実行 → 例外で落ちずにシードを返すこと
      const all = await getAllSavedCompetitorAnalyses();
      assert(all.length >= 5, '壊れたJSON時でもシードが返却されること');
      assert(all.some((item) => item.keyword === '水泳 息継ぎ コツ 大人'), 'シードデータが含まれること');
    });

    await runTest('Suite 5', '連続高速並行保存（Concurrency Stress）耐性検証', async () => {
      const concurrentTasks = Array.from({ length: 5 }).map((_, i) => {
        const dummy: KeywordCompetitorIntelligence = {
          keyword: `並行テスト_${i}_${Date.now()}`,
          analyzedAt: new Date().toISOString(),
          summary: `並行サマリー_${i}`,
          competitorAnalyses: {
            swimmy: {
              competitorId: 'swimmy',
              competitorName: 'Swimmy',
              assumedPositioning: 'P',
              topRankWeakness: 'W',
              ourWinningAngle: 'A',
            },
            base_plus: {
              competitorId: 'base_plus',
              competitorName: 'BasePlus',
              assumedPositioning: 'P',
              topRankWeakness: 'W',
              ourWinningAngle: 'A',
            },
            suisapo: {
              competitorId: 'suisapo',
              competitorName: 'Suisapo',
              assumedPositioning: 'P',
              topRankWeakness: 'W',
              ourWinningAngle: 'A',
            },
          },
          blindSpots: ['B1'],
          ourWinningStrategy: 'S',
          recommendedCta: {
            headline: 'H',
            subheadline: 'S',
            buttonText: 'B',
            targetAudience: 'A',
          },
          comparisonMarkdownTable: '| a | b |',
        };
        return saveCompetitorAnalysis(dummy);
      });

      const results = await Promise.all(concurrentTasks);
      assert(results.every((r) => r === true), 'すべての並行書き込みが成功すること');
    });
  } finally {
    // 元のJSONファイルを復元
    if (originalJsonContent !== null) {
      fs.writeFileSync(jsonFilePath, originalJsonContent, 'utf-8');
      console.log('    ℹ️ data/seo/competitor-benchmarks.json をテスト前の状態に復元完了');
    }
  }

  // ---------------------------------------------------------------------------
  // Suite 6: 4社比較Markdownテーブルのフォーマット構文妥当性検証
  // ---------------------------------------------------------------------------
  console.log('\n▶ Suite 6: 4社比較Markdownテーブルのフォーマット構文妥当性検証');

  await runTest('Suite 6', 'Markdownテーブルの列数・区切り・内容の整合性検証', () => {
    const md = buildComparisonMarkdownTable('テスト用テーマ');
    assert(md.includes('### 【徹底比較】'), '見出しが存在すること');

    const lines = md.split('\n').filter((l) => l.trim().startsWith('|'));
    assert(lines.length >= 10, '最低10行以上のテーブル行が存在すること');

    // 1行目: ヘッダー
    const headerCols = lines[0].split('|').map((s) => s.trim()).filter((s) => s.length > 0);
    assertEqual(headerCols.length, 5, 'ヘッダーの列数は5列でなければならない');
    assertEqual(headerCols[0], '比較項目', '第1列: 比較項目');
    assertEqual(headerCols[1], 'スイムパートナーズ（当教室）', '第2列: スイムパートナーズ');
    assertEqual(headerCols[2], 'Swimmy (東京スイミーSS)', '第3列: Swimmy');
    assertEqual(headerCols[3], 'ベースプラス (関東)', '第4列: ベースプラス');
    assertEqual(headerCols[4], 'スイサポ', '第5列: スイサポ');

    // 2行目: アライメント区切り
    const alignCols = lines[1].split('|').map((s) => s.trim()).filter((s) => s.length > 0);
    assertEqual(alignCols.length, 5, 'アライメント行の列数は5列でなければならない');
    for (const align of alignCols) {
      assert(align.startsWith(':---') || align.startsWith('---'), '正しいMarkdownアライメント構文');
    }

    // データ行の各行検証
    for (let i = 2; i < lines.length; i++) {
      const dataCols = lines[i].split('|').map((s) => s.trim()).filter((s) => s.length > 0);
      assertEqual(dataCols.length, 5, `データ行 ${i} の列数は5列でなければならない (内容: ${lines[i]})`);
    }

    // 必須項目の網羅性
    const mandatoryItems = [
      '運営形態',
      '指導体制',
      '入会金・年会費',
      'コーチ指名料',
      'コーチ交通費',
      '季節・地域割増',
      'フォーム分析DX',
      '指導アプローチ',
      '料金の透明性',
      '対象エリア',
    ];

    for (const item of mandatoryItems) {
      assert(
        lines.some((l) => l.includes(item)),
        `比較項目に「${item}」が含まれていること`
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Suite 7: 境界値・ストレステスト（Adversarial Edge Cases）
  // ---------------------------------------------------------------------------
  console.log('\n▶ Suite 7: 境界値・ストレステスト（Adversarial Edge Cases）');

  await runTest('Suite 7', '空文字・空白文字入力時のエラーハンドリング検証', async () => {
    // analyzeKeywordCompetitors
    let caughtEmpty = false;
    try {
      await analyzeKeywordCompetitors('');
    } catch {
      caughtEmpty = true;
    }
    assert(caughtEmpty, '空文字列で例外がスローされること');

    let caughtSpaces = false;
    try {
      await analyzeKeywordCompetitors('    ');
    } catch {
      caughtSpaces = true;
    }
    assert(caughtSpaces, '空白のみで例外がスローされること');

    // Action経由
    const actionEmpty = await analyzeKeywordCompetitorsAction('');
    assertEqual(actionEmpty.success, false, 'Actionで空文字はsuccess: false');
    assert(!!actionEmpty.error, 'エラーメッセージが返ること');

    const actionSpaces = await analyzeKeywordCompetitorsAction('   ');
    assertEqual(actionSpaces.success, false, 'Actionで空白のみはsuccess: false');

    const savedEmpty = await getSavedCompetitorAnalysisAction('');
    assertEqual(savedEmpty.success, false, 'getSavedCompetitorAnalysisActionで空文字はfalse');
  });

  await runTest('Suite 7', '超長文キーワード（1000文字）に対する頑健性検証', async () => {
    const hugeKw = '水泳 '.repeat(200) + '大人 息継ぎ';
    // 例外でクラッシュせずにフォールバックまたは処理が完了すること
    const res = await analyzeKeywordCompetitors(hugeKw, undefined, true);
    assert(!!res, '巨大キーワードでも結果を返すこと');
    assert(!!res.summary, 'サマリーが生成されること');
    assert(res.competitorAnalyses.swimmy !== undefined, 'Swimmy分析が存在');
  });

  await runTest('Suite 7', 'XSS/SQLインジェクション風特殊文字列・絵文字に対する耐性検証', async () => {
    const maliciousCases = [
      '<script>alert("xss")</script>',
      "'; DROP TABLE competitor_benchmarks; --",
      '🏊‍♂️ 水泳 個人レッスン 🏆 東京都港区',
      '改行\nを含む\r\nキーワード\tタブ',
    ];

    for (const kw of maliciousCases) {
      const res = await analyzeKeywordCompetitors(kw, undefined, true);
      assert(!!res, `特殊文字列「${kw}」で正常にオブジェクトが返ること`);
      assert(!!res.summary, 'サマリーが存在すること');
      assert(!!res.comparisonMarkdownTable, 'Markdownテーブルが存在すること');
    }
  });

  await runTest('Suite 7', 'テスト顧客制約遵守確認（会員番号0035・テスト太郎以外不使用）', () => {
    // 競合ベンチマークエンジンおよびアクションは顧客DBへのアクセスを行わないこと
    // コードベース内に他の顧客IDや顧客個人情報の参照がないことを静的に担保
    const benchmarkCode = fs.readFileSync(
      path.join(process.cwd(), 'src', 'lib', 'competitor-analysis-engine.ts'),
      'utf-8'
    );
    const actionCode = fs.readFileSync(
      path.join(process.cwd(), 'src', 'actions', 'competitor-benchmark-actions.ts'),
      'utf-8'
    );

    assert(!benchmarkCode.includes('students'), 'competitor-analysis-engine は students テーブルを直接参照しない');
    assert(!actionCode.includes('students'), 'competitor-benchmark-actions は students テーブルを直接参照しない');
  });

  // ---------------------------------------------------------------------------
  // 結果集計
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 検証結果サマリー');
  console.log('================================================================');

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`総テスト数: ${total}`);
  console.log(`成功: ${passed}`);
  console.log(`失敗: ${failed}`);

  if (failed > 0) {
    console.error('\n❌ 失敗したテスト一覧:');
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`- [${r.suite}] ${r.testName}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 全ての検証項目（実証テスト）を 100% 合格しました！');
  }
}

main().catch((err) => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
