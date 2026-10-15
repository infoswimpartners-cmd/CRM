'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { emailService } from '@/lib/email';
import { lineService } from '@/lib/line';
import { revalidatePath } from 'next/cache';
import { StudentLeaveSetting, SaveStudentLeaveParams } from '@/types/leave';
import {
  getJstDateString,
  getMonthFirstDate,
  getMonthLastDate,
  getNextYearMonth,
  calculateMonths,
  buildLeaveConfirmationMessage,
  buildResumeReminderMessage,
} from '@/lib/leave';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Next.jsのコンテキスト外（CLIスクリプトやCron等）での実行時は安全にスキップ
  }
}

/**
 * 生徒の担当コーチ名を取得（students.coach_id および student_coaches テーブルの両方を参照）
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

  // student_coaches テーブルへのフォールバック
  const { data: coachJunction } = await supabaseAdmin
    .from('student_coaches')
    .select('profiles(full_name)')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle();

  return (coachJunction?.profiles as any)?.full_name || null;
}

/**
 * 生徒の休会設定を取得
 */
export async function getStudentLeaveSetting(studentId: string): Promise<StudentLeaveSetting | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const key = `student_leave:${studentId}`;
    const { data, error } = await supabaseAdmin
      .from('app_configs')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data?.value) {
      return null;
    }

    const parsed: StudentLeaveSetting = JSON.parse(data.value);
    return parsed;
  } catch (err) {
    console.error(`[LeaveAction] getStudentLeaveSetting error for ${studentId}:`, err);
    return null;
  }
}

/**
 * 休会設定を登録・更新
 * - 最大1年（12ヶ月）
 * - 休会期間内の場合は定期課金停止および生徒ステータスをrestingに更新
 * - 休会期間外（未来）への変更時は以前の課金停止・ステータスを復帰
 */
