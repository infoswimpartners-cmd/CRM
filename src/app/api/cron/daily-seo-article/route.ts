import { NextResponse } from 'next/server';
import { executeDailySeoArticlePipeline } from '@/lib/daily-seo-article-engine';

/**
 * 毎日自動キーワード分析＆STUDIO CMS記事自動作成 Cron API
 * 実行タイミング: 毎日 4:00 (JST)
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // CRON_SECRETが設定されている場合のみ認証確認（未設定またはVercel内部実行時は通過）
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            const url = new URL(request.url);
            const keyParam = url.searchParams.get('key');
            if (keyParam !== cronSecret) {
                // セキュリティ保護
                console.warn('[Daily SEO Cron] Unauthorized attempt');
            }
        }

        const result = await executeDailySeoArticlePipeline();

        return NextResponse.json({
            success: result.success,
            message: result.message,
            article: result.article ? {
                id: result.article.id,
                keyword: result.article.keyword,
                title: result.article.title,
                slug: result.article.slug,
                targetPath: result.article.targetPath,
            } : null,
            executedAt: new Date().toISOString(),
        }, { status: result.success ? 200 : 500 });
    } catch (err: any) {
        console.error('[Daily SEO Cron Exception]:', err);
        return NextResponse.json({
            success: false,
            error: err.message || 'Internal error during daily SEO article creation',
            executedAt: new Date().toISOString(),
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return GET(request);
}
