/**
 * 体験レッスン終了後 LINEフォローメッセージ送信エンジン
 * 
 * コーチが体験レッスンの報告（lesson_masters.is_trial === true）を提出した直後に、
 * 対象生徒の公式LINEへアンケート・入会手続き案内メッセージを自動送信します。
 * 従来の外部Make Webhookによる送信フローをCRM内部に完全統合し、安定・安全に稼働させます。
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { sendSingleLineMessage } from '@/lib/line-marketing-service';
import { recordLineChatMessage } from '@/lib/line-chat-service';
import { addTagToUser, getUserTags, STANDARD_TAGS } from '@/lib/line-tracking-service';

// 厳格ルール: テスト顧客定数
export const TEST_TARO_STUDENT_NUMBER = '0035';
export const TEST_TARO_LINE_USER_ID = 'U0e5a7654874369ca5e38deb47fd783aa';

// 設定キー定数
export const TRIAL_FOLLOWUP_CONFIG_KEY = 'line_trial_followup_template';
export const TRIAL_FOLLOWUP_ENABLED_KEY = 'line_trial_followup_enabled';
export const TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY = 'trial_followup_gchat_webhook';

// デフォルトメッセージテンプレート（ユーザー指定文面）
export const DEFAULT_TRIAL_FOLLOWUP_TEMPLATE =
`体験レッスンにお越しいただき、誠にありがとうございました。

担当コーチより、無事に体験レッスンが終了した旨、報告を受けております。貴重なお時間の中、当スクールのレッスンをご体験いただき重ねてお礼申し上げます。

つきましては、今後のレッスン運営の参考とするための簡単なアンケートと、ご入会手続きについてご案内いたします。

━━━━━━━━━━━━━━
① 体験アンケート（回答目安：1分）
━━━━━━━━━━━━━━
今後のご希望や、今回のレッスンについてのご感想をお聞かせいただけますと幸いです。

👇回答はこちら
https://forms.gle/nNJMpU9TwQ4hkmPR7

━━━━━━━━━━━━━━
② ご入会手続きのご案内
━━━━━━━━━━━━━━
継続してレッスンの受講（クラス枠の確保）をご希望される場合は、こちらからお手続きへお進みいただけます。

👇お手続きはこちら
https://liff.line.me/2009159689-Ugq1NLXe

━━━━━━━━━━━━━━
💬 ご質問・ご相談
━━━━━━━━━━━━━━
スケジュールのご相談や、受講に関するご不明な点などがございましたら、このLINEへそのままお気軽にご返信ください。スタッフより個別にご案内させていただきます。`;

export interface SendTrialLessonFollowupParams {
    studentId: string;
    coachId?: string | null;
    lessonId?: string | null;
    lessonDate?: string | null;
    location?: string | null;
    forceSend?: boolean; // 二重送信ガードをバイパス（テスト送信など）
    customTemplate?: string; // プレビュー・テスト送信用カスタムテンプレート
}

export interface SendTrialLessonFollowupResult {
    success: boolean;
    skipped?: boolean;
    skipReason?: string;
    error?: string;
    messageText?: string;
    lineUserId?: string | null;
    studentName?: string;
}

/**
 * 体験レッスン終了後のフォロー設定（ON/OFFおよびテンプレート文面）を取得
 */
export async function getTrialFollowupConfig(): Promise<{
    enabled: boolean;
    template: string;
    gchatWebhookUrl?: string | null;
}> {
    const supabase = createAdminClient();

    try {
        const { data: configs } = await supabase
            .from('app_configs')
            .select('key, value')
            .in('key', [TRIAL_FOLLOWUP_CONFIG_KEY, TRIAL_FOLLOWUP_ENABLED_KEY, TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY]);

        const templateRow = configs?.find(c => c.key === TRIAL_FOLLOWUP_CONFIG_KEY);
        const enabledRow = configs?.find(c => c.key === TRIAL_FOLLOWUP_ENABLED_KEY);
        const gchatRow = configs?.find(c => c.key === TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY);

        const template = templateRow?.value?.trim() || DEFAULT_TRIAL_FOLLOWUP_TEMPLATE;
        // 未設定時はデフォルト有効 (true)
        const enabled = enabledRow ? enabledRow.value === 'true' : true;
        const gchatWebhookUrl = gchatRow?.value?.trim() || null;

        return { enabled, template, gchatWebhookUrl };
    } catch (err) {
        console.error('[TrialFollowup] Error fetching config:', err);
        return { enabled: true, template: DEFAULT_TRIAL_FOLLOWUP_TEMPLATE, gchatWebhookUrl: null };
    }
}

