/**
 * STUDIO（studio.design）CMS 連携・最適化サービス
 * STUDIO CMSの記事仕様（リッチテキストエディタ・カスタムコード・API/Webhook）に
 * 完全適合したフォーマット生成および送信処理を提供
 */

import { StudioCmsArticle, StudioExportBundle } from './studio-cms-types';

/**
 * STUDIO CMSのリッチテキストエディタに直接ペーストして美しい記事になるよう本文を整形
 */
export function buildStudioOptimizedBody(article: {
    title: string;
    keyword: string;
    bodyMarkdown: string;
    faqItems: { question: string; answer: string }[];
    comparisonTableMarkdown: string;
    ctaHeadline?: string;
    ctaSubheadline?: string;
}): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com';
    const trialUrl = `${appUrl}/trial`;

    let content = article.bodyMarkdown.trim();

    // 既にタイトルが本文冒頭にある場合は重複しないように調整
    if (content.startsWith('# ') && content.includes('\n')) {
        const firstLineEnd = content.indexOf('\n');
        content = content.substring(firstLineEnd).trim();
    }

    // 競合3社（Swimmy, ベースプラス, スイサポ）との4社徹底比較表が含まれていない場合は自動挿入
    if (article.comparisonTableMarkdown && !content.includes('Swimmy')) {
        content += `\n\n## 🏊‍♂️ 【徹底比較】大手スイミング・他社個人レッスンとの違い\n\n${article.comparisonTableMarkdown}\n`;
    }

    // FAQセクションが本文末尾にない場合はSTUDIO用に見やすくフォーマットして追記
    if (article.faqItems && article.faqItems.length > 0 && !content.includes('よくある質問')) {
        content += `\n\n## ❓ 「${article.keyword}」に関するよくある質問（FAQ）\n\n`;
        article.faqItems.forEach((faq, index) => {
            content += `### Q${index + 1}. ${faq.question}\n\n`;
            content += `**A.** ${faq.answer}\n\n`;
        });
    }

    // STUDIO CMS用 体験レッスン案内CTAボックス（記事末尾）
    const ctaTitle = article.ctaHeadline || `「${article.keyword}」でお悩みなら、まずは60分の個別指導を体験`;
    const ctaSub = article.ctaSubheadline || '完全専任プロコーチが身近な公営温水プールへ出張。入会金0円・毎レッスンの動画カルテ付きで驚きの上達を実感できます。';

    const ctaBox = `
---

### 🌊 【東京・神奈川・千葉・埼玉対応】スイムパートナーズの出張マンツーマン体験レッスン

**${ctaTitle}**

${ctaSub}

- **完全マンツーマン指導**: 生徒1人に専属プロコーチが60分つきっきりで指導
- **身近な公営プールで受講可能**: 自宅近くや通勤・通学途中の公営プールへ出張
- **水中動画カルテでフォーム即時改善**: 毎回のレッスン後に動画付き復習カルテを送付
- **安心の明朗会計**: 入会金・年会費・指定用品代はずっと0円。レッスン料のみ

👉 **[今すぐ体験レッスンの空き枠を確認・予約する（60分体験）](${trialUrl})**
`;

    content += `\n${ctaBox.trim()}\n`;

    return content;
}

/**
 * STUDIO CMSの動的ページ「カスタムコード」またはHTML埋め込み用 JSON-LD 構造化データ
 */
