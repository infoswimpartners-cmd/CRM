/**
 * LINEマーケティング 自動配信 Cron ディスパッチャー API
 * 
 * エンドポイント:
 *   GET  /api/cron/line-marketing-dispatcher
 *   POST /api/cron/line-marketing-dispatcher
 * 
 * クエリパラメータ:
 *   dry_run=true (シミュレーション実行モード)
 * 
 * 処理内容:
 *   1. 予約一括配信（Scheduled Broadcasts）の自動実行
 *   2. 体験レッスン受講完了（status: trial_done）生徒のステップ進行同期
 *   3. 到来したステップ配信のLINE Push実行
 *   4. 【最重要安全制御】本入会（status: active）または退会（status: withdrawn）生徒の安全自動スキップ
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    processScheduledBroadcasts,
    processStepDeliveries,
    syncTrialDoneStudentsToProgress,
    processCartAbandonmentReminders,
} from '@/lib/line-marketing-service';

export const dynamic = 'force-dynamic';

export async function runMarketingDispatcher(options: { dryRun?: boolean } = {}) {
    const { dryRun = false } = options;
    const nowIso = new Date().toISOString();

    // 1. 体験受講完了生徒のステップ進行自動登録（エンロール同期）
    const syncResult = await syncTrialDoneStudentsToProgress({ dryRun });

    // 2. 予約一括配信の実行
    const broadcastResult = await processScheduledBroadcasts({ dryRun });

    // 3. 体験後ステップ配信の判定・実行（本入会スキップ制御付き）
    const stepResult = await processStepDeliveries({ dryRun });

    // 4. 未申込者向けステップ配信（Day 1: 19:00, Day 2: 12:00, Day 3: 18:00）の判定・実行
    let leadStepResult: any = null;
    try {
        const { processLineStepReminders } = await import('@/lib/line-step-reminders');
        leadStepResult = await processLineStepReminders({ dryRun });
    } catch (leadStepErr) {
        console.error('[Dispatcher] Error in processLineStepReminders:', leadStepErr);
    }

    // 5. カゴ落ち自動フォロー（フォーム閲覧後2h〜24h離脱者）の判定・実行
    let cartRecoveryResult: any = null;
    try {
        cartRecoveryResult = await processCartAbandonmentReminders({ dryRun });
    } catch (cartRecoveryErr) {
        console.error('[Dispatcher] Error in processCartAbandonmentReminders:', cartRecoveryErr);
    }

    return {
        dryRun,
        timestamp: nowIso,
        sync: syncResult,
        broadcast: broadcastResult,
        stepDeliveries: stepResult,
        leadStepReminders: leadStepResult,
        cartRecovery: cartRecoveryResult,
    };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dry_run') === 'true';

    // 認証検証: CRON_SECRET が設定されている場合はヘッダーを検査
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // Bearerが不一致の場合でも、管理者Cookieセッションがあれば許可
        try {
            const { createClient } = await import('@/lib/supabase/server');
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role !== 'admin') {
                    return NextResponse.json({ success: false, error: 'Unauthorized: Admin role required' }, { status: 401 });
                }
            } else {
                return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
            }
        } catch {
            return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
        }
    }

    try {
        const result = await runMarketingDispatcher({ dryRun });
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error('[Cron Dispatcher API] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return GET(request);
}
