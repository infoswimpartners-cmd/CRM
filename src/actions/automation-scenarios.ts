'use server';

/**
 * Make風 自動配信シナリオ管理 Server Actions
 * 
 * 各種自動送信（体験後フォロー、離脱ステップ配信、コーチ報告下書き、アクティビティ復帰、リマインダー等）
 * の設定状態を一元取得・微調整・テスト送信するハブAPIを提供します。
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
    AutomationScenario,
    SaveScenarioConfigParams,
    ScenarioStatus,
} from '@/types/automation-scenarios';
import {
    DEFAULT_TRIAL_FOLLOWUP_TEMPLATE,
    TRIAL_FOLLOWUP_CONFIG_KEY,
    TRIAL_FOLLOWUP_ENABLED_KEY,
    TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY,
    TEST_TARO_STUDENT_NUMBER,
} from '@/lib/line-trial-followup';

// レッスン報告フィードバックのデフォルトテンプレート（コーチ入力本文のみ）
const DEFAULT_LESSON_REPORT_FEEDBACK_TEMPLATE = `{{feedback_comment}}`;

// 離脱ステップ配信のデフォルトテンプレート
const DEFAULT_CART_RECOVERY_TEMPLATE =
`{{name}} 様

スイムパートナーズです🏊‍♂️
先ほどは体験レッスンのお申し込みフォームをご確認いただき、ありがとうございました。

日程やご希望のレッスン場所について、もし迷われている点やご質問などがございましたら、こちらのLINEへそのままお気軽にご相談ください！

専門スタッフが丁寧にサポートさせていただきます✨

👇お申し込みの続きはこちらから
{{form_url}}`;

// ユーザーアクティビティ（1時間未返信）デフォルトテンプレート
const DEFAULT_ACTIVITY_RECOVERY_TEMPLATE =
`{{name}} 様

スイムパートナーズ事務局です🏊‍♂️
先ほどLINEをご確認いただきありがとうございます！

日程のご調整やインストラクターのご希望など、何かご不明な点や気になることはございませんでしたでしょうか？

些細なことでもお気軽にメッセージをお送りください😊`;

// レッスンリマインダーデフォルトテンプレート
const DEFAULT_LESSON_REMINDER_TEMPLATE =
`{{name}} 様

スイムパートナーズです🏊‍♂️
明日予定されているレッスンについてご案内いたします。

━━━━━━━━━━━━━━━
📅 レッスン詳細
━━━━━━━━━━━━━━━
【日時】{{lesson_date}} {{start_time}}〜
【場所】{{location}}
【担当】{{coach_name}} コーチ

【持ち物】水着、スイムキャップ、ゴーグル、タオル、施設利用料

体調に気をつけてお越しくださいませ。
当日お会いできるのを楽しみにしております！`;

/**
 * 管理者権限チェック
 */
async function verifyAdminRole() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { isAuthorized: false, user: null };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return {
            isAuthorized: profile?.role === 'admin' || profile?.role === 'owner',
            user,
        };
    } catch {
        return { isAuthorized: false, user: null };
    }
}

/**
 * 全自動シナリオ一覧とその最新設定を取得
 */
