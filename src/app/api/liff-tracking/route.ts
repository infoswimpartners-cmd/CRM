import { NextResponse } from 'next/server';
import { recordAccessLog } from '@/lib/line-tracking-service';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const userAgent = req.headers.get('user-agent') || undefined;

        const log = await recordAccessLog({
            lineUserId: body.lineUserId || body.userId || null,
            displayName: body.displayName || null,
            formType: body.formType || 'trial',
            referrerName: body.referrerName || null,
            pageUrl: body.pageUrl || body.url || null,
            utmSource: body.utmSource || null,
            utmMedium: body.utmMedium || null,
            utmCampaign: body.utmCampaign || null,
            userAgent,
            metadata: body.metadata || {}
        });

        return NextResponse.json({
            success: true,
            logId: log.id,
            formType: log.form_type
        });
    } catch (err: any) {
        console.error('[API /api/liff-tracking] Error recording access log:', err);
        // トラッキングのエラーでクライアントを停止させないよう200でsuccess: falseを返却
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to record tracking log' },
            { status: 200 }
        );
    }
}
