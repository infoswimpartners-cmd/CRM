/**
 * Lステップ風 1対1個別トーク・チャット管理サービス層
 * 
 * 責務:
 *   1. ユーザーからの受信メッセージ（Webhook）および管理者からの個別返信・自動配信のチャット履歴永続化
 *   2. DBテーブル (line_chat_messages) と app_configs (line_chat_history:*, line_chat_threads_index_v1) のハイブリッド永続化
 *   3. 既存の配信ログ (line_delivery_logs) および監視ログ (line_monitoring_logs) との時系列統合マージ
 *   4. 未読数カウント・要対応フラグ管理・顧客カルテ（ステータス・メモ・ステップ停止）更新
 *   5. 会員番号0035（テスト太郎）の物理セキュリティガード統合
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
    LineChatMessage,
    LineChatThreadUser,
    SendDirectChatParams,
    UpdateChatUserProfileParams,
    SendMessageResult,
} from '@/types/line-marketing';
import {
    sendSingleLineMessage,
    renderLineMessage,
    fetchAndFilterMarketingStudents,
    assertTestPreviewSecurityGuard,
    TEST_TARO_LINE_USER_ID,
    TEST_TARO_STUDENT_NUMBER,
    TEST_TARO_STUDENT_NAME,
    TEST_TARO_STUDENT_ID,
} from '@/lib/line-marketing-service';
import { getAllUserTagsMap, getAllUserTags } from '@/lib/line-tracking-service';
import { getStepLeadState, saveStepLeadState, StepLeadState } from '@/lib/line-step-reminders';

const THREAD_INDEX_CONFIG_KEY = 'line_chat_threads_index_v1';
const CHAT_HISTORY_PREFIX = 'line_chat_history:';
const MAX_HISTORY_PER_USER = 200;

export interface ChatThreadIndexEntry {
    lineUserId: string;
    displayName?: string | null;
    lastMessageText: string | null;
    lastMessageAt: string | null;
    lastMessageDirection: 'inbound' | 'outbound' | null;
    unreadCount: number;
    needsReply: boolean;
    customNotes?: string | null;
    customStatus?: string | null;
    updatedAt: string;
}

export const STATUS_DISPLAY_LABELS: Record<string, string> = {
    friend_only: 'LINE友だち(未申込)',
    inquired: '問い合わせ・相談中',
    applied: '体験申込済',
    trial_pending: '体験日程調整中',
    trial_confirmed: '体験確定',
    trial_done: '体験受講済',
    active: '本会員(受講中)',
    resting: '休会中',
    withdrawn: '退会済',
};

// ==============================================================================
// 1. スレッドインデックス (line_chat_threads_index_v1) 読み書きヘルパー
// ==============================================================================

async function getThreadIndexMap(): Promise<Record<string, ChatThreadIndexEntry>> {
    try {
        const supabase = createAdminClient();
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', THREAD_INDEX_CONFIG_KEY)
            .maybeSingle();

        if (data?.value) {
            return JSON.parse(data.value) as Record<string, ChatThreadIndexEntry>;
        }
    } catch (e) {
        console.warn('[LineChatService] Failed to read thread index:', e);
    }
    return {};
}

async function saveThreadIndexMap(indexMap: Record<string, ChatThreadIndexEntry>): Promise<void> {
    try {
        const supabase = createAdminClient();
        await supabase.from('app_configs').upsert({
            key: THREAD_INDEX_CONFIG_KEY,
            value: JSON.stringify(indexMap),
            description: 'Lステップ風1対1チャット スレッドインデックス・未読管理',
            updated_at: new Date().toISOString(),
        });
    } catch (e) {
        console.warn('[LineChatService] Failed to save thread index:', e);
    }
}

// ==============================================================================
// 2. チャットメッセージの永続保存 (DBテーブル + app_configs ハイブリッド)
// ==============================================================================

export async function recordLineChatMessage(params: {
    lineUserId: string;
    studentId?: string | null;
    displayName?: string | null;
    direction: 'inbound' | 'outbound';
    senderType?: 'user' | 'admin' | 'system_auto' | 'coach';
    messageType?: LineChatMessage['message_type'];
    messageText: string;
    senderLabel?: string | null;
    isRead?: boolean;
    status?: LineChatMessage['status'];
    metadata?: Record<string, any>;
    createdAt?: string;
}): Promise<LineChatMessage | null> {
    if (!params.lineUserId || !params.messageText) return null;

    const supabase = createAdminClient();
    const nowIso = params.createdAt || new Date().toISOString();
    const msgId = crypto.randomUUID();
    const isInbound = params.direction === 'inbound';

    const defaultSenderLabel = isInbound
        ? (params.displayName || 'ユーザー')
        : params.messageType === 'direct_chat'
            ? '事務局（個別返信）'
            : params.messageType === 'broadcast'
                ? '一括配信'
                : params.messageType === 'step_message'
                    ? 'ステップ配信'
                    : params.messageType === 'cart_recovery'
                        ? 'カゴ落ちフォロー'
                        : params.messageType === 'test_preview'
                            ? 'テスト送信'
                            : 'システム配信';

    const messageRecord: LineChatMessage = {
        id: msgId,
        created_at: nowIso,
        line_user_id: params.lineUserId,
        student_id: params.studentId || null,
        display_name: params.displayName || null,
        direction: params.direction,
        sender_type: params.senderType || (isInbound ? 'user' : 'admin'),
        message_type: params.messageType || (isInbound ? 'text' : 'direct_chat'),
        message_text: params.messageText,
        sender_label: params.senderLabel || defaultSenderLabel,
        is_read: params.isRead !== undefined ? params.isRead : !isInbound,
        status: params.status || (isInbound ? 'received' : 'sent'),
        metadata: params.metadata || {},
    };

    // 1. DBテーブル (line_chat_messages) への挿入試行
    try {
        await supabase.from('line_chat_messages').insert({
            id: messageRecord.id,
            created_at: messageRecord.created_at,
            line_user_id: messageRecord.line_user_id,
            student_id: messageRecord.student_id,
            display_name: messageRecord.display_name,
            direction: messageRecord.direction,
            sender_type: messageRecord.sender_type,
            message_type: messageRecord.message_type,
            message_text: messageRecord.message_text,
            sender_label: messageRecord.sender_label,
            is_read: messageRecord.is_read,
            status: messageRecord.status,
            metadata: messageRecord.metadata,
        });
    } catch {
        // テーブル未作成環境でもエラーにせず続行
    }

    // 2. app_configs のユーザー別履歴 (line_chat_history:{lineUserId}) に保存
    try {
        const historyKey = `${CHAT_HISTORY_PREFIX}${params.lineUserId}`;
        const { data: existingCfg } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', historyKey)
            .maybeSingle();

        let historyList: LineChatMessage[] = [];
        if (existingCfg?.value) {
            try {
                historyList = JSON.parse(existingCfg.value);
            } catch {}
        }

        historyList.push(messageRecord);
        if (historyList.length > MAX_HISTORY_PER_USER) {
            historyList = historyList.slice(historyList.length - MAX_HISTORY_PER_USER);
        }

        await supabase.from('app_configs').upsert({
            key: historyKey,
            value: JSON.stringify(historyList),
            description: `LINE個別チャット履歴: ${params.displayName || params.lineUserId}`,
            updated_at: nowIso,
        });
    } catch (e) {
        console.warn('[LineChatService] Failed to save user chat history config:', e);
    }

    // 3. スレッドインデックス (line_chat_threads_index_v1) の更新
    try {
        const indexMap = await getThreadIndexMap();
        const prev = indexMap[params.lineUserId];

        const nextUnreadCount = isInbound
            ? (prev?.unreadCount || 0) + (messageRecord.is_read ? 0 : 1)
            : params.senderType === 'admin'
                ? 0
                : (prev?.unreadCount || 0);

        const nextNeedsReply = isInbound
            ? true
            : params.senderType === 'admin'
                ? false
                : (prev?.needsReply || false);

        indexMap[params.lineUserId] = {
            lineUserId: params.lineUserId,
            displayName: params.displayName || prev?.displayName || null,
            lastMessageText: params.messageText,
            lastMessageAt: nowIso,
            lastMessageDirection: params.direction,
            unreadCount: nextUnreadCount,
            needsReply: nextNeedsReply,
            customNotes: prev?.customNotes ?? null,
            customStatus: prev?.customStatus ?? null,
            updatedAt: nowIso,
        };

        await saveThreadIndexMap(indexMap);
    } catch (e) {
        console.warn('[LineChatService] Failed to update thread index:', e);
    }

    return messageRecord;
}

// ==============================================================================
// 3. 1対1チャット対象ユーザー（スレッド一覧）の取得
// ==============================================================================

function resolveLatestMessageInfo(
    idxEntry?: ChatThreadIndexEntry,
    fbLatest?: {
        text: string;
        at: string;
        direction: 'inbound' | 'outbound';
    }
): {
    lastMessageText: string | null;
    lastMessageAt: string | null;
    lastMessageDirection: 'inbound' | 'outbound' | null;
} {
    let lastMessageText = idxEntry?.lastMessageText || null;
    let lastMessageAt = idxEntry?.lastMessageAt || null;
    let lastMessageDirection = idxEntry?.lastMessageDirection || null;

    if (fbLatest && (!lastMessageText || !lastMessageAt || new Date(fbLatest.at) > new Date(lastMessageAt))) {
        lastMessageText = fbLatest.text;
        lastMessageAt = fbLatest.at;
        lastMessageDirection = fbLatest.direction;
    }

    return {
        lastMessageText,
        lastMessageAt,
        lastMessageDirection,
    };
}

export async function getLineChatThreads(options: {
    searchQuery?: string;
    filterMode?: 'all' | 'unread' | 'needs_reply' | 'leads' | 'students';
    statusFilter?: string;
    tagFilter?: string;
} = {}): Promise<{
    threads: LineChatThreadUser[];
    totalUnreadCount: number;
    totalNeedsReplyCount: number;
}> {
    const supabase = createAdminClient();

    // 1. 各種データソースを並列取得
    const [
        marketingStudents,
        { data: rawStudents },
        { data: rawLeads },
        { data: stepConfigs },
        { data: statusMasters },
        userTagsMap,
        allUserTagRecords,
        threadIndexMap,
        { data: recentDeliveryLogs },
        { data: fallbackDeliveryCfg },
        { data: recentMonitoringLogs },
    ] = await Promise.all([
        fetchAndFilterMarketingStudents({ lineLinkedOnly: true }),
        supabase
            .from('students')
            .select('id, student_number, full_name, full_name_kana, status, line_user_id, notes, created_at')
            .not('line_user_id', 'is', null),
        supabase
            .from('leads')
            .select('id, name, name_kana, line_user_id, status, area, lesson_location, confirmed_location, notes, created_at')
            .not('line_user_id', 'is', null),
        supabase
            .from('app_configs')
            .select('key, value, updated_at')
            .like('key', 'line_step:%'),
        supabase
            .from('student_statuses')
            .select('id, name'),
        getAllUserTagsMap(),
        getAllUserTags(),
        getThreadIndexMap(),
        supabase
            .from('line_delivery_logs')
            .select('line_user_id, rendered_message, message_body, sent_at, created_at, status')
            .in('status', ['success', 'sent'])
            .order('sent_at', { ascending: false })
            .limit(300)
            .then(r => r, () => ({ data: null })),
        supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'line_delivery_logs_data_v1')
            .maybeSingle(),
        supabase
            .from('line_monitoring_logs')
            .select('line_user_id, line_display_name, message_text, direction, status, detected_at, coach_id, coach:profiles!coach_id(id, full_name, base_area)')
            .order('detected_at', { ascending: false })
            .limit(200)
            .then(r => r, () => ({ data: null })),
    ]);

    const statusLabelMap = new Map<string, string>(Object.entries(STATUS_DISPLAY_LABELS));
    for (const sm of statusMasters || []) {
        if (sm.id && sm.name) {
            statusLabelMap.set(sm.id, sm.name);
        }
    }

    // 生徒詳細マップ (line_user_id -> raw student)
    const rawStudentByLineId = new Map<string, any>();
    for (const s of rawStudents || []) {
        if (s.line_user_id && s.line_user_id.trim()) {
            rawStudentByLineId.set(s.line_user_id.trim(), s);
        }
    }

    // リード詳細マップ (line_user_id -> raw lead)
    const rawLeadByLineId = new Map<string, any>();
    for (const l of rawLeads || []) {
        const lid = l.line_user_id?.trim();
        if (lid && /^U[0-9a-f]{32}$/i.test(lid)) {
            if (!rawLeadByLineId.has(lid)) {
                rawLeadByLineId.set(lid, l);
            }
        }
    }

    // タグレコード表示名マップ (line_user_id -> display_name)
    const tagDisplayNameByLineId = new Map<string, string>();
    for (const tr of allUserTagRecords || []) {
        const lid = tr.line_user_id?.trim();
        if (lid && /^U[0-9a-f]{32}$/i.test(lid) && tr.display_name && !tagDisplayNameByLineId.has(lid)) {
            tagDisplayNameByLineId.set(lid, tr.display_name);
        }
    }

    // ステップ配信リード状態マップ (line_user_id -> StepLeadState)
    const stepLeadByLineId = new Map<string, StepLeadState>();
    for (const cfg of stepConfigs || []) {
        try {
            const parsed = JSON.parse(cfg.value) as StepLeadState;
            if (parsed?.line_user_id) {
                stepLeadByLineId.set(parsed.line_user_id.trim(), parsed);
            }
        } catch {}
    }

    // 過去の配信ログ・監視ログから各ユーザーの最新メッセージを補完するマップ
    const fallbackLatestMsgMap = new Map<string, {
        text: string;
        at: string;
        direction: 'inbound' | 'outbound';
        isUnreadMonitoring?: boolean;
        displayName?: string | null;
        coachId?: string | null;
        coachName?: string | null;
        coachBaseArea?: string | null;
    }>();

    // A. 配信ログ (outbound)
    let allDeliveryLogs: any[] = [...(recentDeliveryLogs || [])];
    if (fallbackDeliveryCfg?.value) {
        try {
            const fbLogs = JSON.parse(fallbackDeliveryCfg.value);
            if (Array.isArray(fbLogs)) {
                allDeliveryLogs = [...allDeliveryLogs, ...fbLogs];
            }
        } catch {}
    }

    for (const log of allDeliveryLogs) {
        const lid = log.line_user_id?.trim();
        if (!lid) continue;
        const at = log.sent_at || log.created_at;
        const text = log.rendered_message || log.message_body || '';
        if (!text || !at) continue;

        const existing = fallbackLatestMsgMap.get(lid);
        if (!existing || new Date(at) > new Date(existing.at)) {
            fallbackLatestMsgMap.set(lid, {
                text,
                at,
                direction: 'outbound',
                displayName: existing?.displayName || log.student_name || null,
                coachId: existing?.coachId || null,
                coachName: existing?.coachName || null,
                coachBaseArea: existing?.coachBaseArea || null,
            });
        }
    }

    // B. 監視ログ (inbound / outbound)
    for (const mlog of recentMonitoringLogs || []) {
        const lid = mlog.line_user_id?.trim();
        if (!lid) continue;
        const at = mlog.detected_at;
        const rawText = mlog.message_text || '';
        // 複数行マージされている場合は最後の行をプレビューに使う
        const lines = rawText.split('\n').filter(Boolean);
        const lastLine = (lines[lines.length - 1] || rawText).replace(/^\((顧客|コーチ)\):\s*/, '');
        const dir: 'inbound' | 'outbound' = mlog.direction === 'coach_to_customer' ? 'outbound' : 'inbound';
        const coachObj = Array.isArray((mlog as any).coach) ? (mlog as any).coach[0] : (mlog as any).coach;

        const existing = fallbackLatestMsgMap.get(lid);
        if (!existing || new Date(at) > new Date(existing.at)) {
            fallbackLatestMsgMap.set(lid, {
                text: lastLine,
                at,
                direction: dir,
                isUnreadMonitoring: mlog.status === 'unread' && dir === 'inbound',
                displayName: mlog.line_display_name || existing?.displayName || null,
                coachId: mlog.coach_id || existing?.coachId || null,
                coachName: coachObj?.full_name || existing?.coachName || null,
                coachBaseArea: coachObj?.base_area || existing?.coachBaseArea || null,
            });
        } else if (mlog.coach_id && !existing.coachId) {
            existing.coachId = mlog.coach_id;
            existing.coachName = coachObj?.full_name || null;
            existing.coachBaseArea = coachObj?.base_area || null;
        }
    }

    // 2. 全ユニーク lineUserId を集約して LineChatThreadUser を構築
    const threadMap = new Map<string, LineChatThreadUser>();

    // (1) fetchAndFilterMarketingStudents の生徒を登録
    for (const ms of marketingStudents) {
        const lid = ms.lineUserId?.trim();
        if (!lid) continue;

        const rawStudent = rawStudentByLineId.get(lid);
        const stepState = stepLeadByLineId.get(lid);
        const idxEntry = threadIndexMap[lid];
        const fbLatest = fallbackLatestMsgMap.get(lid);

        const { lastMessageText, lastMessageAt, lastMessageDirection } = resolveLatestMessageInfo(idxEntry, fbLatest);

        const effectiveStatus = idxEntry?.customStatus || ms.status || stepState?.status || 'friend_only';
        const unreadCount = idxEntry
            ? idxEntry.unreadCount
            : (fbLatest?.isUnreadMonitoring ? 1 : 0);

        const needsReply = idxEntry
            ? idxEntry.needsReply
            : (effectiveStatus === 'inquired' || unreadCount > 0);

        const tags = Array.from(new Set([
            ...(ms.tags || []),
            ...(userTagsMap.get(lid) || []),
        ]));

        threadMap.set(lid, {
            lineUserId: lid,
            studentId: ms.id,
            studentNumber: ms.studentNumber || null,
            fullName: ms.fullName || idxEntry?.displayName || stepState?.display_name || '名前未設定',
            lineDisplayName: stepState?.display_name || idxEntry?.displayName || fbLatest?.displayName || tagDisplayNameByLineId.get(lid) || null,
            fullNameKana: ms.fullNameKana || null,
            status: effectiveStatus,
            statusLabel: statusLabelMap.get(effectiveStatus) || STATUS_DISPLAY_LABELS[effectiveStatus] || effectiveStatus,
            area: ms.area || '東京都',
            coachId: ms.coachId || fbLatest?.coachId || null,
            coachName: ms.coachName || fbLatest?.coachName || null,
            planName: ms.planName || null,
            trialDate: ms.trialDate || null,
            tags,
            notes: idxEntry?.customNotes ?? rawStudent?.notes ?? stepState?.notes ?? null,
            lastMessageText,
            lastMessageAt: lastMessageAt || stepState?.followed_at || rawStudent?.created_at || null,
            lastMessageDirection,
            unreadCount,
            needsReply,
            isBlocked: stepState?.is_blocked || false,
            stepStage: stepState?.step_stage ?? null,
            followedAt: stepState?.followed_at || rawStudent?.created_at || null,
        });
    }

    // (2) stepLeadByLineId（公式LINE友だち追加リードで students に未登録のユーザー）を補完
    for (const [lid, stepState] of stepLeadByLineId.entries()) {
        if (threadMap.has(lid)) continue;

        const rawStudent = rawStudentByLineId.get(lid);
        const rawLead = rawLeadByLineId.get(lid);
        const idxEntry = threadIndexMap[lid];
        const fbLatest = fallbackLatestMsgMap.get(lid);

        const { lastMessageText, lastMessageAt, lastMessageDirection } = resolveLatestMessageInfo(idxEntry, fbLatest);

        const effectiveStatus = idxEntry?.customStatus || rawStudent?.status || stepState.status || 'friend_only';
        const unreadCount = idxEntry ? idxEntry.unreadCount : (fbLatest?.isUnreadMonitoring ? 1 : 0);
        const needsReply = idxEntry ? idxEntry.needsReply : (effectiveStatus === 'inquired' || unreadCount > 0);
        const tags = Array.from(new Set([
            ...(userTagsMap.get(lid) || []),
            ...(effectiveStatus === 'friend_only' ? ['friend_only'] : []),
        ]));

        const leadArea = [rawLead?.area, rawLead?.lesson_location, rawLead?.confirmed_location].filter(Boolean).join(' ').trim();

        threadMap.set(lid, {
            lineUserId: lid,
            studentId: rawStudent?.id || null,
            studentNumber: rawStudent?.student_number || null,
            fullName: idxEntry?.displayName || rawStudent?.full_name || rawLead?.name || stepState.display_name || tagDisplayNameByLineId.get(lid) || '公式LINE友だち',
            lineDisplayName: stepState.display_name || idxEntry?.displayName || fbLatest?.displayName || tagDisplayNameByLineId.get(lid) || null,
            fullNameKana: rawStudent?.full_name_kana || rawLead?.name_kana || null,
            status: effectiveStatus,
            statusLabel: statusLabelMap.get(effectiveStatus) || STATUS_DISPLAY_LABELS[effectiveStatus] || effectiveStatus,
            area: leadArea || '未設定',
            coachId: fbLatest?.coachId || null,
            coachName: fbLatest?.coachName || null,
            planName: null,
            trialDate: null,
            tags,
            notes: idxEntry?.customNotes ?? rawStudent?.notes ?? stepState.notes ?? rawLead?.notes ?? null,
            lastMessageText,
            lastMessageAt: lastMessageAt || stepState.followed_at || null,
            lastMessageDirection,
            unreadCount,
            needsReply,
            isBlocked: stepState.is_blocked || false,
            stepStage: stepState.step_stage ?? null,
            followedAt: stepState.followed_at || null,
        });
    }

    // (3) threadIndexMap、fallbackLatestMsgMap、leads、userTags に存在する LINE User ID も補完
    const remainingIds = new Set<string>([
        ...Object.keys(threadIndexMap),
        ...fallbackLatestMsgMap.keys(),
        ...rawLeadByLineId.keys(),
        ...Array.from(userTagsMap.keys()).filter(id => /^U[0-9a-f]{32}$/i.test(id.trim())),
    ]);

    for (const lid of remainingIds) {
        if (!lid || threadMap.has(lid)) continue;
        const idxEntry = threadIndexMap[lid];
        const fbLatest = fallbackLatestMsgMap.get(lid);
        const rawStudent = rawStudentByLineId.get(lid);
        const rawLead = rawLeadByLineId.get(lid);

        const { lastMessageText, lastMessageAt, lastMessageDirection } = resolveLatestMessageInfo(idxEntry, fbLatest);

        // コーチ監視ログ由来のユーザー（coachIdあり）は既存受講生（active）、leads由来は体験申込済（applied）、それ以外は友だち追加（friend_only）
        const defaultStatus = rawStudent?.status
            || (rawLead ? 'applied' : (fbLatest?.coachId ? 'active' : 'friend_only'));
        const effectiveStatus = idxEntry?.customStatus || defaultStatus;
        const unreadCount = idxEntry ? idxEntry.unreadCount : (fbLatest?.isUnreadMonitoring ? 1 : 0);
        const needsReply = idxEntry ? idxEntry.needsReply : (unreadCount > 0);

        const leadArea = [rawLead?.area, rawLead?.lesson_location, rawLead?.confirmed_location].filter(Boolean).join(' ').trim();
        let resolvedArea = leadArea || '未設定';
        if (resolvedArea === '未設定' && fbLatest?.coachBaseArea) {
            if (fbLatest.coachBaseArea.includes('東京')) resolvedArea = '東京都';
            else if (fbLatest.coachBaseArea.includes('神奈川') || fbLatest.coachBaseArea.includes('横浜') || fbLatest.coachBaseArea.includes('川崎')) resolvedArea = '神奈川県';
            else if (fbLatest.coachBaseArea.includes('千葉')) resolvedArea = '千葉県';
            else if (fbLatest.coachBaseArea.includes('埼玉')) resolvedArea = '埼玉県';
            else resolvedArea = fbLatest.coachBaseArea;
        }

        const displayNameCandidate = idxEntry?.displayName || fbLatest?.displayName || tagDisplayNameByLineId.get(lid) || null;

        threadMap.set(lid, {
            lineUserId: lid,
            studentId: rawStudent?.id || null,
            studentNumber: rawStudent?.student_number || null,
            fullName: idxEntry?.displayName || rawStudent?.full_name || rawLead?.name || displayNameCandidate || 'LINEユーザー',
            lineDisplayName: displayNameCandidate,
            fullNameKana: rawStudent?.full_name_kana || rawLead?.name_kana || null,
            status: effectiveStatus,
            statusLabel: statusLabelMap.get(effectiveStatus) || STATUS_DISPLAY_LABELS[effectiveStatus] || effectiveStatus,
            area: resolvedArea,
            coachId: fbLatest?.coachId || null,
            coachName: fbLatest?.coachName || null,
            planName: null,
            trialDate: null,
            tags: userTagsMap.get(lid) || [],
            notes: idxEntry?.customNotes ?? rawStudent?.notes ?? rawLead?.notes ?? null,
            lastMessageText,
            lastMessageAt,
            lastMessageDirection,
            unreadCount,
            needsReply,
            isBlocked: false,
            stepStage: null,
            followedAt: rawStudent?.created_at || rawLead?.created_at || lastMessageAt || null,
        });
    }

    // (4) テスト太郎（会員番号0035）が万が一含まれていない場合は安全テスト用に必ず補完
    if (!threadMap.has(TEST_TARO_LINE_USER_ID)) {
        const idxEntry = threadIndexMap[TEST_TARO_LINE_USER_ID];
        const fbLatest = fallbackLatestMsgMap.get(TEST_TARO_LINE_USER_ID);
        const { lastMessageText, lastMessageAt, lastMessageDirection } = resolveLatestMessageInfo(idxEntry, fbLatest);
        threadMap.set(TEST_TARO_LINE_USER_ID, {
            lineUserId: TEST_TARO_LINE_USER_ID,
            studentId: TEST_TARO_STUDENT_ID,
            studentNumber: TEST_TARO_STUDENT_NUMBER,
            fullName: TEST_TARO_STUDENT_NAME,
            lineDisplayName: TEST_TARO_STUDENT_NAME,
            fullNameKana: 'テストタロウ',
            status: idxEntry?.customStatus || 'trial_done',
            statusLabel: statusLabelMap.get(idxEntry?.customStatus || 'trial_done') || '体験受講済',
            area: '東京都 (港区)',
            coachId: null,
            coachName: '新吉航大',
            planName: '月2回プラン（60分）',
            trialDate: null,
            tags: userTagsMap.get(TEST_TARO_LINE_USER_ID) || ['trial_done'],
            notes: idxEntry?.customNotes || 'テスト送信専用アカウント（会員番号0035）',
            lastMessageText,
            lastMessageAt: lastMessageAt || new Date().toISOString(),
            lastMessageDirection,
            unreadCount: idxEntry?.unreadCount || 0,
            needsReply: idxEntry?.needsReply || false,
            isBlocked: false,
            stepStage: -1,
            followedAt: null,
        });
    }

    const allThreads = Array.from(threadMap.values());

    // 全体集計（フィルタ適用前の未読・要対応カウント）
    const totalUnreadCount = allThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
    const totalNeedsReplyCount = allThreads.filter(t => t.needsReply || t.unreadCount > 0 || t.status === 'inquired').length;

    // 3. フィルタリング適用
    let filtered = allThreads;

    if (options.filterMode === 'unread') {
        filtered = filtered.filter(t => t.unreadCount > 0);
    } else if (options.filterMode === 'needs_reply') {
        filtered = filtered.filter(t => t.needsReply || t.unreadCount > 0 || t.status === 'inquired');
    } else if (options.filterMode === 'leads') {
        filtered = filtered.filter(t => t.status === 'friend_only' || t.status === 'inquired');
    } else if (options.filterMode === 'students') {
        filtered = filtered.filter(t => t.status !== 'friend_only' && t.status !== 'inquired');
    }

    if (options.statusFilter && options.statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === options.statusFilter);
    }

    if (options.tagFilter && options.tagFilter !== 'all') {
        filtered = filtered.filter(t => t.tags.includes(options.tagFilter!));
    }

    if (options.searchQuery && options.searchQuery.trim() !== '') {
        const q = options.searchQuery.trim().toLowerCase();
        filtered = filtered.filter(t =>
            t.fullName.toLowerCase().includes(q) ||
            (t.lineDisplayName && t.lineDisplayName.toLowerCase().includes(q)) ||
            (t.fullNameKana && t.fullNameKana.toLowerCase().includes(q)) ||
            (t.studentNumber && t.studentNumber.toLowerCase().includes(q)) ||
            (t.area && t.area.toLowerCase().includes(q)) ||
            (t.lastMessageText && t.lastMessageText.toLowerCase().includes(q)) ||
            t.lineUserId.toLowerCase().includes(q)
        );
    }

    // 4. ソート: 未読あり -> 要対応 -> 最新メッセージ日時降順
    filtered.sort((a, b) => {
        // 1. 未読があるものを最優先
        if ((a.unreadCount > 0) !== (b.unreadCount > 0)) {
            return a.unreadCount > 0 ? -1 : 1;
        }
        // 2. 要対応フラグがあるものを次点優先
        if (a.needsReply !== b.needsReply) {
            return a.needsReply ? -1 : 1;
        }
        // 3. 最新メッセージ日時または友だち追加日時の新しい順
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        if (timeA !== timeB) {
            return timeB - timeA;
        }
        return a.fullName.localeCompare(b.fullName, 'ja');
    });

    return {
        threads: filtered,
        totalUnreadCount,
        totalNeedsReplyCount,
    };
}

