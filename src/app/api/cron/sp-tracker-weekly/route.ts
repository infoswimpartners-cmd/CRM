import { NextResponse } from 'next/server';
import { getSpTrackerDashboard } from '@/actions/sp-tracker-actions';
import { sendSpTrackerWeeklyReport } from '@/lib/sp-tracker-notifier';

/**
 * 毎週月曜 8:30 (JST) 定期配信用 Cron API
 * Cloud Scheduler または Vercel Cron から呼び出されるエンドポイント
 */
export async function GET(request: Request) {
    try {
        const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
        if (!webhookUrl) {
            return NextResponse.json({ error: 'GOOGLE_CHAT_WEBHOOK_URL is not configured.' }, { status: 400 });
        }

        const dashboard = await getSpTrackerDashboard();
        const now = new Date();
        const periodText = `${now.getFullYear()}年${now.getMonth() + 1}月第${Math.ceil(now.getDate() / 7)}週`;

        const result = await sendSpTrackerWeeklyReport({
            webhookUrl,
            periodText,
            seoTopRate: dashboard.statusMeters.seoTopRate,
            geoSovRate: dashboard.statusMeters.geoSovRate,
            citationGapCount: dashboard.statusMeters.citationGapCount,
            internalHealthScore: dashboard.statusMeters.internalHealthScore,
            actions: dashboard.actionRecommendations,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, deliveredAt: new Date().toISOString() });
    } catch (err: any) {
        console.error('[SP-Tracker Cron Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
