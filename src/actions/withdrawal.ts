'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { sendGoogleChatMessage } from '@/lib/google-chat';
import { stopStepReminderForUser } from '@/lib/line-step-reminders';
import { revalidatePath } from 'next/cache';
import { StudentWithdrawalSetting, SaveStudentWithdrawalParams } from '@/types/withdrawal';
import { buildWithdrawalResumeReminderMessage } from '@/lib/withdrawal';
import { emailService } from '@/lib/email';
import { lineService } from '@/lib/line';
import { getJstDateString } from '@/lib/leave';

const REASON_LABELS: Record<string, string> = {
  'time-finance': 'スケジュール・金銭的に継続が難しい',
  'coach-match': 'コーチとの相性・レッスン内容が合わない',
  'goal-achieved': '目標を達成した（25m完泳など）',
  'other': 'その他（引っ越し・体調不良など）',
};

export interface SubmitWithdrawalInput {
  line_user_id: string;
  withdrawal_reason: string;
  satisfaction_score?: number; // 1-5
  feedback_comment?: string;
  student_name?: string;
}

/**
 * LINEユーザーIDに紐づく受講生の名前を取得するサーバーアクション
 */
export async function getStudentNameByLineId(lineUserId: string) {
  try {
    if (!lineUserId) return null;
    const supabaseAdmin = createAdminClient();
    const { data: dbStudent } = await supabaseAdmin
      .from('students')
      .select('full_name, student_number, status')
      .eq('line_user_id', lineUserId)
      .maybeSingle();
    
    return dbStudent?.full_name || null;
  } catch (e) {
    console.error('Failed to fetch student name by line_user_id server action:', e);
    return null;
  }
}

/**
 * 退会申請を処理し、CRMステータス連動・データ永続化・Stripe解約・Google Chat通知を実行
 */