// ==============================================================================
// 4. 選択ユーザーの時系列チャット履歴取得 (DB + app_configs + 既存配信/監視ログ統合)
// ==============================================================================

export async function getLineChatHistory(lineUserId: string): Promise<LineChatMessage[]> {
    if (!lineUserId) return [];
    const supabase = createAdminClient();
    const cleanLineId = lineUserId.trim();

    const [
        dbChatRes,
        cfgHistoryRes,
        deliveryLogsRes,
        fallbackDeliveryCfgRes,
        monitoringLogsRes,
    ] = await Promise.all([
        // 1. line_chat_messages テーブル
        supabase
            .from('line_chat_messages')
            .select('*')
            .eq('line_user_id', cleanLineId)
            .order('created_at', { ascending: true })
            .limit(200)
            .then(r => r, () => ({ data: null, error: true })),
        // 2. app_configs: line_chat_history:{lineUserId}
        supabase
            .from('app_configs')
            .select('value')
            .eq('key', `${CHAT_HISTORY_PREFIX}${cleanLineId}`)
            .maybeSingle(),
        // 3. line_delivery_logs (過去の自動/一括/テスト送信履歴)
        supabase
            .from('line_delivery_logs')
            .select('*')
            .eq('line_user_id', cleanLineId)
            .in('status', ['success', 'sent', 'failed'])
            .order('sent_at', { ascending: true })
            .limit(100)
            .then(r => r, () => ({ data: null, error: true })),
        // 4. app_configs: line_delivery_logs_data_v1 (フォールバック配信ログ)
        supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'line_delivery_logs_data_v1')
            .maybeSingle(),
        // 5. line_monitoring_logs (過去の受信監視ログ)
        supabase
            .from('line_monitoring_logs')
            .select('*')
            .eq('line_user_id', cleanLineId)
            .order('detected_at', { ascending: true })
            .limit(100)
            .then(r => r, () => ({ data: null, error: true })),
    ]);

    const mergedById = new Map<string, LineChatMessage>();

    // A. app_configs の個別チャット履歴を登録
    if (cfgHistoryRes.data?.value) {
        try {
            const list = JSON.parse(cfgHistoryRes.data.value) as LineChatMessage[];
            for (const item of list) {
                if (item && item.id && item.message_text) {
                    mergedById.set(item.id, item);
                }
            }
        } catch {}
    }

    // B. DBテーブル line_chat_messages の履歴をマージ
    if (dbChatRes.data && Array.isArray(dbChatRes.data)) {
        for (const row of dbChatRes.data) {
            if (row && row.id && row.message_text) {
                mergedById.set(row.id, {
                    id: row.id,
                    created_at: row.created_at,
                    line_user_id: row.line_user_id,
                    student_id: row.student_id,
                    display_name: row.display_name,
                    direction: row.direction,
                    sender_type: row.sender_type,
                    message_type: row.message_type,
                    message_text: row.message_text,
                    sender_label: row.sender_label,
                    is_read: row.is_read,
                    status: row.status,
                    metadata: row.metadata || {},
                });
            }
        }
    }

    const primaryMessages = Array.from(mergedById.values());

    // 重複判定ヘルパー: 同じ方向・同じ本文でタイムスタンプが60秒以内のものが既にあればスキップ
    const isDuplicateMessage = (direction: 'inbound' | 'outbound', text: string, timestampIso: string): boolean => {
        const targetTime = new Date(timestampIso).getTime();
        const normalizedText = text.trim();
        return primaryMessages.some(m => {
            if (m.direction !== direction) return false;
            if (m.message_text.trim() !== normalizedText) return false;
            const diffMs = Math.abs(new Date(m.created_at).getTime() - targetTime);
            return diffMs <= 60 * 1000;
        });
    };

    // C. line_delivery_logs (およびフォールバック) から過去送信履歴を統合
    let deliveryRows: any[] = [];
    if (deliveryLogsRes.data && Array.isArray(deliveryLogsRes.data)) {
        deliveryRows = [...deliveryLogsRes.data];
    }
    if (fallbackDeliveryCfgRes.data?.value) {
        try {
            const fbLogs = JSON.parse(fallbackDeliveryCfgRes.data.value);
            if (Array.isArray(fbLogs)) {
                const userFbLogs = fbLogs.filter((l: any) => l.line_user_id === cleanLineId);
                deliveryRows = [...deliveryRows, ...userFbLogs];
            }
        } catch {}
    }

    for (const dlog of deliveryRows) {
        if (dlog.status === 'skipped') continue;
        const text = dlog.rendered_message || dlog.message_body || '';
        const sentAt = dlog.sent_at || dlog.created_at;
        if (!text || !sentAt) continue;

        if (isDuplicateMessage('outbound', text, sentAt)) continue;

        const isDirectChat = dlog.delivery_type === 'direct_chat' || dlog.step_name === '個別トーク（1対1チャット）' || dlog.step_name === '個別トーク返信';
        const msgType: LineChatMessage['message_type'] = isDirectChat
            ? 'direct_chat'
            : (dlog.delivery_type || 'broadcast');

        const senderLabel = isDirectChat
            ? '事務局（個別返信）'
            : dlog.delivery_type === 'step_message'
                ? `ステップ配信${dlog.step_name ? ` (${dlog.step_name})` : ''}`
                : dlog.delivery_type === 'cart_recovery'
                    ? 'カゴ落ち自動フォロー'
                    : dlog.delivery_type === 'test_preview'
                        ? 'テストプレビュー送信'
                        : '一括配信';

        const syntheticMsg: LineChatMessage = {
            id: `dlog-${dlog.id}`,
            created_at: sentAt,
            line_user_id: cleanLineId,
            student_id: dlog.student_id || null,
            display_name: dlog.student_name || null,
            direction: 'outbound',
            sender_type: isDirectChat ? 'admin' : 'system_auto',
            message_type: msgType,
            message_text: text,
            sender_label: senderLabel,
            is_read: true,
            status: dlog.status === 'failed' ? 'failed' : 'sent',
            metadata: {
                from_delivery_log: true,
                campaign_id: dlog.campaign_id,
                error_message: dlog.error_message,
            },
        };

        primaryMessages.push(syntheticMsg);
    }

    // D. line_monitoring_logs から過去の受信メッセージを統合
    if (monitoringLogsRes.data && Array.isArray(monitoringLogsRes.data)) {
        for (const mlog of monitoringLogsRes.data) {
            const rawText = mlog.message_text || '';
            const detectedAt = mlog.detected_at;
            if (!rawText || !detectedAt) continue;

            // (顧客): / (コーチ): のプレフィックスを整形
            const cleanedText = rawText
                .replace(/^\(顧客\):\s*/, '')
                .replace(/^\(コーチ\):\s*/, '')
                .replace(/\n\(顧客\):\s*/g, '\n')
                .replace(/\n\(コーチ\):\s*/g, '\n');

            const dir: 'inbound' | 'outbound' = mlog.direction === 'coach_to_customer' ? 'outbound' : 'inbound';
            if (isDuplicateMessage(dir, cleanedText, detectedAt)) continue;

            primaryMessages.push({
                id: `mlog-${mlog.id}`,
                created_at: detectedAt,
                line_user_id: cleanLineId,
                display_name: mlog.line_display_name || null,
                direction: dir,
                sender_type: dir === 'inbound' ? 'user' : 'coach',
                message_type: 'text',
                message_text: cleanedText,
                sender_label: dir === 'inbound' ? (mlog.line_display_name || '顧客メッセージ') : '担当コーチLINE',
                is_read: mlog.status === 'checked',
                status: 'received',
                metadata: { from_monitoring_log: true },
            });
        }
    }

    // 時系列（古い順 → 最新が一番下）にソート
    primaryMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return primaryMessages;
}