/**
 * 体験レッスン終了後のフォロー設定を保存
 */
export async function saveTrialFollowupConfig(params: {
    enabled: boolean;
    template: string;
    gchatWebhookUrl?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient();

    try {
        const upsertRows = [
            { key: TRIAL_FOLLOWUP_ENABLED_KEY, value: params.enabled ? 'true' : 'false' },
            { key: TRIAL_FOLLOWUP_CONFIG_KEY, value: params.template },
        ];

        if (params.gchatWebhookUrl !== undefined) {
            upsertRows.push({
                key: TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY,
                value: params.gchatWebhookUrl?.trim() || '',
            });
        }

        await supabase.from('app_configs').upsert(upsertRows, { onConflict: 'key' });

        return { success: true };
    } catch (err: any) {
        console.error('[TrialFollowup] Error saving config:', err);
        return { success: false, error: err.message || '設定の保存に失敗しました' };
    }
}

/**
 * 体験レッスンフォロー通知用のGoogle Chat Webhook URLを取得
 */
export async function getTrialFollowupGChatWebhookUrl(): Promise<string | null> {
    const supabase = createAdminClient();

    // 1. app_configs の trial_followup_gchat_webhook または schedule_monitoring_gchat_webhook
    try {
        const { data: configs } = await supabase
            .from('app_configs')
            .select('key, value')
            .in('key', [TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY, 'schedule_monitoring_gchat_webhook']);

        const specific = configs?.find(c => c.key === TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY)?.value?.trim();
        if (specific) return specific;

        const scheduleWh = configs?.find(c => c.key === 'schedule_monitoring_gchat_webhook')?.value?.trim();
        if (scheduleWh) return scheduleWh;
    } catch (err) {
        console.warn('[TrialFollowup] App config fetch error:', err);
    }

    // 2. google_chat_webhooks から「公式ラインチャットグループ」または「日程調整」を検索
    try {
        const { data: webhooks } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url')
            .or('space_name.ilike.%公式ライン%,space_name.ilike.%日程調整%')
            .eq('active', true)
            .limit(1)
            .maybeSingle();

        if (webhooks?.webhook_url) {
            return webhooks.webhook_url;
        }
    } catch (whErr) {
        console.warn('[TrialFollowup] Webhook table fetch error:', whErr);
    }

    // 3. 環境変数 GOOGLE_CHAT_WEBHOOK_URL
    return process.env.GOOGLE_CHAT_WEBHOOK_URL || null;
}

/**
 * LINE送信が除外・失敗した場合にGoogle Chatへ手動送信用メッセージを通知
 */
export async function notifyTrialFollowupExclusionToGoogleChat(params: {
    studentName: string;
    studentNumber?: string | null;
    studentId?: string | null;
    lineUserId?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    coachName?: string | null;
    lessonDate?: string | null;
    location?: string | null;
    reason: string;
    messageText: string;
}): Promise<boolean> {
    const webhookUrl = await getTrialFollowupGChatWebhookUrl();
    if (!webhookUrl) {
        console.warn('[TrialFollowup] Google Chat Webhook URL is not configured. Skipping fallback notification.');
        return false;
    }

    const { sendGoogleChatMessage } = await import('@/lib/google-chat');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://manager.swim-partners.com';
    const customerUrl = params.studentId ? `${siteUrl}/customers/${params.studentId}` : `${siteUrl}/admin/leads`;

    const formattedDate = params.lessonDate
        ? new Date(params.lessonDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
        : '未設定';

    const chatNotification = 
`⚠️ *【要手動対応】体験レッスン終了フォロー LINE未送信通知*
────────────────────────
コーチより体験レッスンの報告がありましたが、LINEでのメッセージ送信が除外または失敗したため、事務局より手動でのご連絡（メール・SMS等）をお願いいたします。

*■ 未送信の理由*: ${params.reason}
*■ 対象生徒*: ${params.studentName} 様（会員番号: ${params.studentNumber || '未登録'}）
*■ 連絡先電話番号*: ${params.contactPhone || '(未登録)'}
*■ 連絡先メール*: ${params.contactEmail || '(未登録)'}
*■ 担当コーチ*: ${params.coachName || '担当コーチ'}
*■ レッスン日時*: ${formattedDate}
*■ レッスン場所*: ${params.location || '指定プール'}

*■ 手動送信用メッセージ本文（コピーしてご使用ください）*:
\`\`\`
${params.messageText}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━
▼ 顧客詳細・個別チャットを開く
${customerUrl}
━━━━━━━━━━━━━━━━━━━━━━━━`;

    const success = await sendGoogleChatMessage(webhookUrl, chatNotification);
    if (success) {
        console.log(`[TrialFollowup] Successfully notified Google Chat of un-sent followup for ${params.studentName}`);
    }
    return success;
}

/**
 * 体験レッスン終了後、生徒のLINEへフォローメッセージを送信
 */
export async function sendTrialLessonFollowupLineMessage(
    params: SendTrialLessonFollowupParams
): Promise<SendTrialLessonFollowupResult> {
    const { studentId, coachId, lessonId, lessonDate, location, forceSend = false, customTemplate } = params;
    const supabase = createAdminClient();

    // 1. 設定確認（自動送信が無効化されている場合はスキップ）
    const config = await getTrialFollowupConfig();
    if (!config.enabled && !forceSend) {
        console.log(`[TrialFollowup] Automatic followup is disabled. Skipping for student ${studentId}`);
        return {
            success: false,
            skipped: true,
            skipReason: 'automatic_followup_disabled',
        };
    }

    // 2. 生徒情報の照会
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
            id,
            student_number,
            full_name,
            line_user_id,
            contact_email,
            contact_phone,
            status,
            coach:coach_id(full_name)
        `)
        .eq('id', studentId)
        .maybeSingle();

    if (studentError || !student) {
        console.warn(`[TrialFollowup] Student not found: ${studentId}`);
        return {
            success: false,
            skipped: true,
            skipReason: 'student_not_found',
            error: '生徒情報が見つかりませんでした',
        };
    }

    // 3. コーチ情報の取得
    let coachName = (student.coach as any)?.full_name || '担当コーチ';
    if (coachId) {
        const { data: coachProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', coachId)
            .maybeSingle();
        if (coachProfile?.full_name) {
            coachName = coachProfile.full_name;
        }
    }

    // 4. メッセージ文面の確定と変数置換の準備
    const rawTemplate = customTemplate || config.template;
    const formattedDate = lessonDate
        ? new Date(lessonDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
        : '';

    const variables: Record<string, string> = {
        name: student.full_name,
        student_name: student.full_name,
        student_number: student.student_number || '',
        coach_name: coachName,
        lesson_date: formattedDate,
        location: location || '',
        enroll_url: 'https://liff.line.me/2009159689-Ugq1NLXe',
        survey_url: 'https://forms.gle/nNJMpU9TwQ4hkmPR7',
    };

    // 置換後テキストの生成（LINE送信・チャットログ・Google Chat通知用）
    let renderedMessage = rawTemplate;
    for (const [k, v] of Object.entries(variables)) {
        renderedMessage = renderedMessage.replace(new RegExp(`[{｛]{1,2}\\s*${k}\\s*[}｝]{1,2}`, 'gi'), v);
    }

    // 5. LINE連携チェック（未連携の場合は除外とし、Google Chatへ手動送信用通知を送信）
    if (!student.line_user_id || student.line_user_id.trim() === '') {
        console.log(`[TrialFollowup] Student ${student.full_name} (${student.student_number}) has no LINE user ID. Skipping LINE and notifying Google Chat.`);

        await notifyTrialFollowupExclusionToGoogleChat({
            studentName: student.full_name,
            studentNumber: student.student_number,
            studentId: student.id,
            lineUserId: null,
            contactPhone: student.contact_phone,
            contactEmail: student.contact_email,
            coachName,
            lessonDate,
            location,
            reason: 'LINE未連携（公式LINEの連携情報が登録されていません）',
            messageText: renderedMessage,
        });

        return {
            success: false,
            skipped: true,
            skipReason: 'no_line_user_id',
            studentName: student.full_name,
            messageText: renderedMessage,
        };
    }

    // 6. 二重送信ガード（forceSend = true の場合はバイパス）
    if (!forceSend) {
        try {
            const userTags = await getUserTags(student.line_user_id);
            if (userTags.includes(STANDARD_TAGS.TRIAL_FOLLOWUP_SENT)) {
                console.log(`[TrialFollowup] Student ${student.full_name} already received trial followup. Skipping.`);
                return {
                    success: false,
                    skipped: true,
                    skipReason: 'already_sent_to_student',
                    lineUserId: student.line_user_id,
                    studentName: student.full_name,
                };
            }
        } catch (tagCheckErr) {
            console.warn('[TrialFollowup] Tag check warning:', tagCheckErr);
        }
    }

    // 7. LINE Push送信実行
    const sendResult = await sendSingleLineMessage({
        studentId: student.id,
        studentNumber: student.student_number,
        studentName: student.full_name,
        lineUserId: student.line_user_id,
        rawMessage: rawTemplate,
        variables,
        deliveryType: 'direct_chat',
        stepName: '体験レッスン終了フォロー',
    });

    // 8. LINE送信失敗時（月間上限超過など）: Google Chatへ手動送信用通知を送信
    if (!sendResult.success) {
        console.error(`[TrialFollowup] Failed to send LINE message to ${student.full_name}:`, sendResult.error);

        const reasonDescription = sendResult.error?.includes('monthly limit')
            ? 'LINE公式アカウントの月間配信枠上限超過（429: monthly limit）'
            : `LINE送信エラー（${sendResult.error || '不明なエラー'}）`;

        await notifyTrialFollowupExclusionToGoogleChat({
            studentName: student.full_name,
            studentNumber: student.student_number,
            studentId: student.id,
            lineUserId: student.line_user_id,
            contactPhone: student.contact_phone,
            contactEmail: student.contact_email,
            coachName,
            lessonDate,
            location,
            reason: reasonDescription,
            messageText: renderedMessage,
        });

        return {
            success: false,
            error: sendResult.error || 'LINE送信に失敗しました',
            lineUserId: student.line_user_id,
            studentName: student.full_name,
            messageText: renderedMessage,
        };
    }

    // 9. 個別チャット履歴（line_chat_messages）へ記録
    try {
        await recordLineChatMessage({
            lineUserId: student.line_user_id,
            studentId: student.id,
            displayName: student.full_name,
            direction: 'outbound',
            senderType: 'system_auto',
            messageType: 'direct_chat',
            messageText: renderedMessage,
            senderLabel: '体験レッスン終了フォロー',
            status: 'sent',
            metadata: {
                lesson_id: lessonId || null,
                coach_id: coachId || null,
                coach_name: coachName,
                sent_at: new Date().toISOString(),
                source: 'trial_lesson_report_followup',
            },
        });
    } catch (chatErr) {
        console.error('[TrialFollowup] Failed to record message to chat history:', chatErr);
    }

    // 10. trial_followup_sent および trial_done タグを付与
    try {
        await addTagToUser(student.line_user_id, STANDARD_TAGS.TRIAL_FOLLOWUP_SENT, {
            category: 'automation',
            displayName: student.full_name,
            studentId: student.id,
            metadata: {
                sent_at: new Date().toISOString(),
                lesson_id: lessonId || null,
            },
        });

        await addTagToUser(student.line_user_id, STANDARD_TAGS.TRIAL_DONE, {
            category: 'status',
            displayName: student.full_name,
            studentId: student.id,
            metadata: {
                trial_completed_at: new Date().toISOString(),
                lesson_id: lessonId || null,
            },
        });
    } catch (tagErr) {
        console.error('[TrialFollowup] Failed to add tags to user:', tagErr);
    }

    console.log(`[TrialFollowup] Successfully sent trial followup LINE message to ${student.full_name} (${student.student_number})`);

    return {
        success: true,
        messageText: renderedMessage,
        lineUserId: student.line_user_id,
        studentName: student.full_name,
    };
}