export async function submitWithdrawal(data: SubmitWithdrawalInput) {
  try {
    const supabaseAdmin = createAdminClient();
    const lineUserId = data.line_user_id?.trim();

    // 1. バリデーション
    if (!lineUserId) {
      return { success: false, error: 'LINEユーザーIDが取得できませんでした。' };
    }
    if (!data.withdrawal_reason) {
      return { success: false, error: '退会理由が選択されていません。' };
    }

    const reasonLabel = REASON_LABELS[data.withdrawal_reason] || data.withdrawal_reason;
    const satisfaction = data.satisfaction_score ? `${data.satisfaction_score} / 5` : '未回答';
    const stars = data.satisfaction_score ? '★'.repeat(data.satisfaction_score) + '☆'.repeat(5 - data.satisfaction_score) : '';
    const now = new Date();
    const nowJstStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    // 2. studentsテーブルから受講生を特定
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, full_name, student_number, stripe_subscription_id, notes, status, contact_email')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    const studentId = student?.id || null;
    const studentName = student?.full_name || data.student_name || '公式LINE受講生';
    const studentNumber = student?.student_number || '未設定';

    // 3. 受講生データが存在する場合：CRMステータス自動更新、メモ追記、Stripe解約
    if (student) {
      // 3-1. メモ欄（notes）に退会アンケートデータを追記
      const surveyNote = 
`【退会受付: ${nowJstStr}】
・退会理由: ${reasonLabel}
・満足度: ${stars} (${satisfaction})
・ご意見・ご要望: ${data.feedback_comment?.trim() || '（なし）'}
--------------------------------------------------`;
      const updatedNotes = student.notes ? `${surveyNote}\n\n${student.notes}` : surveyNote;

      // 3-2. Stripeサブスクリプションの課金停止
      if (student.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(student.stripe_subscription_id);
          console.log(`[Withdrawal] Cancelled Stripe subscription: ${student.stripe_subscription_id}`);
        } catch (stripeErr: any) {
          console.error('[Withdrawal] Stripe subscription cancel error:', stripeErr?.message);
        }
      }

      // 3-3. students テーブルのステータスを 'withdrawn'（退会済み）へ自動更新
      const { error: updateErr } = await supabaseAdmin
        .from('students')
        .update({
          status: 'withdrawn',
          notes: updatedNotes,
          stripe_subscription_id: null,
          membership_type_id: null,
        })
        .eq('id', student.id);

      if (updateErr) {
        console.error('[Withdrawal] Failed to update student status to withdrawn:', updateErr);
      } else {
        console.log(`[Withdrawal] Successfully updated student (${student.id}: ${studentName}) status to 'withdrawn'`);
      }

      // 3-4. 公式LINEステップリマインド配信を停止
      try {
        await stopStepReminderForUser(lineUserId, 'withdrawn');
      } catch (stepErr) {
        console.error('[Withdrawal] Failed to stop step reminder:', stepErr);
      }
    } else {
      console.warn(`[Withdrawal] No student found with line_user_id: ${lineUserId}. Recording survey anyway.`);
    }

    // 4. 退会データ収集（app_configs に永続保存）
    const surveyPayload = {
      student_id: studentId,
      student_name: studentName,
      student_number: studentNumber,
      line_user_id: lineUserId,
      reason_id: data.withdrawal_reason,
      reason_label: reasonLabel,
      satisfaction_score: data.satisfaction_score || null,
      feedback_comment: data.feedback_comment?.trim() || null,
      submitted_at: now.toISOString(),
      submitted_at_jst: nowJstStr,
    };

    const configKey = `withdrawal_survey:${studentId || lineUserId}:${now.getTime()}`;
    await supabaseAdmin.from('app_configs').upsert({
      key: configKey,
      value: JSON.stringify(surveyPayload),
      description: `退会アンケート: ${studentName} 様 (${nowJstStr})`,
      updated_at: now.toISOString(),
    });

    // 5. 公式ラインチャットグループへのGoogle Chat即時通知
    let webhookUrl: string | null = null;
    const { data: adminTrigger } = await supabaseAdmin
      .from('email_triggers')
      .select('google_chat_webhook_url, google_chat_enabled')
      .eq('id', 'line_schedule_detected')
      .maybeSingle();

    if (adminTrigger && adminTrigger.google_chat_enabled !== false && adminTrigger.google_chat_webhook_url) {
      webhookUrl = adminTrigger.google_chat_webhook_url;
    }

    if (!webhookUrl) {
      const { data: defaultWebhook } = await supabaseAdmin
        .from('google_chat_webhooks')
        .select('webhook_url')
        .or('space_name.ilike.%公式ライン%,space_name.ilike.%日程調整%')
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      webhookUrl = defaultWebhook?.webhook_url || process.env.GOOGLE_CHAT_WEBHOOK_URL || null;
    }

    if (webhookUrl) {
      const chatMessage = 
`🚨 *【退会申請を受付ました】*
・受講生: ${studentName} 様（会員番号: ${studentNumber}）
・LINE ID: \`${lineUserId}\`
・退会理由: *${reasonLabel}*
・総合満足度: *${stars} (${satisfaction})*
・ご意見・ご要望:
「${data.feedback_comment?.trim() || '（特になし）'}」
・対応状況: *CRMステータスを「退会済み」に自動更新し、サブスクリプション課金を停止しました。*
・受付日時: ${nowJstStr}`;

      try {
        await sendGoogleChatMessage(webhookUrl, chatMessage);
      } catch (chatErr) {
        console.error('[Withdrawal] Failed to send Google Chat message:', chatErr);
      }
    }

    // 6. 退会専用の外部Webhook（Make）への送信
    const externalWebhookUrl = process.env.MAKE_WITHDRAWAL_WEBHOOK_URL;
    const trialWebhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

    // 体験申し込み用Webhookと同じURLが指定されている場合は誤送信・シナリオ誤作動を防ぐためスキップ
    if (externalWebhookUrl && externalWebhookUrl !== trialWebhookUrl) {
      try {
        await fetch(externalWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...surveyPayload,
            event_type: 'withdrawal',
            agreed_timestamp: now.toISOString(),
          }),
        });
      } catch (makeErr) {
        console.error('[Withdrawal] Make webhook error:', makeErr);
      }
    } else if (externalWebhookUrl && externalWebhookUrl === trialWebhookUrl) {
      console.warn('[Withdrawal] MAKE_WITHDRAWAL_WEBHOOK_URL is identical to NEXT_PUBLIC_MAKE_WEBHOOK_URL (trial booking). Skipped to prevent webhook collision.');
    }

    return { 
      success: true, 
      studentName: studentName !== '公式LINE受講生' ? studentName : null 
    };

  } catch (error: any) {
    console.error('Error in submitWithdrawal server action:', error);
    return {
      success: false,
      error: error.message || '退会申請の送信中に予期せぬエラーが発生しました。',
    };
  }
}

/**
 * 収集された退会アンケートデータを一覧取得する管理者用アクション
 */