// ==============================================================================
// 5. 既読処理 & 要対応フラグ切り替え
// ==============================================================================

/**
 * 新着検知用の軽量シグネチャ取得（各ソースの最新更新時刻のみを limit 1 で取得）
 * クライアントはこの値が変化した時だけ重いスレッド一覧・履歴を再取得する
 */
export async function getLineChatSyncSignature(): Promise<string> {
    const supabase = createAdminClient();
    const [idxRes, chatRes, monRes, dlvRes] = await Promise.all([
        supabase
            .from('app_configs')
            .select('updated_at')
            .eq('key', THREAD_INDEX_CONFIG_KEY)
            .maybeSingle()
            .then(r => r, () => ({ data: null })),
        supabase
            .from('line_chat_messages')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .then(r => r, () => ({ data: null })),
        supabase
            .from('line_monitoring_logs')
            .select('detected_at')
            .order('detected_at', { ascending: false })
            .limit(1)
            .then(r => r, () => ({ data: null })),
        supabase
            .from('line_delivery_logs')
            .select('sent_at')
            .order('sent_at', { ascending: false })
            .limit(1)
            .then(r => r, () => ({ data: null })),
    ]);
    const pick = (res: any, col: string) =>
        Array.isArray(res?.data) ? res.data[0]?.[col] || '' : res?.data?.[col] || '';
    return [
        pick(idxRes, 'updated_at'),
        pick(chatRes, 'created_at'),
        pick(monRes, 'detected_at'),
        pick(dlvRes, 'sent_at'),
    ].join('|');
}