export function buildStudioJsonLd(article: {
    title: string;
    metaDescription: string;
    keyword: string;
    slug: string;
    faqItems: { question: string; answer: string }[];
}): string {
    const siteUrl = 'https://swim-partners.com';
    const canonicalUrl = `${siteUrl}/articles/${article.slug}`;

    const jsonLdObject: any = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Article',
                '@id': `${canonicalUrl}#article`,
                isPartOf: {
                    '@type': 'WebSite',
                    '@id': `${siteUrl}/#website`,
                    name: 'スイムパートナーズ',
                    url: siteUrl,
                },
                headline: article.title,
                description: article.metaDescription,
                inLanguage: 'ja',
                mainEntityOfPage: canonicalUrl,
                author: {
                    '@type': 'Organization',
                    name: 'スイムパートナーズ 指導部',
                    url: siteUrl,
                },
                publisher: {
                    '@type': 'Organization',
                    name: '出張個別指導スイミング スイムパートナーズ',
                    url: siteUrl,
                },
                keywords: [article.keyword, '水泳 個人レッスン', 'マンツーマン 水泳指導', '公営プール 出張'],
            },
        ],
    };

    if (article.faqItems && article.faqItems.length > 0) {
        jsonLdObject['@graph'].push({
            '@type': 'FAQPage',
            '@id': `${canonicalUrl}#faq`,
            mainEntity: article.faqItems.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: f.answer,
                },
            })),
        });
    }

    return `<script type="application/ld+json">\n${JSON.stringify(jsonLdObject, null, 2)}\n</script>`;
}

/**
 * STUDIO CMS管理画面でワンクリックで貼り付けられる「完全エクスポートバンドル」を構築
 */
export function buildStudioExportBundle(article: StudioCmsArticle): StudioExportBundle {
    const fullStudioClipboardText = `
【STUDIO CMS 登録用テキスト】
--------------------------------------------------
■ タイトル:
${article.title}

■ スラッグ (Slug):
${article.slug}

■ メタディスクリプション (SEO説明文):
${article.metaDescription}

■ カテゴリ:
${article.categoryLabel}
--------------------------------------------------
■ 記事本文（以下の内容をSTUDIO記事エディタにそのまま貼り付け）:

${article.bodyMarkdown}
--------------------------------------------------
`.trim();

    return {
        title: article.title,
        slug: article.slug,
        metaDescription: article.metaDescription,
        fullStudioClipboardText,
        jsonLdScript: article.jsonLd,
        studioEditorUrl: 'https://studio.design',
    };
}

/**
 * STUDIO CMS API または Webhook への自動送信（環境変数がある場合に自動実行）
 */
export async function syncArticleToStudioCms(article: StudioCmsArticle): Promise<{ success: boolean; message: string }> {
    const studioApiToken = process.env.STUDIO_API_TOKEN;
    const studioWebhookUrl = process.env.STUDIO_CMS_WEBHOOK_URL || process.env.STUDIO_WEBHOOK_URL;

    // Webhook URL が設定されている場合
    if (studioWebhookUrl) {
        try {
            const res = await fetch(studioWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'article.created',
                    article: {
                        id: article.id,
                        title: article.title,
                        slug: article.slug,
                        meta_description: article.metaDescription,
                        body_markdown: article.bodyMarkdown,
                        category: article.categoryLabel,
                        keyword: article.keyword,
                        created_at: article.createdAt,
                    },
                }),
            });

            if (res.ok) {
                return { success: true, message: 'STUDIO Webhook経由で記事データを自動送信しました。' };
            }
        } catch (err: any) {
            console.warn('[Studio CMS] Webhook sync failed:', err);
        }
    }

    // STUDIO API Token が設定されている場合（公式STUDIO API）
    if (studioApiToken) {
        try {
            const endpoint = 'https://api.studio.design/v1/cms/items';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${studioApiToken}`,
                },
                body: JSON.stringify({
                    title: article.title,
                    slug: article.slug,
                    body: article.bodyMarkdown,
                    metaDescription: article.metaDescription,
                    status: 'draft',
                }),
            });

            if (res.ok) {
                return { success: true, message: 'STUDIO CMS API経由で記事を下書き保存しました。' };
            }
        } catch (err: any) {
            console.warn('[Studio CMS] API sync failed:', err);
        }
    }

    return {
        success: true,
        message: 'STUDIO CMS連携用データを準備しました（管理画面からワンクリックコピー可能）。',
    };
}