export async function getWithdrawalSurveysAction() {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: configs, error } = await supabaseAdmin
      .from('app_configs')
      .select('key, value, description, updated_at')
      .ilike('key', 'withdrawal_survey:%')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('getWithdrawalSurveysAction error:', error);
      return [];
    }

    return (configs || []).map(item => {
      try {
        return JSON.parse(item.value);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (e) {
    console.error('Failed to get withdrawal surveys:', e);
    return [];
  }
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Next.js コンテキスト外（Cronやスクリプト実行時）は安全にスキップ
  }
}

/**
 * 生徒の担当コーチ名を取得
 */
async function getStudentCoachName(
  supabaseAdmin: any,
  studentId: string,
  initialCoachId?: string | null
): Promise<string | null> {
  if (initialCoachId) {
    const { data: coachProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', initialCoachId)
      .maybeSingle();
    if (coachProfile?.full_name) {
      return coachProfile.full_name;
    }
  }

  const { data: coachJunction } = await supabaseAdmin
    .from('student_coaches')
    .select('profiles(full_name)')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();

  return (coachJunction?.profiles as any)?.full_name || null;
}

/**
 * 生徒の退会設定を取得
 */
export async function getStudentWithdrawalSetting(studentId: string): Promise<StudentWithdrawalSetting | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const key = `student_withdrawal:${studentId}`;
    const { data, error } = await supabaseAdmin
      .from('app_configs')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data?.value) {
      return null;
    }

    const parsed: StudentWithdrawalSetting = JSON.parse(data.value);
    return parsed;
  } catch (err) {
    console.error(`[WithdrawalAction] getStudentWithdrawalSetting error for ${studentId}:`, err);
    return null;
  }
}

/**
 * 退会設定を登録・更新
 * - students テーブルのステータスを 'withdrawn' へ更新
 * - Stripeサブスクリプションを停止
 * - LINEリッチメニュー解除
 * - 再開案内予定月（例: 3月など）を登録
 */
