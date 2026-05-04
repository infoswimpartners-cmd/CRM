'use server';

import { createClient } from '@/lib/supabase/server';
import { TrioSlot } from '@/types/trio';
import { revalidatePath } from 'next/cache';
import { cleanupExpiredEntries } from './trio_matching';

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
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();
    
    // 関連するエントリーも削除
    await supabaseAdmin.from('trio_entries').delete().eq('slot_id', slotId);

    const { error } = await supabaseAdmin
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
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('trio_slots')
      .update({ is_facility_booked: isBooked })
      .eq('id', slotId);

    if (error) {
      console.error(error);
      return { success: false, error: '状態の更新に失敗しました。' };
    }

    revalidatePath('/admin/trio');
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

// 5. 管理画面用スロットとエントリー取得
export async function getTrioAdminSlots(): Promise<{ slots?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // 管理画面表示時にも期限切れを掃除
    await cleanupExpiredEntries();

    const { data, error } = await supabase
      .from('trio_slots')
      .select(`
        *,
        entries:trio_entries(
          id,
          payment_status,
          student:students(
            id,
            full_name,
            contact_email,
            contact_phone,
            is_trio
          )
        )
      `)
      .order('start_at', { ascending: true });

    if (error) throw error;
    return { slots: data || [] };
  } catch (err: any) {
    return { error: err.message };
  }
}

// 6. エントリーのキャンセル（削除）
export async function cancelTrioEntry(entryId: string, slotId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();
    
    // 1. エントリーを削除
    const { error: deleteError } = await supabaseAdmin
      .from('trio_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) throw deleteError;

    // 2. スロットの予約人数を再計算して更新
    const { data: entries } = await supabaseAdmin
      .from('trio_entries')
      .select('id')
      .eq('slot_id', slotId);

    const newCount = entries?.length || 0;
    
    // ステータス判定
    let newStatus = 'entry';
    if (newCount === 1) newStatus = 'matching';
    else if (newCount >= 2) newStatus = 'confirmed';

    await supabaseAdmin
      .from('trio_slots')
      .update({ 
        reserved_count: newCount,
        status: newStatus
      })
      .eq('id', slotId);

    revalidatePath('/admin/trio');
    revalidatePath('/trio/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('cancelTrioEntry error:', err);
    return { success: false, error: 'キャンセルの処理に失敗しました。' };
  }
}
