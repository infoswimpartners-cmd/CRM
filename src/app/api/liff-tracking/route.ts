import { NextResponse, after } from 'next/server';
import { recordAccessLog, recordConfirmAbandon } from '@/lib/line-tracking-service';
import { scheduleLazyConfirm30MinFollowup } from '@/lib/line-marketing-service';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const userAgent = req.headers.get('user-agent') || undefined;
        const resolvedLineUserId = body.lineUserId || body.userId || null;

        // 案D: クライアント側の30分タイマー満了による確認画面離脱フォロー即時判定トリガー
        if (body.step === 'confirm_30m_check') {
            scheduleLazyConfirm30MinFollowup(
                {
                    targetLineUserId: resolvedLineUserId || undefined,
                    force: true,
                },
                after
            );
            return NextResponse.json({
                success: true,
                step: 'confirm_30m_check',
                queued: true,
            });
        }

        // 案B: 既存のLIFFトラッキングリクエストのついでに、前回チェックから3分以上経過していれば
        // Next.js after() でバックグラウンド消化を実行（レスポンス速度には一切影響させない）
        scheduleLazyConfirm30MinFollowup({}, after);

        // 離脱ビーコン送信時の処理
        if (body.step === 'abandon') {
            await recordConfirmAbandon({
                lineUserId: resolvedLineUserId,
                displayName: body.displayName || null,
                pageUrl: body.pageUrl || body.url || null,
            });
            return NextResponse.json({ success: true, step: 'abandon' });
        }

        const log = await recordAccessLog({
            lineUserId: resolvedLineUserId,
            displayName: body.displayName || null,
            formType: body.formType || (body.step === 'confirm' ? 'trial_confirm' : 'trial'),
            step: body.step || (body.isConfirm ? 'confirm' : 'view'),
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

