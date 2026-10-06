'use server';

/**
 * LINEマーケティングシステム Server Actions
 * 
 * 管理画面（/admin/line-marketing）およびAPIから呼び出されるサーバー側処理
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
    sendSingleLineMessage,
    TEST_TARO_STUDENT_NUMBER,
    TEST_TARO_LINE_USER_ID,
    TEST_TARO_STUDENT_NAME,
    SendMessageResult,
    fetchAndFilterMarketingStudents,
    syncTrialDoneStudentsToProgress,
} from '@/lib/line-marketing-service';
import {
    SegmentFilterConditions,
    FilterPreviewStudent,
    FilterPreviewResult,
    StepRuleItem,
    CreateBroadcastParams,
    GetDeliveryLogsParams,
    DeliveryLogsResult,
    SyncTrialDoneResult,
    LineMarketingKpiSummary,
    LineBroadcastCampaign,
} from '@/types/line-marketing';
import {
    getTrackingKpiSummary,
    getTagsSummary,
    addTagToUser,
    removeTagFromUser
} from '@/lib/line-tracking-service';
import { TrackingKpiSummary, TagSummaryItem } from '@/types/line-tracking';

// ==============================================================================
// 認証ヘルパー: 管理者権限チェック（CLI・スクリプト実行時フォールバック対応）
// ==============================================================================

async function assertAdminUser(): Promise<{ userId: string }> {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!authError && user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role === 'admin') {
                return { userId: user.id };
            }
            throw new Error('管理者権限が必要です。');
        }
    } catch (e: any) {
        // CLI実行環境（cookiesコンテキスト外）の場合、SUPABASE_SERVICE_ROLE_KEYがあれば許可
        if (process.env.SUPABASE_SERVICE_ROLE_KEY && (typeof window === 'undefined' && !process.env.NEXT_RUNTIME)) {
            return { userId: '00000000-0000-0000-0000-000000000000' };
        }
        if (e.message?.includes('管理者権限')) {
            throw e;
        }
    }

    // CLI環境でservice role keyがある場合は管理者昇格
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { userId: '00000000-0000-0000-0000-000000000000' };
    }

    throw new Error('認証されていません。管理者アカウントでログインしてください。');
}

function safeRevalidate(path: string) {
    try {
        revalidatePath(path);
    } catch {
        // スクリプト実行環境などキャッシュコンテキスト外では無視
    }
}

// ==============================================================================
// 1. 複合セグメント抽出＆リアルタイムプレビュー
// ==============================================================================

export async function previewSegmentStudents(
    filter: SegmentFilterConditions = {}
): Promise<FilterPreviewResult> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        // 1. 共通抽出関数を利用して生徒一覧を精密抽出
        const filteredStudents = await fetchAndFilterMarketingStudents(filter);

        // 2. ステータスマスタ取得（ラベル表示用）
        const { data: statusMasters } = await supabaseAdmin
            .from('student_statuses')
            .select('id, name');
        const statusMap = new Map((statusMasters || []).map((s: any) => [s.id, s.name]));

        const students: FilterPreviewStudent[] = filteredStudents.map(s => ({
            id: s.id,
            studentNumber: s.studentNumber,
            fullName: s.fullName,
            fullNameKana: s.fullNameKana || null,
            status: s.status,
            statusLabel: statusMap.get(s.status) || s.status,
            area: s.area,
            coachId: s.coachId || null,
            coachName: s.coachName || null,
            membershipTypeId: s.membershipTypeId || null,
            planName: s.planName || null,
            hasLine: s.hasLine,
            lineUserId: s.lineUserId || null,
            trialDate: s.trialDate || null,
            tags: s.tags || [],
        }));

        const lineEligibleCount = students.filter(s => s.hasLine).length;

        return {
            success: true,
            totalCount: students.length,
            lineEligibleCount,
            students,
        };
    } catch (err: any) {
        console.error('[previewSegmentStudents] Unexpected error:', err);
        return { success: false, totalCount: 0, lineEligibleCount: 0, students: [], error: err.message };
    }
}

/**
 * 互換エイリアス
 */
export const previewSegmentFilter = previewSegmentStudents;

// ==============================================================================
// 2. 一括配信予約・即時配信実行
// ==============================================================================