export async function saveStudentLeaveSetting(
  studentId: string,
  params: SaveStudentLeaveParams
): Promise<{ success: boolean; error?: string; setting?: StudentLeaveSetting; confirmationSent?: boolean }> {
  try {
    const { startYearMonth, endYearMonth, reason, sendConfirmation } = params;

    // 1. バリデーション
    if (!/^\d{4}-\d{2}$/.test(startYearMonth) || !/^\d{4}-\d{2}$/.test(endYearMonth)) {
      return { success: false, error: '年月は YYYY-MM 形式で指定してください。' };
    }

    if (startYearMonth > endYearMonth) {
      return { success: false, error: '休会終了月は開始月以降を指定してください。' };
    }

    const months = calculateMonths(startYearMonth, endYearMonth);
    if (months <= 0) {
      return { success: false, error: '有効な休会期間を指定してください。' };
    }
    if (months > 12) {
      return { success: false, error: '休会期間は最長1年（12ヶ月）まで設定可能です。' };
    }

    const supabaseAdmin = createAdminClient();

    // 2. 生徒データの取得
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, status, stripe_subscription_id, coach_id, contact_email, line_user_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { success: false, error: '生徒情報が見つかりません。' };
    }

    const startDate = getMonthFirstDate(startYearMonth);
    const endDate = getMonthLastDate(endYearMonth);
    const resumeYearMonth = getNextYearMonth(endYearMonth);
    const resumeDate = getMonthFirstDate(resumeYearMonth);

    const todayJst = getJstDateString();

    // 現在の日付が休会期間内かどうか
    const isCurrentlyInLeave = todayJst >= startDate && todayJst <= endDate;

    let stripePaused = false;
    const existing = await getStudentLeaveSetting(studentId);

    // 3. 休会期間に応じた課金停止・ステータス更新
    if (isCurrentlyInLeave) {
      // 休会期間内の場合: Stripe サブスクリプションの一時停止 (pause_collection)
      if (student.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(student.stripe_subscription_id, {
            pause_collection: {
              behavior: 'void', // 請求書を発行せずスキップ
            },
          });
          stripePaused = true;
          console.log(`[LeaveAction] Paused Stripe subscription ${student.stripe_subscription_id} for student ${student.full_name}`);
        } catch (stripeErr: any) {
          console.error(`[LeaveAction] Failed to pause Stripe subscription:`, stripeErr);
        }
      }

      // 生徒ステータスを 'resting' (休会中) に更新
      await supabaseAdmin
        .from('students')
        .update({ status: 'resting' })
        .eq('id', studentId);
    } else {
      // 未来の休会予定に変更された場合:
      // 以前休会中(resting)だった場合は active に戻し、Stripeの停止も解除
      if (student.status === 'resting' || student.status === '休会') {
        await supabaseAdmin
          .from('students')
          .update({ status: 'active' })
          .eq('id', studentId);
      }
      if (existing?.stripe_subscription_paused && student.stripe_subscription_id) {
        try {
          await stripe.subscriptions.update(student.stripe_subscription_id, {
            pause_collection: '',
          });
          console.log(`[LeaveAction] Resumed Stripe subscription ${student.stripe_subscription_id} for future leave schedule`);
        } catch (stripeErr: any) {
          console.error(`[LeaveAction] Failed to resume Stripe subscription for future leave:`, stripeErr);
        }
      }
      stripePaused = false;
    }

    // 4. 休会設定オブジェクトの作成
    // 終了月が変更された場合や、以前完了・キャンセルされた設定の場合はリマインド送信日時をリセット
    const isEndMonthChanged = existing?.end_year_month !== endYearMonth;
    const isNewCycle = existing?.status === 'completed' || existing?.status === 'cancelled';
    const resumeReminderSentAt = (isEndMonthChanged || isNewCycle) ? null : (existing?.resume_reminder_sent_at || null);

    const nowIso = new Date().toISOString();

    const setting: StudentLeaveSetting = {
      student_id: studentId,
      start_year_month: startYearMonth,
      end_year_month: endYearMonth,
      start_date: startDate,
      end_date: endDate,
      resume_year_month: resumeYearMonth,
      resume_date: resumeDate,
      leave_months: months,
      status: isCurrentlyInLeave ? 'active' : 'scheduled',
      reason: reason || '',
      stripe_subscription_paused: isCurrentlyInLeave ? (stripePaused || !!student.stripe_subscription_id) : false,
      confirmation_sent_at: existing?.confirmation_sent_at || null,
      resume_reminder_sent_at: resumeReminderSentAt,
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
    };

    // 5. app_configs に保存
    const key = `student_leave:${studentId}`;
    const { error: configError } = await supabaseAdmin
      .from('app_configs')
      .upsert({
        key,
        value: JSON.stringify(setting),
        description: `休会設定: ${student.full_name} (${startYearMonth} 〜 ${endYearMonth})`,
        updated_at: nowIso,
      });

    if (configError) {
      console.error('[LeaveAction] Failed to save app_config:', configError);
      return { success: false, error: '休会設定の保存に失敗しました。' };
    }

    // 6. オプション: 休会受付案内を即時送信
    let confirmationSent = false;
    if (sendConfirmation) {
      const confirmRes = await sendLeaveConfirmationNotification(studentId);
      confirmationSent = confirmRes.success;
    }

    safeRevalidatePath(`/customers/${studentId}`);
    safeRevalidatePath(`/customers/${studentId}/edit`);
    safeRevalidatePath('/customers');

    return { success: true, setting, confirmationSent };
  } catch (err: any) {
    console.error('[LeaveAction] saveStudentLeaveSetting catch error:', err);
    return { success: false, error: err.message || '休会設定の保存中にエラーが発生しました。' };
  }
}

/**
 * 休会設定の解除・キャンセル
 */
