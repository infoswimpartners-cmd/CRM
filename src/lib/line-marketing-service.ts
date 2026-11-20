/**
 * LINEマーケティングシステム コアサービス層
 * 
 * 責務:
 *   1. LINE公式アクセストークンの解決（app_configs優先、環境変数フォールバック、キャッシュ）
 *   2. 変数置換エンジン（{{name}}, {{coach_name}}, {{plan_name}}等、安全フォールバック含む）
 *   3. 会員番号0035・テスト太郎専用のハードコード物理例外セキュリティガード
 *   4. LINE Messaging API呼び出し（429レートリミット指数バックオフ、文字数制限チェック）
 *   5. 配信ログ（line_delivery_logs）への自動書き込み
 *   6. 体験後ステップ配信判定＆本入会（status: active）自動スキップ制御
 */

import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatLineMessage } from '@/lib/line';
import {
    SendMessageOptions,
    SendMessageResult,
    LineStepRule,
    SegmentFilterConditions,
    SyncTrialDoneResult,
    ProcessCartAbandonmentOptions,
    ProcessCartAbandonmentResult,
} from '@/types/line-marketing';
import {
    getAllUserTagsMap,
    filterStudentsWithTags,
    STANDARD_TAGS,
    addTagToUser,
    getAllUserTags,
} from '@/lib/line-tracking-service';
import { getStepLeadState, saveStepLeadState } from '@/lib/line-step-reminders';

export type {
    SendMessageOptions,
    SendMessageResult,
    SyncTrialDoneResult,
    ProcessCartAbandonmentOptions,
    ProcessCartAbandonmentResult,
};

// ==============================================================================
// 1. 定数定義・テスト太郎安全定数
// ==============================================================================

export const TEST_TARO_STUDENT_NUMBER = '0035';
export const TEST_TARO_LINE_USER_ID = 'U0e5a7654874369ca5e38deb47fd783aa';
export const TEST_TARO_STUDENT_NAME = 'テスト太郎';
export const TEST_TARO_STUDENT_ID = 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff';

export const DEFAULT_VARIABLE_FALLBACKS: Record<string, string> = {
    name: 'お客様',
    coach_name: '担当コーチ',
    plan_name: 'スイムパートナーズ',
    trial_date: '体験レッスン',
    area: 'ご希望エリア',
    student_number: '',
    trial_url: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/trial` : 'https://manager.swim-partners.com/trial',
    form_url: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/trial` : 'https://manager.swim-partners.com/trial',
};

// ==============================================================================
// 2. LINE公式アクセストークン解決（キャッシュ付き）
// ==============================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getOfficialLineAccessToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && cachedToken && cachedToken.expiresAt > now) {
        return cachedToken.token;
    }

    try {
        const supabase = createAdminClient();

        // 優先度 1: app_configs テーブルの line_channel_access_token
        const { data: config } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'line_channel_access_token')
            .maybeSingle();

        let token = config?.value?.trim();

        // 優先度 2: 環境変数 LINE_CHANNEL_ACCESS_TOKEN
        if (!token) {
            token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || '';
        }

        if (!token) {
            throw new Error('LINE公式アクセストークンが設定されていません (app_configs: line_channel_access_token または 環境変数: LINE_CHANNEL_ACCESS_TOKEN)');
        }

        // 5分間キャッシュ
        cachedToken = {
            token,
            expiresAt: now + 5 * 60 * 1000,
        };

        return token;
    } catch (err: any) {
        // フォールバック: キャッシュまたは環境変数直接
        if (cachedToken) return cachedToken.token;
        const envToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
        if (envToken) return envToken;
        throw err;
    }
}

// ==============================================================================
// 3. 変数置換エンジン（安全フォールバック・全角半角ブレ吸収）
// ==============================================================================

/**
 * テンプレート内の変数を置換し、LINE用に整形します
 * サポート形式: {{name}}, {name}, ｛｛name｝｝, ｛name｝
 */
export function renderLineMessage(
    template: string,
    variables?: Record<string, string | null | undefined> | null
): string {
    if (!template) return '';
    const safeVars = (variables && typeof variables === 'object') ? variables : {};

    // 正規表現: {{name}}, {name}, ｛｛name｝｝, ｛name｝, 大文字小文字, 前後空白を吸収
    const rendered = template.replace(/[{｛]{1,2}\s*([a-zA-Z0-9_-]+)\s*[}｝]{1,2}/gi, (match, rawKey) => {
        const key = rawKey.toLowerCase();

        // 1. 与えられた変数値の照合（プロトタイプ汚染・プロパティ漏洩を防止するため hasOwnProperty で検証）
        let providedVal: string | null | undefined = undefined;
        if (Object.prototype.hasOwnProperty.call(safeVars, key)) {
            providedVal = safeVars[key];
        } else if (Object.prototype.hasOwnProperty.call(safeVars, rawKey)) {
            providedVal = safeVars[rawKey];
        }

        if (providedVal !== undefined && providedVal !== null && String(providedVal).trim() !== '') {
            return String(providedVal).trim();
        }

        // 2. デフォルト安全フォールバック（プロトタイププロパティの誤解決を防止）
        if (Object.prototype.hasOwnProperty.call(DEFAULT_VARIABLE_FALLBACKS, key)) {
            return DEFAULT_VARIABLE_FALLBACKS[key];
        }

        // 3. 未知の変数は安全に空文字で除去
        return '';
    });

    // 既存のLINE最適化整形関数を適用（タグ除去、改行統一、余計な空白圧縮）
    return formatLineMessage(rendered);
}

/**
 * 互換エイリアス
 */
export const replaceTemplateVariables = renderLineMessage;

// ==============================================================================
// 4. 安全テストガード（ハードコード物理例外セキュリティガード）
// ==============================================================================

/**
 * テスト送信・プレビュー送信時に、会員番号0035・テスト太郎以外の宛先を物理的に遮断します
 */
export function assertTestPreviewSecurityGuard(options: {
    deliveryType?: string;
    isTestPreview?: boolean;
    lineUserId?: string | null;
    studentNumber?: string | null;
    studentName?: string | null;
}): void {
    const isTest = options.isTestPreview === true || options.deliveryType === 'test_preview';
    if (!isTest) return;

    // ハードコード厳格チェック 1: LINE User ID
    if (!options.lineUserId || options.lineUserId !== TEST_TARO_LINE_USER_ID) {
        const err = `SECURITY VIOLATION: テスト送信は会員番号0035（テスト太郎: line_user_id: ${TEST_TARO_LINE_USER_ID}）宛てのみ物理的に許可されています。不正な宛先: ${options.lineUserId}`;
        console.error(`[LineMarketingService Security] ${err}`);
        throw new Error(err);
    }

    // ハードコード厳格チェック 2: student_number が与えられている場合（空文字・空白・空白混入も厳格に遮断）
    if (options.studentNumber !== undefined && options.studentNumber !== null) {
        if (options.studentNumber !== TEST_TARO_STUDENT_NUMBER) {
            const err = `SECURITY VIOLATION: テスト送信は会員番号0035（テスト太郎）宛てのみ物理的に許可されています。不正な会員番号: ${options.studentNumber}`;
            console.error(`[LineMarketingService Security] ${err}`);
            throw new Error(err);
        }
    }
}

// ==============================================================================
// 5. LINE Messaging API 呼び出し（429指数バックオフ付き）
// ==============================================================================

async function fetchLineApiWithRetry(
    endpoint: string,
    body: any,
    token: string,
    maxRetries = 3
): Promise<{ ok: boolean; status: number; data: any; lineRequestId?: string }> {
    let lastStatus = 599;
    let lastData: any = null;
    let lastLineRequestId: string | undefined = undefined;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const lineRequestId = res.headers.get('x-line-request-id') || undefined;
            const data = await res.json().catch(() => ({}));

            lastStatus = res.status;
            lastData = data;
            lastLineRequestId = lineRequestId;

            if (res.ok) {
                return { ok: true, status: res.status, data, lineRequestId };
            }

            // 429 Too Many Requests ハンドリング
            if (res.status === 429) {
                if (attempt === maxRetries) {
                    console.warn(`[LineMarketingService] 429 Rate Limit persisted after ${maxRetries} attempts. Returning 429.`);
                    return { ok: false, status: 429, data, lineRequestId };
                }

                const retryAfterHeader = res.headers.get('retry-after');
                const delayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : Math.pow(2, attempt) * 1000;
                console.warn(`[LineMarketingService] 429 Rate Limited. Backoff for ${delayMs}ms (Attempt ${attempt}/${maxRetries})`);
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }

            // その他のHTTPエラー (400, 401, 500等) はリトライせず即返却
            return { ok: false, status: res.status, data, lineRequestId };
        } catch (netErr: any) {
            lastError = netErr;
            if (attempt === maxRetries) {
                console.warn(`[LineMarketingService] Network error on final attempt ${attempt}/${maxRetries}:`, netErr);
                break;
            }
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(`[LineMarketingService] Network error. Retrying in ${delayMs}ms...`, netErr);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return {
        ok: false,
        status: lastStatus,
        data: lastData || { error: lastError?.message || 'Network Timeout after retries' },
        lineRequestId: lastLineRequestId,
    };
}

// ==============================================================================
// 6. 配信ログ自動書き込み処理 (line_delivery_logs)
// ==============================================================================

export async function writeDeliveryLog(params: {
    studentId?: string | null;
    studentNumber?: string | null;
    studentName?: string | null;
    lineUserId: string;
    deliveryType: 'broadcast' | 'step_message' | 'test_preview' | 'cart_recovery' | 'confirm_abandon_recovery' | 'confirm_30m_followup' | 'inactive_follow_recovery' | 'direct_chat';
    campaignId?: string | null;
    stepId?: string | null;
    stepName?: string | null;
    renderedMessage: string;
    status: 'sent' | 'success' | 'failed' | 'skipped';
    errorMessage?: string | null;
    responseStatusCode?: number | null;
    lineRequestId?: string | null;
    isTestPreview?: boolean;
}): Promise<void> {
    try {
        const supabase = createAdminClient();
        const nowIso = new Date().toISOString();
        let { error } = await supabase.from('line_delivery_logs').insert({
            student_id: params.studentId || null,
            student_number: params.studentNumber || null,
            student_name: params.studentName || null,
            line_user_id: params.lineUserId,
            delivery_type: params.deliveryType,
            campaign_id: params.campaignId || null,
            step_id: params.stepId || null,
            step_name: params.stepName || null,
            message_body: params.renderedMessage,
            rendered_message: params.renderedMessage,
            status: params.status,
            error_message: params.errorMessage || null,
            response_status_code: params.responseStatusCode || null,
            line_request_id: params.lineRequestId || null,
            is_test_preview: params.isTestPreview || params.deliveryType === 'test_preview',
            sent_at: nowIso,
        });

        // DBのCHECK制約が未マイグレーションで direct_chat / cart_recovery / confirm_30m_followup 等が弾かれた場合、互換種別で再試行
        if (error && (params.deliveryType === 'direct_chat' || params.deliveryType === 'cart_recovery' || params.deliveryType === 'confirm_30m_followup' || params.deliveryType === 'confirm_abandon_recovery' || params.deliveryType === 'inactive_follow_recovery')) {
            const fallbackStepName =
                params.stepName ||
                (params.deliveryType === 'direct_chat'
                    ? '個別トーク（1対1チャット）'
                    : params.deliveryType === 'confirm_30m_followup'
                        ? '確認画面離脱30分後フォロー'
                        : params.deliveryType === 'confirm_abandon_recovery'
                            ? 'フォーム確認後未申込 即時フォロー'
                            : 'カゴ落ち自動フォロー');
            const retryRes = await supabase.from('line_delivery_logs').insert({
                student_id: params.studentId || null,
                student_number: params.studentNumber || null,
                student_name: params.studentName || null,
                line_user_id: params.lineUserId,
                delivery_type: 'broadcast',
                campaign_id: params.campaignId || null,
                step_id: params.stepId || null,
                step_name: fallbackStepName,
                message_body: params.renderedMessage,
                rendered_message: params.renderedMessage,
                status: params.status,
                error_message: params.errorMessage || null,
                response_status_code: params.responseStatusCode || null,
                line_request_id: params.lineRequestId || null,
                is_test_preview: params.isTestPreview || false,
                sent_at: nowIso,
            });
            error = retryRes.error;
        }

        if (error) {
            // テーブル未作成時は app_configs にフォールバック保存
            const { data: config } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'line_delivery_logs_data_v1')
                .maybeSingle();

            let logs: any[] = [];
            if (config?.value) {
                try { logs = JSON.parse(config.value); } catch {}
            }

            logs.unshift({
                id: crypto.randomUUID(),
                student_id: params.studentId || null,
                student_number: params.studentNumber || null,
                student_name: params.studentName || null,
                line_user_id: params.lineUserId,
                delivery_type: params.deliveryType,
                campaign_id: params.campaignId || null,
                step_id: params.stepId || null,
                step_name: params.stepName || null,
                message_body: params.renderedMessage,
                rendered_message: params.renderedMessage,
                status: params.status,
                error_message: params.errorMessage || null,
                response_status_code: params.responseStatusCode || null,
                line_request_id: params.lineRequestId || null,
                is_test_preview: params.isTestPreview || params.deliveryType === 'test_preview',
                sent_at: new Date().toISOString(),
            });

            if (logs.length > 200) logs = logs.slice(0, 200);

            await supabase
                .from('app_configs')
                .upsert({
                    key: 'line_delivery_logs_data_v1',
                    value: JSON.stringify(logs),
                    updated_at: new Date().toISOString(),
                });
        }
    } catch (logErr) {
        // 例外時も処理を落とさない
        console.warn('[LineMarketingService] Delivery log insertion warning:', logErr);
    }
}

// ==============================================================================
// 7. 単一メッセージ送信処理
// ==============================================================================

export async function sendSingleLineMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    // 1. 安全テストガード検証
    assertTestPreviewSecurityGuard(options);

    // 2. LINE連携チェック（未連携顧客の安全スキップ）
    if (!options.lineUserId || options.lineUserId.trim() === '') {
        console.log(`[LineMarketingService] Skipped delivery: student ${options.studentNumber || options.studentId || 'unknown'} has no LINE user ID`);
        return {
            success: false,
            skipped: true,
            skipReason: 'LINE user ID is missing or null',
        };
    }

    // 3. 本文の変数置換と整形
    const rendered = renderLineMessage(options.rawMessage, options.variables);
    if (!rendered || rendered.trim() === '') {
        return { success: false, error: 'メッセージ本文が空です' };
    }

    // LINEテキストメッセージ上限チェック（最大5,000文字）
    if (rendered.length > 5000) {
        return { success: false, error: `メッセージ文字数がLINEの上限（5,000文字）を超過過しています: ${rendered.length}文字` };
    }

    // 4. トークン解決
    let token = '';
    try {
        token = await getOfficialLineAccessToken();
    } catch (tokenErr: any) {
        console.error('[LineMarketingService] Token error:', tokenErr);
        await writeDeliveryLog({
            studentId: options.studentId,
            studentNumber: options.studentNumber,
            studentName: options.studentName,
            lineUserId: options.lineUserId,
            deliveryType: options.deliveryType,
            campaignId: options.campaignId,
            stepId: options.stepId,
            stepName: options.stepName,
            renderedMessage: rendered,
            status: 'failed',
            errorMessage: tokenErr.message,
            isTestPreview: options.isTestPreview,
        });
        return { success: false, error: tokenErr.message };
    }

    // 5. Push API 呼び出し
    const res = await fetchLineApiWithRetry(
        'https://api.line.me/v2/bot/message/push',
        {
            to: options.lineUserId,
            messages: [{ type: 'text', text: rendered }],
        },
        token
    );

    const isSuccess = res.ok;
    const errorMsg = isSuccess ? undefined : (res.data?.message || JSON.stringify(res.data));

    // 6. 配信ログ記録
    await writeDeliveryLog({
        studentId: options.studentId,
        studentNumber: options.studentNumber,
        studentName: options.studentName,
        lineUserId: options.lineUserId,
        deliveryType: options.deliveryType,
        campaignId: options.campaignId,
        stepId: options.stepId,
        stepName: options.stepName,
        renderedMessage: rendered,
        status: isSuccess ? 'success' : 'failed',
        errorMessage: errorMsg,
        responseStatusCode: res.status,
        lineRequestId: res.lineRequestId,
        isTestPreview: options.isTestPreview,
    });

    return {
        success: isSuccess,
        messageId: res.lineRequestId,
        error: errorMsg,
        statusCode: res.status,
        lineRequestId: res.lineRequestId,
    };
}