export async function getAutomationScenariosAction(): Promise<{
    success: boolean;
    data: AutomationScenario[];
    error?: string;
}> {
    const { isAuthorized } = await verifyAdminRole();
    if (!isAuthorized) {
        return { success: false, data: [], error: 'Unauthorized' };
    }

    try {
        const supabaseAdmin = createAdminClient();

        // 関連する全設定キーを取得
        const { data: configRows } = await supabaseAdmin
            .from('app_configs')
            .select('key, value, updated_at');

        const configMap = new Map<string, { value: string; updatedAt?: string }>();
        for (const row of configRows || []) {
            configMap.set(row.key, { value: row.value, updatedAt: row.updated_at });
        }

        // 1. 体験レッスン終了後フォロー
        const trialFollowupEnabled = configMap.get(TRIAL_FOLLOWUP_ENABLED_KEY)?.value !== 'false';
        const trialFollowupTemplate = configMap.get(TRIAL_FOLLOWUP_CONFIG_KEY)?.value?.trim() || DEFAULT_TRIAL_FOLLOWUP_TEMPLATE;
        const trialFollowupGChat = configMap.get(TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY)?.value?.trim() || null;

        // 2. レッスン報告フィードバック案内（下書き）
        const feedbackMode = (configMap.get('line_lesson_report_feedback_mode')?.value || 'draft') as 'draft' | 'auto_send' | 'disabled';
        const feedbackTemplate = configMap.get('line_lesson_report_feedback_template')?.value?.trim() || DEFAULT_LESSON_REPORT_FEEDBACK_TEMPLATE;
        const feedbackStatus: ScenarioStatus = feedbackMode === 'auto_send' ? 'active' : feedbackMode === 'disabled' ? 'paused' : 'draft';

        // 3. 申し込み離脱・フォーム確認後ステップ配信
        const cartRecoveryEnabled = configMap.get('line_step_reminders_enabled')?.value !== 'false';
        const cartTemplatesRaw = configMap.get('step_reminders_templates')?.value;
        let cartTemplate = DEFAULT_CART_RECOVERY_TEMPLATE;
        try {
            if (cartTemplatesRaw) {
                const parsed = JSON.parse(cartTemplatesRaw);
                cartTemplate = parsed.step1 || parsed.immediate || DEFAULT_CART_RECOVERY_TEMPLATE;
            }
        } catch {}

        // 4. ユーザーアクティビティ・1時間未返信フォロー
        const activityFollowEnabled = configMap.get('line_user_activity_follow_enabled')?.value === 'true';
        const activityTemplate = configMap.get('line_user_activity_follow_template')?.value?.trim() || DEFAULT_ACTIVITY_RECOVERY_TEMPLATE;

        // 5. タグ連動ステップシーケンス
        const tagSequenceEnabled = configMap.get('tag_step_settings_enabled')?.value !== 'false';

        // 6. レッスン前日・当日リマインダー
        const reminderEnabled = configMap.get('lesson_reminder_enabled')?.value !== 'false';
        const reminderTemplate = configMap.get('lesson_reminder_template')?.value?.trim() || DEFAULT_LESSON_REMINDER_TEMPLATE;

        const scenarios: AutomationScenario[] = [
            {
                id: 'trial_followup',
                name: '体験レッスン終了後フォロー',
                category: 'post_lesson',
                categoryLabel: 'レッスン後',
                description: 'コーチが体験レッスンの報告（完了）を提出した直後に、生徒の公式LINEへ体験アンケートやご入会手続きURLを自動案内します。未連携時や送信失敗時はGoogle Chatへ手動送信用通知が届きます。',
                trigger: 'コーチによる体験レッスン報告完了',
                timing: '報告提出直後（即時）',
                target: '体験レッスン受講生徒',
                status: trialFollowupEnabled ? 'active' : 'paused',
                statusLabel: trialFollowupEnabled ? '稼働中 (Make内製化)' : '一時停止',
                channels: ['line', 'gchat'],
                template: trialFollowupTemplate,
                defaultTemplate: DEFAULT_TRIAL_FOLLOWUP_TEMPLATE,
                variables: [
                    { key: 'name', label: '生徒氏名', example: 'テスト太郎' },
                    { key: 'coach_name', label: '担当コーチ名', example: '山田コーチ' },
                    { key: 'lesson_date', label: '受講日時', example: '2026年11月4日(水)' },
                    { key: 'location', label: '受講プール場所', example: '東京体育館プール' },
                ],
                extraSettings: {
                    gchatWebhookUrl: trialFollowupGChat,
                },
                updatedAt: configMap.get(TRIAL_FOLLOWUP_CONFIG_KEY)?.updatedAt,
            },
            {
                id: 'lesson_report_feedback',
                name: 'レッスン報告・フィードバック案内',
                category: 'post_lesson',
                categoryLabel: 'レッスン後',
                description: 'コーチが提出した指導内容・コメントを生徒LINEへ案内するシナリオです。現在は「シナリオ下書き（準備中）」として保持されているため、コーチが報告を提出してもメッセージ送信は実行されません。準備が整い次第「稼働中」へ昇格可能です。',
                trigger: 'コーチによるレッスン報告提出（通常・体験）',
                timing: 'シナリオ下書き中（準備中・送信保留）',
                target: 'レッスン受講生徒',
                status: feedbackStatus,
                statusLabel: feedbackMode === 'draft' ? '下書き (準備中)' : feedbackMode === 'auto_send' ? '稼働中 (自動送信)' : '一時停止',
                channels: ['line'],
                template: feedbackTemplate,
                defaultTemplate: DEFAULT_LESSON_REPORT_FEEDBACK_TEMPLATE,
                variables: [
                    { key: 'name', label: '生徒氏名', example: 'テスト太郎' },
                    { key: 'coach_name', label: '担当コーチ名', example: '佐藤コーチ' },
                    { key: 'lesson_date', label: '受講日時', example: '2026年11月4日(水)' },
                    { key: 'location', label: 'プール場所', example: '東京体育館プール' },
                    { key: 'feedback_comment', label: 'コーチコメント', example: 'キックの姿勢がとても安定してきました！' },
                    { key: 'report_url', label: 'マイページURL', example: 'https://manager.swim-partners.com/member/reports/...' },
                ],
                extraSettings: {
                    feedbackMode,
                },
                updatedAt: configMap.get('line_lesson_report_feedback_template')?.updatedAt,
            },
            {
                id: 'cart_recovery',
                name: '申し込み離脱・フォーム確認後ステップ配信',
                category: 'cart_recovery',
                categoryLabel: '離脱復帰',
                description: '体験レッスン申し込みフォームの確認画面に到達した後、未申し込みのまま離脱したリードに対し、離脱直後および24時間後にLINEでフォローメッセージを自動配信します。Geminiによる自然言語変換に対応。',
                trigger: '体験申込フォーム確認画面アクセス後の未完了離脱',
                timing: '離脱直後 / 24時間後 / 48時間後',
                target: 'フォーム離脱見込み客（リード）',
                status: cartRecoveryEnabled ? 'active' : 'paused',
                statusLabel: cartRecoveryEnabled ? '稼働中' : '一時停止',
                channels: ['line'],
                template: cartTemplate,
                defaultTemplate: DEFAULT_CART_RECOVERY_TEMPLATE,
                variables: [
                    { key: 'name', label: '顧客氏名', example: 'テスト太郎' },
                    { key: 'form_url', label: 'フォーム再開URL', example: 'https://manager.swim-partners.com/trial?leadId=...' },
                ],
                extraSettings: {
                    enableAiNaturalize: true,
                },
                updatedAt: configMap.get('step_reminders_templates')?.updatedAt,
            },
            {
                id: 'user_activity_recovery',
                name: '1時間未返信・アクティビティ復帰フォロー',
                category: 'activity',
                categoryLabel: '行動検知',
                description: '生徒やリードが直近でLIFFを開いたなどのアクティビティが検知された後、1時間以上返信や申し込みがない場合に、困っている点がないか個別の疑問解消メッセージを自動送信します。',
                trigger: 'LIFF閲覧等の最終アクティビティ検知',
                timing: '最終アクションから1時間後（無返信時）',
                target: '返信・申込が途絶えた生徒・リード',
                status: activityFollowEnabled ? 'active' : 'paused',
                statusLabel: activityFollowEnabled ? '稼働中' : '一時停止',
                channels: ['line'],
                template: activityTemplate,
                defaultTemplate: DEFAULT_ACTIVITY_RECOVERY_TEMPLATE,
                variables: [
                    { key: 'name', label: '顧客氏名', example: 'テスト太郎' },
                ],
                extraSettings: {
                    inactiveHours: 1,
                },
                updatedAt: configMap.get('line_user_activity_follow_template')?.updatedAt,
            },
            {
                id: 'tag_sequence',
                name: 'タグ連動ステップシーケンス',
                category: 'step',
                categoryLabel: 'ステップ配信',
                description: '生徒に特定のタグ（体験受講済: trial_done、入会済: enrolled など）が付与された際に、経過日数（1日後、3日後、7日後など）に合わせて自動で順次配信されるステップ配信シナリオです。',
                trigger: '対象タグ（trial_done / enrolled等）の付与',
                timing: 'タグ付与後 1日後 / 3日後 / 7日後',
                target: 'タグが付与された生徒',
                status: tagSequenceEnabled ? 'active' : 'paused',
                statusLabel: tagSequenceEnabled ? '稼働中' : '一時停止',
                channels: ['line'],
                template: '※タグ別ステップシーケンスにて複数ステップ設定中',
                defaultTemplate: '※タグ別ステップシーケンスにて複数ステップ設定中',
                variables: [
                    { key: 'name', label: '生徒氏名', example: 'テスト太郎' },
                ],
            },
            {
                id: 'lesson_reminder',
                name: 'レッスン前日・当日リマインダー',
                category: 'reminder',
                categoryLabel: 'リマインダー',
                description: '確定したレッスン予定日の前日夜および当日の朝に、集合時間・場所・持ち物などを生徒のLINEへ自動通知し、無断キャンセルや忘れ物を防止します。',
                trigger: 'バッチ定期実行（前日19:00 / 当日朝）',
                timing: '前日19:00 / 当日朝',
                target: 'レッスン予約済みの生徒',
                status: reminderEnabled ? 'active' : 'paused',
                statusLabel: reminderEnabled ? '稼働中' : '一時停止',
                channels: ['line'],
                template: reminderTemplate,
                defaultTemplate: DEFAULT_LESSON_REMINDER_TEMPLATE,
                variables: [
                    { key: 'name', label: '生徒氏名', example: 'テスト太郎' },
                    { key: 'coach_name', label: '担当コーチ名', example: '山田コーチ' },
                    { key: 'lesson_date', label: 'レッスン日', example: '2026年11月5日(木)' },
                    { key: 'start_time', label: '開始時刻', example: '14:00' },
                    { key: 'location', label: 'プール場所', example: '東京体育館プール' },
                ],
                updatedAt: configMap.get('lesson_reminder_template')?.updatedAt,
            },
        ];

        return { success: true, data: scenarios };
    } catch (e: any) {
        console.error('[getAutomationScenariosAction] Error:', e);
        return { success: false, data: [], error: e.message || 'シナリオ一覧の取得に失敗しました' };
    }
}

