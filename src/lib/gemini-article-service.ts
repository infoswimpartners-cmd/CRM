/**
 * Gemini 3.8 Flash を用いた高度SEO・AIO記事自動生成サービス
 * スイムパートナーズ専属チーフコーチ＆SEOマーケター視点でプロ品質の記事を執筆
 */

import { GeneratedArticle, ArticleType } from './generated-articles-storage';
import { GenerateArticleParams as BaseGenerateArticleParams } from './article-generator-engine';
import { KeywordCompetitorIntelligence } from '@/types/competitor-benchmark';
import { buildComparisonMarkdownTable } from './competitor-benchmark-data';

export interface GenerateArticleParams extends BaseGenerateArticleParams {
    /** 競合3社（Swimmy, ベースプラス, スイサポ）のベンチマーク分析インテリジェンス */
    competitorIntelligence?: KeywordCompetitorIntelligence;
}

export async function generateArticleWithGeminiFlash(
    params: GenerateArticleParams,
    apiKey: string
): Promise<GeneratedArticle> {
    const { keyword, articleType, customPrompt, competitorContext, intentContext, competitorIntelligence } = params;
    const targetPath = params.targetPath || (articleType === 'aio' ? '/articles/column' : '/articles/tips');
    const today = new Date();
    const dateStr = today.toISOString();
    const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const isRewrite = params.isRewrite || (targetPath && !targetPath.startsWith('/articles/'));

    // 競合3社インテリジェンスプロンプトブロックの構築
    let competitorSection = '';
    if (competitorIntelligence) {
        const analyses = competitorIntelligence.competitorAnalyses;
        const swimmy = analyses?.swimmy;
        const basePlus = analyses?.base_plus;
        const suisapo = analyses?.suisapo;

        competitorSection = `
【競合ベンチマーク3社（Swimmy / ベースプラス / スイサポ）インテリジェンス・差別化要件】
本記事では、同一キーワードにおける競合他社3社のポジショニング・上位記事の弱点を論理的に打破し、読者に対してスイムパートナーズが選ばれる理由を証明してください。

1. Swimmy (東京スイミーSS) 対比:
   - 競合の想定状況: ${swimmy?.assumedPositioning || '知育・児童スイミング中心'}
   - 競合の弱点・不足点: ${swimmy?.topRankWeakness || '大人の息継ぎ・フォーム改善や進級即効対策の技術論が希薄'}
   - 当教室の勝ち筋: ${swimmy?.ourWinningAngle || '完全明朗会計（入会金・年会費・夏季加算0円）と生体力学即効改善'}
   - 料金・形態比較: 入会金10,800円や一律交通費1,400円・夏季加算がなく、当教室はずっと0円・公営プール実費（300〜500円）のみ。

2. ベースプラス (BASE PLUS 関東) 対比:
   - 競合の想定状況: ${basePlus?.assumedPositioning || '集団スクール乗り換え特化・2名受講割安'}
   - 競合の弱点・不足点: ${basePlus?.topRankWeakness || '初期費用（入会金＋年会費＋保険料＝約1.8万円）が重く、毎回の動画カルテがない'}
   - 当教室の勝ち筋: ${basePlus?.ourWinningAngle || '初期費用完全0円・毎レッスン水中動画カルテ送付・専任プロコーチ60分完全密着'}
   - 料金・形態比較: 初年度固定費用17,650円不要。2名指導ではなく完全1対1で密度2倍。

3. スイサポ 対比:
   - 競合の想定状況: ${suisapo?.assumedPositioning || '品川区・城南エリア拠点、都度払い'}
   - 競合の弱点・不足点: ${suisapo?.topRankWeakness || '都度払い8,000円に見えて交通費+1,000円・代表指名料+2,500円（実質11,500円〜）と割高化'}
   - 当教室の勝ち筋: ${suisapo?.ourWinningAngle || '交通費込み・指名料0円・完全専任制・東京/神奈川/千葉/埼玉の広域対応'}
   - 料金・形態比較: 隠れた追加料金一切なし。予約ごとの担当交代がなく専任プロコーチが伴走。

■ 競合3社の共通盲点（上位記事で言及されていない重要ポイント）:
${competitorIntelligence.blindSpots?.map((b, i) => `  - 盲点${i + 1}: ${b}`).join('\n') || '  - 一般論の精神論や回数重視にとどまり、大人の沈み込みや進級テストの生体力学的メカニズムが不足'}

■ 自社（スイムパートナーズ）の必勝総合戦略:
${competitorIntelligence.ourWinningStrategy || '完全明朗会計、専任プロコーチ制、毎回の動画カルテ、生体力学（重心・浮力・脱力）ピンポイント指導の4大優位性を提示'}

■ 推奨CTA設計:
- 見出し: ${competitorIntelligence.recommendedCta?.headline || '60分で悩みを解消する出張マンツーマン体験レッスン'}
- サブコピー: ${competitorIntelligence.recommendedCta?.subheadline || '入会金0円・交通費込み。身近な公営プールでプロコーチが専任指導'}
- ボタン文言: ${competitorIntelligence.recommendedCta?.buttonText || '体験レッスンを予約する（空き枠確認）'}

■ 【最重要・必須出力指示】4社徹底比較Markdownテーブル:
記事本文（content_md）内に、以下の4社徹底比較Markdownテーブルを【必ずそのまま含めて出力】してください：
${competitorIntelligence.comparisonMarkdownTable || buildComparisonMarkdownTable(keyword)}
`;
    } else {
        competitorSection = `
【他社・競合比較（4社徹底比較）要件】
一般的な集団スクールに加え、主要個別指導スクール（Swimmy、ベースプラス、スイサポ）とスイムパートナーズの決定的な違いを明確にし、以下の4社徹底比較Markdownテーブルを必ず記事本文中に含めてください：
${buildComparisonMarkdownTable(keyword)}
`;
    }

    const systemPrompt = `
あなたはお出張個別指導スイミング「スイムパートナーズ」の専属チーフコーチ兼、検索エンジンの上位表示（SEO）およびAI検索（AIO）を熟知した最高峰のコンテンツマーケターです。

【スイムパートナーズの特徴・訴求要素】
- サービス内容: 東京23区・神奈川（横浜・川崎等）・千葉・埼玉の身近な公営温水プールへプロコーチが出張する完全マンツーマン水泳個別指導
- 対象者: 
  1. ジュニア（進級テストで停滞している子、水が怖い子、フォームの癖を直したい子）
  2. 大人（25m完泳したい初心者、息継ぎで沈んでしまう方、ジムで泳ぎ直したい50代〜60代、水恐怖症の方）
- 強み:
  - 生徒1人にコーチ1名の専属60分。大手スクールの一斉指導（1対10〜15名で1人の実質指導は2〜3分）に比べ圧倒的な上達速度（平均3〜5回で完泳）。
  - 水中・陸上からのスマホ・動画撮影によるフォーム分析＆レッスンカルテ送付。
  - 公営プール利用なので入会金不要、レッスン料とプール入場料実費（300〜500円）のみの明朗会計。
- ゴール: 読者の悩みに寄り添い、科学的・生体力学的な理由で納得させ、安心感を与えて「体験レッスン（60分）」への申し込み（CVR向上）を促すこと。

【生成要件】
- 読者が検索したターゲットキーワード: 「${keyword}」
- 記事種別: ${isRewrite ? '既存ページ・記事のリライト強化（Google検索1位奪取＆CVR最大化）' : articleType === 'seo' ? 'SEO記事（検索1位狙撃・論理的網羅性とCVR最大化）' : 'AIO記事（ChatGPT/Perplexity等のAI検索が引用・推奨しやすい明確な結論とエビデンス構成）'}
- 対象パス: ${targetPath}
${competitorSection}
${competitorContext?.competitorWeakness ? `- 競合他社の弱点補足: ${competitorContext.competitorWeakness}` : ''}
${competitorContext?.differentiationStrategy ? `- 差別化戦略補足: ${competitorContext.differentiationStrategy}` : ''}
${intentContext?.searchIntent ? `- 読者のリアルな悩み・検索意図: ${intentContext.searchIntent}` : ''}
${customPrompt ? `- ユーザーからの追加リクエスト: ${customPrompt}` : ''}

【Markdown本文執筆の厳格ルール】
- 抽象的な定型文や一般論の羅列は厳禁です。
- 生体力学的メカニズム（重心移動、頭の角度、浮力と肺の浮心、脱力、ローリング等）を専門的かつわかりやすく解説してください。
- 読者がすぐに試せる具体的な改善ドリル（お風呂・陸上ドリル、水中ドリル）をステップ形式で記載してください。
- 上記の【4社徹底比較Markdownテーブル】を必ず記事本文（content_md）内にそのまま含めてください。
- 読者が抱く疑問を解消するFAQ（3〜4項目）と、安心感のある体験レッスン誘導CTAを配置してください。

【出力フォーマット（厳密なJSON形式のみを出力してください。バッククォート \`\`\`json のみで囲み、余計な前置きや後置きの挨拶は一切不要です）】
{
  "title": "読者の目を惹きSEO完全一致キーワードを含む魅力的なタイトル（32〜45文字）",
  "meta_description": "検索結果スニペットに表示されるクリック率の高い説明文（110〜140文字）",
  "content_md": "Markdown形式の本格記事本文（見出しH2, H3、箇条書き、4社徹底比較表、具体的アドバイス、自宅練習法、体験レッスンへの誘導CTAを含む。2,500〜3,500文字以上の圧倒的な情報量）",
  "content_html": "STUDIOやWebサイトにそのまま貼り付け可能なセマンティックHTML（<article>, <h2>, <h3>, <p>, <ul>, <table>, CTAブロック等。洗練されたTailwindクラスまたはインラインスタイル付き）",
  "faq_items": [
    { "question": "よくある質問1", "answer": "親身で説得力のある回答" },
    { "question": "よくある質問2", "answer": "親身で説得力のある回答" },
    { "question": "よくある質問3", "answer": "親身で説得力のある回答" }
  ]
}
`;

    const userPrompt = `キーワード「${keyword}」${isRewrite ? `および対象パス「${targetPath}」のリライト記事` : ''}に関するプロ品質の記事を、指定のJSON形式で出力してください。一般的な抽象論ではなく、水泳指導のプロならではの生体力学的な理由（重心、頭の位置、浮力、脱力等）と、マンツーマン個別指導の優位性、および指定の4社徹底比較表を確実に含めて書いてください。`;

    // 利用可能な高速Geminiモデルの自動フォールバック候補
    const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
    ];

    let candidateText = '';
    let lastError = '';

    const articleJsonSchema = {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            meta_description: { type: 'STRING' },
            content_md: { type: 'STRING' },
            content_html: { type: 'STRING' },
            faq_items: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        question: { type: 'STRING' },
                        answer: { type: 'STRING' },
                    },
                    required: ['question', 'answer'],
                },
            },
        },
        required: ['title', 'meta_description', 'content_md', 'faq_items'],
    };

    for (const model of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                        responseMimeType: 'application/json',
                        responseSchema: articleJsonSchema,
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
                const errorText = await res.text();
                lastError = `Gemini API (${model}) Error (${res.status}): ${errorText}`;
                continue;
            }
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            lastError = fetchErr.message || String(fetchErr);
            continue;
        }
    }

    if (!candidateText) {
        throw new Error(lastError || 'Gemini APIから回答が取得できませんでした');
    }

    // JSONブロックの抽出と安全なパース
    let jsonStr = candidateText.trim();
    if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    // 最外郭の { ... } を抽出
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    let parsed: any;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        try {
            // 制御文字や未エスケープ改行のサニタイズ修復
            const sanitized = jsonStr.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
                if (match === '\n') return '\\n';
                if (match === '\r') return '\\r';
                if (match === '\t') return '\\t';
                return '';
            });
            parsed = JSON.parse(sanitized);
        } catch (e) {
            // パース失敗時のフォールバック処理
            parsed = {
                title: `【プロ指導員監修】「${keyword}」の真実と上達の秘訣`,
                meta_description: `「${keyword}」でお悩みの方へ。水泳個別指導スイムパートナーズが教える最短の上達ロードマップ。`,
                content_md: candidateText,
                content_html: `<div class="article-content space-y-6">${candidateText.replace(/\n/g, '<br/>')}</div>`,
                faq_items: [],
            };
        }
    }

    const faqItems = parsed.faq_items || [];
    const jsonLd = JSON.stringify(
        {
            '@context': 'https://schema.org',
            '@type': articleType === 'aio' ? 'FAQPage' : 'Article',
            headline: parsed.title,
            description: parsed.meta_description,
            author: {
                '@type': 'Organization',
                name: 'スイムパートナーズ',
            },
            mainEntity:
                faqItems.length > 0
                    ? faqItems.map((f: any) => ({
                          '@type': 'Question',
                          name: f.question,
                          acceptedAnswer: {
                              '@type': 'Answer',
                              text: f.answer,
                          },
                      }))
                    : undefined,
        },
        null,
        2
    );

    let contentMd = parsed.content_md || '';
    const tableToEnsure = competitorIntelligence?.comparisonMarkdownTable || buildComparisonMarkdownTable(keyword);

    // Markdownテーブルの欠落防止ガード: テーブル記法 | スイムパートナーズ が含まれていない場合は本文末尾前または適切な箇所に補完
    if (!contentMd.includes('スイムパートナーズ') || !contentMd.includes('| ---')) {
        contentMd = `${contentMd}\n\n## 🏊‍♂️ 【徹底比較】他社スクールとスイムパートナーズの違い\n\n${tableToEnsure}\n`;
    }

    const contentHtml = (parsed.content_html && parsed.content_html.trim())
        ? parsed.content_html
        : `<div class="article-content space-y-6">${contentMd.replace(/\n/g, '<br/>')}</div>`;

    return {
        id,
        keyword,
        article_type: articleType,
        title: parsed.title,
        meta_description: parsed.meta_description,
        content_md: contentMd,
        content_html: contentHtml,
        faq_items: faqItems,
        json_ld: jsonLd,
        target_path: targetPath,
        status: 'draft',
        created_at: dateStr,
    };
}