/**
 * 互換エイリアス
 */
export const sendSingleMessage = sendSingleLineMessage;

// ==============================================================================
// 8. テスト太郎専用テスト送信
// ==============================================================================

export async function sendTestPreviewMessage(params: {
    message?: string;
    rawMessage?: string;
    targetLineUserId?: string;
    customVariables?: Record<string, string>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const rawMessage = params.message || params.rawMessage || '【テスト配信】プレビュー確認です。';
    const targetLineUserId = params.targetLineUserId || TEST_TARO_LINE_USER_ID;

    // 物理ガード
    assertTestPreviewSecurityGuard({
        isTestPreview: true,
        lineUserId: targetLineUserId,
        studentNumber: TEST_TARO_STUDENT_NUMBER,
    });

    const defaultVariables: Record<string, string> = {
        name: TEST_TARO_STUDENT_NAME,
        coach_name: '新吉航大 コーチ',
        plan_name: '月2回プラン（60分）',
        area: '東京都港区',
        trial_date: '2026年9月30日',
        student_number: TEST_TARO_STUDENT_NUMBER,
    };

    const result = await sendSingleLineMessage({
        studentNumber: TEST_TARO_STUDENT_NUMBER,
        studentName: TEST_TARO_STUDENT_NAME,
        lineUserId: targetLineUserId,
        rawMessage,
        variables: { ...defaultVariables, ...(params.customVariables || {}) },
        deliveryType: 'test_preview',
        isTestPreview: true,
    });

    return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
    };
}

// ==============================================================================
// 9. マーケティング対象生徒共通抽出・エリア判定ロジック
// ==============================================================================

export interface FilteredMarketingStudent {
    id: string;
    studentNumber: string;
    fullName: string;
    fullNameKana?: string | null;
    status: string;
    area: string;
    coachId?: string | null;
    coachName?: string | null;
    membershipTypeId?: string | null;
    planName?: string | null;
    hasLine: boolean;
    lineUserId?: string | null;
    trialDate?: string | null;
    tags?: string[];
}

export async function fetchAndFilterMarketingStudents(
    filter: SegmentFilterConditions = {}
): Promise<FilteredMarketingStudent[]> {
    const supabase = createAdminClient();

    // 抽出に必要なデータを Promise.all で並列一括取得（待機時間を大幅短縮）
    const [studentsResult, userTagsMap, leadsResult] = await Promise.all([
        supabase
            .from('students')
            .select(`
                id,
                student_number,
                full_name,
                full_name_kana,
                status,
                line_user_id,
                coach_id,
                membership_type_id,
                coach:profiles!coach_id (id, full_name, base_area),
                membership_type:membership_types!membership_type_id (id, name),
                lessons:lessons (id, location, lesson_date, lesson_masters(is_trial, name))
            `)
            .order('created_at', { ascending: false }),
        getAllUserTagsMap(),
        supabase
            .from('leads')
            .select('name, area, lesson_location, confirmed_location, line_user_id'),
    ]);

    const rawStudents = studentsResult.data;
    if (studentsResult.error || !rawStudents) return [];

    const rawLeads = leadsResult.data;
    const leadMapByLineId = new Map<string, any>();
    const leadMapByName = new Map<string, any>();
    if (rawLeads) {
        for (const l of rawLeads) {
            if (l.line_user_id) leadMapByLineId.set(l.line_user_id, l);
            if (l.name) leadMapByName.set(l.name.replace(/\s+/g, ''), l);
        }
    }

    const lineLinkedOnly = filter.lineLinkedOnly !== false && filter.line_linked_only !== false;
    const targetStatuses = filter.statuses;
    const targetCoachIds = filter.coachIds || filter.coach_ids;
    const targetMembershipTypeIds = filter.membershipTypeIds || filter.membership_type_ids;
    const searchQuery = (filter.searchQuery || filter.search_query || '').trim().toLowerCase();
    const targetAreas = filter.areas;

    let filtered: FilteredMarketingStudent[] = [];

    for (const s of rawStudents) {
        const hasLine = !!(s.line_user_id && s.line_user_id.trim() !== '');
        if (lineLinkedOnly && !hasLine) continue;
        if (targetStatuses && targetStatuses.length > 0 && !targetStatuses.includes(s.status)) continue;
        if (targetCoachIds && targetCoachIds.length > 0 && (!s.coach_id || !targetCoachIds.includes(s.coach_id))) continue;
        if (targetMembershipTypeIds && targetMembershipTypeIds.length > 0 && (!s.membership_type_id || !targetMembershipTypeIds.includes(s.membership_type_id))) continue;

        // エリア判定ロジック（leads情報、レッスン受講場所、担当コーチの活動拠点を総合評価）
        const matchedLead = (s.line_user_id && leadMapByLineId.get(s.line_user_id)) ||
            (s.full_name && leadMapByName.get(s.full_name.replace(/\s+/g, '')));
        const leadAreaText = [matchedLead?.area, matchedLead?.lesson_location, matchedLead?.confirmed_location]
            .filter(Boolean)
            .join(' ');
        const lessonLocations = (s.lessons || []).map((l: any) => l.location || '').filter(Boolean).join(' ');
        const coachArea = (s.coach as any)?.base_area || '';
        const combinedLoc = `${leadAreaText} ${lessonLocations} ${coachArea}`.trim();

        let areaName = '東京都';
        let subAreaName = '';

        // 千葉県判定
        if (combinedLoc.includes('千葉') || combinedLoc.includes('船橋') || combinedLoc.includes('市川') ||
            combinedLoc.includes('柏') || combinedLoc.includes('浦安') || combinedLoc.includes('松戸') ||
            combinedLoc.includes('習志野') || combinedLoc.includes('メグスパ')) {
            areaName = '千葉県';
            if (combinedLoc.includes('船橋')) subAreaName = '船橋市';
            else if (combinedLoc.includes('市川')) subAreaName = '市川市';
            else if (combinedLoc.includes('柏')) subAreaName = '柏市';
            else if (combinedLoc.includes('浦安')) subAreaName = '浦安市';
        }
        // 神奈川県判定
        else if (combinedLoc.includes('横浜') || combinedLoc.includes('川崎') || combinedLoc.includes('神奈川') ||
            combinedLoc.includes('久地') || combinedLoc.includes('都筑') || combinedLoc.includes('相模原') ||
            combinedLoc.includes('藤沢') || combinedLoc.includes('湘南')) {
            areaName = '神奈川県';
            if (combinedLoc.includes('横浜')) subAreaName = '横浜市';
            else if (combinedLoc.includes('川崎')) subAreaName = '川崎市';
        }
        // 埼玉県判定
        else if (combinedLoc.includes('埼玉') || combinedLoc.includes('さいたま') || combinedLoc.includes('大宮') ||
            combinedLoc.includes('浦和') || combinedLoc.includes('川口') || combinedLoc.includes('所沢')) {
            areaName = '埼玉県';
            if (combinedLoc.includes('川口')) subAreaName = '川口市';
            else subAreaName = 'さいたま市';
        }
        // 東京都（区・市部判定）
        else {
            areaName = '東京都';
            if (combinedLoc.includes('港区') || combinedLoc.includes('三田') || combinedLoc.includes('御成門') ||
                combinedLoc.includes('田町') || combinedLoc.includes('麻布') || combinedLoc.includes('白金')) {
                subAreaName = '港区';
            } else if (combinedLoc.includes('品川') || combinedLoc.includes('日野学園') || combinedLoc.includes('五反田') ||
                combinedLoc.includes('大崎') || combinedLoc.includes('ワールドシティ')) {
                subAreaName = '品川区';
            } else if (combinedLoc.includes('渋谷') || combinedLoc.includes('恵比寿') || combinedLoc.includes('代官山') ||
                combinedLoc.includes('ひがし健康プラザ') || combinedLoc.includes('上原')) {
                subAreaName = '渋谷区';
            } else if (combinedLoc.includes('目黒') || combinedLoc.includes('五本木') || combinedLoc.includes('自由が丘') ||
                combinedLoc.includes('西部地区プール')) {
                subAreaName = '目黒区';
            } else if (combinedLoc.includes('世田谷') || combinedLoc.includes('等々力') || combinedLoc.includes('二子玉川') ||
                combinedLoc.includes('成城') || combinedLoc.includes('千歳温水') || combinedLoc.includes('総合運動場')) {
                subAreaName = '世田谷区';
            } else if (combinedLoc.includes('新宿') || combinedLoc.includes('四谷') || combinedLoc.includes('東新宿') ||
                combinedLoc.includes('東京体育館') || combinedLoc.includes('高田馬場') || combinedLoc.includes('目白') ||
                combinedLoc.includes('麹町')) {
                subAreaName = '新宿区';
            } else if (combinedLoc.includes('杉並') || combinedLoc.includes('高井戸') || combinedLoc.includes('上北沢') ||
                combinedLoc.includes('荻窪')) {
                subAreaName = '杉並区';
            } else if (combinedLoc.includes('江東') || combinedLoc.includes('深川') || combinedLoc.includes('有明') ||
                combinedLoc.includes('東陽町')) {
                subAreaName = '江東区';
            } else if (combinedLoc.includes('中央区') || combinedLoc.includes('日本橋') || combinedLoc.includes('水天宮') ||
                combinedLoc.includes('銀座')) {
                subAreaName = '中央区';
            } else if (combinedLoc.includes('江戸川') || combinedLoc.includes('葛西') || combinedLoc.includes('小岩')) {
                subAreaName = '江戸川区';
            } else if (combinedLoc.includes('墨田') || combinedLoc.includes('錦糸町') || combinedLoc.includes('ひがしんアリーナ')) {
                subAreaName = '墨田区';
            } else if (combinedLoc.includes('武蔵野') || combinedLoc.includes('吉祥寺') || combinedLoc.includes('三鷹') ||
                combinedLoc.includes('調布') || combinedLoc.includes('府中') || combinedLoc.includes('町田')) {
                subAreaName = '東京市部';
            }
        }

        const displayArea = subAreaName ? `${areaName} (${subAreaName})` : areaName;

        // フィルターによるエリア絞り込み判定（都道府県・区市町村・複合キーワードの柔軟マッチング）
        if (targetAreas && targetAreas.length > 0) {
            const isMatched = targetAreas.some((target: string) => {
                if (target === 'all' || target === '全エリア') return true;
                // 完全一致または前方一致・含有判定
                if (areaName === target || subAreaName === target || displayArea.includes(target)) return true;
                if (combinedLoc.includes(target)) return true;
                // 都道府県指定の場合、その配下の区市町村もマッチ
                if (target === '東京都' && areaName === '東京都') return true;
                if (target === '神奈川県' && areaName === '神奈川県') return true;
                if (target === '千葉県' && areaName === '千葉県') return true;
                if (target === '埼玉県' && areaName === '埼玉県') return true;
                // スラッシュ/中黒区切りの複合エリア指定（例: 港区・品川区）
                if (target.includes('・')) {
                    const parts = target.split('・');
                    return parts.some(p => areaName.includes(p) || subAreaName.includes(p) || combinedLoc.includes(p));
                }
                return false;
            });
            if (!isMatched) continue;
        }

        if (searchQuery !== '') {
            const name = (s.full_name || '').toLowerCase();
            const kana = (s.full_name_kana || '').toLowerCase();
            const num = (s.student_number || '').toLowerCase();
            if (!name.includes(searchQuery) && !kana.includes(searchQuery) && !num.includes(searchQuery)) {
                continue;
            }
        }

        let trialDate: string | null = null;
        const trialLesson = (s.lessons || []).find((l: any) => {
            const m = l.lesson_masters;
            return m?.is_trial === true || m?.name?.includes('体験');
        });
        if (trialLesson?.lesson_date) {
            trialDate = trialLesson.lesson_date;
        }

        const studentTags = s.line_user_id ? [...(userTagsMap.get(s.line_user_id) || [])] : [];
        if (s.status === 'trial_done' && !studentTags.includes('trial_done')) {
            studentTags.push('trial_done');
        }

        filtered.push({
            id: s.id,
            studentNumber: s.student_number || '',
            fullName: s.full_name || '',
            fullNameKana: s.full_name_kana || null,
            status: s.status,
            area: displayArea,
            coachId: s.coach_id || null,
            coachName: (s.coach as any)?.full_name || null,
            membershipTypeId: s.membership_type_id || null,
            planName: (s.membership_type as any)?.name || null,
            hasLine,
            lineUserId: s.line_user_id || null,
            trialDate,
            tags: studentTags,
        });
    }

    // タグ絞り込み（includeTags, excludeTags, viewedFormNotApplied, confirmedFormNotApplied）を適用
    filtered = await filterStudentsWithTags(filtered, {
        includeTags: filter.includeTags,
        excludeTags: filter.excludeTags,
        viewedFormNotApplied: filter.viewedFormNotApplied,
        confirmedFormNotApplied: filter.confirmedFormNotApplied,
    });

    return filtered;
}

// ==============================================================================
// 10. 予約一括配信の実行 (processScheduledBroadcasts)
// ==============================================================================

