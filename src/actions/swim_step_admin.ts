'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { LineService } from '@/lib/line';
import { revalidatePath } from 'next/cache';

export interface SwimStepAdminBooking {
  id: string;
  created_at: string;
  updated_at: string;
  line_user_id: string | null;
  line_display_name: string | null;
  parent_name: string;
  parent_kana: string;
  phone: string;
  email: string;
  child_name: string;
  child_kana: string;
  child_age: string | null;
  birth_date: string | null;
  plan_type: string;
  amount: number;
  payment_status: 'pending' | 'paid' | 'canceled';
  stripe_session_id: string | null;
  selected_slots: Array<{
    sessionNumber: number;
    date: string;
    dateLabel: string;
    classType: 'water_familiarity' | 'crawl_breathing';
    className: string;
    timeRange: string;
  }>;
  swimming_experience: string | null;
  terms_agreed: boolean;
  admin_notes: string | null;
  status: 'confirmed' | 'attended' | 'cancelled';
}

export interface SwimStepSummary {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  slotCounts: Record<string, number>; // "1_water_familiarity": 3 等
}

// 規定の8スロットのキー定義
export const SWIM_STEP_SLOTS_DEF = [
  {
    sessionNumber: 1,
    date: '2026-10-02',
    dateLabel: '第1回：10月2日（金）',
    classes: [
      { type: 'water_familiarity', label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing', label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
  {
    sessionNumber: 2,
    date: '2026-10-09',
    dateLabel: '第2回：10月9日（金）',
    classes: [
      { type: 'water_familiarity', label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing', label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
  {
    sessionNumber: 3,
    date: '2026-10-16',
    dateLabel: '第3回：10月16日（金）',
    classes: [
      { type: 'water_familiarity', label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing', label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
  {
    sessionNumber: 4,
    date: '2026-10-23',
    dateLabel: '第4回：10月23日（金）',
    classes: [
      { type: 'water_familiarity', label: '17:00〜17:50（水慣れ〜キック基礎）', capacity: 3 },
      { type: 'crawl_breathing', label: '18:00〜18:50（クロール息継ぎ・25m挑戦）', capacity: 3 },
    ],
  },
];

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