export async function saveStudentWithdrawalSetting(
  studentId: string,
  params: SaveStudentWithdrawalParams
): Promise<{ success: boolean; error?: string; setting?: StudentWithdrawalSetting }> {
  try {
    const { withdrawalDate, reason, resumeTargetMonth, cancelStripe = true } = params;

    if (!withdrawalDate || !/^\d{4}-\d{2}-\d{2}$/.test(withdrawalDate)) {
      return { success: false, error: '退会日は YYYY-MM-DD 形式で指定してください。' };
    }

    const supabaseAdmin = createAdminClient();

    // 1. 生徒情報の取得
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, student_number, status, stripe_subscription_id, line_user_id, notes')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { success: false, error: '生徒情報が見つかりませんでした。' };
    }

    const todayJst = getJstDateString();
    const isFutureWithdrawal = withdrawalDate > todayJst;
    const now = new Date();
    const nowJstStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const yearMonth = withdrawalDate.slice(0, 7);

    if (isFutureWithdrawal) {
      // --- 未来の退会予約（例: 11月末退会など） ---
      // 1. Stripe サブスクリプションは即時解約せず、退会日末日（JST 23:59:59）での解約予定 (cancel_at) を登録
      // これにより、退会日前の月謝決済（例: 11月5日）は通常通り実行され、退会日に自動解約されます
      if (cancelStripe && student.stripe_subscription_id) {
        try {
          const cancelAtTimestamp = Math.floor(new Date(`${withdrawalDate}T23:59:59+09:00`).getTime() / 1000);
          await stripe.subscriptions.update(student.stripe_subscription_id, {
            cancel_at: cancelAtTimestamp,
          });
          console.log(`[WithdrawalAction] Scheduled Stripe subscription cancel_at for ${student.stripe_subscription_id} at ${withdrawalDate} 23:59:59`);
        } catch (stripeErr: any) {
          console.error('[WithdrawalAction] Stripe schedule cancel error:', stripeErr?.message);
        }
      }

      // 2. 生徒ステータスは active（有効）のまま維持し、メモのみ追記
      const resumeText = resumeTargetMonth ? `・再開案内希望: ${resumeTargetMonth}頃` : '・再開案内希望: なし';
      const withdrawalNote = 
`【退会予約受付: ${nowJstStr}】
・退会予定日: ${withdrawalDate}
・退会理由: ${reason?.trim() || '（指定なし）'}
${resumeText}
※ 退会予定日までは会員ステータス（active）が維持され、月謝決済完了後の退会日に自動解約・退会となります。
--------------------------------------------------`;
      const updatedNotes = student.notes ? `${withdrawalNote}\n\n${student.notes}` : withdrawalNote;

      const { error: updateErr } = await supabaseAdmin
        .from('students')
        .update({
          notes: updatedNotes,
        })
        .eq('id', student.id);

      if (updateErr) {
        console.error('[WithdrawalAction] Failed to update student notes for withdrawal reservation:', updateErr);
      }

      // 3. app_configs に status: 'scheduled'（退会予約中）として保存
      const existing = await getStudentWithdrawalSetting(studentId);
      const setting: StudentWithdrawalSetting = {
        student_id: studentId,
        withdrawal_date: withdrawalDate,
        withdrawal_year_month: yearMonth,
        reason: reason?.trim() || undefined,
        resume_target_month: resumeTargetMonth?.trim() || undefined,
        resume_reminder_sent_at: existing?.resume_reminder_sent_at || null,
        status: 'scheduled',
        created_at: existing?.created_at || now.toISOString(),
        updated_at: now.toISOString(),
      };

      await supabaseAdmin.from('app_configs').upsert({
        key: `student_withdrawal:${studentId}`,
        value: JSON.stringify(setting),
        description: `生徒退会予約: ${student.full_name} 様 (退会予定日: ${withdrawalDate})`,
        updated_at: now.toISOString(),
      });

      safeRevalidatePath(`/customers/${studentId}`);
      safeRevalidatePath('/customers');
      safeRevalidatePath('/customers/withdrawn');

      return { success: true, setting };
    } else {
      // --- 即時退会（今日以前の退会日） ---
      // 1. Stripe サブスクリプションを即時解約
      if (cancelStripe && student.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(student.stripe_subscription_id);
          console.log(`[WithdrawalAction] Cancelled Stripe subscription: ${student.stripe_subscription_id}`);
        } catch (stripeErr: any) {
          console.error('[WithdrawalAction] Stripe cancel error:', stripeErr?.message);
        }
      }

      // 2. メモ追記 & ステータスを withdrawn に更新
      const resumeText = resumeTargetMonth ? `・再開案内希望: ${resumeTargetMonth}頃` : '・再開案内希望: なし';
      const withdrawalNote = 
`【退会完了: ${nowJstStr}】
・退会日: ${withdrawalDate}
・退会理由: ${reason?.trim() || '（指定なし）'}
${resumeText}
--------------------------------------------------`;
      const updatedNotes = student.notes ? `${withdrawalNote}\n\n${student.notes}` : withdrawalNote;

      const { error: updateErr } = await supabaseAdmin
        .from('students')
        .update({
          status: 'withdrawn',
          notes: updatedNotes,
          stripe_subscription_id: null,
          membership_type_id: null,
        })
        .eq('id', student.id);

      if (updateErr) {
        console.error('[WithdrawalAction] Failed to update student status to withdrawn:', updateErr);
        return { success: false, error: '生徒ステータスの更新に失敗しました。' };
      }

      // 3. LINE連携ユーザーの処理（リッチメニュー解除、ステップリマインド停止）
      if (student.line_user_id) {
        try {
          const { unlinkRichMenuFromUser } = await import('@/lib/line-richmenu');
          await unlinkRichMenuFromUser(student.line_user_id);
        } catch (rmErr) {
          console.error('[WithdrawalAction] Failed to unlink rich menu:', rmErr);
        }

        try {
          await stopStepReminderForUser(student.line_user_id, 'withdrawn');
        } catch (stepErr) {
          console.error('[WithdrawalAction] Failed to stop step reminder:', stepErr);
        }
      }

      // 4. 退会設定の永続化 (status: 'active' 退会完了)
      const existing = await getStudentWithdrawalSetting(studentId);
      const setting: StudentWithdrawalSetting = {
        student_id: studentId,
        withdrawal_date: withdrawalDate,
        withdrawal_year_month: yearMonth,
        reason: reason?.trim() || undefined,
        resume_target_month: resumeTargetMonth?.trim() || undefined,
        resume_reminder_sent_at: existing?.resume_reminder_sent_at || null,
        status: 'active',
        created_at: existing?.created_at || now.toISOString(),
        updated_at: now.toISOString(),
      };

      await supabaseAdmin.from('app_configs').upsert({
        key: `student_withdrawal:${studentId}`,
        value: JSON.stringify(setting),
        description: `生徒退会完了: ${student.full_name} 様 (退会日: ${withdrawalDate})`,
        updated_at: now.toISOString(),
      });

      safeRevalidatePath(`/customers/${studentId}`);
      safeRevalidatePath('/customers');
      safeRevalidatePath('/customers/withdrawn');

      return { success: true, setting };
    }
  } catch (error: any) {
    console.error('Error in saveStudentWithdrawalSetting:', error);
    return { success: false, error: error.message || '退会設定の保存中にエラーが発生しました。' };
  }
}

