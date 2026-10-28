'use server';

import {
    executeDailySeoArticlePipeline,
    analyzeDailyKeywordOpportunities,
} from '@/lib/daily-seo-article-engine';
import { getGeneratedArticles, updateArticleStatus, ArticleStatus } from '@/lib/generated-articles-storage';
import { buildStudioExportBundle } from '@/lib/studio-cms-service';
import { syncArticleToNotionDatabase, NotionSyncResult } from '@/lib/notion-service';
import { StudioCmsArticle, StudioExportBundle } from '@/lib/studio-cms-types';

/**
 * 本日の日次SEO記事生成を実行するアクション（手動実行・検証用）
 */
export async function triggerDailySeoArticleAction(): Promise<{
    success: boolean;
    article?: StudioCmsArticle;
    message: string;
}> {
    try {
        const result = await executeDailySeoArticlePipeline();
        return {
            success: Boolean(result?.success),
            article: result?.article,
            message: result?.message || '日次記事生成が完了しました。',
        };
    } catch (err: any) {
        console.error('[Action triggerDailySeoArticleAction Error]:', err);
        return {
            success: false,
            message: String(err?.message || '日次SEO記事の生成処理中にエラーが発生しました。'),
        };
    }
}

/**
 * 次回分析予定のキーワードプレビューを取得
 */
export async function previewNextDailyKeywordAction() {
    try {
        const candidate = await analyzeDailyKeywordOpportunities();
        return { success: true, candidate };
    } catch (err: any) {
        return { success: false, error: err?.message };
    }
}

/**
 * 直近で生成された日次STUDIO CMS記事一覧を取得
 */
export async function getLatestStudioArticlesAction(): Promise<StudioCmsArticle[]> {
    try {
        const articles = await getGeneratedArticles();
        return articles.map((a) => {
            const slug = a.target_path.split('/').pop() || a.id;
            return {
                id: a.id,
                keyword: a.keyword,
                slug,
                title: a.title,
                metaDescription: a.meta_description,
                bodyMarkdown: a.content_md,
                bodyHtml: a.content_html,
                jsonLd: a.json_ld || '',
                faqItems: a.faq_items || [],
                comparisonTableMarkdown: '',
                category: 'adult' as const,
                categoryLabel: 'SEO最適化',
                targetAudience: '水泳学習者・保護者',
                searchIntent: a.keyword,
                targetPath: a.target_path,
                status: a.status as any,
                createdAt: a.created_at,
                publishedAt: a.published_at,
                analysisSummary: {
                    reasonForSelection: '日次キーワード自動分析による選定',
                    monthlySearchVolume: 800,
                    estimatedCvrScore: 4.8,
                    competitorWeakness: '他社の上位記事は精神論が多く具体的な技術・生体力学的解説が不足',
                    ourWinningAngle: '完全専任プロコーチ・動画カルテ・公営プール出張の明朗会計',
                },
            };
        });
    } catch (err) {
        console.warn('Failed to get studio articles:', err);
        return [];
    }
}

/**
 * 特定記事のSTUDIO用エクスポートバンドル（1クリックコピー用データ）を取得
 */
export async function getStudioExportBundleAction(articleId: string): Promise<StudioExportBundle | null> {
    const articles = await getLatestStudioArticlesAction();
    const target = articles.find((a) => a.id === articleId);
    if (!target) return null;
    return buildStudioExportBundle(target);
}

/**
 * 記事の公開ステータスを更新
 */
export async function toggleStudioArticleStatusAction(articleId: string, newStatus: ArticleStatus) {
    const success = await updateArticleStatus(articleId, newStatus);
    return { success };
}

/**
 * Notion API の接続設定状況を確認
 */
export async function getNotionConnectionStatusAction(): Promise<{
    isConfigured: boolean;
    hasApiKey: boolean;
    hasDatabaseId: boolean;
}> {
    const hasApiKey = Boolean(process.env.NOTION_API_KEY && process.env.NOTION_API_KEY.trim());
    const hasDatabaseId = Boolean(process.env.NOTION_DATABASE_ID && process.env.NOTION_DATABASE_ID.trim());

    return {
        isConfigured: hasApiKey && hasDatabaseId,
        hasApiKey,
        hasDatabaseId,
    };
}

/**
 * 特定記事を手動でNotionデータベースへ送信
 */
export async function syncArticleToNotionAction(articleId: string): Promise<NotionSyncResult> {
    const articles = await getLatestStudioArticlesAction();
    const target = articles.find((a) => a.id === articleId);

    if (!target) {
        return {
            success: false,
            message: '対象記事が見つかりませんでした。',
        };
    }

    return await syncArticleToNotionDatabase(target);
}