export async function processScheduledBroadcasts(options: { dryRun?: boolean; campaignId?: string } = {}): Promise<{
    processedCampaigns: number;
    successCount: number;
    failedCount: number;
}> {
    const { dryRun = false, campaignId } = options;
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // ゾンビロック解除ガード (10分以上 sending のままスタックしたキャンペーンを scheduled に復旧)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    let scheduledCampaigns: any[] = [];
    let useFallback = false;

    try {
        await supabase
            .from('line_broadcast_campaigns')
            .update({ status: 'scheduled', updated_at: nowIso })
            .eq('status', 'sending')
            .lte('updated_at', tenMinutesAgo);

        let query = supabase
            .from('line_broadcast_campaigns')
            .select('*');

        if (campaignId) {
            query = query.eq('id', campaignId);
        } else {
            query = query.eq('status', 'scheduled').lte('scheduled_at', nowIso);
        }

        const { data, error: selectErr } = await query;
        if (!selectErr && data) {
            scheduledCampaigns = data;
        } else {
            useFallback = true;
        }
    } catch {
        useFallback = true;
    }

    if (useFallback) {
        try {
            const { data: config } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'line_broadcast_campaigns_data_v1')
                .maybeSingle();
            if (config?.value) {
                const allCampaigns: any[] = JSON.parse(config.value);
                // ゾンビロック解除（10分以上 sending のままスタックしたものを scheduled に戻す）
                let configModified = false;
                for (const c of allCampaigns) {
                    if (c.status === 'sending' && c.updated_at && new Date(c.updated_at) <= new Date(tenMinutesAgo)) {
                        c.status = 'scheduled';
                        c.updated_at = nowIso;
                        configModified = true;
                    }
                }
                if (configModified) {
                    await supabase
                        .from('app_configs')
                        .upsert({
                            key: 'line_broadcast_campaigns_data_v1',
                            value: JSON.stringify(allCampaigns),
                            updated_at: nowIso,
                        });
                }

                if (campaignId) {
                    scheduledCampaigns = allCampaigns.filter((c: any) => c.id === campaignId && c.status !== 'completed');
                } else {
                    scheduledCampaigns = allCampaigns.filter((c: any) =>
                        c.status === 'scheduled' && c.scheduled_at && new Date(c.scheduled_at) <= new Date(nowIso)
                    );
                }
            }
        } catch {}
    }

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
        return { processedCampaigns: 0, successCount: 0, failedCount: 0 };
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const camp of scheduledCampaigns) {
        if (!dryRun) {
            if (!useFallback) {
                // DBテーブル利用時: アトミック楽観ロック
                const { data: lockedCamp } = await supabase
                    .from('line_broadcast_campaigns')
                    .update({ status: 'sending', updated_at: nowIso })
                    .eq('id', camp.id)
                    .eq('status', 'scheduled')
                    .select('id')
                    .maybeSingle();

                if (!lockedCamp) {
                    // 他の並行プロセスが既に処理を開始したためスキップ
                    continue;
                }
            } else {
                // app_configs フォールバック利用時: 楽観ロック
                try {
                    const { data: config } = await supabase
                        .from('app_configs')
                        .select('value')
                        .eq('key', 'line_broadcast_campaigns_data_v1')
                        .maybeSingle();
                    if (config?.value) {
                        const allCamps: any[] = JSON.parse(config.value);
                        const target = allCamps.find((c: any) => c.id === camp.id);
                        if (!target || target.status !== 'scheduled') {
                            continue; // 既に処理中または送信済み
                        }
                        target.status = 'sending';
                        target.updated_at = nowIso;
                        await supabase
                            .from('app_configs')
                            .upsert({
                                key: 'line_broadcast_campaigns_data_v1',
                                value: JSON.stringify(allCamps),
                                updated_at: nowIso,
                            });
                    }
                } catch {
                    continue;
                }
            }
        }

        // 共通抽出関数を利用してプレビューと100%同一の抽出・変数解決を実施
        const targetStudents = await fetchAndFilterMarketingStudents({
            ...(camp.filter_conditions || {}),
            lineLinkedOnly: true,
        });

        let campSuccess = 0;
        let campFailed = 0;

        for (const student of targetStudents) {
            if (dryRun) {
                campSuccess++;
                continue;
            }

            const variables: Record<string, string> = {
                name: student.fullName,
                student_number: student.studentNumber,
                coach_name: student.coachName || DEFAULT_VARIABLE_FALLBACKS.coach_name,
                plan_name: student.planName || DEFAULT_VARIABLE_FALLBACKS.plan_name,
                area: student.area || DEFAULT_VARIABLE_FALLBACKS.area,
                trial_date: student.trialDate || DEFAULT_VARIABLE_FALLBACKS.trial_date,
                trial_url: DEFAULT_VARIABLE_FALLBACKS.trial_url,
            };

            const sendRes = await sendSingleLineMessage({
                studentId: student.id,
                studentNumber: student.studentNumber,
                studentName: student.fullName,
                lineUserId: student.lineUserId || '',
                rawMessage: camp.message_text || camp.message_template,
                variables,
                deliveryType: 'broadcast',
                campaignId: camp.id,
            });

            if (sendRes.success) campSuccess++;
            else campFailed++;

            await new Promise(r => setTimeout(r, 30));
        }

        totalSuccess += campSuccess;
        totalFailed += campFailed;

        if (!dryRun) {
            if (!useFallback) {
                await supabase
                    .from('line_broadcast_campaigns')
                    .update({
                        status: campSuccess > 0 ? 'completed' : 'failed',
                        sent_count: campSuccess,
                        success_count: campSuccess,
                        failed_count: campFailed,
                        sent_at: nowIso,
                        executed_at: nowIso,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', camp.id);
            } else {
                try {
                    const { data: config } = await supabase
                        .from('app_configs')
                        .select('value')
                        .eq('key', 'line_broadcast_campaigns_data_v1')
                        .maybeSingle();
                    if (config?.value) {
                        const allCamps: any[] = JSON.parse(config.value);
                        const idx = allCamps.findIndex((c: any) => c.id === camp.id);
                        if (idx !== -1) {
                            allCamps[idx].status = campSuccess > 0 ? 'completed' : 'failed';
                            allCamps[idx].sent_count = campSuccess;
                            allCamps[idx].success_count = campSuccess;
                            allCamps[idx].failed_count = campFailed;
                            allCamps[idx].sent_at = nowIso;
                            allCamps[idx].executed_at = nowIso;
                            allCamps[idx].updated_at = new Date().toISOString();
                            await supabase
                                .from('app_configs')
                                .upsert({
                                    key: 'line_broadcast_campaigns_data_v1',
                                    value: JSON.stringify(allCamps),
                                    updated_at: new Date().toISOString(),
                                });
                        }
                    }
                } catch {}
            }
        }
    }

    return {
        processedCampaigns: scheduledCampaigns.length,
        successCount: totalSuccess,
        failedCount: totalFailed,
    };
}

// ==============================================================================
// 11. 体験完了生徒のステップ自動登録・エンロール同期 (syncTrialDoneStudentsToProgress)
// ==============================================================================

/**
 * JST基準でステップ配信日時を算出する共通ヘルパー
 */
export function calculateStepScheduledAt(baseDate: Date | string, delayDays: number, sendTime: string): string {
    let year: number;
    let month: number;
    let day: number;

    if (typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
        const parts = baseDate.split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
    } else {
        const d = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
        const jstMs = d.getTime() + 9 * 60 * 60 * 1000;
        const jstDate = new Date(jstMs);
        year = jstDate.getUTCFullYear();
        month = jstDate.getUTCMonth();
        day = jstDate.getUTCDate();
    }

    const [hours, minutes] = (sendTime || '18:00').split(':').map(Number);
    // JSTから9時間引いてUTCエポックを計算
    const targetUtcTimestamp = Date.UTC(year, month, day + delayDays, hours - 9, minutes, 0, 0);
    return new Date(targetUtcTimestamp).toISOString();
}

/**
 * 体験受講完了（status: trial_done）生徒のステップ進行自動登録（エンロール同期）
 */
export async function syncTrialDoneStudentsToProgress(options: {
    dryRun?: boolean;
    studentId?: string; // 特定生徒のみピンポイント同期する場合（レッスン完了フック用）
} = {}): Promise<SyncTrialDoneResult> {
    const { dryRun = false, studentId } = options;
    const supabase = createAdminClient();

    // 1. 既に登録済みの student_id を全件取得
    const { data: existingProgress, error: fetchProgErr } = await supabase
        .from('line_step_student_progress')
        .select('student_id');

    if (fetchProgErr) {
        console.warn('[syncTrialDoneStudentsToProgress] Fetch progress warning:', fetchProgErr.message);
    }
    const existingStudentIdSet = new Set((existingProgress || []).map((p: any) => p.student_id));

    // 2. status = 'trial_done' かつ line_user_id を持つ生徒を取得
    let studentQuery = supabase
        .from('students')
        .select(`
            id,
            student_number,
            full_name,
            status,
            line_user_id,
            created_at,
            lessons:lessons (
                id,
                lesson_date,
                lesson_masters:lesson_masters (
                    is_trial,
                    name
                )
            )
        `)
        .eq('status', 'trial_done')
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '');

    if (studentId) {
        studentQuery = studentQuery.eq('id', studentId);
    }

    const { data: trialDoneStudents, error: studentErr } = await studentQuery;
    if (studentErr || !trialDoneStudents) {
        return {
            totalEligibleCount: 0,
            newlyEnrolledCount: 0,
            alreadyEnrolledCount: 0,
            enrolledStudentIds: [],
            errors: studentErr ? [studentErr.message] : [],
        };
    }

    // 3. 有効なステップルールの先頭（step_order 最小）を取得
    const { data: stepRules } = await supabase
        .from('line_step_rules')
        .select('*')
        .eq('is_active', true)
        .order('step_order', { ascending: true })
        .limit(1);

    const firstRule = stepRules && stepRules.length > 0 ? stepRules[0] : null;
    const delayDays = firstRule ? firstRule.delay_days : 1;
    const sendTime = firstRule ? firstRule.send_time : '18:00';

    let newlyEnrolledCount = 0;
    let alreadyEnrolledCount = 0;
    const enrolledStudentIds: string[] = [];

    for (const student of trialDoneStudents) {
        if (existingStudentIdSet.has(student.id)) {
            alreadyEnrolledCount++;
            continue;
        }

        // 体験受講日（起点日）の特定
        let trialDateStr: string | null = null;
        const trialLessons = (student.lessons || []).filter((l: any) => {
            const m = l.lesson_masters;
            return m?.is_trial === true || m?.name?.includes('体験');
        });

        if (trialLessons.length > 0) {
            // 最も新しい受講日を採用
            trialLessons.sort((a: any, b: any) => (b.lesson_date || '').localeCompare(a.lesson_date || ''));
            trialDateStr = trialLessons[0].lesson_date;
        }

        // レッスン日がない場合は created_at または現在日をフォールバック
        const baseDate = trialDateStr ? new Date(trialDateStr) : new Date(student.created_at || Date.now());
        
        // JST基準で Step 1 の next_scheduled_at を算出
        const nextScheduledAt = calculateStepScheduledAt(baseDate, delayDays, sendTime);
        const triggerDate = baseDate.toISOString().substring(0, 10);

        if (!dryRun) {
            const { error: insertErr } = await supabase
                .from('line_step_student_progress')
                .insert({
                    student_id: student.id,
                    line_user_id: student.line_user_id,
                    trial_completed_at: baseDate.toISOString(),
                    trigger_date: triggerDate,
                    current_step_order: 0,
                    status: 'in_progress',
                    next_scheduled_at: nextScheduledAt,
                });

            if (insertErr) {
                console.error(`[syncTrialDoneStudentsToProgress] Insert error for student ${student.id}:`, insertErr);
                continue;
            }
        }

        newlyEnrolledCount++;
        enrolledStudentIds.push(student.id);
    }

    return {
        totalEligibleCount: trialDoneStudents.length,
        newlyEnrolledCount,
        alreadyEnrolledCount,
        enrolledStudentIds,
    };
}

// ==============================================================================
// 12. 体験後ステップ配信判定＆本入会自動スキップ制御 (processStepDeliveries)
// ==============================================================================

export interface StepDeliveryProcessResult {
    processedCount: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
}