/**
 * ローカル生成記事（またはGeminiフォールバック記事）に競合3社ベンチマークインテリジェンスを合成・拡張するヘルパー
 */
export function enrichArticleWithCompetitorIntelligence(
    article: GeneratedArticle,
    intelligence: KeywordCompetitorIntelligence
): GeneratedArticle {
    if (!intelligence) return article;

    const table = intelligence.comparisonMarkdownTable || buildComparisonMarkdownTable(article.keyword);
    const blindSpotsSection = intelligence.blindSpots && intelligence.blindSpots.length > 0
        ? intelligence.blindSpots.map((b, i) => `${i + 1}. **${b}**`).join('\n')
        : '1. **筋力不足ではなく生体力学的な「重心移動・肺の浮力」の解説不足**\n2. **公営プール入場料実費と民間高額月謝の費用対効果対比の欠如**';

    const competitorSectionMd = `

---

## 🏊‍♂️ 【他社比較】大手スクール・競合3社（Swimmy / ベースプラス / スイサポ）とスイムパートナーズの決定的な違い

当教室（スイムパートナーズ）では、他社でありがちな「追加交通費」「指名料」「高額な入会金」「形式的なワッペン進級テスト待ち」を一切排除しています。

${table}

### 💡 他社上位記事では語られない「見落とされがちな盲点」
${blindSpotsSection}

### 🎯 スイムパートナーズの必勝アプローチ
${intelligence.ourWinningStrategy}

### 🚀 【先着枠限定】${intelligence.recommendedCta.headline}
${intelligence.recommendedCta.subheadline}

👉 **[${intelligence.recommendedCta.buttonText}（公営プール出張・空き枠確認）](https://swim-partners.com/personal_swim)**

---
`;

    // 本文への合成
    let updatedContentMd = article.content_md || '';
    if (!updatedContentMd.includes('【他社比較】') && !updatedContentMd.includes('スイムパートナーズ（当教室）')) {
        // まとめセクションやFAQの直前、または末尾に挿入
        if (updatedContentMd.includes('## まとめ')) {
            updatedContentMd = updatedContentMd.replace('## まとめ', `${competitorSectionMd}\n\n## まとめ`);
        } else if (updatedContentMd.includes('## よくあるご質問')) {
            updatedContentMd = updatedContentMd.replace('## よくあるご質問', `${competitorSectionMd}\n\n## よくあるご質問`);
        } else {
            updatedContentMd = `${updatedContentMd}\n${competitorSectionMd}`;
        }
    }

    const updatedContentHtml = article.content_html
        ? `${article.content_html}<section class="competitor-comparison my-8 p-6 bg-slate-50 rounded-xl border border-slate-200">${competitorSectionMd.replace(/\n/g, '<br/>')}</section>`
        : `<div class="article-content space-y-6">${updatedContentMd.replace(/\n/g, '<br/>')}</div>`;

    return {
        ...article,
        content_md: updatedContentMd,
        content_html: updatedContentHtml,
    };
}

