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
}> {
    const supabase = createAdminClient();

    try {
        const { data: configs } = await supabase
            .from('app_configs')
            .select('key, value')
            .in('key', [TRIAL_FOLLOWUP_CONFIG_KEY, TRIAL_FOLLOWUP_ENABLED_KEY]);

        const templateRow = configs?.find(c => c.key === TRIAL_FOLLOWUP_CONFIG_KEY);
        const enabledRow = configs?.find(c => c.key === TRIAL_FOLLOWUP_ENABLED_KEY);

        const template = templateRow?.value?.trim() || DEFAULT_TRIAL_FOLLOWUP_TEMPLATE;
        // 未設定時はデフォルト有効 (true)
        const enabled = enabledRow ? enabledRow.value === 'true' : true;

        return { enabled, template };
    } catch (err) {
        console.error('[TrialFollowup] Error fetching config:', err);
        return { enabled: true, template: DEFAULT_TRIAL_FOLLOWUP_TEMPLATE };
    }
}

/**
 * 体験レッスン終了後のフォロー設定を保存
 */
export async function saveTrialFollowupConfig(params: {
    enabled: boolean;
    template: string;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient();

    try {
        await supabase.from('app_configs').upsert([
            { key: TRIAL_FOLLOWUP_ENABLED_KEY, value: params.enabled ? 'true' : 'false' },
            { key: TRIAL_FOLLOWUP_CONFIG_KEY, value: params.template },
        ], { onConflict: 'key' });

        return { success: true };
    } catch (err: any) {
        console.error('[TrialFollowup] Error saving config:', err);
        return { success: false, error: err.message || '設定の保存に失敗しました' };
    }
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

    // 3. LINE連携チェック
    if (!student.line_user_id || student.line_user_id.trim() === '') {
        console.log(`[TrialFollowup] Student ${student.full_name} (${student.student_number}) has no LINE user ID. Skipping.`);
        return {
            success: false,
            skipped: true,
            skipReason: 'no_line_user_id',
            studentName: student.full_name,
        };
    }

    // 4. コーチ情報の取得
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

    // 5. 二重送信ガード（forceSend = true の場合はバイパス）
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

    // 6. メッセージ文面の確定と変数置換
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

    if (!sendResult.success) {
        console.error(`[TrialFollowup] Failed to send LINE message to ${student.full_name}:`, sendResult.error);
        return {
            success: false,
            error: sendResult.error || 'LINE送信に失敗しました',
            lineUserId: student.line_user_id,
            studentName: student.full_name,
        };
    }

    // 置換後テキストの生成（チャットログ保存用）
    let renderedMessage = rawTemplate;
    for (const [k, v] of Object.entries(variables)) {
        renderedMessage = renderedMessage.replace(new RegExp(`[{｛]{1,2}\\s*${k}\\s*[}｝]{1,2}`, 'gi'), v);
    }

    // 8. 個別チャット履歴（line_chat_messages）へ記録
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

    // 9. trial_followup_sent および trial_done タグを付与
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
