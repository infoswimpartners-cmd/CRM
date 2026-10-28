import { NextResponse } from 'next/server';
import { syncGscRanksAction } from '@/actions/sp-tracker-actions';
import { executeDailySeoArticlePipeline } from '@/lib/daily-seo-article-engine';

/**
 * 毎日 4:00 (JST) 定期実行用 Cron API
 * Search Consoleの最新実績と順位履歴を自動同期し、日別トレンドを最新化した上で
 * 日次キーワード分析＆STUDIO CMS最適化記事の自動作成・公開パイプラインを自動連動実行
 */
export async function GET(request: Request) {
    try {
        // 1. GSC最新順位の自動同期
        const result = await syncGscRanksAction();

        // 2. 日次キーワード分析＆STUDIO CMS記事自動生成パイプラインの連動実行
        let articleResult = null;
        try {
            articleResult = await executeDailySeoArticlePipeline();
            console.log('[SP-Tracker Daily Cron] Daily SEO Article Pipeline Result:', articleResult.message);
        } catch (articleErr) {
            console.warn('[SP-Tracker Daily Cron] Daily SEO Article Pipeline Notice:', articleErr);
        }

        if (!result.success) {
            console.warn('[SP-Tracker Daily Cron Notice]:', result.message);
            return NextResponse.json({
                success: false,
                message: result.message,
                articleMessage: articleResult?.message || null,
                executedAt: new Date().toISOString(),
            }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            message: result.message,
            articleGenerated: articleResult?.success || false,
            articleMessage: articleResult?.message || null,
            executedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('[SP-Tracker Daily Cron Error]:', err);
        return NextResponse.json({
            success: false,
            error: err.message || 'Daily sync failed',
            executedAt: new Date().toISOString(),
        }, { status: 500 });
    }
}