/**
 * 退会設定の取り消し・復帰処理
 */
export async function cancelStudentWithdrawalSetting(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, line_user_id, stripe_subscription_id, notes')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { success: false, error: '生徒情報が見つかりません。' };
    }

    const now = new Date();
    const nowJstStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const cancelNote = 
`【退会取消・復帰: ${nowJstStr}】
・退会設定を取り消し、ステータスを有効（active）に復帰しました。
--------------------------------------------------`;
    const updatedNotes = student.notes ? `${cancelNote}\n\n${student.notes}` : cancelNote;

    // もし Stripe サブスクリプションに cancel_at が設定されていた場合はクリアして復元
    if (student.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(student.stripe_subscription_id, {
          cancel_at: '',
        });
        console.log(`[cancelStudentWithdrawalSetting] Cleared cancel_at for Stripe subscription ${student.stripe_subscription_id}`);
      } catch (stripeErr: any) {
        console.error('[cancelStudentWithdrawalSetting] Failed to clear cancel_at:', stripeErr?.message);
      }
    }

    // ステータスを active に戻す
    const { error: updateErr } = await supabaseAdmin
      .from('students')
      .update({
        status: 'active',
        notes: updatedNotes,
      })
      .eq('id', studentId);

    if (updateErr) {
      return { success: false, error: 'ステータスの復帰に失敗しました。' };
    }

    // LINEリッチメニューを会員用に再設定
    if (student.line_user_id) {
      try {
        const { linkMemberRichMenuToUser } = await import('@/lib/line-richmenu');
        await linkMemberRichMenuToUser(student.line_user_id);
      } catch (rmErr) {
        console.error('[cancelStudentWithdrawalSetting] Rich menu error:', rmErr);
      }
    }

    // 設定レコードを cancelled に更新
    const setting = await getStudentWithdrawalSetting(studentId);
    if (setting) {
      setting.status = 'cancelled';
      setting.updated_at = now.toISOString();

      await supabaseAdmin.from('app_configs').upsert({
        key: `student_withdrawal:${studentId}`,
        value: JSON.stringify(setting),
        updated_at: now.toISOString(),
      });
    }

    safeRevalidatePath(`/customers/${studentId}`);
    safeRevalidatePath('/customers');
    safeRevalidatePath('/customers/withdrawn');

    return { success: true };
  } catch (err: any) {
    console.error('Error in cancelStudentWithdrawalSetting:', err);
    return { success: false, error: err.message || '退会取り消し中にエラーが発生しました。' };
  }
}

/**
 * 退会予約の自動処理（日次Cron用）
 * 退会日を迎えた scheduled 状態の生徒を検出し、Stripe解約・ステータス更新を実行
 */