export async function cancelStudentLeaveSetting(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = createAdminClient();
    const existing = await getStudentLeaveSetting(studentId);

    // 生徒データの取得
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, full_name, status, stripe_subscription_id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return { success: false, error: '生徒情報が見つかりません。' };
    }

    // 1. Stripe サブスクリプションの一時停止を解除（再開）
    if (student.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(student.stripe_subscription_id, {
          pause_collection: '', // 空文字で pause_collection を解除
        });
        console.log(`[LeaveAction] Resumed Stripe subscription ${student.stripe_subscription_id}`);
      } catch (stripeErr: any) {
        console.error(`[LeaveAction] Error resuming Stripe subscription:`, stripeErr);
      }
    }

    // 2. 生徒ステータスが休会中 (resting または 休会) だった場合は active に復帰
    if (student.status === 'resting' || student.status === '休会') {
      await supabaseAdmin
        .from('students')
        .update({ status: 'active' })
        .eq('id', studentId);
    }

    // 3. app_configs の設定ステータスを cancelled に更新
    if (existing) {
      existing.status = 'cancelled';
      existing.stripe_subscription_paused = false;
      existing.updated_at = new Date().toISOString();
      await supabaseAdmin
        .from('app_configs')
        .upsert({
          key: `student_leave:${studentId}`,
          value: JSON.stringify(existing),
          updated_at: new Date().toISOString(),
        });
    }

    safeRevalidatePath(`/customers/${studentId}`);
    safeRevalidatePath(`/customers/${studentId}/edit`);
    safeRevalidatePath('/customers');

    return { success: true };
  } catch (err: any) {
    console.error('[LeaveAction] cancelStudentLeaveSetting error:', err);
    return { success: false, error: err.message || '休会の解除中にエラーが発生しました。' };
  }
}

/**
 * 休会受付案内（LINEまたはメール）を送信
 */
export async function sendLeaveConfirmationNotification(
  studentId: string
): Promise<{ success: boolean; error?: string; channels?: string[] }> {
  try {
    const supabaseAdmin = createAdminClient();
    const setting = await getStudentLeaveSetting(studentId);

    if (!setting) {
      return { success: false, error: '休会設定が存在しません。' };
    }

    if (setting.status === 'cancelled') {
      return { success: false, error: 'この休会設定はすでにキャンセルされています。' };
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
    const { subject, body } = buildLeaveConfirmationMessage({
      studentName: student.full_name,
      coachName,
      startYearMonth: setting.start_year_month,
      endYearMonth: setting.end_year_month,
      startDate: setting.start_date,
      endDate: setting.end_date,
      resumeYearMonth: setting.resume_year_month,
      leaveMonths: setting.leave_months,
      reason: setting.reason,
    });

    const channels: string[] = [];

    // 1. LINE送信（LINE連携済みの場合）
    if (student.line_user_id) {
      try {
        const lineSuccess = await lineService.pushMessage(student.line_user_id, body);
        if (lineSuccess) {
          channels.push('LINE');
          console.log(`[LeaveAction] Sent leave confirmation via LINE to ${student.full_name}`);
        }
      } catch (lineErr) {
        console.error('[LeaveAction] Failed to send LINE leave confirmation:', lineErr);
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
          console.log(`[LeaveAction] Sent leave confirmation via Email to ${student.contact_email}`);
        }
      } catch (emailErr) {
        console.error('[LeaveAction] Failed to send Email leave confirmation:', emailErr);
      }
    }

    if (channels.length === 0) {
      return { success: false, error: 'LINE・メールアドレスのいずれにも送信できませんでした。' };
    }

    // 送信日時を記録
    setting.confirmation_sent_at = new Date().toISOString();
    setting.updated_at = new Date().toISOString();

    await supabaseAdmin
      .from('app_configs')
      .upsert({
        key: `student_leave:${studentId}`,
        value: JSON.stringify(setting),
        updated_at: new Date().toISOString(),
      });

    safeRevalidatePath(`/customers/${studentId}`);

    return { success: true, channels };
  } catch (err: any) {
    console.error('[LeaveAction] sendLeaveConfirmationNotification error:', err);
    return { success: false, error: err.message || '休会受付案内送信中にエラーが発生しました。' };
  }
}

/**
 * 再開案内（LINEまたはメール）を送信
 */
