'use server';

import { createClient } from '@/lib/supabase/server';
import { TrioSlot } from '@/types/trio';
import { revalidatePath } from 'next/cache';

// 管理者権限チェック用のユーティリティ
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証されていません');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('管理者権限が必要です');
  }
}

// 1. スロット作成
export async function createTrioSlot(startAt: string, endAt: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 権限などの本実装時は以下のチェックを行う
    // await requireAdmin();

    const supabase = await createClient();
    const { error } = await supabase
      .from('trio_slots')
      .insert([{
        start_at: startAt,
        end_at: endAt,
        status: 'entry',
        reserved_count: 0,
        is_facility_booked: false
      }]);

    if (error) {
      console.error(error);
      return { success: false, error: 'スロットの作成に失敗しました。' };
    }

    revalidatePath('/admin/trio');
    revalidatePath('/trio/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 2. スロット削除
export async function deleteTrioSlot(slotId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // await requireAdmin();

    const supabase = await createClient();
    const { error } = await supabase
      .from('trio_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error(error);
      return { success: false, error: 'スロットの削除に失敗しました。' };
    }

    revalidatePath('/admin/trio');
    revalidatePath('/trio/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 3. 施設予約完了ステータスのトグル
export async function toggleFacilityBooked(slotId: string, isBooked: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    // await requireAdmin();

    const supabase = await createClient();
    const { error } = await supabase
      .from('trio_slots')
      .update({ is_facility_booked: isBooked })
      .eq('id', slotId);

    if (error) {
      console.error(error);
      return { success: false, error: '状態の更新に失敗しました。' };
    }

    revalidatePath('/admin/trio');
    revalidatePath('/admin/trio/slots');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 4. キャンセル待ちリスト取得
export async function getTrioWaitlist(): Promise<{ waitlist: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('trio_waitlists')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { waitlist: data || [] };
  } catch (err: any) {
    return { waitlist: [], error: err.message };
  }
}
