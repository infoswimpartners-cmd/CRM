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

import { createAdminClient } from '@/lib/supabase/admin';
import { formatLineMessage } from '@/lib/line';
import {
    SendMessageOptions,
    SendMessageResult,
    LineStepRule,
    SegmentFilterConditions,
    SyncTrialDoneResult,
} from '@/types/line-marketing';
import { getAllUserTagsMap, filterStudentsWithTags } from '@/lib/line-tracking-service';

export type { SendMessageOptions, SendMessageResult, SyncTrialDoneResult };

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
    deliveryType: 'broadcast' | 'step_message' | 'test_preview';
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
        await supabase.from('line_delivery_logs').insert({
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
    } catch (logErr) {
        // テーブルが存在しない場合やDBエラー時も処理全体を止めない
        console.warn('[LineMarketingService] Delivery log insertion warning (table may be pending migration):', logErr);
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

    const { data: rawStudents, error } = await supabase
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
        .order('created_at', { ascending: false });

    if (error || !rawStudents) return [];

    // 全ユーザーのタグマップを取得
    const userTagsMap = await getAllUserTagsMap();

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

        // エリア判定ロジック
        let areaName = '東京都';
        const lessonLocations = (s.lessons || []).map((l: any) => l.location || '').join(' ');
        const coachArea = (s.coach as any)?.base_area || '';
        const combinedLoc = `${lessonLocations} ${coachArea}`;

        if (combinedLoc.includes('千葉') || combinedLoc.includes('船橋') || combinedLoc.includes('市川')) {
            areaName = '千葉県';
        } else if (combinedLoc.includes('横浜') || combinedLoc.includes('川崎') || combinedLoc.includes('神奈川')) {
            areaName = '神奈川県';
        } else if (combinedLoc.includes('目黒')) {
            areaName = '目黒区';
        } else if (combinedLoc.includes('港区') || combinedLoc.includes('三田') || combinedLoc.includes('御成門')) {
            areaName = '港区';
        } else if (combinedLoc.includes('品川')) {
            areaName = '品川区';
        } else if (combinedLoc.includes('世田谷')) {
            areaName = '世田谷区';
        }

        if (targetAreas && targetAreas.length > 0) {
            const matchArea = targetAreas.some((a: string) => areaName.includes(a) || combinedLoc.includes(a));
            if (!matchArea) continue;
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

        const studentTags = s.line_user_id ? (userTagsMap.get(s.line_user_id) || []) : [];

        filtered.push({
            id: s.id,
            studentNumber: s.student_number || '',
            fullName: s.full_name || '',
            fullNameKana: s.full_name_kana || null,
            status: s.status,
            area: areaName,
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

    // タグ絞り込み（includeTags, excludeTags, viewedFormNotApplied）を適用
    filtered = await filterStudentsWithTags(filtered, {
        includeTags: filter.includeTags,
        excludeTags: filter.excludeTags,
        viewedFormNotApplied: filter.viewedFormNotApplied,
    });

    return filtered;
}

// ==============================================================================
// 10. 予約一括配信の実行 (processScheduledBroadcasts)
// ==============================================================================

export async function processScheduledBroadcasts(options: { dryRun?: boolean } = {}): Promise<{
    processedCampaigns: number;
    successCount: number;
    failedCount: number;
}> {
    const { dryRun = false } = options;
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // ゾンビロック解除ガード (10分以上 sending のままスタックしたキャンペーンを scheduled に復旧)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
        .from('line_broadcast_campaigns')
        .update({ status: 'scheduled', updated_at: nowIso })
        .eq('status', 'sending')
        .lt('updated_at', tenMinutesAgo);

    const { data: scheduledCampaigns } = await supabase
        .from('line_broadcast_campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', nowIso);

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
        return { processedCampaigns: 0, successCount: 0, failedCount: 0 };
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const camp of scheduledCampaigns) {
        if (!dryRun) {
            // アトミック楽観ロック: status が 'scheduled' の場合のみ 'sending' に遷移
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

    const [hours, minutes] = (sendTime || '19:00').split(':').map(Number);
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
    const sendTime = firstRule ? firstRule.send_time : '19:00';

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