/**
 * シナリオの設定（有効/無効、テンプレート文面、モード等）を保存
 */
export async function saveScenarioConfigAction(
    params: SaveScenarioConfigParams
): Promise<{ success: boolean; error?: string }> {
    const { isAuthorized } = await verifyAdminRole();
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const supabaseAdmin = createAdminClient();
        const { scenarioId, status, template, extraSettings } = params;
        const upsertRows: { key: string; value: string }[] = [];

        if (scenarioId === 'trial_followup') {
            upsertRows.push(
                { key: TRIAL_FOLLOWUP_ENABLED_KEY, value: status === 'active' ? 'true' : 'false' },
                { key: TRIAL_FOLLOWUP_CONFIG_KEY, value: template }
            );
            if (extraSettings?.gchatWebhookUrl !== undefined) {
                upsertRows.push({
                    key: TRIAL_FOLLOWUP_GCHAT_WEBHOOK_KEY,
                    value: extraSettings.gchatWebhookUrl?.trim() || '',
                });
            }
        } else if (scenarioId === 'lesson_report_feedback') {
            const mode = extraSettings?.feedbackMode || (status === 'active' ? 'auto_send' : status === 'draft' ? 'draft' : 'disabled');
            upsertRows.push(
                { key: 'line_lesson_report_feedback_mode', value: mode },
                { key: 'line_lesson_report_feedback_template', value: template }
            );
        } else if (scenarioId === 'cart_recovery') {
            upsertRows.push(
                { key: 'line_step_reminders_enabled', value: status === 'active' ? 'true' : 'false' }
            );
            // テンプレート更新
            const { data: current } = await supabaseAdmin
                .from('app_configs')
                .select('value')
                .eq('key', 'step_reminders_templates')
                .maybeSingle();

            let tplObj: any = { step1: template };
            try {
                if (current?.value) {
                    tplObj = { ...JSON.parse(current.value), step1: template };
                }
            } catch {}
            upsertRows.push({
                key: 'step_reminders_templates',
                value: JSON.stringify(tplObj),
            });
        } else if (scenarioId === 'user_activity_recovery') {
            upsertRows.push(
                { key: 'line_user_activity_follow_enabled', value: status === 'active' ? 'true' : 'false' },
                { key: 'line_user_activity_follow_template', value: template }
            );
        } else if (scenarioId === 'tag_sequence') {
            upsertRows.push({
                key: 'tag_step_settings_enabled',
                value: status === 'active' ? 'true' : 'false',
            });
        } else if (scenarioId === 'lesson_reminder') {
            upsertRows.push(
                { key: 'lesson_reminder_enabled', value: status === 'active' ? 'true' : 'false' },
                { key: 'lesson_reminder_template', value: template }
            );
        }

        if (upsertRows.length > 0) {
            await supabaseAdmin.from('app_configs').upsert(upsertRows, { onConflict: 'key' });
        }

        revalidatePath('/admin/line-marketing');
        revalidatePath('/admin/line-monitoring');

        return { success: true };
    } catch (e: any) {
        console.error('[saveScenarioConfigAction] Error:', e);
        return { success: false, error: e.message || 'シナリオ設定の保存に失敗しました' };
    }
}