export async function markLineChatRead(lineUserId: string): Promise<void> {
    if (!lineUserId) return;
    const supabase = createAdminClient();
    const cleanId = lineUserId.trim();

    // 1. DBテーブルの既読更新
    try {
        await supabase
            .from('line_chat_messages')
            .update({ is_read: true })
            .eq('line_user_id', cleanId)
            .eq('direction', 'inbound')
            .eq('is_read', false);
    } catch {}

    // 2. app_configs 履歴の既読更新
    try {
        const historyKey = `${CHAT_HISTORY_PREFIX}${cleanId}`;
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', historyKey)
            .maybeSingle();

        if (data?.value) {
            const list = JSON.parse(data.value) as LineChatMessage[];
            let modified = false;
            for (const m of list) {
                if (m.direction === 'inbound' && !m.is_read) {
                    m.is_read = true;
                    modified = true;
                }
            }
            if (modified) {
                await supabase.from('app_configs').upsert({
                    key: historyKey,
                    value: JSON.stringify(list),
                    updated_at: new Date().toISOString(),
                });
            }
        }
    } catch {}

    // 3. スレッドインデックスの未読数を 0 にリセット（未登録エントリも作成して監視ログ由来の未読を確実に解除）
    try {
        const indexMap = await getThreadIndexMap();
        const prev = indexMap[cleanId];
        // 既に既読（未読0）のエントリが存在する場合は無駄な全体書き込みをスキップ（高速化）
        if (prev && (prev.unreadCount || 0) === 0) {
            return;
        }
        indexMap[cleanId] = {
            lineUserId: cleanId,
            displayName: prev?.displayName || null,
            lastMessageText: prev?.lastMessageText || null,
            lastMessageAt: prev?.lastMessageAt || null,
            lastMessageDirection: prev?.lastMessageDirection || null,
            unreadCount: 0,
            needsReply: prev?.needsReply ?? false,
            customNotes: prev?.customNotes ?? null,
            customStatus: prev?.customStatus ?? null,
            updatedAt: new Date().toISOString(),
        };
        await saveThreadIndexMap(indexMap);
    } catch {}
}