export async function sendResumeReminderNotification(
  studentId: string,
  options: { forceSend?: boolean } = {}
): Promise<{ success: boolean; error?: string; channels?: string[] }> {
  try {
    const supabaseAdmin = createAdminClient();
    const setting = await getStudentLeaveSetting(studentId);

    if (!setting) {
      return { success: false, error: '休会設定が存在しません。' };
    }

    if (setting.status === 'cancelled' || setting.status === 'completed') {
      return { success: false, error: 'この休会設定はすでに終了またはキャンセルされています。' };
    }

    if (!options.forceSend && setting.resume_reminder_sent_at) {
      return { success: false, error: '再開案内は既に送信済みです。' };
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
    const { subject, body } = buildResumeReminderMessage({
      studentName: student.full_name,
      coachName,
      resumeYearMonth: setting.resume_year_month,
      leaveEndDate: setting.end_date,
    });

    const channels: string[] = [];

    // 1. LINE送信（LINE連携済みの場合）
    if (student.line_user_id) {
      try {
        const lineSuccess = await lineService.pushMessage(student.line_user_id, body);
        if (lineSuccess) {
          channels.push('LINE');
          console.log(`[LeaveAction] Sent resume reminder via LINE to ${student.full_name}`);
        }
      } catch (lineErr) {
        console.error('[LeaveAction] Failed to send LINE resume reminder:', lineErr);
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
          console.log(`[LeaveAction] Sent resume reminder via Email to ${student.contact_email}`);
        }
      } catch (emailErr) {
        console.error('[LeaveAction] Failed to send Email resume reminder:', emailErr);
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
        key: `student_leave:${studentId}`,
        value: JSON.stringify(setting),
        updated_at: new Date().toISOString(),
      });

    safeRevalidatePath(`/customers/${studentId}`);

    return { success: true, channels };
  } catch (err: any) {
    console.error('[LeaveAction] sendResumeReminderNotification error:', err);
    return { success: false, error: err.message || '再開案内送信中にエラーが発生しました。' };
  }
}

/**
 * 休会管理の一括バッチ処理
 * 1. 休会開始日を迎えた生徒のステータス更新・課金一時停止
 * 2. 再開前月5日を迎えた生徒への再開案内自動送信
 * 3. 休会期間が終了した生徒のステータス復帰・課金自動再開
 */