export async function processStepDeliveries(options: { dryRun?: boolean } = {}): Promise<StepDeliveryProcessResult> {
    const { dryRun = false } = options;
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // ゾンビロック解除ガード (10分以上 sending のままスタックしたレコードを in_progress に復旧)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
        .from('line_step_student_progress')
        .update({ status: 'in_progress', updated_at: nowIso })
        .eq('status', 'sending')
        .lt('updated_at', tenMinutesAgo);

    // 1. 送信予定日時が到来している進行中レコードを取得
    const { data: progressList, error } = await supabase
        .from('line_step_student_progress')
        .select(`
            id,
            student_id,
            line_user_id,
            trial_completed_at,
            current_step_order,
            status,
            student:students!student_id (
                id,
                student_number,
                full_name,
                status,
                coach:profiles!coach_id(full_name),
                membership_type:membership_types!membership_type_id(name)
            )
        `)
        .eq('status', 'in_progress')
        .lte('next_scheduled_at', nowIso);

    if (error || !progressList || progressList.length === 0) {
        return { processedCount: 0, successCount: 0, skippedCount: 0, failedCount: 0 };
    }

    // 2. 有効なステップルールを全件取得
    const { data: stepRules } = await supabase
        .from('line_step_rules')
        .select('*')
        .eq('is_active', true)
        .order('step_order', { ascending: true });

    const activeRules = stepRules || [];

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const progress of progressList) {
        // dryRun でない場合、処理直前にアトミックロックを獲得 (status: 'in_progress' -> 'sending')
        if (!dryRun) {
            const { data: lockedProgress } = await supabase
                .from('line_step_student_progress')
                .update({ status: 'sending', updated_at: new Date().toISOString() })
                .eq('id', progress.id)
                .eq('status', 'in_progress')
                .select('id')
                .maybeSingle();

            if (!lockedProgress) {
                // 他の並行プロセスがロック獲得済みのためスキップ
                continue;
            }
        }

        const student: any = progress.student;

        // 生徒情報が存在しない場合はスキップ
        if (!student) continue;

        // -------------------------------------------------------------
        // ★超重要: 本入会（status: active）安全スキップ制御★
        // 配信直前に対象生徒の最新ステータスを確認
        // -------------------------------------------------------------
        if (student.status === 'active' || student.status === 'withdrawn') {
            const isEnrollment = student.status === 'active';
            const stopReason = isEnrollment ? 'stopped_by_enrollment' : 'stopped_by_withdrawal';
            const skipMessage = isEnrollment
                ? `[自動スキップ: 生徒が既に本入会(${student.status})済みのため体験後ステップ配信を停止]`
                : `[自動スキップ: 生徒が退会(${student.status})したためステップ配信を停止]`;

            if (!dryRun) {
                await supabase
                    .from('line_step_student_progress')
                    .update({
                        status: 'stopped',
                        stop_reason: stopReason,
                        skip_reason: stopReason,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', progress.id);

                await writeDeliveryLog({
                    studentId: student.id,
                    studentNumber: student.student_number,
                    studentName: student.full_name,
                    lineUserId: progress.line_user_id || '',
                    deliveryType: 'step_message',
                    stepName: `Step ${progress.current_step_order + 1} (Auto-Skipped)`,
                    renderedMessage: skipMessage,
                    status: 'skipped',
                    errorMessage: `${stopReason}: Student current status is '${student.status}'`,
                });
            }

            skippedCount++;
            continue;
        }

        // 次に送信すべきステップルールを特定
        const nextRule = activeRules.find((r: LineStepRule) => r.step_order > progress.current_step_order);
        if (!nextRule) {
            // 全ステップ完了
            if (!dryRun) {
                await supabase
                    .from('line_step_student_progress')
                    .update({
                        status: 'completed',
                        stop_reason: 'all_steps_sent',
                        skip_reason: 'all_steps_sent',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', progress.id);
            }
            continue;
        }

        if (dryRun) {
            successCount++;
            continue;
        }

        // 変数準備
        const variables = {
            name: student.full_name,
            coach_name: student.coach?.full_name || '',
            plan_name: student.membership_type?.name || '',
            student_number: student.student_number || '',
            trial_date: progress.trial_completed_at ? progress.trial_completed_at.substring(0, 10) : '',
        };

        // LINE送信
        const result = await sendSingleLineMessage({
            studentId: student.id,
            studentNumber: student.student_number,
            studentName: student.full_name,
            lineUserId: progress.line_user_id,
            rawMessage: nextRule.message_text,
            variables,
            deliveryType: 'step_message',
            stepId: nextRule.id,
            stepName: nextRule.title,
        });

        if (result.success) {
            successCount++;

            // 次回予定日時を算出
            const futureRule = activeRules.find((r: LineStepRule) => r.step_order > nextRule.step_order);
            let nextScheduledAt: string | null = null;
            let nextStatus = 'in_progress';
            let stopReason: string | null = null;

            if (futureRule) {
                const baseDate = progress.trial_completed_at ? new Date(progress.trial_completed_at) : new Date();
                nextScheduledAt = calculateStepScheduledAt(baseDate, futureRule.delay_days, futureRule.send_time);
            } else {
                nextStatus = 'completed';
                stopReason = 'all_steps_sent';
            }

            await supabase
                .from('line_step_student_progress')
                .update({
                    current_step_order: nextRule.step_order,
                    last_sent_at: new Date().toISOString(),
                    next_scheduled_at: nextScheduledAt,
                    status: nextStatus,
                    stop_reason: stopReason,
                    skip_reason: stopReason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', progress.id);
        } else {
            failedCount++;
            if (!dryRun) {
                // 送信失敗時は in_progress にロールバックして次回リトライ可能にする
                await supabase
                    .from('line_step_student_progress')
                    .update({
                        status: 'in_progress',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', progress.id);
            }
        }

        await new Promise(r => setTimeout(r, 50));
    }

    return {
        processedCount: progressList.length,
        successCount,
        skippedCount,
        failedCount,
    };
}

// ==============================================================================
// 12. カゴ落ち自動フォロー判定エンジン (Cart Abandonment Reminders)
// ==============================================================================

export const DEFAULT_CART_RECOVERY_TEMPLATE = `{{name}} 様

スイムパートナーズ事務局です😊
先ほどは体験レッスンのご案内ページをご覧いただき、ありがとうございます！

「日程の入力が少し手間に感じた…」
「近くに通えるプールがあるか分からない」
など、もし迷われている点がございましたらご安心ください🏊‍♂️✨

お申し込みフォームを全て入力しなくても大丈夫です！
このLINEチャットに直接、以下の2点を送っていただくだけで、事務局が最適なコーチ・空き枠をお調べいたします💡

-----------------------------
① ご希望の曜日や時間帯（例: 土日の午前、平日夕方など）:
② 最寄り駅またはご希望のエリア:
-----------------------------

もちろん「水が怖くて顔つけから始めたい」「クロールの息継ぎを直したい」といったご相談だけでも大歓迎です。

▼ もう一度フォームから申し込む場合はこちら
{{trial_url}}

※すでにお申し込み済みの場合や行き違いの際はご容赦ください。`;

/**
 * カゴ落ち（フォーム離脱者）の自動フォロー判定エンジン
 * 
 * 判定条件:
 *   1. フォーム閲覧（trial_form_viewed）保有
 *   2. 未申込（trial_applied 未保有）
 *   3. 未フォロー（cart_recovery_sent 未保有）
 *   4. フォーム閲覧から1時間以上24時間以内（熱量の高い1〜2時間をカバー）
 *   5. 配信時間帯ガード: JST 10:00〜20:30 の間のみ配信（落ち着いて検討できるゴールデンタイム）
 * 
 * スパム防止調停:
 *   既存のステップ配信ステート（line_step:{lineUserId}）が存在する場合、
 *   次回ステップ配信予定を24時間後ろ倒しにして二重送信を防止
 * 
 * 【最重要安全ガード】:
 *   app_configs: line_cart_recovery_mode のデフォルトを 'test_only' とし、
 *   テストモード時は会員番号0035、TEST_TARO_LINE_USER_ID 以外を完全にスキップ
 */
export async function processCartAbandonmentReminders(
    options: ProcessCartAbandonmentOptions = {}
): Promise<ProcessCartAbandonmentResult> {
    const { dryRun = false, nowDate = new Date(), targetLineUserId, forceSend = false } = options;
    const supabase = createAdminClient();

    // 1. 配信時間帯ガード判定 (JST 10:00〜20:30: 落ち着いてスケジュール確認・返信ができる時間帯)
    // JST = UTC + 9時間
    const jstDate = new Date(nowDate.getTime() + 9 * 60 * 60 * 1000);
    const jstHour = jstDate.getUTCHours();
    const jstMinute = jstDate.getUTCMinutes();
    const jstMinutesOfDay = jstHour * 60 + jstMinute;

    // 10:00 = 600分, 20:30 = 1230分
    if (!forceSend && (jstMinutesOfDay < 600 || jstMinutesOfDay > 1230)) {
        console.log(`[CartRecovery] JST時間帯ガード作動: 現在JST ${jstHour}:${String(jstMinute).padStart(2, '0')}のため配信を停止します（配信許可: 10:00〜20:30）`);
        return {
            processedCount: 0,
            successCount: 0,
            skippedCount: 0,
            failedCount: 0,
            isOutsideHours: true,
            mode: 'test_only',
            details: [],
        };
    }

    // 2. 稼働モードの取得（デフォルト: test_only）
    const { data: modeConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'line_cart_recovery_mode')
        .maybeSingle();

    const rawMode = modeConfig?.value?.trim().toLowerCase();
    const recoveryMode = rawMode === 'active' || rawMode === 'live' ? 'active' : 'test_only';
    const isTestOnly = recoveryMode === 'test_only';

    // 3. メッセージテンプレート取得
    const { data: templateConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'line_cart_recovery_template')
        .maybeSingle();

    const templateText = templateConfig?.value?.trim() || DEFAULT_CART_RECOVERY_TEMPLATE;

    // 4. 全ユーザータグの取得
    const allUserTags = await getAllUserTags();

    // ユーザー毎のタグ集合と最新閲覧日時をマッピング
    const userCandidateMap = new Map<string, {
        lineUserId: string;
        tags: Set<string>;
        viewedAt: Date | null;
        displayName?: string;
    }>();

    for (const tag of allUserTags) {
        if (!tag.line_user_id) continue;
        let entry = userCandidateMap.get(tag.line_user_id);
        if (!entry) {
            entry = {
                lineUserId: tag.line_user_id,
                tags: new Set<string>(),
                viewedAt: null,
                displayName: tag.display_name || undefined,
            };
            userCandidateMap.set(tag.line_user_id, entry);
        }

        entry.tags.add(tag.tag_name);
        if (tag.display_name && !entry.displayName) {
            entry.displayName = tag.display_name;
        }

        // trial_form_viewed の日時取得
        if (tag.tag_name === STANDARD_TAGS.FORM_VIEWED) {
            const dateStr = tag.metadata?.last_viewed_at || tag.metadata?.first_viewed_at || tag.created_at;
            if (dateStr) {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                    if (!entry.viewedAt || parsedDate.getTime() > entry.viewedAt.getTime()) {
                        entry.viewedAt = parsedDate;
                    }
                }
            }
        }
    }

    // line_access_logs からも直近のアクセス日時を補完
    try {
        const { data: recentLogs } = await supabase
            .from('line_access_logs')
            .select('line_user_id, created_at, display_name')
            .eq('form_type', 'trial')
            .order('created_at', { ascending: false })
            .limit(200);

        if (recentLogs) {
            for (const log of recentLogs) {
                if (!log.line_user_id) continue;
                const entry = userCandidateMap.get(log.line_user_id);
                if (entry) {
                    const logDate = new Date(log.created_at);
                    if (!isNaN(logDate.getTime())) {
                        if (!entry.viewedAt || logDate.getTime() > entry.viewedAt.getTime()) {
                            entry.viewedAt = logDate;
                        }
                    }
                    if (log.display_name && !entry.displayName) {
                        entry.displayName = log.display_name;
                    }
                }
            }
        }
    } catch {
        // line_access_logsテーブルが存在しない環境ではフォールバック
    }

    // 5. 候補者の判定と配信処理
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: ProcessCartAbandonmentResult['details'] = [];

    let candidates = Array.from(userCandidateMap.values());

    if (targetLineUserId) {
        if (!userCandidateMap.has(targetLineUserId)) {
            const { data: directStudent } = await supabase
                .from('students')
                .select('line_user_id, full_name')
                .eq('line_user_id', targetLineUserId)
                .maybeSingle();

            if (directStudent?.line_user_id) {
                candidates = [{
                    lineUserId: directStudent.line_user_id,
                    tags: new Set<string>(),
                    viewedAt: nowDate,
                    displayName: directStudent.full_name || undefined,
                }];
            }
        } else {
            candidates = candidates.filter(c => c.lineUserId === targetLineUserId);
        }
    }

    for (const candidate of candidates) {
        const { lineUserId, tags, viewedAt } = candidate;

        // 条件1: フォーム閲覧タグを保有していること（forceSend時はバイパス）
        if (!forceSend && !tags.has(STANDARD_TAGS.FORM_VIEWED)) {
            continue;
        }

        // 条件2: 未申込であること（trial_applied 未保有）
        if (!forceSend && tags.has(STANDARD_TAGS.FORM_APPLIED)) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'already_applied',
            });
            continue;
        }

        // 条件3: 未フォローであること（cart_recovery_sent 未保有）
        if (!forceSend && tags.has(STANDARD_TAGS.CART_RECOVERY_SENT)) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'already_recovery_sent',
            });
            continue;
        }

        // 条件4: 閲覧日時の存在と経過時間（30分以上24時間以内: 熱量の高いタイミングを逃さずカバー）
        if (!forceSend && !viewedAt) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'viewed_at_missing',
            });
            continue;
        }

        const elapsedMs = viewedAt ? (nowDate.getTime() - viewedAt.getTime()) : 0;
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        if (!forceSend && (elapsedHours < 0.5 || elapsedHours > 24)) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: `elapsed_out_of_range (${elapsedHours.toFixed(1)}h)`,
                elapsedHours,
            });
            continue;
        }

        // 生徒情報の照会（連携済み生徒の確認と安全ガード）
        let student: any = null;
        try {
            const { data } = await supabase
                .from('students')
                .select(`
                    id,
                    student_number,
                    full_name,
                    status,
                    coach:coach_id(full_name),
                    membership_type:membership_type_id(name)
                `)
                .eq('line_user_id', lineUserId)
                .maybeSingle();
            student = data;
        } catch {
            // エラー時は生徒情報なしとして継続
        }

        // 生徒が存在し、すでに本入会済（active）や申込済（applied）、退会済（withdrawn）の場合は安全スキップ
        // ※ テスト太郎（0035）は検証実行用アカウントのため、タグ条件に基づいてテスト判定可能とする
        if (student && student.student_number !== TEST_TARO_STUDENT_NUMBER) {
            if (student.status === 'active' || student.status === 'applied' || student.status === 'withdrawn') {
                skippedCount++;
                details.push({
                    lineUserId,
                    studentName: student.full_name,
                    action: 'skipped',
                    reason: `student_already_${student.status}`,
                    elapsedHours,
                });
                continue;
            }
        }

        // 【最重要安全ガード】: test_only モード時はテスト太郎（0035）以外を完全にスキップ（forceSend時は手動実行許可）
        if (isTestOnly && !forceSend) {
            const isTestUserId = lineUserId === TEST_TARO_LINE_USER_ID;
            const isTestStudentNumber = student?.student_number === TEST_TARO_STUDENT_NUMBER;

            if (!isTestUserId && !isTestStudentNumber) {
                skippedCount++;
                details.push({
                    lineUserId,
                    studentName: student?.full_name || candidate.displayName,
                    action: 'skipped',
                    reason: 'test_only_mode_guard',
                    elapsedHours,
                });
                console.log(`[CartRecovery] 安全ガード作動 (test_onlyモード): 実ユーザーへの配信をスキップしました (LINE ID: ${lineUserId})`);
                continue;
            }
        }

        const studentName = student?.full_name || candidate.displayName || 'お客様';

        // dryRunモードの場合の処理
        if (dryRun) {
            successCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'dry_run',
                reason: 'simulated_send_success',
                elapsedHours,
            });
            continue;
        }

        // 変数の準備（LINEアカウント情報を確実に引き継ぐためLIFF/userId付きURLを生成）
        const trialLiffId = process.env.NEXT_PUBLIC_TRIAL_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID;
        const personalizedTrialUrl = trialLiffId
            ? `https://liff.line.me/${trialLiffId}`
            : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://member.swim-partners.com'}/trial?userId=${encodeURIComponent(lineUserId)}`;

        const variables: Record<string, string> = {
            name: studentName,
            student_number: student?.student_number || '',
            coach_name: student?.coach?.full_name || '',
            plan_name: student?.membership_type?.name || '',
            trial_url: personalizedTrialUrl,
        };

        // LINE送信処理
        const sendResult = await sendSingleLineMessage({
            studentId: student?.id,
            studentNumber: student?.student_number,
            studentName,
            lineUserId,
            rawMessage: templateText,
            variables,
            deliveryType: 'cart_recovery',
            stepName: 'カゴ落ち自動フォロー',
        });

        if (sendResult.success) {
            successCount++;

            // 1. スパム防止調停: カゴ落ち送信成功時、既存のステップ配信ステート（line_step:{lineUserId}）が存在する場合、次回ステップ配信予定を24時間後ろ倒し
            try {
                const stepLeadState = await getStepLeadState(lineUserId);
                if (stepLeadState && stepLeadState.next_send_at && stepLeadState.step_stage !== -1 && !stepLeadState.is_blocked) {
                    const currentNextDate = new Date(stepLeadState.next_send_at);
                    const baseTime = currentNextDate.getTime() > nowDate.getTime()
                        ? currentNextDate.getTime()
                        : nowDate.getTime();
                    const delayedNextDate = new Date(baseTime + 24 * 60 * 60 * 1000);

                    await saveStepLeadState({
                        ...stepLeadState,
                        next_send_at: delayedNextDate.toISOString(),
                        notes: `${stepLeadState.notes ? stepLeadState.notes + ' | ' : ''}カゴ落ちフォロー送信のため次回ステップ配信を24時間後ろ倒し`,
                    });
                    console.log(`[CartRecovery] スパム防止調停適用: LINE ID ${lineUserId} の次回ステップ配信予定を ${delayedNextDate.toISOString()} に後ろ倒ししました`);
                }
            } catch (stepErr) {
                console.error(`[CartRecovery] スパム防止調停エラー (LINE ID: ${lineUserId}):`, stepErr);
            }

            // 2. cart_recovery_sent タグを安全に付与
            try {
                await addTagToUser(lineUserId, STANDARD_TAGS.CART_RECOVERY_SENT, {
                    category: 'automation',
                    displayName: studentName,
                    studentId: student?.id,
                    metadata: {
                        sent_at: nowDate.toISOString(),
                        elapsed_hours: Math.round(elapsedHours * 10) / 10,
                    },
                });
            } catch (tagErr) {
                console.error(`[CartRecovery] cart_recovery_sent タグ付与失敗 (${lineUserId}):`, tagErr);
            }

            details.push({
                lineUserId,
                studentName,
                action: 'sent',
                elapsedHours,
            });
        } else {
            failedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'failed',
                reason: sendResult.error,
                elapsedHours,
            });
        }

        await new Promise(r => setTimeout(r, 50));
    }

    return {
        processedCount: candidates.length,
        successCount,
        skippedCount,
        failedCount,
        mode: recoveryMode,
        details,
    };
}

// ==============================================================================
// 12. 友だち追加後1時間 未アクション（リッチメニュー未操作・未返信）自動フォロー機能
// ==============================================================================

