'use server';

import {
    getSpreadsheetConfigStatus,
    saveArticleSpreadsheetId,
    appendArticleToSpreadsheet,
    SpreadsheetConfigStatus,
} from '@/lib/article-spreadsheet-service';
import { getGeneratedArticles } from '@/lib/generated-articles-storage';
import { generateArticleThumbnail } from '@/lib/thumbnail-generator-service';

/**
 * 記事用スプレッドシート連携状況を取得
 */
export async function getSpreadsheetConfigStatusAction(): Promise<SpreadsheetConfigStatus> {
    try {
        return await getSpreadsheetConfigStatus();
    } catch (e: any) {
        return {
            configured: false,
            spreadsheetId: null,
            spreadsheetUrl: null,
            serviceAccountEmail: null,
            targetSheetName: 'SEO記事一覧',
        };
    }
}

/**
 * 記事用スプレッドシートURLまたはIDを保存
 */
export async function saveSpreadsheetConfigAction(spreadsheetUrlOrId: string): Promise<{
    success: boolean;
    cleanId?: string;
    message: string;
}> {
    try {
        const result = await saveArticleSpreadsheetId(spreadsheetUrlOrId);
        return {
            success: true,
            cleanId: result.cleanId,
            message: 'スプレッドシート連携設定を正常に保存しました。',
        };
    } catch (err: any) {
        return {
            success: false,
            message: err?.message || 'スプレッドシート設定の保存に失敗しました。',
        };
    }
}

/**
 * 特定の記事を手動でスプレッドシートに追加
 */
export async function syncSingleArticleToSpreadsheetAction(articleId: string): Promise<{
    success: boolean;
    spreadsheetUrl?: string;
    message: string;
}> {
    try {
        const articles = await getGeneratedArticles();
        const article = articles.find(a => a.id === articleId);

        if (!article) {
            return {
                success: false,
                message: '指定された記事が見つかりませんでした。',
            };
        }

        // サムネイル画像URLを取得または生成
        let thumbnailUrl = article.thumbnail_url;
        if (!thumbnailUrl) {
            const thumb = await generateArticleThumbnail({
                title: article.title,
                keyword: article.keyword,
                slug: article.target_path.split('/').pop(),
            });
            thumbnailUrl = thumb.thumbnailUrl;
        }

        const slug = article.target_path.split('/').pop() || article.id;

        const result = await appendArticleToSpreadsheet({
            articleId: article.id,
            title: article.title,
            keyword: article.keyword,
            bodyMarkdown: article.content_md,
            thumbnailUrl,
            slug,
            metaDescription: article.meta_description,
            createdAt: article.created_at,
        });

        return result;
    } catch (err: any) {
        return {
            success: false,
            message: err?.message || 'スプレッドシートへの追加中にエラーが発生しました。',
        };
    }
}