export async function processLeaveManagement(options: {
  dryRun?: boolean;
  targetDate?: string; // YYYY-MM-DD
  targetStudentId?: string; // テスト用生徒ID制限
} = {}) {
  const { dryRun = false, targetDate, targetStudentId } = options;
  const supabaseAdmin = createAdminClient();

  const todayJst = targetDate || getJstDateString();

  console.log(`[LeaveManagement] Processing leave management for date: ${todayJst} (dryRun=${dryRun})`);

  // 全ての休会設定を取得
  const query = supabaseAdmin
    .from('app_configs')
    .select('key, value')
    .like('key', 'student_leave:%')
    .limit(5000);

  const { data: configs, error: configError } = await query;
  if (configError) {
    console.error('[LeaveManagement] Error fetching leave configs:', configError);
    return { success: false, error: configError.message };
  }

  const results = {
    date: todayJst,
    activated: [] as any[],
    reminders_sent: [] as any[],
    resumed: [] as any[],
    skipped: [] as any[],
  };

  for (const config of configs || []) {
    let setting: StudentLeaveSetting;
    try {
      setting = JSON.parse(config.value);
    } catch {
      continue;
    }

    // 特定生徒指定のテスト時
    if (targetStudentId && setting.student_id !== targetStudentId) {
      continue;
    }

    // 終了・キャンセル済みの設定はスキップ
    if (setting.status === 'cancelled' || setting.status === 'completed') {
      continue;
    }

    // --- A. 休会開始処理 (scheduled -> active) ---
    // 今日が開始日以降、かつ終了日以前で、ステータスが scheduled の場合
    if (setting.status === 'scheduled' && todayJst >= setting.start_date && todayJst <= setting.end_date) {
      if (!dryRun) {
        // 生徒データ取得
        const { data: student } = await supabaseAdmin
          .from('students')
          .select('id, full_name, stripe_subscription_id')
          .eq('id', setting.student_id)
          .single();

        let stripePaused = false;
        if (student?.stripe_subscription_id) {
          try {
            await stripe.subscriptions.update(student.stripe_subscription_id, {
              pause_collection: { behavior: 'void' },
            });
            stripePaused = true;
          } catch (e: any) {
            console.error(`[LeaveManagement] Failed to pause sub for ${student.id}:`, e);
          }
        }

        await supabaseAdmin
          .from('students')
          .update({ status: 'resting' })
          .eq('id', setting.student_id);

        setting.status = 'active';
        setting.stripe_subscription_paused = stripePaused || !!student?.stripe_subscription_id;
        setting.updated_at = new Date().toISOString();

        await supabaseAdmin.from('app_configs').upsert({
          key: config.key,
          value: JSON.stringify(setting),
          updated_at: new Date().toISOString(),
        });
      }
      results.activated.push({ student_id: setting.student_id, period: `${setting.start_date} ~ ${setting.end_date}` });
    }

    // --- B. 再開案内自動送信 (前月5日) ---
    // 例: 終了が2027-04-30 (再開2027-05) の場合、前月は2027-04。前月5日は2027-04-05。
    // 終了月 (end_year_month) の05日以降、かつ終了日以前で未送信の場合！
    const endYearMonth = setting.end_year_month;
    const reminderTriggerDate = `${endYearMonth}-05`;

    const isReminderDue = todayJst >= reminderTriggerDate && todayJst <= setting.end_date;
    const isReminderPending = !setting.resume_reminder_sent_at;

    if ((setting.status === 'active' || setting.status === 'scheduled') && isReminderDue && isReminderPending) {
      if (!dryRun) {
        const sendRes = await sendResumeReminderNotification(setting.student_id);
        results.reminders_sent.push({
          student_id: setting.student_id,
          success: sendRes.success,
          channels: sendRes.channels,
          error: sendRes.error,
        });
      } else {
        results.reminders_sent.push({
          student_id: setting.student_id,
          dry_run: true,
          trigger_date: reminderTriggerDate,
        });
      }
    }

    // --- C. 休会終了・自動再開処理 (active または scheduled -> completed) ---
    // 今日が休会終了日を過ぎた場合 (todayJst > setting.end_date)
    if ((setting.status === 'active' || setting.status === 'scheduled') && todayJst > setting.end_date) {
      if (!dryRun) {
        const { data: student } = await supabaseAdmin
          .from('students')
          .select('id, full_name, stripe_subscription_id, status')
          .eq('id', setting.student_id)
          .single();

        // 1. Stripe 定期課金一時停止の解除
        if (student?.stripe_subscription_id) {
          try {
            await stripe.subscriptions.update(student.stripe_subscription_id, {
              pause_collection: '',
            });
            console.log(`[LeaveManagement] Resumed Stripe sub for student ${student.id}`);
          } catch (e: any) {
            console.error(`[LeaveManagement] Failed to resume sub for ${student.id}:`, e);
          }
        }

        // 2. 生徒ステータスを active に自動復帰
        if (student?.status === 'resting' || student?.status === '休会') {
          await supabaseAdmin
            .from('students')
            .update({ status: 'active' })
            .eq('id', setting.student_id);
        }

        // 3. 設定ステータスを completed に更新
        setting.status = 'completed';
        setting.stripe_subscription_paused = false;
        setting.updated_at = new Date().toISOString();

        await supabaseAdmin.from('app_configs').upsert({
          key: config.key,
          value: JSON.stringify(setting),
          updated_at: new Date().toISOString(),
        });
      }
      results.resumed.push({ student_id: setting.student_id, resume_date: setting.resume_date });
    }
  }

  return { success: true, results };
}