export const DEFAULT_INACTIVE_FOLLOW_RECOVERY_TEMPLATE = `{{name}} 様、こんにちは！
スイムパートナーズ公式LINEへのご登録ありがとうございます😊🏊‍♂️

「水泳のマンツーマンレッスンってどんな感じ？」
「近くのプールに出張してくれるのかな？」
「泳げない初心者や子どもでも大丈夫？」

など、何か気になっていることやご不安な点はございませんか？

当スクールは、専任のプロコーチがご自宅近くの公営プールへお伺いする完全個別レッスンです✨

気になることやご質問がありましたら、どんな些細なことでもこのチャットにそのままお気軽にご返信くださいね！専任スタッフが丁寧にお答えいたします。

▼ レッスンの詳細やコーチ一覧はこちら
https://liff.line.me/2009159689-dWjvcfS7`;

export interface ProcessInactiveFollowOptions {
    dryRun?: boolean;
    nowDate?: Date;
    targetLineUserId?: string; // 特定ユーザー指定実行用
    forceSend?: boolean; // 時間帯チェック・経過時間チェック等の強制バイパス
}

export interface ProcessInactiveFollowResult {
    processedCount: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
    isOutsideHours?: boolean;
    mode: 'active' | 'test_only';
    details: Array<{
        lineUserId: string;
        studentName?: string;
        action: 'sent' | 'skipped' | 'failed';
        reason?: string;
        elapsedMinutes?: number;
    }>;
}

/**
 * 友だち追加後、1時間経過してもリッチメニュー操作・メッセージ・フォーム閲覧がない未アクションユーザーへ
 * 自動的にフォローメッセージを送信する処理
 */
export async function processInactiveFollowRecovery(
    options: ProcessInactiveFollowOptions = {}
): Promise<ProcessInactiveFollowResult> {
    const { dryRun = false, nowDate = new Date(), targetLineUserId, forceSend = false } = options;
    const supabase = createAdminClient();

    // 1. 配信時間帯ガード判定 (JST 8:30〜21:30: 迷惑にならない時間帯に限定)
    const jstDate = new Date(nowDate.getTime() + 9 * 60 * 60 * 1000);
    const jstHour = jstDate.getUTCHours();
    const jstMinute = jstDate.getUTCMinutes();
    const jstMinutesOfDay = jstHour * 60 + jstMinute;

    // 8:30 = 510分, 21:30 = 1290分
    if (!forceSend && (jstMinutesOfDay < 510 || jstMinutesOfDay > 1290)) {
        console.log(`[InactiveFollowRecovery] JST時間帯ガード作動: 現在JST ${jstHour}:${String(jstMinute).padStart(2, '0')}のため配信を停止します（配信許可: 8:30〜21:30）`);
        return {
            processedCount: 0,
            successCount: 0,
            skippedCount: 0,
            failedCount: 0,
            isOutsideHours: true,
            mode: 'test_only',
            details: [],
        };
    }

    // 2. 稼働モードの取得（デフォルト: active で稼働）
    const { data: modeConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'line_inactive_follow_recovery_mode')
        .maybeSingle();

    const rawMode = modeConfig?.value?.trim().toLowerCase();
    // 明示的に inactive や test_only でなければ active
    const recoveryMode = rawMode === 'test_only' ? 'test_only' : 'active';
    const isTestOnly = recoveryMode === 'test_only';

    // 3. メッセージテンプレート取得
    const { data: templateConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'line_inactive_follow_recovery_template')
        .maybeSingle();

    const templateText = templateConfig?.value?.trim() || DEFAULT_INACTIVE_FOLLOW_RECOVERY_TEMPLATE;

    // 4. 全ユーザータグの取得
    const allUserTags = await getAllUserTags();
    const userTagsMap = new Map<string, Set<string>>();
    for (const tag of allUserTags) {
        if (!tag.line_user_id) continue;
        let set = userTagsMap.get(tag.line_user_id);
        if (!set) {
            set = new Set<string>();
            userTagsMap.set(tag.line_user_id, set);
        }
        set.add(tag.tag_name);
    }

    // 5. 候補者（friend_only ステータスの生徒）を取得
    let studentQuery = supabase
        .from('students')
        .select('id, full_name, line_user_id, status, created_at, notes')
        .eq('status', 'friend_only')
        .not('line_user_id', 'is', null);

    if (targetLineUserId) {
        studentQuery = studentQuery.eq('line_user_id', targetLineUserId);
    }

    const { data: candidates, error: candError } = await studentQuery;

    if (candError) {
        console.error('[InactiveFollowRecovery] Failed to fetch candidates:', candError);
        return {
            processedCount: 0,
            successCount: 0,
            skippedCount: 0,
            failedCount: 0,
            mode: recoveryMode,
            details: [],
        };
    }

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: ProcessInactiveFollowResult['details'] = [];

    const nowTime = nowDate.getTime();

    for (const student of candidates || []) {
        const lineUserId = student.line_user_id;
        const studentName = student.full_name || '公式LINE友だち';
        if (!lineUserId) continue;

        // A. テストモード制限（test_only 時は 会員番号0035 または TEST_TARO 以外スキップ）
        if (isTestOnly && !forceSend && lineUserId !== TEST_TARO_LINE_USER_ID) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: 'test_onlyモードのためスキップ（テスト対象外）',
            });
            continue;
        }

        // B. 既に送信済みかチェック
        const tags = userTagsMap.get(lineUserId) || new Set<string>();
        if (!forceSend && tags.has(STANDARD_TAGS.INACTIVE_FOLLOW_RECOVERY_SENT)) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: '既に友だち追加1時間後フォローを送信済み',
            });
            continue;
        }

        // C. 既に申込完了または体験受講済みかチェック
        if (!forceSend && (tags.has(STANDARD_TAGS.FORM_APPLIED) || tags.has(STANDARD_TAGS.TRIAL_DONE))) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: '既に申込・受講済みのためスキップ',
            });
            continue;
        }

        // D. フォーム閲覧中・確認画面到達（カゴ落ちフォロー対象）かチェック
        if (!forceSend && (tags.has(STANDARD_TAGS.FORM_VIEWED) || tags.has(STANDARD_TAGS.FORM_CONFIRMED))) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: 'フォーム閲覧済み（カゴ落ちフォロー対象）のためスキップ',
            });
            continue;
        }

        // E. 経過時間の計算（友だち追加から1時間以上経過しているか）
        const createdAtTime = new Date(student.created_at).getTime();
        const elapsedMinutes = Math.floor((nowTime - createdAtTime) / (60 * 1000));

        // 1時間（60分）未満の場合はまだ配信しない
        if (!forceSend && elapsedMinutes < 60) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: `友だち追加から1時間未経過（現在 ${elapsedMinutes}分経過）`,
                elapsedMinutes,
            });
            continue;
        }

        // 3時間（180分）以上経過している過去ユーザーは違和感防止のためスキップ（直近の新規追加者に限定）
        if (!forceSend && elapsedMinutes > 180) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: `友だち追加から規定時間超過（現在 ${elapsedMinutes}分経過 / 180分超のためスキップ）`,
                elapsedMinutes,
            });
            continue;
        }

        // F-1. ブロック中かチェック
        const { data: stepConfig } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', `line_step:${lineUserId}`)
            .maybeSingle();

        if (stepConfig?.value) {
            try {
                const parsed = JSON.parse(stepConfig.value);
                if (parsed.is_blocked) {
                    skippedCount++;
                    details.push({
                        lineUserId,
                        studentName,
                        action: 'skipped',
                        reason: 'ブロック中のためスキップ',
                        elapsedMinutes,
                    });
                    continue;
                }
            } catch {}
        }

        // F-2. アクティビティログで自発的アクション（メッセージ、リッチメニュー操作等）があるかチェック
        const { data: userActs } = await supabase
            .from('line_user_activities')
            .select('activity_type')
            .eq('line_user_id', lineUserId)
            .in('activity_type', [
                'message_text',
                'message_sticker',
                'message_media',
                'postback_menu',
                'postback_action',
                'form_view',
                'form_confirm',
                'form_submit'
            ])
            .limit(1);

        if (!forceSend && userActs && userActs.length > 0) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'skipped',
                reason: `自発的アクション確認済み (${userActs[0].activity_type}) のためスキップ`,
                elapsedMinutes,
            });
            continue;
        }

        // F-3. 相手からのメッセージ送信履歴（個別チャット）があるかチェック
        const { data: chatData } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', `line_chat_history:${lineUserId}`)
            .maybeSingle();

        if (chatData?.value) {
            try {
                const history: any[] = JSON.parse(chatData.value);
                const hasInboundUserMessage = history.some(m => m.direction === 'inbound' && m.senderType === 'user');
                if (!forceSend && hasInboundUserMessage) {
                    skippedCount++;
                    details.push({
                        lineUserId,
                        studentName,
                        action: 'skipped',
                        reason: '顧客から既にメッセージを受信しているためスキップ',
                        elapsedMinutes,
                    });
                    continue;
                }
            } catch {}
        }

        // G. シミュレーション（dryRun）の場合
        if (dryRun) {
            successCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'sent',
                reason: `[dry_run] 送信シミュレーション成功 (${elapsedMinutes}分経過)`,
                elapsedMinutes,
            });
            continue;
        }

        // H. 実際のLINE送信処理
        const personalizedMessage = templateText
            .replace(/\{\{name\}\}/g, studentName)
            .replace(/\{\{student_name\}\}/g, studentName);

        const sendResult = await sendSingleLineMessage({
            studentId: student?.id,
            studentName,
            lineUserId,
            rawMessage: templateText,
            variables: {
                name: studentName,
                student_name: studentName,
            },
            deliveryType: 'inactive_follow_recovery',
            campaignId: 'inactive_follow_recovery_1h',
            stepName: '友だち追加1時間後 未アクションフォロー',
        });

        if (sendResult.success) {
            successCount++;

            // 1. タグ付与
            await addTagToUser(lineUserId, STANDARD_TAGS.INACTIVE_FOLLOW_RECOVERY_SENT, {
                category: 'automation',
                displayName: studentName,
                metadata: {
                    sent_at: new Date().toISOString(),
                    elapsed_minutes: elapsedMinutes,
                }
            });

            // 2. チャット履歴へアウトバウンドメッセージとして記録
            try {
                const { recordLineChatMessage } = await import('@/lib/line-chat-service');
                await recordLineChatMessage({
                    lineUserId,
                    displayName: studentName,
                    direction: 'outbound',
                    senderType: 'system_auto',
                    messageType: 'text',
                    messageText: personalizedMessage,
                    senderLabel: '追加1時間フォロー自動配信',
                    isRead: true,
                    status: 'sent',
                });
            } catch (chatErr) {
                console.warn('[InactiveFollowRecovery] Failed to record chat message:', chatErr);
            }

            // 3. アクティビティログへ行動監視記録
            try {
                const { recordUserActivity } = await import('@/lib/line-tracking-service');
                await recordUserActivity({
                    lineUserId,
                    displayName: studentName,
                    activityType: 'message_text',
                    activityTitle: '友だち追加1時間後 未アクション自動フォロー配信',
                    activityDetail: personalizedMessage,
                    metadata: { elapsed_minutes: elapsedMinutes }
                });
            } catch (actErr) {
                console.warn('[InactiveFollowRecovery] Failed to record activity log:', actErr);
            }

            console.log(`[InactiveFollowRecovery] Sent 1-hour follow to: ${studentName} (${lineUserId}, ${elapsedMinutes}m elapsed)`);

            details.push({
                lineUserId,
                studentName,
                action: 'sent',
                elapsedMinutes,
            });
        } else {
            failedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'failed',
                reason: sendResult.error,
                elapsedMinutes,
            });
        }

        await new Promise(r => setTimeout(r, 80));
    }

    return {
        processedCount: (candidates || []).length,
        successCount,
        skippedCount,
        failedCount,
        mode: recoveryMode,
        details,
    };
}


// ==============================================================================
// 15. フォーム確認後未申込（ホット離脱者）即時自動フォロー処理
// ==============================================================================

export const DEFAULT_CONFIRM_ABANDON_TEMPLATE = 
`{{name}} 様、Swim Partners事務局です🏊‍♂️
体験レッスン予約フォームのご入力内容をご確認いただきありがとうございます！

入力の途中でご不明な点やお困りごとはございませんでしたでしょうか？

「希望の日時や場所をもう少し詳しく相談したい」
「レッスンの進め方について事前に聞いておきたい」

など、どんな些細なことでも構いませんので、このLINEチャットにそのままお気軽にご返信ください😊
専任のスタッフが個別にご案内・調整いたします✨

▼ 続きから体験レッスンを申し込む場合はこちら
{{trial_url}}`;

export interface ProcessConfirmAbandonmentOptions {
    dryRun?: boolean;
    nowDate?: Date;
    targetLineUserId?: string;
    forceSend?: boolean;
}

export interface ProcessConfirmAbandonmentResult {
    processedCount: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
    isOutsideHours?: boolean;
    mode: string;
    details: Array<{
        lineUserId: string;
        studentName?: string;
        action: 'sent' | 'skipped' | 'dry_run' | 'failed';
        reason?: string;
        elapsedMinutes?: number;
    }>;
}

/**
 * フォーム確認後未申込（ホット離脱者）への即時自動フォロー配信を実行します。
 * 
 * 判定条件:
 *   1. フォーム確認画面閲覧タグ（trial_form_confirmed）保有
 *   2. 体験申込完了タグ（trial_applied）未保有
 *   3. 確認後即時フォロー送信済タグ（confirm_abandon_recovery_sent）未保有
 *   4. 確認画面到達または離脱から3分以上経過（即座に離脱を検知した最短猶予）
 *   5. 配信時間帯ガード: JST 8:00〜21:30
 *   6. 安全ガード: test_onlyモード時は会員番号0035（テスト太郎）のみ送信
 */
