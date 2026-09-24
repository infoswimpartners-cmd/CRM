import { NextResponse } from 'next/server';
import { syncGscRanksAction } from '@/actions/sp-tracker-actions';

/**
 * 毎日 4:00 (JST) 定期実行用 Cron API
 * Search Consoleの最新実績と順位履歴を自動同期し、日別トレンドを最新化する
 */
export async function GET(request: Request) {
    try {
        const result = await syncGscRanksAction();

        if (!result.success) {
            console.warn('[SP-Tracker Daily Cron Notice]:', result.message);
            return NextResponse.json({
                success: false,
                message: result.message,
                executedAt: new Date().toISOString(),
            }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            message: result.message,
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
