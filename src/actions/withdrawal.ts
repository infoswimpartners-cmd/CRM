'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { sendGoogleChatMessage } from '@/lib/google-chat';
import { stopStepReminderForUser } from '@/lib/line-step-reminders';

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