export async function toggleLineChatNeedsReply(lineUserId: string, needsReply: boolean): Promise<void> {
    if (!lineUserId) return;
    const cleanId = lineUserId.trim();
    const indexMap = await getThreadIndexMap();
    const prev = indexMap[cleanId];

    indexMap[cleanId] = {
        lineUserId: cleanId,
        displayName: prev?.displayName || null,
        lastMessageText: prev?.lastMessageText || null,
        lastMessageAt: prev?.lastMessageAt || null,
        lastMessageDirection: prev?.lastMessageDirection || null,
        unreadCount: needsReply ? (prev?.unreadCount || 0) : 0,
        needsReply,
        customNotes: prev?.customNotes ?? null,
        customStatus: prev?.customStatus ?? null,
        updatedAt: new Date().toISOString(),
    };

    await saveThreadIndexMap(indexMap);
}

// ==============================================================================
// 6. 管理画面からの 1対1 個別チャット送信処理
// ==============================================================================

export async function sendDirectLineChatMessage(params: SendDirectChatParams): Promise<SendMessageResult & { chatMessage?: LineChatMessage | null }> {
    const cleanLineId = (params.lineUserId || '').trim();
    if (!cleanLineId) {
        return { success: false, error: '送信先の LINE User ID が指定されていません。' };
    }

    // テストプレビューフラグ時は会員番号0035（テスト太郎）の物理セキュリティガードを強制検証
    if (params.isTestPreview) {
        assertTestPreviewSecurityGuard({
            isTestPreview: true,
            deliveryType: 'test_preview',
            lineUserId: cleanLineId,
            studentNumber: params.studentNumber,
            studentName: params.studentName,
        });
    }

    const renderedText = renderLineMessage(params.rawMessage, params.variables);
    if (!renderedText || !renderedText.trim()) {
        return { success: false, error: '送信メッセージ本文が空です。' };
    }

    // LINE Push API 送信 (sendSingleLineMessage 経由でレート制限リトライ・配信ログ記録も実行)
    const sendRes = await sendSingleLineMessage({
        studentId: params.studentId || undefined,
        studentNumber: params.studentNumber || undefined,
        studentName: params.studentName || undefined,
        lineUserId: cleanLineId,
        rawMessage: params.rawMessage,
        variables: params.variables,
        deliveryType: params.isTestPreview ? 'test_preview' : 'direct_chat',
        stepName: '個別トーク（1対1チャット）',
        isTestPreview: params.isTestPreview,
    });

    // 個別チャット履歴へ即座に記録
    const chatMessage = await recordLineChatMessage({
        lineUserId: cleanLineId,
        studentId: params.studentId || null,
        displayName: params.studentName || null,
        direction: 'outbound',
        senderType: 'admin',
        messageType: params.isTestPreview ? 'test_preview' : 'direct_chat',
        messageText: renderedText,
        senderLabel: params.isTestPreview ? '事務局（テスト送信）' : '事務局（個別返信）',
        isRead: true,
        status: sendRes.success ? 'sent' : 'failed',
        metadata: {
            lineRequestId: sendRes.lineRequestId,
            error: sendRes.error,
        },
    });

    return {
        ...sendRes,
        chatMessage,
    };
}

