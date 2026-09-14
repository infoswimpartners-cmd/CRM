'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { LineService } from '@/lib/line';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';
import { SWIM_STEP_SLOTS_DEF } from '@/types/swim_step';
import type { 
  SwimStepAdminBooking, 
  SwimStepSummary 
} from '@/types/swim_step';

/**
 * 申込一覧およびサマリーの取得
 */
export async function getSwimStepBookings(): Promise<{
  bookings: SwimStepAdminBooking[];
  summary: SwimStepSummary;
}> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('swim_step_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[SwimStep Admin] Fetch warning:', error.message);
      return { bookings: [], summary: calculateSummary([]) };
    }

    const bookings = (data || []) as SwimStepAdminBooking[];
    return {
      bookings,
      summary: calculateSummary(bookings),
    };
  } catch (err: any) {
    console.error('[SwimStep Admin] Error in getSwimStepBookings:', err);
    return { bookings: [], summary: calculateSummary([]) };
  }
}

/**
 * サマリー集計計算
 */
function calculateSummary(bookings: SwimStepAdminBooking[]): SwimStepSummary {
  let paidBookings = 0;
  let pendingBookings = 0;
  let totalRevenue = 0;
  const slotCounts: Record<string, number> = {};

  for (const b of bookings) {
    if (b.status === 'cancelled') {
      continue; // キャンセルされたものは枠数・売上集計から除外して枠を解放
    }
    if (b.payment_status === 'paid') {
      paidBookings++;
      totalRevenue += b.amount || 0;

      // 決済完了している参加者のみスロットカウントに加算
      if (Array.isArray(b.selected_slots)) {
        for (const slot of b.selected_slots) {
          const key = `${slot.sessionNumber}_${slot.classType}`;
          slotCounts[key] = (slotCounts[key] || 0) + 1;
        }
      }
    } else if (b.payment_status === 'pending') {
      pendingBookings++;
    }
  }

  return {
    totalBookings: bookings.length,
    paidBookings,
    pendingBookings,
    totalRevenue,
    slotCounts,
  };
}

/**
 * 申込ステータス・管理者メモの更新
 */