export async function processConfirmAbandonmentReminders(
    options: ProcessConfirmAbandonmentOptions = {}
): Promise<ProcessConfirmAbandonmentResult> {
    const { dryRun = false, nowDate = new Date(), targetLineUserId, forceSend = false } = options;
    const supabase = createAdminClient();

    // 1. 配信時間帯ガード判定 (JST 8:00〜21:30: 入力直後のホットリードのため朝から夜まで幅広く即時対応)
    const jstDate = new Date(nowDate.getTime() + 9 * 60 * 60 * 1000);
    const jstHour = jstDate.getUTCHours();
    const jstMinute = jstDate.getUTCMinutes();
    const jstMinutesOfDay = jstHour * 60 + jstMinute;

    // 8:00 = 480分, 21:30 = 1290分
    if (!forceSend && (jstMinutesOfDay < 480 || jstMinutesOfDay > 1290)) {
        console.log(`[ConfirmRecovery] JST時間帯ガード作動: 現在JST ${jstHour}:${String(jstMinute).padStart(2, '0')}のため配信を停止します（配信許可: 8:00〜21:30）`);
        return {
            processedCount: 0,
            successCount: 0,
            skippedCount: 0,
            failedCount: 0,
            isOutsideHours: true,
            mode: 'test_only',
            details: [],
        };
    }

    // 2. 稼働モードの取得（デフォルト: test_only）
    const { data: modeConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'line_confirm_recovery_mode')
        .maybeSingle();

    const rawMode = modeConfig?.value?.trim().toLowerCase();
    const recoveryMode = rawMode === 'active' || rawMode === 'live' ? 'active' : 'test_only';
    const isTestOnly = recoveryMode === 'test_only';

    // 3. メッセージテンプレート取得
    const { data: templateConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'line_confirm_recovery_template')
        .maybeSingle();

    const templateText = templateConfig?.value?.trim() || DEFAULT_CONFIRM_ABANDON_TEMPLATE;

    // 4. 全ユーザータグの取得
    const allUserTags = await getAllUserTags();

    // ユーザー毎のタグ集合と最新確認・離脱日時をマッピング
    const userCandidateMap = new Map<string, {
        lineUserId: string;
        tags: Set<string>;
        confirmedAt: Date | null;
        abandonedAt: Date | null;
        displayName?: string;
    }>();

    for (const tag of allUserTags) {
        if (!tag.line_user_id) continue;
        let entry = userCandidateMap.get(tag.line_user_id);
        if (!entry) {
            entry = {
                lineUserId: tag.line_user_id,
                tags: new Set<string>(),
                confirmedAt: null,
                abandonedAt: null,
                displayName: tag.display_name || undefined,
            };
            userCandidateMap.set(tag.line_user_id, entry);
        }

        entry.tags.add(tag.tag_name);
        if (tag.display_name && !entry.displayName) {
            entry.displayName = tag.display_name;
        }

        // trial_form_confirmed の日時・離脱日時取得
        if (tag.tag_name === STANDARD_TAGS.FORM_CONFIRMED) {
            const confDateStr = tag.metadata?.last_confirmed_at || tag.metadata?.first_confirmed_at || tag.created_at;
            if (confDateStr) {
                const parsed = new Date(confDateStr);
                if (!isNaN(parsed.getTime())) {
                    if (!entry.confirmedAt || parsed.getTime() > entry.confirmedAt.getTime()) {
                        entry.confirmedAt = parsed;
                    }
                }
            }
            const abandonDateStr = tag.metadata?.abandoned_at;
            if (abandonDateStr) {
                const parsedAb = new Date(abandonDateStr);
                if (!isNaN(parsedAb.getTime())) {
                    if (!entry.abandonedAt || parsedAb.getTime() > entry.abandonedAt.getTime()) {
                        entry.abandonedAt = parsedAb;
                    }
                }
            }
        }
    }

    // 5. 候補者の判定と配信処理
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: ProcessConfirmAbandonmentResult['details'] = [];

    const candidates = Array.from(userCandidateMap.values());

    for (const candidate of candidates) {
        const { lineUserId, tags, confirmedAt, abandonedAt } = candidate;

        // 条件1: フォーム確認タグ（trial_form_confirmed）を保有していること
        if (!tags.has(STANDARD_TAGS.FORM_CONFIRMED)) {
            continue;
        }

        // 条件2: 未申込であること（trial_applied 未保有）
        if (tags.has(STANDARD_TAGS.FORM_APPLIED)) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'already_applied',
            });
            continue;
        }

        // 条件3: 未フォローであること（confirm_abandon_recovery_sent 未保有）
        if (tags.has(STANDARD_TAGS.CONFIRM_ABANDON_RECOVERY_SENT)) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'already_confirm_recovery_sent',
            });
            continue;
        }

        // 条件4: 離脱または確認からの経過時間判定
        // 離脱ビーコン（abandonedAt）がある場合は1分以上経過で即送信、確認のみの場合は3分以上経過で離脱と判定
        const targetEventDate = abandonedAt || confirmedAt;
        if (!targetEventDate) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'confirmed_at_missing',
            });
            continue;
        }

        const elapsedMs = nowDate.getTime() - targetEventDate.getTime();
        const elapsedMinutes = elapsedMs / (1000 * 60);

        // 離脱ビーコンありなら1分以上、確認のみなら3分以上。上限は48時間（2880分）以内
        const minRequiredMinutes = abandonedAt ? 1.0 : 3.0;
        if (elapsedMinutes < minRequiredMinutes || elapsedMinutes > 2880) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: `elapsed_out_of_range (${elapsedMinutes.toFixed(1)}m, required >= ${minRequiredMinutes}m)`,
                elapsedMinutes,
            });
            continue;
        }

        // 生徒情報の照会
        let student: any = null;
        try {
            const { data } = await supabase
                .from('students')
                .select(`
                    id,
                    student_number,
                    full_name,
                    status,
                    coach:coach_id(full_name),
                    membership_type:membership_type_id(name)
                `)
                .eq('line_user_id', lineUserId)
                .maybeSingle();
            student = data;
        } catch {}

        // すでに本入会・申込・退会の生徒は安全スキップ
        if (student && student.student_number !== TEST_TARO_STUDENT_NUMBER) {
            if (student.status === 'active' || student.status === 'applied' || student.status === 'withdrawn') {
                skippedCount++;
                details.push({
                    lineUserId,
                    studentName: student.full_name,
                    action: 'skipped',
                    reason: `student_already_${student.status}`,
                    elapsedMinutes,
                });
                continue;
            }
        }

        // 【最重要安全ガード】: test_only モード時はテスト太郎（0035）以外を完全にスキップ（forceSend時は手動実行許可）
        if (isTestOnly && !forceSend) {
            const isTestUserId = lineUserId === TEST_TARO_LINE_USER_ID;
            const isTestStudentNumber = student?.student_number === TEST_TARO_STUDENT_NUMBER;

            if (!isTestUserId && !isTestStudentNumber) {
                skippedCount++;
                details.push({
                    lineUserId,
                    studentName: student?.full_name || candidate.displayName,
                    action: 'skipped',
                    reason: 'test_only_mode_guard',
                    elapsedMinutes,
                });
                console.log(`[ConfirmRecovery] 安全ガード作動 (test_onlyモード): 実ユーザーへの配信をスキップしました (LINE ID: ${lineUserId})`);
                continue;
            }
        }

        const studentName = student?.full_name || candidate.displayName || 'お客様';

        // dryRunモードの場合の処理
        if (dryRun) {
            successCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'dry_run',
                reason: 'simulated_send_success',
                elapsedMinutes,
            });
            continue;
        }

        // 変数の準備（LINEアカウント情報を確実に引き継ぐためLIFF/userId付きURLを生成）
        const trialLiffId = process.env.NEXT_PUBLIC_TRIAL_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID;
        const personalizedTrialUrl = trialLiffId
            ? `https://liff.line.me/${trialLiffId}`
            : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://member.swim-partners.com'}/trial?userId=${encodeURIComponent(lineUserId)}`;

        const variables: Record<string, string> = {
            name: studentName,
            student_number: student?.student_number || '',
            coach_name: student?.coach?.full_name || '',
            plan_name: student?.membership_type?.name || '',
            trial_url: personalizedTrialUrl,
        };

        // メッセージの動的自然化（Gemini連携、失敗時は安全フォールバック）
        let finalMessage = templateText;
        try {
            const { generateNaturalStepMessage } = await import('@/lib/line-step-gemini');
            const naturalResult = await generateNaturalStepMessage({
                stepStage: 0, // 0 = フォーム確認後即時フォロー
                customerName: studentName,
                originalTemplateText: templateText,
                trialUrl: personalizedTrialUrl,
                customInstructions: '体験申込フォームで入力内容の確認画面まで進んでいただいた直後のフォローです。お申し込み途中で日程や場所、レッスン内容について迷われたりお困りではなかったかを優しく気遣い、このLINEチャットで気軽に相談・調整できることを専任スタッフとして温かく伝えてください。',
            });
            if (naturalResult.text) {
                finalMessage = naturalResult.text;
            }
        } catch (geminiErr) {
            console.warn('[ConfirmRecovery] Gemini naturalization skipped, using template:', geminiErr);
        }

        // LINE送信処理
        const sendResult = await sendSingleLineMessage({
            studentId: student?.id,
            studentNumber: student?.student_number,
            studentName,
            lineUserId,
            rawMessage: finalMessage,
            variables,
            deliveryType: 'confirm_abandon_recovery',
            stepName: 'フォーム確認後未申込 即時フォロー',
        });

        if (sendResult.success) {
            successCount++;

            // 1. スパム防止調停: 即時フォロー送信時、後続のステップ配信予定を24時間後ろ倒し
            try {
                const stepLeadState = await getStepLeadState(lineUserId);
                if (stepLeadState && stepLeadState.next_send_at && stepLeadState.step_stage !== -1 && !stepLeadState.is_blocked) {
                    const currentNextDate = new Date(stepLeadState.next_send_at);
                    const baseTime = currentNextDate.getTime() > nowDate.getTime()
                        ? currentNextDate.getTime()
                        : nowDate.getTime();
                    const delayedNextDate = new Date(baseTime + 24 * 60 * 60 * 1000);

                    await saveStepLeadState({
                        ...stepLeadState,
                        next_send_at: delayedNextDate.toISOString(),
                        notes: `${stepLeadState.notes ? stepLeadState.notes + ' | ' : ''}フォーム確認後即時フォロー送信のため次回ステップ配信を24時間後ろ倒し`,
                    });
                    console.log(`[ConfirmRecovery] スパム防止調停適用: LINE ID ${lineUserId} の次回ステップ配信予定を後ろ倒ししました`);
                }
            } catch (stepErr) {
                console.error(`[ConfirmRecovery] スパム防止調停エラー (LINE ID: ${lineUserId}):`, stepErr);
            }

            // 2. confirm_abandon_recovery_sent タグを付与
            try {
                await addTagToUser(lineUserId, STANDARD_TAGS.CONFIRM_ABANDON_RECOVERY_SENT, {
                    category: 'automation',
                    displayName: studentName,
                    studentId: student?.id,
                    metadata: {
                        sent_at: nowDate.toISOString(),
                        elapsed_minutes: Math.round(elapsedMinutes * 10) / 10,
                    },
                });
            } catch (tagErr) {
                console.error(`[ConfirmRecovery] confirm_abandon_recovery_sent タグ付与失敗 (${lineUserId}):`, tagErr);
            }

            details.push({
                lineUserId,
                studentName,
                action: 'sent',
                elapsedMinutes,
            });
        } else {
            failedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'failed',
                reason: sendResult.error,
                elapsedMinutes,
            });
        }

        await new Promise(r => setTimeout(r, 50));
    }

    return {
        processedCount: candidates.length,
        successCount,
        skippedCount,
        failedCount,
        mode: recoveryMode,
        details,
    };
}

// ==============================================================================
// 16. 体験申込の確認画面離脱 30分後リマインド配信処理 (task-20261115-001)
// ==============================================================================

export const CONFIRM_30M_FOLLOWUP_ENABLED_KEY = 'line_confirm_30m_followup_enabled';
export const CONFIRM_30M_FOLLOWUP_MODE_KEY = 'line_confirm_30m_followup_mode';
export const CONFIRM_30M_FOLLOWUP_TEMPLATE_KEY = 'line_confirm_30m_followup_template';

export const DEFAULT_CONFIRM_30M_FOLLOWUP_TEMPLATE =
`{{name}}様
体験レッスンのお申し込み、ありがとうございます。
「やってみたい」と思って入力を進めてくださったこと、とても嬉しく思います。
あと少しで完了のところでした。入力いただいた内容はそのまま残っていますので、こちらから続きをご入力いただけます。
▼続きから申し込む
{{form_url}}
「うちの子に合うかな」「泳げなくても大丈夫かな」など、気になることがあれば、このトークにそのまま返信ください。一つずつ一緒に確認しながら進めましょう。`;

export interface ProcessConfirm30MinFollowupOptions {
    dryRun?: boolean;
    nowDate?: Date;
    targetLineUserId?: string;
    forceSend?: boolean;
    allowTestUsersInTestOnly?: boolean;
}

export interface ProcessConfirm30MinFollowupResult {
    processedCount: number;
    successCount: number;
    skippedCount: number;
    failedCount: number;
    enabled: boolean;
    mode: 'active' | 'test_only' | 'paused';
    details: Array<{
        lineUserId: string;
        studentName?: string;
        action: 'sent' | 'skipped' | 'dry_run' | 'failed';
        reason?: string;
        elapsedMinutes?: number;
        confirmedAt?: string;
    }>;
}

/**
 * 体験申込フォームで確認画面まで入力して申込を完了しなかったユーザーへ、
 * 離脱（確認画面到達）の30分後に再開を促すLINEメッセージを1回だけ自動送信する。
 *
 * 要件:
 *   3.1 トリガーとタイミング:
 *       - 対象イベント: 確認画面到達（trial_confirm 到達記録 / trial_form_confirmed「フォーム確認済未申込」タグ付与）
 *       - 到達から30分後に送信（30分以上経過）
 *       - 1ユーザーにつき同一離脱には1回まで（再度フォームを開いて再度確認画面で離脱した場合は新しい起点としてよい）
 *   3.2 送信直前の除外判定（必須）:
 *       送信直前に最新状態を再確認し、以下のいずれかなら送信しない:
 *       (a) 申込完了している（trial_applied タグ、students.status が申込・体験以降、leads 登録済、または line_access_logs.is_converted）
 *       (b) 本入会済み（active）または退会済み（withdrawn）
 *       (c) 本30分フォローを当該離脱に対して送信済み（confirm_30m_followup_sent タグの sent_for_confirmed_at / sent_at により冪等管理）
 *   3.3 文面:
 *       登録済み文面と同一を使用（{{name}} と {{form_url}} / {{trial_url}} 両対応）
 */
export const CONFIRM_STEP1_AUTO_PAUSED_KEY = 'line_confirm_step1_auto_paused_20261120';
let hasCheckedConfirmStep1PauseInMemory = false;

/**
 * 30分後リマインド有効化に伴い、同文面で重複するステップ配信シナリオ「フォーム確認済未申込 (trial_form_confirmed)」の
 * Step 1（確認当日18:00 / step_order = 1）を1回限り自動で停止（is_active = false）する。
 * Step 2（翌日18:00 / step_order = 2）は有効のまま維持する。
 */
export async function ensureConfirmStep1PausedOnce(): Promise<void> {
    if (hasCheckedConfirmStep1PauseInMemory) return;
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    try {
        const { data: flagRow } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', CONFIRM_STEP1_AUTO_PAUSED_KEY)
            .maybeSingle();

        if (flagRow?.value) {
            hasCheckedConfirmStep1PauseInMemory = true;
            return;
        }

        // 1. DBテーブル line_step_rules の trial_form_confirmed Step 1 のみを停止（Step 2 以降は触らない）
        try {
            await supabase
                .from('line_step_rules')
                .update({ is_active: false, updated_at: nowIso })
                .eq('target_tag', 'trial_form_confirmed')
                .eq('step_order', 1);
        } catch {}

        // 2. app_configs フォールバック (line_step_rules_data_v1) 側も同様に Step 1 のみ停止
        try {
            const { data: fbCfg } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'line_step_rules_data_v1')
                .maybeSingle();

            if (fbCfg?.value) {
                const rules = JSON.parse(fbCfg.value);
                if (Array.isArray(rules)) {
                    let changed = false;
                    const updatedRules = rules.map((r: any) => {
                        if (r && r.targetTag === 'trial_form_confirmed' && Number(r.stepOrder) === 1 && r.isActive !== false) {
                            changed = true;
                            return { ...r, isActive: false, updatedAt: nowIso };
                        }
                        return r;
                    });
                    if (changed) {
                        await supabase
                            .from('app_configs')
                            .upsert(
                                {
                                    key: 'line_step_rules_data_v1',
                                    value: JSON.stringify(updatedRules),
                                    updated_at: nowIso,
                                },
                                { onConflict: 'key' }
                            );
                    }
                }
            }
        } catch {}

        await supabase
            .from('app_configs')
            .upsert(
                {
                    key: CONFIRM_STEP1_AUTO_PAUSED_KEY,
                    value: nowIso,
                    updated_at: nowIso,
                },
                { onConflict: 'key' }
            );

        hasCheckedConfirmStep1PauseInMemory = true;
    } catch (err) {
        console.warn('[ensureConfirmStep1PausedOnce] Warning:', err);
    }
}