// ==============================================================================
// 7. 顧客カルテ情報（ステータス・対応メモ・ステップ配信停止）の更新
// ==============================================================================

export async function updateLineChatUserProfile(params: UpdateChatUserProfileParams): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient();
    const cleanLineId = (params.lineUserId || '').trim();
    if (!cleanLineId) {
        return { success: false, error: 'LINE User ID が指定されていません。' };
    }

    try {
        // 1. students テーブルの更新
        const studentUpdatePayload: Record<string, any> = {};
        if (params.status !== undefined) studentUpdatePayload.status = params.status;
        if (params.notes !== undefined) studentUpdatePayload.notes = params.notes;
        if (params.customDisplayName !== undefined && params.customDisplayName.trim() !== '') {
            studentUpdatePayload.full_name = params.customDisplayName.trim();
        }

        if (Object.keys(studentUpdatePayload).length > 0) {
            if (params.studentId) {
                await supabase
                    .from('students')
                    .update(studentUpdatePayload)
                    .eq('id', params.studentId);
            } else {
                await supabase
                    .from('students')
                    .update(studentUpdatePayload)
                    .eq('line_user_id', cleanLineId);
            }
        }

        // 2. 公式LINEステップ配信状態 (line_step:{lineUserId}) の更新
        const stepState = await getStepLeadState(cleanLineId);
        if (stepState) {
            if (params.status !== undefined) {
                stepState.status = params.status as any;
                if (params.status !== 'friend_only') {
                    stepState.step_stage = -1;
                    stepState.next_send_at = null;
                }
            }
            if (params.stopStepDelivery === true) {
                stepState.step_stage = -1;
                stepState.next_send_at = null;
            } else if (params.stopStepDelivery === false && stepState.step_stage === -1) {
                stepState.step_stage = 0;
                stepState.next_send_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            }
            if (params.notes !== undefined) {
                stepState.notes = params.notes;
            }
            if (params.customDisplayName !== undefined && params.customDisplayName.trim() !== '') {
                stepState.display_name = params.customDisplayName.trim();
            }
            await saveStepLeadState(stepState);
        }

        // 3. スレッドインデックス (line_chat_threads_index_v1) にもメモ・ステータスを永続化
        const indexMap = await getThreadIndexMap();
        const prev = indexMap[cleanLineId];
        indexMap[cleanLineId] = {
            lineUserId: cleanLineId,
            displayName: params.customDisplayName?.trim() || prev?.displayName || null,
            lastMessageText: prev?.lastMessageText || null,
            lastMessageAt: prev?.lastMessageAt || null,
            lastMessageDirection: prev?.lastMessageDirection || null,
            unreadCount: prev?.unreadCount || 0,
            needsReply: prev?.needsReply || false,
            customNotes: params.notes !== undefined ? params.notes : (prev?.customNotes ?? null),
            customStatus: params.status !== undefined ? params.status : (prev?.customStatus ?? null),
            updatedAt: new Date().toISOString(),
        };
        await saveThreadIndexMap(indexMap);

        return { success: true };
    } catch (e: any) {
        console.error('[LineChatService] updateLineChatUserProfile error:', e);
        return { success: false, error: e.message || '顧客情報の更新に失敗しました。' };
    }
}