export async function updateSwimStepBooking(
  id: string,
  data: {
    payment_status?: 'pending' | 'paid' | 'canceled';
    status?: 'confirmed' | 'attended' | 'cancelled';
    admin_notes?: string;
  }
) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('swim_step_bookings')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/swim-step');
    return { success: true };
  } catch (error: any) {
    console.error('[SwimStep Admin] Update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 管理画面から対象保護者へLINEメッセージを個別送信
 */
export async function sendSwimStepLineMessage(
  bookingId: string,
  message: string
) {
  try {
    if (!message || !message.trim()) {
      return { success: false, error: 'メッセージ内容を入力してください。' };
    }

    const supabaseAdmin = createAdminClient();
    const { data: booking, error } = await supabaseAdmin
      .from('swim_step_bookings')
      .select('line_user_id, parent_name, child_name')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return { success: false, error: '申込情報が見つかりませんでした。' };
    }

    if (!booking.line_user_id) {
      return {
        success: false,
        error: 'この申込にはLINE User IDが連携されていないため、LINE送信できません。',
      };
    }

    const lineService = new LineService();
    const sent = await lineService.pushMessage(booking.line_user_id, message);

    if (!sent) {
      return { success: false, error: 'LINEメッセージの送信に失敗しました。アクセストークン等をご確認ください。' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[SwimStep Admin] LINE push error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 管理画面からのキャンセルおよびStripe返金・LINE通知連携処理
 */
export async function cancelSwimStepBookingAction(params: {
  bookingId: string;
  issueStripeRefund: boolean;
  refundAmount?: number;
  cancelReason?: string;
  sendLineNotification: boolean;
}) {
  const { bookingId, issueStripeRefund, refundAmount, cancelReason, sendLineNotification } = params;
  try {
    const supabaseAdmin = createAdminClient();
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('swim_step_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: '申込情報が見つかりませんでした。' };
    }

    let refundId: string | null = null;
    let actualRefundedAmount = 0;

    // 1. Stripe返金処理（指定があり、かつ決済済みの場合）
    if (issueStripeRefund && booking.payment_status === 'paid') {
      let paymentIntentId = booking.stripe_payment_intent_id;

      // payment_intent_id が未記録の場合、stripe_session_id から取得
      if (!paymentIntentId && booking.stripe_session_id) {
        try {
          const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
          if (session.payment_intent) {
            paymentIntentId =
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent.id;
          }
        } catch (sessErr) {
          console.error('[SwimStep Refund] Failed to retrieve session for PaymentIntent:', sessErr);
        }
      }

      if (!paymentIntentId) {
        return {
          success: false,
          error: 'Stripeの決済情報（PaymentIntent ID）が見つかりませんでした。Stripeダッシュボードからの直接返金をお試しください。',
        };
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount && refundAmount > 0 ? refundAmount : undefined, // 指定なしは全額返金
        reason: 'requested_by_customer',
        metadata: {
          bookingId: booking.id,
          parentName: booking.parent_name,
          cancelReason: cancelReason || '管理者によるキャンセル・返金処理',
        },
      });

      refundId = refund.id;
      actualRefundedAmount = refund.amount;
    }

    // 2. DBステータス更新
    const nowStr = new Date().toISOString();
    const refundNote = refundId
      ? `【返金完了: ${actualRefundedAmount.toLocaleString()}円 (Refund ID: ${refundId})】`
      : issueStripeRefund
      ? '【返金処理なし】'
      : '';
    const reasonNote = cancelReason ? ` 理由: ${cancelReason}` : '';
    const updatedNotes = `${booking.admin_notes || ''}\n[${new Date().toLocaleDateString('ja-JP')} キャンセル] ${refundNote}${reasonNote}`.trim();

    const { error: updateErr } = await supabaseAdmin
      .from('swim_step_bookings')
      .update({
        status: 'cancelled',
        payment_status: issueStripeRefund ? 'canceled' : booking.payment_status,
        admin_notes: updatedNotes,
        updated_at: nowStr,
      })
      .eq('id', bookingId);

    if (updateErr) throw updateErr;

    // 3. LINE通知送信（指定があり、かつLINE連携済みの場合）
    if (sendLineNotification && booking.line_user_id) {
      const lineService = new LineService();
      const refundMsgPart = refundId
        ? `ご決済いただきました受講料（${actualRefundedAmount.toLocaleString()}円）につきましては、クレジットカードへの全額返金手続きを完了いたしました。\n（※カード会社の締め日により、明細への反映には数日程度要する場合がございます）`
        : 'キャンセルを受け付けいたしました。';

      const lineMessage = `【キャンセル手続き完了】スイムステップ

${booking.parent_name} 様

城東小学校プールで開催の「スイムステップ（10月限定クラス）」について、お申し込みのキャンセル手続きが完了いたしました。

━━━━━━━━━━━━━━━━━━━
■ キャンセル内容
・お子様名：${booking.child_name} 様
・参加プラン：${booking.plan_type}
━━━━━━━━━━━━━━━━━━━

${refundMsgPart}

またの機会のご参加を、コーチ一同心よりお待ち申し上げております。`;

      try {
        await lineService.pushMessage(booking.line_user_id, lineMessage);
      } catch (lineErr) {
        console.error('[SwimStep Cancel] LINE Push Error:', lineErr);
      }
    }

    revalidatePath('/admin/swim-step');
    return {
      success: true,
      refundId,
      refundedAmount: actualRefundedAmount,
    };
  } catch (error: any) {
    console.error('[SwimStep Cancel] Error:', error);
    return { success: false, error: error.message || 'キャンセル処理に失敗しました。' };
  }
}