export async function processWithdrawalManagement(options: {
  dryRun?: boolean;
  targetDate?: string; // YYYY-MM-DD
  targetStudentId?: string;
} = {}) {
  const { dryRun = false, targetDate, targetStudentId } = options;
  const supabaseAdmin = createAdminClient();
  const todayJst = targetDate || getJstDateString();

  console.log(`[WithdrawalManagement] Processing withdrawals for date: ${todayJst} (dryRun=${dryRun})`);

  const { data: configs, error: configError } = await supabaseAdmin
    .from('app_configs')
    .select('key, value')
    .ilike('key', 'student_withdrawal:%')
    .limit(5000);

  if (configError) {
    console.error('[WithdrawalManagement] Error fetching withdrawal configs:', configError);
    return { success: false, error: configError.message };
  }

  const results = {
    date: todayJst,
    processed: [] as any[],
  };

  for (const config of configs || []) {
    let setting: StudentWithdrawalSetting;
    try {
      setting = JSON.parse(config.value);
    } catch {
      continue;
    }

    if (targetStudentId && setting.student_id !== targetStudentId) {
      continue;
    }

    // 退会予約中（scheduled）かつ、今日が退会日以降の場合
    if (setting.status === 'scheduled' && todayJst >= setting.withdrawal_date) {
      if (!dryRun) {
        const { data: student } = await supabaseAdmin
          .from('students')
          .select('id, full_name, stripe_subscription_id, line_user_id')
          .eq('id', setting.student_id)
          .single();

        if (student) {
          // Stripeサブスク解約（まだアクティブなら）
          if (student.stripe_subscription_id) {
            try {
              await stripe.subscriptions.cancel(student.stripe_subscription_id);
              console.log(`[WithdrawalManagement] Cancelled Stripe sub ${student.stripe_subscription_id} for ${student.full_name}`);
            } catch (e: any) {
              console.error(`[WithdrawalManagement] Stripe cancel error:`, e?.message);
            }
          }

          // ステータスを withdrawn に更新
          await supabaseAdmin
            .from('students')
            .update({
              status: 'withdrawn',
              stripe_subscription_id: null,
              membership_type_id: null,
            })
            .eq('id', student.id);

          // LINEリッチメニュー解除
          if (student.line_user_id) {
            try {
              const { unlinkRichMenuFromUser } = await import('@/lib/line-richmenu');
              await unlinkRichMenuFromUser(student.line_user_id);
            } catch (e) {}
            try {
              await stopStepReminderForUser(student.line_user_id, 'withdrawn');
            } catch (e) {}
          }

          // 設定レコードを active（退会完了）に更新
          setting.status = 'active';
          setting.updated_at = new Date().toISOString();
          await supabaseAdmin.from('app_configs').upsert({
            key: config.key,
            value: JSON.stringify(setting),
            updated_at: new Date().toISOString(),
          });

          results.processed.push({
            student_id: student.id,
            student_name: student.full_name,
            withdrawal_date: setting.withdrawal_date,
          });
        }
      }
    }
  }

  return { success: true, results };
}

/**
 * 退会者向け再開案内（LINEまたはメール）を送信
 */
export async function sendWithdrawalResumeReminderNotification(
  studentId: string
): Promise<{ success: boolean; error?: string; channels?: string[] }> {
  try {
    const supabaseAdmin = createAdminClient();
    const setting = await getStudentWithdrawalSetting(studentId);

    if (!setting) {
      return { success: false, error: '退会設定が存在しません。' };
    }

    if (setting.status === 'cancelled') {
      return { success: false, error: 'この退会設定はすでにキャンセルされています。' };
    }

    // 生徒情報とコーチ情報の取得
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, contact_email, line_user_id, coach_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { success: false, error: '生徒情報が見つかりません。' };
    }

    const coachName = await getStudentCoachName(supabaseAdmin, studentId, student.coach_id);
    const { subject, body } = buildWithdrawalResumeReminderMessage({
      studentName: student.full_name,
      coachName,
      resumeTargetMonth: setting.resume_target_month,
    });

    const channels: string[] = [];

    // 1. LINE送信（LINE連携済みの場合）
    if (student.line_user_id) {
      try {
        const lineSuccess = await lineService.pushMessage(student.line_user_id, body);
        if (lineSuccess) {
          channels.push('LINE');
          console.log(`[WithdrawalAction] Sent resume reminder via LINE to ${student.full_name}`);
        }
      } catch (lineErr) {
        console.error('[WithdrawalAction] Failed to send LINE resume reminder:', lineErr);
      }
    }

    // 2. メール送信（メールアドレスが存在する場合）
    if (student.contact_email) {
      try {
        const emailSuccess = await emailService.sendEmail({
          to: student.contact_email,
          subject,
          text: body,
        });
        if (emailSuccess) {
          channels.push('Email');
          console.log(`[WithdrawalAction] Sent resume reminder via Email to ${student.contact_email}`);
        }
      } catch (emailErr) {
        console.error('[WithdrawalAction] Failed to send Email resume reminder:', emailErr);
      }
    }

    if (channels.length === 0) {
      return { success: false, error: 'LINE・メールアドレスのいずれにも送信できませんでした。' };
    }

    // 送信日時を記録
    setting.resume_reminder_sent_at = new Date().toISOString();
    setting.updated_at = new Date().toISOString();

    await supabaseAdmin
      .from('app_configs')
      .upsert({
        key: `student_withdrawal:${studentId}`,
        value: JSON.stringify(setting),
        updated_at: new Date().toISOString(),
      });

    safeRevalidatePath(`/customers/${studentId}`);
    safeRevalidatePath('/customers');
    safeRevalidatePath('/customers/withdrawn');

    return { success: true, channels };
  } catch (err: any) {
    console.error('[WithdrawalAction] sendWithdrawalResumeReminderNotification error:', err);
    return { success: false, error: err.message || '再開案内の送信中にエラーが発生しました。' };
  }
}

