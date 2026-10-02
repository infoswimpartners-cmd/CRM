/**
 * Gemini 3.8 Flash を用いた高度SEO・AIO記事自動生成サービス
 * スイムパートナーズ専属チーフコーチ＆SEOマーケター視点でプロ品質の記事を執筆
 */

import { GeneratedArticle, ArticleType } from './generated-articles-storage';
import { GenerateArticleParams } from './article-generator-engine';

export async function generateArticleWithGeminiFlash(
    params: GenerateArticleParams,
    apiKey: string
): Promise<GeneratedArticle> {
    const { keyword, articleType, customPrompt, competitorContext, intentContext } = params;
    const targetPath = params.targetPath || (articleType === 'aio' ? '/articles/column' : '/articles/tips');
    const today = new Date();
    const dateStr = today.toISOString();
    const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const systemPrompt = `
あなたは出張個別指導スイミング「スイムパートナーズ」の専属チーフコーチ兼、検索エンジンの上位表示（SEO）およびAI検索（AIO）を熟知した最高峰のコンテンツマーケターです。

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
- 記事種別: ${articleType === 'seo' ? 'SEO記事（検索1位狙撃・論理的網羅性とCVR最大化）' : 'AIO記事（ChatGPT/Perplexity等のAI検索が引用・推奨しやすい明確な結論とエビデンス構成）'}
${competitorContext?.competitorWeakness ? `- 競合他社の弱点: ${competitorContext.competitorWeakness}` : ''}
${competitorContext?.differentiationStrategy ? `- 差別化戦略: ${competitorContext.differentiationStrategy}` : ''}
${intentContext?.searchIntent ? `- 読者のリアルな悩み・検索意図: ${intentContext.searchIntent}` : ''}
${customPrompt ? `- ユーザーからの追加リクエスト: ${customPrompt}` : ''}

【出力フォーマット（厳密なJSON形式のみを出力してください。バッククォート \`\`\`json のみで囲み、余計な前置きや後置きの挨拶は一切不要です）】
{
  "title": "読者の目を惹きSEO完全一致キーワードを含む魅力的なタイトル（32〜45文字）",
  "meta_description": "検索結果スニペットに表示されるクリック率の高い説明文（110〜140文字）",
  "content_md": "Markdown形式の本格記事本文（見出しH2, H3、箇条書き、比較表、具体的アドバイス、自宅練習法、体験レッスンへの誘導CTAを含む。2,500〜3,500文字以上の圧倒的な情報量）",
  "content_html": "STUDIOやWebサイトにそのまま貼り付け可能なセマンティックHTML（<article>, <h2>, <h3>, <p>, <ul>, <table>, CTAブロック等。洗練されたTailwindクラスまたはインラインスタイル付き）",
  "faq_items": [
    { "question": "よくある質問1", "answer": "親身で説得力のある回答" },
    { "question": "よくある質問2", "answer": "親身で説得力のある回答" },
    { "question": "よくある質問3", "answer": "親身で説得力のある回答" }
  ]
}
`;

    const userPrompt = `キーワード「${keyword}」に関するプロ品質の記事を、指定のJSON形式で出力してください。一般的な抽象論ではなく、水泳指導のプロならではの生体力学的な理由（重心、頭の位置、浮力、脱力等）と、マンツーマン個別指導の優位性を具体的に書いてください。`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
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
            },
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
        throw new Error('Gemini APIから回答が取得できませんでした');
    }

    // JSONブロックの抽出
    let jsonStr = candidateText.trim();
    if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    let parsed: any;
    try {
        parsed = JSON.parse(jsonStr);
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

    return {
        id,
        keyword,
        article_type: articleType,
        title: parsed.title,
        meta_description: parsed.meta_description,
        content_md: parsed.content_md,
        content_html: parsed.content_html,
        faq_items: faqItems,
        json_ld: jsonLd,
        target_path: targetPath,
        status: 'draft',
        created_at: dateStr,
    };
}
