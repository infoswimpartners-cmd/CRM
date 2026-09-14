'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { LineService } from '@/lib/line';
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