export async function processConfirm30MinFollowupReminders(
    options: ProcessConfirm30MinFollowupOptions = {}
): Promise<ProcessConfirm30MinFollowupResult> {
    const {
        dryRun = false,
        nowDate = new Date(),
        targetLineUserId,
        forceSend = false,
        allowTestUsersInTestOnly = false,
    } = options;
    const supabase = createAdminClient();

    // 既存ステップ配信「フォーム確認済未申込」Step 1（当日18:00）の自動停止（初回1回のみ・Step 2は有効維持）
    await ensureConfirmStep1PausedOnce();

    // 1. 有効/無効および稼働モード設定の取得
    const { data: configRows } = await supabase
        .from('app_configs')
        .select('key, value')
        .in('key', [
            CONFIRM_30M_FOLLOWUP_ENABLED_KEY,
            CONFIRM_30M_FOLLOWUP_MODE_KEY,
            CONFIRM_30M_FOLLOWUP_TEMPLATE_KEY,
        ]);

    const cfgMap = new Map<string, string>();
    for (const r of configRows || []) {
        if (r.key && r.value !== null && r.value !== undefined) {
            cfgMap.set(r.key, String(r.value));
        }
    }

    const enabledVal = cfgMap.get(CONFIRM_30M_FOLLOWUP_ENABLED_KEY)?.trim().toLowerCase();
    // デフォルトは有効（管理画面から false / paused に切り替え可能）
    const isEnabled = enabledVal !== 'false' && enabledVal !== '0' && enabledVal !== 'paused';

    if (!isEnabled && !forceSend) {
        return {
            processedCount: 0,
            successCount: 0,
            skippedCount: 0,
            failedCount: 0,
            enabled: false,
            mode: 'paused',
            details: [],
        };
    }

    const rawMode = cfgMap.get(CONFIRM_30M_FOLLOWUP_MODE_KEY)?.trim().toLowerCase();
    const recoveryMode: 'active' | 'test_only' = rawMode === 'test_only' ? 'test_only' : 'active';
    const isTestOnly = recoveryMode === 'test_only';

    const templateText = cfgMap.get(CONFIRM_30M_FOLLOWUP_TEMPLATE_KEY)?.trim() || DEFAULT_CONFIRM_30M_FOLLOWUP_TEMPLATE;

    // 2. 全ユーザータグおよび直近アクセスログから候補者を収集
    const allUserTags = await getAllUserTags();

    const userCandidateMap = new Map<string, {
        lineUserId: string;
        tags: Set<string>;
        confirmedAt: Date | null;
        appliedAt: Date | null;
        followupSentAt: Date | null;
        followupSentForConfirmedAt: Date | null;
        displayName?: string;
    }>();

    for (const tag of allUserTags) {
        if (!tag.line_user_id) continue;
        let entry = userCandidateMap.get(tag.line_user_id);
        if (!entry) {
            entry = {
                lineUserId: tag.line_user_id,
                tags: new Set<string>(),
                confirmedAt: null,
                appliedAt: null,
                followupSentAt: null,
                followupSentForConfirmedAt: null,
                displayName: tag.display_name || undefined,
            };
            userCandidateMap.set(tag.line_user_id, entry);
        }

        entry.tags.add(tag.tag_name);
        if (tag.display_name && !entry.displayName) {
            entry.displayName = tag.display_name;
        }

        // 確認画面到達日時（trial_form_confirmed）の取得
        // 再度フォームを開いて再度確認画面に到達した場合は metadata (last_confirmed_at / confirmed_at / abandoned_at / first_confirmed_at) の最新日時を優先し、未設定時のみ created_at をフォールバック使用する
        if (tag.tag_name === STANDARD_TAGS.FORM_CONFIRMED) {
            const metaDates = [
                tag.metadata?.last_confirmed_at,
                tag.metadata?.confirmed_at,
                tag.metadata?.abandoned_at,
                tag.metadata?.first_confirmed_at,
            ].filter(Boolean);
            const candidateDates = metaDates.length > 0 ? metaDates : [tag.created_at].filter(Boolean);

            for (const dStr of candidateDates) {
                const parsed = new Date(dStr);
                if (!isNaN(parsed.getTime())) {
                    if (!entry.confirmedAt || parsed.getTime() > entry.confirmedAt.getTime()) {
                        entry.confirmedAt = parsed;
                    }
                }
            }
        }

        // 申込完了タグ（trial_applied）の日時取得
        if (tag.tag_name === STANDARD_TAGS.FORM_APPLIED) {
            const appDateStr = tag.metadata?.applied_at || tag.created_at;
            if (appDateStr) {
                const parsed = new Date(appDateStr);
                if (!isNaN(parsed.getTime())) {
                    if (!entry.appliedAt || parsed.getTime() > entry.appliedAt.getTime()) {
                        entry.appliedAt = parsed;
                    }
                }
            }
        }

        // 30分フォロー送信済タグ（confirm_30m_followup_sent）の日時取得
        if (tag.tag_name === STANDARD_TAGS.CONFIRM_30M_FOLLOWUP_SENT) {
            const sentDateStr = tag.metadata?.sent_at || tag.created_at;
            if (sentDateStr) {
                const parsed = new Date(sentDateStr);
                if (!isNaN(parsed.getTime())) {
                    if (!entry.followupSentAt || parsed.getTime() > entry.followupSentAt.getTime()) {
                        entry.followupSentAt = parsed;
                    }
                }
            }
            const sentForConfStr = tag.metadata?.sent_for_confirmed_at;
            if (sentForConfStr) {
                const parsed = new Date(sentForConfStr);
                if (!isNaN(parsed.getTime())) {
                    if (!entry.followupSentForConfirmedAt || parsed.getTime() > entry.followupSentForConfirmedAt.getTime()) {
                        entry.followupSentForConfirmedAt = parsed;
                    }
                }
            }
        }
    }

    // line_access_logs（および app_configs フォールバック）の trial_confirm 記録からも確認画面到達日時を補完
    try {
        const { data: confirmLogs, error: logErr } = await supabase
            .from('line_access_logs')
            .select('line_user_id, created_at, display_name, form_type, is_converted, metadata')
            .eq('form_type', 'trial_confirm')
            .order('created_at', { ascending: false })
            .limit(300);

        let logsToProcess: any[] = [];
        if (!logErr && confirmLogs) {
            logsToProcess = confirmLogs;
        } else {
            const { data: fbLogs } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'line_tracking_logs_v1')
                .maybeSingle();
            if (fbLogs?.value) {
                try {
                    const parsedLogs: any[] = JSON.parse(fbLogs.value);
                    logsToProcess = parsedLogs.filter(l => l.form_type === 'trial_confirm');
                } catch {}
            }
        }

        for (const log of logsToProcess) {
            if (!log.line_user_id) continue;
            let entry = userCandidateMap.get(log.line_user_id);
            if (!entry) {
                entry = {
                    lineUserId: log.line_user_id,
                    tags: new Set<string>([STANDARD_TAGS.FORM_CONFIRMED]),
                    confirmedAt: null,
                    appliedAt: null,
                    followupSentAt: null,
                    followupSentForConfirmedAt: null,
                    displayName: log.display_name || undefined,
                };
                userCandidateMap.set(log.line_user_id, entry);
            } else {
                entry.tags.add(STANDARD_TAGS.FORM_CONFIRMED);
            }

            const logDateStr = log.metadata?.confirmed_at || log.created_at;
            if (logDateStr) {
                const logDate = new Date(logDateStr);
                if (!isNaN(logDate.getTime())) {
                    if (!entry.confirmedAt || logDate.getTime() > entry.confirmedAt.getTime()) {
                        entry.confirmedAt = logDate;
                    }
                }
            }
            if (log.is_converted) {
                entry.tags.add(STANDARD_TAGS.FORM_APPLIED);
            }
            if (log.display_name && !entry.displayName) {
                entry.displayName = log.display_name;
            }
        }
    } catch {
        // アクセスログ参照失敗時はタグ情報のみで継続
    }

    let candidates = Array.from(userCandidateMap.values());
    if (targetLineUserId) {
        candidates = candidates.filter(c => c.lineUserId === targetLineUserId);
    }

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: ProcessConfirm30MinFollowupResult['details'] = [];

    for (const candidate of candidates) {
        const { lineUserId, tags, confirmedAt } = candidate;

        // トリガー条件: 確認画面到達（trial_form_confirmed）していること
        if (!tags.has(STANDARD_TAGS.FORM_CONFIRMED)) {
            continue;
        }

        if (!confirmedAt) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: 'confirmed_at_missing',
            });
            continue;
        }

        const confirmedAtIso = confirmedAt.toISOString();
        const elapsedMs = nowDate.getTime() - confirmedAt.getTime();
        const elapsedMinutes = elapsedMs / (1000 * 60);

        // 要件3.1 タイミング判定: 到達から30分後に送信（30分未満は未到来のためスキップ、上限は48時間＝2880分）
        if (!forceSend && (elapsedMinutes < 30 || elapsedMinutes > 2880)) {
            skippedCount++;
            details.push({
                lineUserId,
                action: 'skipped',
                reason: elapsedMinutes < 30
                    ? `not_yet_30m (${elapsedMinutes.toFixed(1)}m < 30m)`
                    : `expired_over_48h (${elapsedMinutes.toFixed(1)}m)`,
                elapsedMinutes,
                confirmedAt: confirmedAtIso,
            });
            continue;
        }

        // =========================================================================
        // 要件3.2: 送信直前の最新状態再確認による除外判定（必須）
        // =========================================================================

        // 最新タグ一覧をDB/フォールバックから直前再取得して検証
        const freshAllTags = await getAllUserTags();
        const freshUserTags = freshAllTags.filter(t => t.line_user_id === lineUserId);
        const freshTagNames = new Set(freshUserTags.map(t => t.tag_name));

        // 最新の confirmedAt を再算出（別プロセスで更新された場合の整合性担保）
        let latestConfirmedAt = confirmedAt;
        const freshConfirmTag = freshUserTags.find(t => t.tag_name === STANDARD_TAGS.FORM_CONFIRMED);
        if (freshConfirmTag) {
            const freshMetaDates = [
                freshConfirmTag.metadata?.last_confirmed_at,
                freshConfirmTag.metadata?.confirmed_at,
                freshConfirmTag.metadata?.abandoned_at,
                freshConfirmTag.metadata?.first_confirmed_at,
            ].filter(Boolean);
            const freshCandidateDates = freshMetaDates.length > 0 ? freshMetaDates : [freshConfirmTag.created_at].filter(Boolean);
            for (const dStr of freshCandidateDates) {
                const p = new Date(dStr);
                if (!isNaN(p.getTime()) && p.getTime() > latestConfirmedAt.getTime()) {
                    latestConfirmedAt = p;
                }
            }
        }

        // (c) 本30分フォローを送信済みか判定（同一離脱には1回まで。再度フォームを開いて再度離脱した場合は新しい起点としてよい）
        const freshSentTag = freshUserTags.find(t => t.tag_name === STANDARD_TAGS.CONFIRM_30M_FOLLOWUP_SENT);
        if (freshSentTag) {
            const sentAtStr = freshSentTag.metadata?.sent_at || freshSentTag.created_at;
            const sentForConfStr = freshSentTag.metadata?.sent_for_confirmed_at;
            const sentAtDate = sentAtStr ? new Date(sentAtStr) : null;
            const sentForConfDate = sentForConfStr ? new Date(sentForConfStr) : null;

            const isAlreadySentForThisAbandon =
                (sentForConfDate && !isNaN(sentForConfDate.getTime()) && sentForConfDate.getTime() >= latestConfirmedAt.getTime()) ||
                (sentAtDate && !isNaN(sentAtDate.getTime()) && sentAtDate.getTime() >= latestConfirmedAt.getTime());

            if (isAlreadySentForThisAbandon) {
                skippedCount++;
                details.push({
                    lineUserId,
                    action: 'skipped',
                    reason: 'already_confirm_30m_followup_sent',
                    elapsedMinutes,
                    confirmedAt: latestConfirmedAt.toISOString(),
                });
                continue;
            }
        }

        // 配信ログ（line_delivery_logs / フォールバック）でも当該離脱以降に confirm_30m_followup が送信済みでないか二重チェック
        try {
            const { data: recentSentLogs, error: sentLogErr } = await supabase
                .from('line_delivery_logs')
                .select('id, sent_at, status, delivery_type, step_name')
                .eq('line_user_id', lineUserId)
                .in('status', ['sent', 'success'])
                .gte('sent_at', latestConfirmedAt.toISOString())
                .limit(20);

            let matchingLogFound = false;
            if (!sentLogErr && recentSentLogs) {
                matchingLogFound = recentSentLogs.some(
                    l => l.delivery_type === 'confirm_30m_followup' || l.step_name === '確認画面離脱30分後フォロー'
                );
            } else {
                const { data: fbLogCfg } = await supabase
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'line_delivery_logs_data_v1')
                    .maybeSingle();
                if (fbLogCfg?.value) {
                    try {
                        const fbLogs: any[] = JSON.parse(fbLogCfg.value);
                        matchingLogFound = fbLogs.some(
                            l =>
                                l.line_user_id === lineUserId &&
                                (l.status === 'sent' || l.status === 'success') &&
                                (l.delivery_type === 'confirm_30m_followup' || l.step_name === '確認画面離脱30分後フォロー') &&
                                l.sent_at &&
                                new Date(l.sent_at).getTime() >= latestConfirmedAt.getTime()
                        );
                    } catch {}
                }
            }

            if (matchingLogFound) {
                skippedCount++;
                details.push({
                    lineUserId,
                    action: 'skipped',
                    reason: 'already_confirm_30m_followup_sent_in_logs',
                    elapsedMinutes,
                    confirmedAt: latestConfirmedAt.toISOString(),
                });
                continue;
            }
        } catch {}

        // (a)-1 タグによる申込完了判定（trial_applied タグが存在し、確認到達以降または既に付与されている場合）
        if (freshTagNames.has(STANDARD_TAGS.FORM_APPLIED)) {
            const freshAppliedTag = freshUserTags.find(t => t.tag_name === STANDARD_TAGS.FORM_APPLIED);
            const appliedAtStr = freshAppliedTag?.metadata?.applied_at || freshAppliedTag?.created_at;
            const appliedAtDate = appliedAtStr ? new Date(appliedAtStr) : null;
            // trial_applied タグを保有していれば申込完了とみなす（再度確認到達した場合でも applied_at >= confirmed_at またはタグ保持中は除外）
            if (!appliedAtDate || isNaN(appliedAtDate.getTime()) || appliedAtDate.getTime() >= latestConfirmedAt.getTime() || freshTagNames.has(STANDARD_TAGS.FORM_APPLIED)) {
                skippedCount++;
                details.push({
                    lineUserId,
                    action: 'skipped',
                    reason: 'already_applied_tag',
                    elapsedMinutes,
                    confirmedAt: latestConfirmedAt.toISOString(),
                });
                continue;
            }
        }

        // 生徒情報の直前照会（students テーブル）
        let student: any = null;
        try {
            const { data } = await supabase
                .from('students')
                .select(`
                    id,
                    student_number,
                    full_name,
                    status,
                    coach:coach_id(full_name),
                    membership_type:membership_type_id(name)
                `)
                .eq('line_user_id', lineUserId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            student = data;
        } catch {}

        // (b) 本入会済み（active）または退会済み（withdrawn）の除外判定（テスト太郎を含む全ユーザーで厳格適用）
        if (student && (student.status === 'active' || student.status === 'withdrawn')) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName: student.full_name,
                action: 'skipped',
                reason: `student_status_${student.status}`,
                elapsedMinutes,
                confirmedAt: latestConfirmedAt.toISOString(),
            });
            continue;
        }

        // (a)-2 生徒ステータスによる申込完了判定（applied, trial_pending, trial_confirmed, trial_billed, trial_done）
        const appliedStatuses = ['applied', 'trial_pending', 'trial_confirmed', 'trial_billed', 'trial_done'];
        if (student && appliedStatuses.includes(student.status)) {
            skippedCount++;
            details.push({
                lineUserId,
                studentName: student.full_name,
                action: 'skipped',
                reason: `student_already_${student.status}`,
                elapsedMinutes,
                confirmedAt: latestConfirmedAt.toISOString(),
            });
            continue;
        }

        // (a)-3 leads テーブルで確認画面到達以降に申込レコードが作成・更新されていないか直前確認
        try {
            const { data: recentLead } = await supabase
                .from('leads')
                .select('id, status, created_at, updated_at')
                .eq('line_user_id', lineUserId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (recentLead) {
                const leadTime = Math.max(
                    recentLead.created_at ? new Date(recentLead.created_at).getTime() : 0,
                    recentLead.updated_at ? new Date(recentLead.updated_at).getTime() : 0
                );
                if (leadTime >= latestConfirmedAt.getTime()) {
                    skippedCount++;
                    details.push({
                        lineUserId,
                        studentName: student?.full_name || candidate.displayName,
                        action: 'skipped',
                        reason: 'already_applied_in_leads',
                        elapsedMinutes,
                        confirmedAt: latestConfirmedAt.toISOString(),
                    });
                    continue;
                }
            }
        } catch {}

        // (a)-4 line_access_logs で is_converted = true になっていないか直前確認
        try {
            const { data: convLogs, error: convErr } = await supabase
                .from('line_access_logs')
                .select('id, is_converted, converted_at, created_at')
                .eq('line_user_id', lineUserId)
                .eq('is_converted', true)
                .order('created_at', { ascending: false })
                .limit(1);

            let isConverted = false;
            if (!convErr && convLogs && convLogs.length > 0) {
                const convTime = new Date(convLogs[0].converted_at || convLogs[0].created_at).getTime();
                if (convTime >= latestConfirmedAt.getTime()) {
                    isConverted = true;
                }
            } else {
                const { data: fbLogs } = await supabase
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'line_tracking_logs_v1')
                    .maybeSingle();
                if (fbLogs?.value) {
                    try {
                        const parsedLogs: any[] = JSON.parse(fbLogs.value);
                        isConverted = parsedLogs.some(
                            l =>
                                l.line_user_id === lineUserId &&
                                l.is_converted === true &&
                                new Date(l.converted_at || l.created_at).getTime() >= latestConfirmedAt.getTime()
                        );
                    } catch {}
                }
            }

            if (isConverted) {
                skippedCount++;
                details.push({
                    lineUserId,
                    studentName: student?.full_name || candidate.displayName,
                    action: 'skipped',
                    reason: 'already_converted_in_access_logs',
                    elapsedMinutes,
                    confirmedAt: latestConfirmedAt.toISOString(),
                });
                continue;
            }
        } catch {}

        // 【安全ガード】: test_only モード時はテスト太郎（0035）または明示的テスト対象以外をスキップ
        if (isTestOnly && !forceSend && !allowTestUsersInTestOnly) {
            const isTestUserId = lineUserId === TEST_TARO_LINE_USER_ID;
            const isTestStudentNumber = student?.student_number === TEST_TARO_STUDENT_NUMBER;

            if (!isTestUserId && !isTestStudentNumber) {
                skippedCount++;
                details.push({
                    lineUserId,
                    studentName: student?.full_name || candidate.displayName,
                    action: 'skipped',
                    reason: 'test_only_mode_guard',
                    elapsedMinutes,
                    confirmedAt: latestConfirmedAt.toISOString(),
                });
                console.log(`[Confirm30mFollowup] 安全ガード作動 (test_onlyモード): 実ユーザーへの配信をスキップしました (LINE ID: ${lineUserId})`);
                continue;
            }
        }

        const studentName = (student?.full_name || candidate.displayName || 'お客様').trim();

        // 変数の準備（{{form_url}} と {{trial_url}} の両方に対応）
        const trialLiffId = process.env.NEXT_PUBLIC_TRIAL_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID;
        const personalizedFormUrl = trialLiffId
            ? `https://liff.line.me/${trialLiffId}`
            : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://manager.swim-partners.com'}/trial?userId=${encodeURIComponent(lineUserId)}`;

        const variables: Record<string, string> = {
            name: studentName,
            student_number: student?.student_number || '',
            coach_name: student?.coach?.full_name || '',
            plan_name: student?.membership_type?.name || '',
            form_url: personalizedFormUrl,
            trial_url: personalizedFormUrl,
        };

        // dryRunモードの場合
        if (dryRun) {
            successCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'dry_run',
                reason: 'simulated_send_success',
                elapsedMinutes,
                confirmedAt: latestConfirmedAt.toISOString(),
            });
            continue;
        }

        // 要件3.3: 登録済み文面と同一の固定テンプレートをそのまま変数置換して送信（Gemini改変なし）
        const sendResult = await sendSingleLineMessage({
            studentId: student?.id,
            studentNumber: student?.student_number,
            studentName,
            lineUserId,
            rawMessage: templateText,
            variables,
            deliveryType: 'confirm_30m_followup',
            stepName: '確認画面離脱30分後フォロー',
        });

        if (sendResult.success) {
            successCount++;

            // 1. 送信済みタグ（confirm_30m_followup_sent「確認後30分フォロー送信済」）を冪等に付与
            try {
                await addTagToUser(lineUserId, STANDARD_TAGS.CONFIRM_30M_FOLLOWUP_SENT, {
                    category: 'automation',
                    displayName: studentName,
                    studentId: student?.id,
                    metadata: {
                        sent_at: nowDate.toISOString(),
                        sent_for_confirmed_at: latestConfirmedAt.toISOString(),
                        elapsed_minutes: Math.round(elapsedMinutes * 10) / 10,
                    },
                });
            } catch (tagErr) {
                console.error(`[Confirm30mFollowup] confirm_30m_followup_sent タグ付与失敗 (${lineUserId}):`, tagErr);
            }

            // 2. スパム防止調停: 後続の友だち追加ステップ配信予定があれば24時間後ろ倒し
            try {
                const stepLeadState = await getStepLeadState(lineUserId);
                if (stepLeadState && stepLeadState.next_send_at && stepLeadState.step_stage !== -1 && !stepLeadState.is_blocked) {
                    const currentNextDate = new Date(stepLeadState.next_send_at);
                    const baseTime = currentNextDate.getTime() > nowDate.getTime()
                        ? currentNextDate.getTime()
                        : nowDate.getTime();
                    const delayedNextDate = new Date(baseTime + 24 * 60 * 60 * 1000);

                    await saveStepLeadState({
                        ...stepLeadState,
                        next_send_at: delayedNextDate.toISOString(),
                        notes: `${stepLeadState.notes ? stepLeadState.notes + ' | ' : ''}確認画面離脱30分後フォロー送信のため次回ステップ配信を24時間後ろ倒し`,
                    });
                }
            } catch (stepErr) {
                console.error(`[Confirm30mFollowup] スパム防止調停エラー (${lineUserId}):`, stepErr);
            }

            // 3. 1対1個別チャット履歴へアウトバウンドメッセージを記録
            try {
                const renderedMsg = renderLineMessage(templateText, variables);
                const { recordLineChatMessage } = await import('@/lib/line-chat-service');
                await recordLineChatMessage({
                    lineUserId,
                    displayName: studentName,
                    direction: 'outbound',
                    senderType: 'system_auto',
                    messageType: 'step_message',
                    messageText: renderedMsg,
                    senderLabel: '確認画面離脱30分後フォロー自動配信',
                    isRead: true,
                    status: 'sent',
                    metadata: {
                        deliveryType: 'confirm_30m_followup',
                        confirmedAt: latestConfirmedAt.toISOString(),
                        elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
                    },
                });
            } catch (chatErr) {
                console.warn('[Confirm30mFollowup] Failed to record chat message:', chatErr);
            }

            details.push({
                lineUserId,
                studentName,
                action: 'sent',
                elapsedMinutes,
                confirmedAt: latestConfirmedAt.toISOString(),
            });
        } else {
            failedCount++;
            details.push({
                lineUserId,
                studentName,
                action: 'failed',
                reason: sendResult.error,
                elapsedMinutes,
                confirmedAt: latestConfirmedAt.toISOString(),
            });
        }

        await new Promise(r => setTimeout(r, 50));
    }

    return {
        processedCount: candidates.length,
        successCount,
        skippedCount,
        failedCount,
        enabled: isEnabled,
        mode: recoveryMode,
        details,
    };
}