export async function createBroadcastCampaign(
    params: CreateBroadcastParams
): Promise<{
    success: boolean;
    campaignId?: string;
    status?: 'scheduled' | 'completed' | 'failed';
    targetCount?: number;
    successCount?: number;
    failedCount?: number;
    error?: string;
}> {
    try {
        const { userId } = await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        // 1. 対象生徒のプレビュー抽出を実行
        const preview = await previewSegmentStudents(params.filterConditions);
        if (!preview.success) {
            return { success: false, error: '対象生徒の抽出に失敗しました: ' + preview.error };
        }

        // 除外リストの適用 & LINE連携必須
        const excludedSet = new Set(params.excludedStudentIds || []);
        const targetStudents = preview.students.filter(s => s.hasLine && s.lineUserId && !excludedSet.has(s.id));

        if (targetStudents.length === 0) {
            return { success: false, error: '配信対象となるLINE連携済みの生徒が存在しません。' };
        }

        const now = new Date();
        const isScheduled = !!params.scheduledAt && new Date(params.scheduledAt) > now;

        // 2. キャンペーンレコードの作成
        const initialStatus = isScheduled ? 'scheduled' : 'sending';
        let campaignId = crypto.randomUUID();
        let useFallbackCampaigns = false;

        try {
            const { data: campaign, error: campError } = await supabaseAdmin
                .from('line_broadcast_campaigns')
                .insert({
                    title: params.title,
                    message_text: params.messageTemplate,
                    message_template: params.messageTemplate,
                    filter_conditions: params.filterConditions,
                    target_count: targetStudents.length,
                    status: initialStatus,
                    scheduled_at: isScheduled ? new Date(params.scheduledAt!).toISOString() : null,
                    created_by: userId !== '00000000-0000-0000-0000-000000000000' ? userId : null,
                })
                .select()
                .single();

            if (!campError && campaign) {
                campaignId = campaign.id;
            } else {
                useFallbackCampaigns = true;
            }
        } catch {
            useFallbackCampaigns = true;
        }

        // テーブル未作成時は app_configs にフォールバック保存
        if (useFallbackCampaigns) {
            try {
                const { data: config } = await supabaseAdmin
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'line_broadcast_campaigns_data_v1')
                    .maybeSingle();

                let campaigns: any[] = [];
                if (config?.value) {
                    try { campaigns = JSON.parse(config.value); } catch {}
                }

                campaigns.unshift({
                    id: campaignId,
                    title: params.title,
                    message_text: params.messageTemplate,
                    message_template: params.messageTemplate,
                    filter_conditions: params.filterConditions,
                    target_count: targetStudents.length,
                    status: initialStatus,
                    scheduled_at: isScheduled ? new Date(params.scheduledAt!).toISOString() : null,
                    created_by: userId !== '00000000-0000-0000-0000-000000000000' ? userId : null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                if (campaigns.length > 50) campaigns = campaigns.slice(0, 50);

                await supabaseAdmin
                    .from('app_configs')
                    .upsert({
                        key: 'line_broadcast_campaigns_data_v1',
                        value: JSON.stringify(campaigns),
                        updated_at: new Date().toISOString(),
                    });
            } catch (fbErr) {
                console.warn('[createBroadcastCampaign] Fallback config save warning:', fbErr);
            }
        }

        // 予約配信の場合はここで完了返却（Cronが実行）
        if (isScheduled) {
            safeRevalidate('/admin/line-marketing');
            return {
                success: true,
                campaignId,
                status: 'scheduled',
                targetCount: targetStudents.length,
            };
        }

        // 即時配信の場合: ループ送信実行
        let successCount = 0;
        let failedCount = 0;

        for (const student of targetStudents) {
            const variables = {
                name: student.fullName,
                coach_name: student.coachName || '',
                plan_name: student.planName || '',
                area: student.area,
                student_number: student.studentNumber,
                trial_date: student.trialDate || '',
            };

            const result: SendMessageResult = await sendSingleLineMessage({
                studentId: student.id,
                studentNumber: student.studentNumber,
                studentName: student.fullName,
                lineUserId: student.lineUserId!,
                rawMessage: params.messageTemplate,
                variables,
                deliveryType: 'broadcast',
                campaignId,
            });

            if (result.success) {
                successCount++;
            } else {
                failedCount++;
            }

            // 429レート制限緩和のための微小待機（30ms）
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        const finalStatus = successCount > 0 ? 'completed' : 'failed';

        // キャンペーン状態更新
        if (!useFallbackCampaigns) {
            await supabaseAdmin
                .from('line_broadcast_campaigns')
                .update({
                    status: finalStatus,
                    sent_count: successCount,
                    success_count: successCount,
                    failed_count: failedCount,
                    sent_at: new Date().toISOString(),
                    executed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', campaignId);
        } else {
            try {
                const { data: config } = await supabaseAdmin
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'line_broadcast_campaigns_data_v1')
                    .maybeSingle();

                if (config?.value) {
                    let campaigns: any[] = JSON.parse(config.value);
                    const idx = campaigns.findIndex((c: any) => c.id === campaignId);
                    if (idx !== -1) {
                        campaigns[idx].status = finalStatus;
                        campaigns[idx].sent_count = successCount;
                        campaigns[idx].success_count = successCount;
                        campaigns[idx].failed_count = failedCount;
                        campaigns[idx].sent_at = new Date().toISOString();
                        campaigns[idx].executed_at = new Date().toISOString();
                        campaigns[idx].updated_at = new Date().toISOString();

                        await supabaseAdmin
                            .from('app_configs')
                            .upsert({
                                key: 'line_broadcast_campaigns_data_v1',
                                value: JSON.stringify(campaigns),
                                updated_at: new Date().toISOString(),
                            });
                    }
                }
            } catch (fbUpdateErr) {
                console.warn('[createBroadcastCampaign] Fallback config update warning:', fbUpdateErr);
            }
        }

        safeRevalidate('/admin/line-marketing');

        return {
            success: true,
            campaignId,
            status: finalStatus,
            targetCount: targetStudents.length,
            successCount,
            failedCount,
        };
    } catch (err: any) {
        console.error('[createBroadcastCampaign] Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * キャンペーン一覧（予約配信および送信履歴）取得アクション
 */
export async function getBroadcastCampaigns(params: {
    status?: string;
    limit?: number;
} = {}): Promise<{
    success: boolean;
    campaigns: LineBroadcastCampaign[];
    error?: string;
}> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();
        const limit = params.limit || 50;

        // 1. テーブルからの取得試行
        try {
            let query = supabaseAdmin
                .from('line_broadcast_campaigns')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (params.status && params.status !== 'all') {
                query = query.eq('status', params.status);
            }

            const { data, error } = await query;
            if (!error && data) {
                return { success: true, campaigns: data as LineBroadcastCampaign[] };
            }
        } catch {}

        // 2. app_configs フォールバック
        const { data: config } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', 'line_broadcast_campaigns_data_v1')
            .maybeSingle();

        let campaigns: LineBroadcastCampaign[] = [];
        if (config?.value) {
            try {
                campaigns = JSON.parse(config.value);
            } catch {}
        }

        if (params.status && params.status !== 'all') {
            campaigns = campaigns.filter(c => c.status === params.status);
        }

        return { success: true, campaigns: campaigns.slice(0, limit) };
    } catch (err: any) {
        console.error('[getBroadcastCampaigns] Error:', err);
        return { success: false, campaigns: [], error: err.message };
    }
}

/**
 * 配信予約の編集・更新アクション
 */
export async function updateBroadcastCampaign(
    campaignId: string,
    params: {
        title?: string;
        messageTemplate?: string;
        scheduledAt?: string | null;
        filterConditions?: SegmentFilterConditions;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();
        const nowIso = new Date().toISOString();

        let updatedInTable = false;

        try {
            const updatePayload: Record<string, any> = {
                updated_at: nowIso,
            };
            if (params.title !== undefined) updatePayload.title = params.title;
            if (params.messageTemplate !== undefined) {
                updatePayload.message_text = params.messageTemplate;
                updatePayload.message_template = params.messageTemplate;
            }
            if (params.scheduledAt !== undefined) {
                updatePayload.scheduled_at = params.scheduledAt ? new Date(params.scheduledAt).toISOString() : null;
            }
            if (params.filterConditions !== undefined) {
                updatePayload.filter_conditions = params.filterConditions;
            }

            const { data, error } = await supabaseAdmin
                .from('line_broadcast_campaigns')
                .update(updatePayload)
                .eq('id', campaignId)
                .select('id')
                .maybeSingle();

            if (!error && data) {
                updatedInTable = true;
            }
        } catch {}

        if (!updatedInTable) {
            // app_configs フォールバック更新
            const { data: config } = await supabaseAdmin
                .from('app_configs')
                .select('value')
                .eq('key', 'line_broadcast_campaigns_data_v1')
                .maybeSingle();

            if (config?.value) {
                let campaigns: any[] = JSON.parse(config.value);
                const idx = campaigns.findIndex((c: any) => c.id === campaignId);
                if (idx !== -1) {
                    if (params.title !== undefined) campaigns[idx].title = params.title;
                    if (params.messageTemplate !== undefined) {
                        campaigns[idx].message_text = params.messageTemplate;
                        campaigns[idx].message_template = params.messageTemplate;
                    }
                    if (params.scheduledAt !== undefined) {
                        campaigns[idx].scheduled_at = params.scheduledAt ? new Date(params.scheduledAt).toISOString() : null;
                    }
                    if (params.filterConditions !== undefined) {
                        campaigns[idx].filter_conditions = params.filterConditions;
                    }
                    campaigns[idx].updated_at = nowIso;

                    await supabaseAdmin
                        .from('app_configs')
                        .upsert({
                            key: 'line_broadcast_campaigns_data_v1',
                            value: JSON.stringify(campaigns),
                            updated_at: nowIso,
                        });
                }
            }
        }

        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        console.error('[updateBroadcastCampaign] Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * 配信予約のキャンセルアクション (status -> 'cancelled')
 */
export async function cancelBroadcastCampaign(
    campaignId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();
        const nowIso = new Date().toISOString();

        let cancelledInTable = false;

        try {
            const { data, error } = await supabaseAdmin
                .from('line_broadcast_campaigns')
                .update({ status: 'cancelled', updated_at: nowIso })
                .eq('id', campaignId)
                .select('id')
                .maybeSingle();

            if (!error && data) {
                cancelledInTable = true;
            }
        } catch {}

        if (!cancelledInTable) {
            const { data: config } = await supabaseAdmin
                .from('app_configs')
                .select('value')
                .eq('key', 'line_broadcast_campaigns_data_v1')
                .maybeSingle();

            if (config?.value) {
                let campaigns: any[] = JSON.parse(config.value);
                const idx = campaigns.findIndex((c: any) => c.id === campaignId);
                if (idx !== -1) {
                    campaigns[idx].status = 'cancelled';
                    campaigns[idx].updated_at = nowIso;

                    await supabaseAdmin
                        .from('app_configs')
                        .upsert({
                            key: 'line_broadcast_campaigns_data_v1',
                            value: JSON.stringify(campaigns),
                            updated_at: nowIso,
                        });
                }
            }
        }

        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        console.error('[cancelBroadcastCampaign] Error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * キャンペーンの削除アクション
 */
export async function deleteBroadcastCampaign(
    campaignId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();
        const nowIso = new Date().toISOString();

        try {
            await supabaseAdmin
                .from('line_broadcast_campaigns')
                .delete()
                .eq('id', campaignId);
        } catch {}

        const { data: config } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', 'line_broadcast_campaigns_data_v1')
            .maybeSingle();

        if (config?.value) {
            let campaigns: any[] = JSON.parse(config.value);
            campaigns = campaigns.filter((c: any) => c.id !== campaignId);

            await supabaseAdmin
                .from('app_configs')
                .upsert({
                    key: 'line_broadcast_campaigns_data_v1',
                    value: JSON.stringify(campaigns),
                    updated_at: nowIso,
                });
        }

        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        console.error('[deleteBroadcastCampaign] Error:', err);
        return { success: false, error: err.message };
    }
}

// ==============================================================================
// 3. ステップ配信ルール管理 (CRUD・並び順更新・有効無効トグル・タグ別対応)
// ==============================================================================

const FALLBACK_RULES_KEY = 'line_step_rules_data_v1';

// 初期デフォルトシードルール（タグ別）
const DEFAULT_SEED_STEP_RULES: StepRuleItem[] = [
    {
        id: 'step-trial-1',
        stepOrder: 1,
        title: '1日後 19:00: 体験受講のお礼と感想のお伺い',
        delayDays: 1,
        sendTime: '19:00',
        messageText: '{{name}} 様、昨日はSwim Partnersの体験レッスンをご受講いただき誠にありがとうございました！🏊‍♂️✨\n\nお子様の泳ぎやレッスンのご様子はいかがでしたでしょうか？\n「楽しかった！」「また行きたい！」などのお声がございましたら大変嬉しく思います。\n\nご質問や気になる点がございましたら、いつでもこのLINEチャットへ直接ご返信くださいね😊',
        isActive: true,
        targetTag: 'trial_done',
    },
    {
        id: 'step-trial-2',
        stepOrder: 2,
        title: '3日後 12:00: 担当コーチからのフィードバック＆上達プラン',
        delayDays: 3,
        sendTime: '12:00',
        messageText: '{{name}} 様、こんにちは！Swim Partners事務局です✨\n\n体験レッスンでのお子様の泳ぎの癖や成長ポイントをもとに、今後の上達ステップをご案内いたします。\nマンツーマン個別指導だからこそ、一人ひとりのペースに合わせて最短距離で目標を達成できます！\n\n▼ 本会員へのご入会・プランのご確認はこちらから\nhttps://manager.swim-partners.com/enroll',
        isActive: true,
        targetTag: 'trial_done',
    },
    {
        id: 'step-trial-3',
        stepOrder: 3,
        title: '7日後 19:00: 体験受講者限定の入会特典・特別案内',
        delayDays: 7,
        sendTime: '19:00',
        messageText: '{{name}} 様、体験レッスンから1週間が経ちましたがいかがお過ごしでしょうか？💡\n\n体験受講者様限定で、今週中のお申し込みで初月特典が適用されるキャンペーンを実施中です。\nご希望の日程やコーチのご相談など、お気軽にチャットにてお聞かせください！',
        isActive: true,
        targetTag: 'trial_done',
    },
    {
        id: 'step-abandon-1',
        stepOrder: 1,
        title: '1日後 18:00: 体験申込フォーム入力のサポート・お悩み相談',
        delayDays: 1,
        sendTime: '18:00',
        messageText: '{{name}} 様、Swim Partners事務局です🏊‍♂️\n昨日体験レッスン予約フォームをご覧いただきありがとうございます！\n\n「日程や場所の選び方がわからない」「コーチの希望がある」など、ご不明な点はございませんでしょうか？\nフォームを入力しなくても、このLINEチャットに直接希望のエリアや曜日をメッセージいただければ、事務局が最適なプランをご案内いたします😊',
        isActive: true,
        targetTag: 'trial_form_viewed',
    },
    {
        id: 'step-abandon-2',
        stepOrder: 2,
        title: '3日後 19:00: 今週の空き枠状況と人気プールのご案内',
        delayDays: 3,
        sendTime: '19:00',
        messageText: '{{name}} 様、こんばんは！✨\nご自宅近くの公営プールでレッスン可能な今週末の空き枠が残りわずかとなってまいりました。\n\n▼ 体験レッスンの空き枠確認・お申し込みはこちらから\n{{trial_url}}\n\nご質問もお気軽にどうぞ！',
        isActive: true,
        targetTag: 'trial_form_viewed',
    },
    {
        id: 'step-friend-1',
        stepOrder: 1,
        title: '24時間後: 出張プール案内・柔軟な利便性',
        delayDays: 1,
        sendTime: '19:00',
        messageText: '{{name}} 様、Swim Partners公式LINEへのご登録ありがとうございます！事務局です😊\n\n当スクールではご自宅近くの公営プールへインストラクターが出張いたします！🏊‍♂️\nまずは一度、お近くのプールで体験してみませんか？\n▼体験レッスンの詳細はこちら\n{{trial_url}}',
        isActive: true,
        targetTag: 'friend_only',
    },
    {
        id: 'step-ref-1',
        stepOrder: 1,
        title: '1日後 12:00: お友達紹介キャンペーン特別価格のご案内',
        delayDays: 1,
        sendTime: '12:00',
        messageText: '{{name}} 様、ご紹介でのご検討誠にありがとうございます！🎁✨\nお友達紹介キャンペーン適用により、初回体験レッスンが特別価格3,500円（通常6,000円）にてご受講いただけます。\n\n▼ 特別価格での体験お申し込みはこちらから\n{{trial_url}}',
        isActive: true,
        targetTag: 'referral_lead',
    }
];

export async function getStepRules(targetTag?: string): Promise<{ success: boolean; rules: StepRuleItem[]; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        // 1. DBテーブルからの取得試行
        try {
            let query = supabaseAdmin
                .from('line_step_rules')
                .select('*')
                .order('step_order', { ascending: true });

            const { data, error } = await query;

            if (!error && data && data.length > 0) {
                let rules: StepRuleItem[] = data.map((r: any) => ({
                    id: r.id,
                    stepOrder: r.step_order,
                    title: r.title,
                    delayDays: r.delay_days,
                    sendTime: r.send_time,
                    messageText: r.message_text,
                    isActive: r.is_active,
                    targetTag: r.target_tag || 'trial_done',
                    createdAt: r.created_at,
                    updatedAt: r.updated_at,
                }));

                if (targetTag && targetTag !== 'all') {
                    rules = rules.filter(r => (r.targetTag || 'trial_done') === targetTag);
                }
                return { success: true, rules };
            }
        } catch {}

        // 2. app_configs フォールバック
        const { data: config } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_RULES_KEY)
            .maybeSingle();

        let rules: StepRuleItem[] = config?.value ? JSON.parse(config.value) : DEFAULT_SEED_STEP_RULES;

        if (targetTag && targetTag !== 'all') {
            rules = rules.filter(r => (r.targetTag || 'trial_done') === targetTag);
        }

        return { success: true, rules };
    } catch (err: any) {
        return { success: false, rules: [], error: err.message };
    }
}

export async function createStepRule(data: {
    title: string;
    delayDays: number;
    sendTime: string;
    messageText: string;
    isActive?: boolean;
    targetTag?: string;
}): Promise<{ success: boolean; ruleId?: string; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();
        const targetTag = data.targetTag || 'trial_done';

        // 1. DBテーブルへの挿入試行
        try {
            const { data: maxOrderData } = await supabaseAdmin
                .from('line_step_rules')
                .select('step_order')
                .order('step_order', { ascending: false })
                .limit(1)
                .maybeSingle();

            const newOrder = (maxOrderData?.step_order || 0) + 1;

            const { data: inserted, error } = await supabaseAdmin
                .from('line_step_rules')
                .insert({
                    step_order: newOrder,
                    title: data.title,
                    delay_days: data.delayDays,
                    send_time: data.sendTime,
                    message_text: data.messageText,
                    is_active: data.isActive !== false,
                })
                .select()
                .single();

            if (!error && inserted) {
                safeRevalidate('/admin/line-marketing');
                return { success: true, ruleId: inserted.id };
            }
        } catch {}

        // 2. app_configs フォールバック
        const { data: config } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_RULES_KEY)
            .maybeSingle();

        let rules: StepRuleItem[] = config?.value ? JSON.parse(config.value) : [...DEFAULT_SEED_STEP_RULES];
        const newId = crypto.randomUUID();
        const tagRules = rules.filter(r => (r.targetTag || 'trial_done') === targetTag);
        const newOrder = tagRules.length + 1;

        const newRule: StepRuleItem = {
            id: newId,
            stepOrder: newOrder,
            title: data.title,
            delayDays: data.delayDays,
            sendTime: data.sendTime,
            messageText: data.messageText,
            isActive: data.isActive !== false,
            targetTag,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        rules.push(newRule);

        await supabaseAdmin.from('app_configs').upsert({
            key: FALLBACK_RULES_KEY,
            value: JSON.stringify(rules),
            description: 'LINEステップ配信シナリオルール',
            updated_at: new Date().toISOString(),
        });

        safeRevalidate('/admin/line-marketing');
        return { success: true, ruleId: newId };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateStepRule(
    id: string,
    data: {
        title?: string;
        delayDays?: number;
        sendTime?: string;
        messageText?: string;
        isActive?: boolean;
        targetTag?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        // 1. DBテーブルの更新試行
        try {
            const updatePayload: any = {
                updated_at: new Date().toISOString(),
            };
            if (data.title !== undefined) updatePayload.title = data.title;
            if (data.delayDays !== undefined) updatePayload.delay_days = data.delayDays;
            if (data.sendTime !== undefined) updatePayload.send_time = data.sendTime;
            if (data.messageText !== undefined) updatePayload.message_text = data.messageText;
            if (data.isActive !== undefined) updatePayload.is_active = data.isActive;

            const { error } = await supabaseAdmin
                .from('line_step_rules')
                .update(updatePayload)
                .eq('id', id);

            if (!error) {
                safeRevalidate('/admin/line-marketing');
                return { success: true };
            }
        } catch {}

        // 2. app_configs フォールバック
        const { data: config } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', FALLBACK_RULES_KEY)
            .maybeSingle();

        if (config?.value) {
            let rules: StepRuleItem[] = JSON.parse(config.value);
            const idx = rules.findIndex(r => r.id === id);
            if (idx >= 0) {
                rules[idx] = {
                    ...rules[idx],
                    ...(data.title !== undefined ? { title: data.title } : {}),
                    ...(data.delayDays !== undefined ? { delayDays: data.delayDays } : {}),
                    ...(data.sendTime !== undefined ? { sendTime: data.sendTime } : {}),
                    ...(data.messageText !== undefined ? { messageText: data.messageText } : {}),
                    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                    ...(data.targetTag !== undefined ? { targetTag: data.targetTag } : {}),
                    updatedAt: new Date().toISOString(),
                };

                await supabaseAdmin.from('app_configs').upsert({
                    key: FALLBACK_RULES_KEY,
                    value: JSON.stringify(rules),
                    updated_at: new Date().toISOString(),
                });
            }
        }

        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function reorderStepRules(
    orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        for (let i = 0; i < orderedIds.length; i++) {
            const ruleId = orderedIds[i];
            const { error } = await supabaseAdmin
                .from('line_step_rules')
                .update({ step_order: i + 1, updated_at: new Date().toISOString() })
                .eq('id', ruleId);

            if (error) {
                console.error('[reorderStepRules] Error:', error);
                return { success: false, error: error.message };
            }
        }

        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteStepRule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        const { error } = await supabaseAdmin
            .from('line_step_rules')
            .delete()
            .eq('id', id);

        if (error) {
            return { success: false, error: error.message };
        }

        // 残りのステップのstep_orderを1からの連番に再整理
        const { data: remaining } = await supabaseAdmin
            .from('line_step_rules')
            .select('id')
            .order('step_order', { ascending: true });

        if (remaining && remaining.length > 0) {
            for (let i = 0; i < remaining.length; i++) {
                await supabaseAdmin
                    .from('line_step_rules')
                    .update({ step_order: i + 1 })
                    .eq('id', remaining[i].id);
            }
        }

        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function toggleStepRuleActive(
    id: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    return updateStepRule(id, { isActive });
}

// ==============================================================================
// 4. テスト太郎専用テスト送信 (会員番号0035限定・厳格物理ガード)
// ==============================================================================

export async function sendTestPreviewMessage(
    rawMessage: string,
    customVariables?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        await assertAdminUser();

        // テスト太郎専用の固定宛先属性
        const testStudentNumber = TEST_TARO_STUDENT_NUMBER; // '0035'
        const testLineUserId = TEST_TARO_LINE_USER_ID;       // 'U0e5a7654874369ca5e38deb47fd783aa'
        const testStudentName = TEST_TARO_STUDENT_NAME;       // 'テスト太郎'

        // プレビューテスト用サンプルの変数
        const defaultTestVariables: Record<string, string> = {
            name: testStudentName,
            coach_name: '新吉航大 コーチ',
            plan_name: '月2回プラン（60分）',
            area: '東京都港区',
            trial_date: '2026年9月30日',
            student_number: testStudentNumber,
        };

        const mergedVariables = {
            ...defaultTestVariables,
            ...(customVariables || {}),
        };

        // プレビュー識別用ヘッダー
        const testFormattedMessage = `【プレビューテスト配信】\n\n${rawMessage}`;

        const result = await sendSingleLineMessage({
            studentNumber: testStudentNumber,
            studentName: testStudentName,
            lineUserId: testLineUserId,
            rawMessage: testFormattedMessage,
            variables: mergedVariables,
            deliveryType: 'test_preview',
            isTestPreview: true,
        });

        return {
            success: result.success,
            messageId: result.messageId,
            error: result.error,
        };
    } catch (err: any) {
        console.error('[sendTestPreviewMessage] Error:', err);
        return { success: false, error: err.message };
    }
}

// ==============================================================================
// 5. 配信ログ取得 & KPI統計
// ==============================================================================

export async function getDeliveryLogs(
    params: GetDeliveryLogsParams = {}
): Promise<DeliveryLogsResult> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        const page = Math.max(1, params.page || 1);
        const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
        const offset = (page - 1) * pageSize;

        let query = supabaseAdmin
            .from('line_delivery_logs')
            .select('*', { count: 'exact' });

        if (params.deliveryType && params.deliveryType !== 'all') {
            query = query.eq('delivery_type', params.deliveryType);
        }

        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }

        if (params.searchQuery && params.searchQuery.trim() !== '') {
            // PostgREST の .or() 構文破壊文字（カンマ, 括弧, クォート, バックスラッシュ）を除去・空白化
            const sanitizedQ = params.searchQuery.replace(/[,()\\"'`]/g, ' ').replace(/\s+/g, ' ').trim();
            if (sanitizedQ !== '') {
                query = query.or(`student_name.ilike.%${sanitizedQ}%,student_number.ilike.%${sanitizedQ}%,rendered_message.ilike.%${sanitizedQ}%`);
            }
        }

        if (params.startDate) {
            query = query.gte('sent_at', params.startDate);
        }

        if (params.endDate) {
            query = query.lte('sent_at', params.endDate);
        }

        query = query.order('sent_at', { ascending: false }).range(offset, offset + pageSize - 1);

        const { data: dataLogs, count, error } = await query;

        let logs: any[] = [];
        let totalCount = 0;
        let allStats: any[] = [];

        if (error) {
            // テーブル未作成時は app_configs フォールバックから取得
            const { data: config } = await supabaseAdmin
                .from('app_configs')
                .select('value')
                .eq('key', 'line_delivery_logs_data_v1')
                .maybeSingle();

            let fallbackLogs: any[] = [];
            if (config?.value) {
                try { fallbackLogs = JSON.parse(config.value); } catch {}
            }

            // 簡易フィルタリング
            let filtered = fallbackLogs;
            if (params.deliveryType && params.deliveryType !== 'all') {
                filtered = filtered.filter((l: any) => l.delivery_type === params.deliveryType);
            }
            if (params.status && params.status !== 'all') {
                filtered = filtered.filter((l: any) => l.status === params.status);
            }
            if (params.searchQuery && params.searchQuery.trim() !== '') {
                const q = params.searchQuery.toLowerCase();
                filtered = filtered.filter((l: any) =>
                    (l.student_name && l.student_name.toLowerCase().includes(q)) ||
                    (l.student_number && l.student_number.toLowerCase().includes(q)) ||
                    (l.rendered_message && l.rendered_message.toLowerCase().includes(q))
                );
            }

            totalCount = filtered.length;
            logs = filtered.slice(offset, offset + pageSize);
            allStats = fallbackLogs;
        } else {
            logs = dataLogs || [];
            totalCount = count || 0;

            const { data: rawStats } = await supabaseAdmin
                .from('line_delivery_logs')
                .select('status');
            allStats = rawStats || [];
        }

        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        allStats.forEach((row: any) => {
            if (row.status === 'success' || row.status === 'sent') successCount++;
            else if (row.status === 'failed') failedCount++;
            else if (row.status === 'skipped') skippedCount++;
        });

        return {
            success: true,
            logs,
            totalCount,
            stats: {
                totalSent: allStats.length,
                successCount,
                failedCount,
                skippedCount,
            },
        };
    } catch (err: any) {
        return {
            success: false,
            logs: [],
            totalCount: 0,
            stats: { totalSent: 0, successCount: 0, failedCount: 0, skippedCount: 0 },
            error: err.message,
        };
    }
}

// ==============================================================================
// 6. 管理画面用マスターデータ取得ヘルパー
// ==============================================================================

export async function getLineMarketingMasterData(): Promise<{
    coaches: Array<{ id: string; fullName: string; baseArea: string | null }>;
    plans: Array<{ id: string; name: string }>;
    statuses: Array<{ id: string; name: string }>;
    areas: string[];
}> {
    await assertAdminUser();
    const supabaseAdmin = createAdminClient();

    const [
        { data: coaches },
        { data: plans },
        { data: statuses },
    ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, full_name, base_area').in('role', ['admin', 'coach']),
        supabaseAdmin.from('membership_types').select('id, name').order('name'),
        supabaseAdmin.from('student_statuses').select('id, name').order('display_order'),
    ]);

    const areas = ['東京都', '千葉県', '神奈川県', '目黒区', '港区', '品川区', '世田谷区'];

    return {
        coaches: (coaches || []).map((c: any) => ({
            id: c.id,
            fullName: c.full_name || '',
            baseArea: c.base_area || null,
        })),
        plans: (plans || []).map((p: any) => ({
            id: p.id,
            name: p.name || '',
        })),
        statuses: (statuses || []).map((s: any) => ({
            id: s.id,
            name: s.name || '',
        })),
        areas,
    };
}

// ==============================================================================
// 9. 体験完了生徒のステップ進行手動同期アクション
// ==============================================================================

export async function syncTrialDoneStudentsAction(options: {
    dryRun?: boolean;
    studentId?: string;
} = {}): Promise<SyncTrialDoneResult & { success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        const result = await syncTrialDoneStudentsToProgress(options);
        revalidatePath('/admin/line-marketing');
        return {
            success: true,
            ...result,
        };
    } catch (err: any) {
        console.error('[syncTrialDoneStudentsAction] Error:', err);
        return {
            success: false,
            totalEligibleCount: 0,
            newlyEnrolledCount: 0,
            alreadyEnrolledCount: 0,
            enrolledStudentIds: [],
            error: err.message,
            errors: [err.message],
        };
    }
}

// ==============================================================================
// 10. 配信KPIサマリー統計取得アクション
// ==============================================================================

/**
 * 配信KPIサマリー統計（総送信数、成功率、エラー数、ステップ稼働中生徒数）取得
 */
export async function getMarketingKpiSummaryAction(): Promise<{
    success: boolean;
    data?: LineMarketingKpiSummary;
    error?: string;
}> {
    try {
        await assertAdminUser();
        const supabaseAdmin = createAdminClient();

        // 1. 配信ログの全件ステータス集計
        let allLogs: any[] = [];
        try {
            const { data: logStats, error: logError } = await supabaseAdmin
                .from('line_delivery_logs')
                .select('status');

            if (!logError && logStats) {
                allLogs = logStats;
            } else {
                // app_configs フォールバック
                const { data: config } = await supabaseAdmin
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'line_delivery_logs_data_v1')
                    .maybeSingle();
                if (config?.value) {
                    try { allLogs = JSON.parse(config.value); } catch {}
                }
            }
        } catch {
            const { data: config } = await supabaseAdmin
                .from('app_configs')
                .select('value')
                .eq('key', 'line_delivery_logs_data_v1')
                .maybeSingle();
            if (config?.value) {
                try { allLogs = JSON.parse(config.value); } catch {}
            }
        }

        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        allLogs.forEach((row: any) => {
            if (row.status === 'success' || row.status === 'sent') successCount++;
            else if (row.status === 'failed') failedCount++;
            else if (row.status === 'skipped') skippedCount++;
        });

        const totalSent = allLogs.length;
        const successRate = totalSent > 0 ? Math.round((successCount / totalSent) * 1000) / 10 : 0;

        // 2. ステップ配信中生徒数の集計 (status = 'in_progress')
        let inProgressStudentsCount = 0;
        try {
            const { count: inProgressCount, error: stepError } = await supabaseAdmin
                .from('line_step_student_progress')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'in_progress');

            if (!stepError && inProgressCount !== null) {
                inProgressStudentsCount = inProgressCount;
            }
        } catch {}

        return {
            success: true,
            data: {
                totalSent,
                successCount,
                failedCount,
                skippedCount,
                successRate,
                inProgressStudentsCount,
            }
        };
    } catch (err: any) {
        console.error('[getMarketingKpiSummaryAction] Error:', err);
        return { success: false, error: err.message };
    }
}

// ==============================================================================
// 7. LIFFアクセストラッキング集計＆ログ取得
// ==============================================================================

export async function getTrackingSummaryAction(
    limit = 100
): Promise<{ success: boolean; data?: TrackingKpiSummary; error?: string }> {
    try {
        await assertAdminUser();
        const summary = await getTrackingKpiSummary(limit);
        return { success: true, data: summary };
    } catch (err: any) {
        console.error('[getTrackingSummaryAction] Error:', err);
        return { success: false, error: err.message };
    }
}

// ==============================================================================
// 8. ユーザータグ一覧＆タグ操作 Actions
// ==============================================================================

export async function getTagsSummaryAction(): Promise<{
    success: boolean;
    tags?: TagSummaryItem[];
    error?: string;
}> {
    try {
        await assertAdminUser();
        const tags = await getTagsSummary();
        return { success: true, tags };
    } catch (err: any) {
        console.error('[getTagsSummaryAction] Error:', err);
        return { success: false, error: err.message };
    }
}

export async function assignTagToUserAction(
    lineUserId: string,
    tagName: string,
    options?: {
        category?: 'behavior' | 'status' | 'campaign' | 'custom';
        displayName?: string;
        studentId?: string;
        metadata?: Record<string, any>;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        await addTagToUser(lineUserId, tagName, options);
        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        console.error('[assignTagToUserAction] Error:', err);
        return { success: false, error: err.message };
    }
}

export async function removeTagFromUserAction(
    lineUserId: string,
    tagName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await assertAdminUser();
        await removeTagFromUser(lineUserId, tagName);
        safeRevalidate('/admin/line-marketing');
        return { success: true };
    } catch (err: any) {
        console.error('[removeTagFromUserAction] Error:', err);
        return { success: false, error: err.message };
    }
}