/**
 * シナリオのテスト送信（厳格ルール: 会員番号0035、テスト太郎様限定）
 */
export async function testSendScenarioAction(params: {
    scenarioId: string;
    customTemplate?: string;
}): Promise<{
    success: boolean;
    recipient?: string;
    messageText?: string;
    error?: string;
}> {
    const { isAuthorized } = await verifyAdminRole();
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const supabaseAdmin = createAdminClient();

        // 厳格ルール: テスト太郎（会員番号0035）のみを検索
        const { data: testStudent, error: findErr } = await supabaseAdmin
            .from('students')
            .select(`
                id,
                full_name,
                student_number,
                line_user_id,
                contact_email,
                contact_phone,
                coach:coach_id(full_name)
            `)
            .eq('student_number', TEST_TARO_STUDENT_NUMBER)
            .maybeSingle();

        if (findErr || !testStudent) {
            return {
                success: false,
                error: `テスト対象顧客（会員番号: ${TEST_TARO_STUDENT_NUMBER}、テスト太郎）が見つかりませんでした`,
            };
        }

        if (!testStudent.line_user_id) {
            return {
                success: false,
                error: `テスト太郎（会員番号: ${TEST_TARO_STUDENT_NUMBER}）にLINE User IDが連携されていません`,
            };
        }

        const coachName = (testStudent.coach as any)?.full_name || '担当コーチ';
        const formattedDate = new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
        });

        const variables: Record<string, string> = {
            name: testStudent.full_name,
            student_name: testStudent.full_name,
            student_number: testStudent.student_number || '',
            coach_name: coachName,
            lesson_date: formattedDate,
            start_time: '14:00',
            location: '東京体育館プール（テスト）',
            feedback_comment: 'クロールの息継ぎが非常にスムーズになりました！次回もこの調子でいきましょう。',
            report_url: `https://manager.swim-partners.com/member/reports/test-preview`,
            form_url: `https://manager.swim-partners.com/trial?leadId=test-lead`,
            enroll_url: 'https://liff.line.me/2009159689-Ugq1NLXe',
            survey_url: 'https://forms.gle/nNJMpU9TwQ4hkmPR7',
        };

        let rawTemplate = params.customTemplate || '';
        if (!rawTemplate) {
            if (params.scenarioId === 'trial_followup') rawTemplate = DEFAULT_TRIAL_FOLLOWUP_TEMPLATE;
            else if (params.scenarioId === 'lesson_report_feedback') rawTemplate = DEFAULT_LESSON_REPORT_FEEDBACK_TEMPLATE;
            else if (params.scenarioId === 'cart_recovery') rawTemplate = DEFAULT_CART_RECOVERY_TEMPLATE;
            else if (params.scenarioId === 'user_activity_recovery') rawTemplate = DEFAULT_ACTIVITY_RECOVERY_TEMPLATE;
            else if (params.scenarioId === 'lesson_reminder') rawTemplate = DEFAULT_LESSON_REMINDER_TEMPLATE;
            else rawTemplate = `{{name}} 様\n\nテスト送信メッセージです。`;
        }

        let rendered = rawTemplate;
        for (const [k, v] of Object.entries(variables)) {
            rendered = rendered.replace(new RegExp(`[{｛]{1,2}\\s*${k}\\s*[}｝]{1,2}`, 'gi'), v);
        }

        const { sendSingleLineMessage } = await import('@/lib/line-marketing-service');
        const sendRes = await sendSingleLineMessage({
            studentId: testStudent.id,
            studentNumber: testStudent.student_number,
            studentName: testStudent.full_name,
            lineUserId: testStudent.line_user_id,
            rawMessage: rawTemplate,
            variables,
            deliveryType: 'test_preview',
            stepName: `シナリオテスト [${params.scenarioId}]`,
            isTestPreview: true,
        });

        if (!sendRes.success) {
            return {
                success: false,
                error: sendRes.error || 'LINE送信に失敗しました（月間配信枠上限超過など）',
            };
        }

        return {
            success: true,
            recipient: `${testStudent.full_name} 様 (${testStudent.student_number})`,
            messageText: rendered,
        };
    } catch (e: any) {
        console.error('[testSendScenarioAction] Error:', e);
        return { success: false, error: e.message || 'テスト送信に失敗しました' };
    }
}