// ==============================================================================
// 17. Webhook / リクエスト便乗方式（案B）＋クライアントタイマー着火（案D）用スロットリング制御
// ==============================================================================

export const CONFIRM_30M_LAST_CHECKED_AT_KEY = 'line_confirm_30m_last_checked_at';
export const CONFIRM_30M_THROTTLE_MS = 3 * 60 * 1000; // 3分間隔スロットリング

let lastLazyConfirm30mCheckTimeMs = 0;
let isLazyConfirm30mRunning = false;

export interface TriggerLazyConfirm30MinOptions {
    nowDate?: Date;
    force?: boolean;
    targetLineUserId?: string;
    dryRun?: boolean;
}

export interface TriggerLazyConfirm30MinResult {
    triggered: boolean;
    reason?: 'already_running_in_memory' | 'throttled_in_memory' | 'throttled_in_db' | 'executed' | 'error';
    lastCheckedAt?: string;
    result?: ProcessConfirm30MinFollowupResult;
    error?: string;
}

/**
 * テスト用：メモリ上のスロットリング状態をリセットする
 */
export function resetLazyConfirm30MinThrottleForTest(): void {
    lastLazyConfirm30mCheckTimeMs = 0;
    isLazyConfirm30mRunning = false;
}

/**
 * 前回チェックから3分以上経過している場合のみ（または force / targetLineUserId 指定時）、
 * processConfirm30MinFollowupReminders() を実行するスロットリング付きラッパー。
 *
 * - 同一プロセス内のメモリキャッシュと app_configs (line_confirm_30m_last_checked_at) の2段構えで
 *   3分以内の連続リクエストによる重複チェック・DB負荷を防止します。
 * - targetLineUserId が指定された場合（案D：クライアントの30分タイマー満了によるピンポイント着火）は、
 *   全体スロットリングに阻害されず当該ユーザーの30分経過＆直前除外判定を即時実行します。
 */
export async function triggerLazyConfirm30MinFollowup(
    options: TriggerLazyConfirm30MinOptions = {}
): Promise<TriggerLazyConfirm30MinResult> {
    const {
        nowDate = new Date(),
        force = false,
        targetLineUserId,
        dryRun = false,
    } = options;

    const nowMs = nowDate.getTime();
    const isTargetedCheck = Boolean(targetLineUserId && targetLineUserId.trim());

    if (!force && !isTargetedCheck) {
        if (isLazyConfirm30mRunning) {
            return {
                triggered: false,
                reason: 'already_running_in_memory',
                lastCheckedAt: lastLazyConfirm30mCheckTimeMs
                    ? new Date(lastLazyConfirm30mCheckTimeMs).toISOString()
                    : undefined,
            };
        }

        // 1. インメモリ高速スロットリング判定（3分未満ならDBアクセスすら行わず即時スキップ）
        if (
            lastLazyConfirm30mCheckTimeMs > 0 &&
            nowMs >= lastLazyConfirm30mCheckTimeMs &&
            nowMs - lastLazyConfirm30mCheckTimeMs < CONFIRM_30M_THROTTLE_MS
        ) {
            return {
                triggered: false,
                reason: 'throttled_in_memory',
                lastCheckedAt: new Date(lastLazyConfirm30mCheckTimeMs).toISOString(),
            };
        }
    }

    const supabase = createAdminClient();

    if (!force && !isTargetedCheck) {
        // 2. サーバーレス複数インスタンス間のDBスロットリング判定（app_configs）
        try {
            const { data: cfg } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', CONFIRM_30M_LAST_CHECKED_AT_KEY)
                .maybeSingle();

            if (cfg?.value) {
                const dbLastMs = new Date(cfg.value).getTime();
                if (!isNaN(dbLastMs)) {
                    if (dbLastMs > lastLazyConfirm30mCheckTimeMs) {
                        lastLazyConfirm30mCheckTimeMs = dbLastMs;
                    }
                    if (nowMs >= dbLastMs && nowMs - dbLastMs < CONFIRM_30M_THROTTLE_MS) {
                        return {
                            triggered: false,
                            reason: 'throttled_in_db',
                            lastCheckedAt: cfg.value,
                        };
                    }
                }
            }
        } catch {
            // app_configs 参照失敗時はメモリ判定のみで続行
        }
    }

    if (!isTargetedCheck) {
        isLazyConfirm30mRunning = true;
        lastLazyConfirm30mCheckTimeMs = nowMs;

        // 後続リクエストの多重起動を防ぐため、実行開始時点で最終チェック時刻を先行記録
        try {
            await supabase
                .from('app_configs')
                .upsert(
                    {
                        key: CONFIRM_30M_LAST_CHECKED_AT_KEY,
                        value: nowDate.toISOString(),
                        updated_at: nowDate.toISOString(),
                    },
                    { onConflict: 'key' }
                );
        } catch {}
    }

    try {
        const result = await processConfirm30MinFollowupReminders({
            nowDate,
            targetLineUserId: isTargetedCheck ? targetLineUserId!.trim() : undefined,
            dryRun,
        });

        return {
            triggered: true,
            reason: 'executed',
            lastCheckedAt: nowDate.toISOString(),
            result,
        };
    } catch (err: any) {
        console.error('[LazyConfirm30mFollowup] Background execution error:', err);
        return {
            triggered: false,
            reason: 'error',
            error: err?.message || String(err),
        };
    } finally {
        if (!isTargetedCheck) {
            isLazyConfirm30mRunning = false;
        }
    }
}

/**
 * Next.js の after() を用いて、呼び出し元のレスポンス返却後に非同期バックグラウンドで
 * triggerLazyConfirm30MinFollowup() をスケジュールするヘルパー。
 * （リクエストスコープ外や単体テスト環境で after() が例外を投げた場合は非同期 Promise にフォールバック）
 */
export function scheduleLazyConfirm30MinFollowup(
    options: TriggerLazyConfirm30MinOptions = {}
): void {
    const task = async () => {
        try {
            await triggerLazyConfirm30MinFollowup(options);
        } catch (err) {
            console.error('[scheduleLazyConfirm30MinFollowup] Error:', err);
        }
    };

    try {
        if (typeof after === 'function') {
            after(task);
            return;
        }
    } catch {
        // リクエストコンテキスト外（テスト実行時など）は非同期実行へフォールバック
    }
    void task();
}



