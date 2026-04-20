'use server';

import { createClient } from '@/lib/supabase/server';
import { TrioSlot } from '@/types/trio';

// 1. スロット一覧の取得
export async function getTrioSlots(): Promise<{ slots?: TrioSlot[]; error?: string }> {
  const supabase = await createClient();
  // 過去のスロットではなく、未来のものだけを取得する実装を想定
  const { data, error } = await supabase
    .from('trio_slots')
    .select('*')
    .gt('start_at', new Date().toISOString())
    .order('start_at', { ascending: true });

  if (error) return { error: error.message };
  return { slots: data as TrioSlot[] };
}

// 2. マッチング開始 (仮予約) ロジック
export async function entryTrioSlot(slotId: string, studentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // スロットの現在の状態を取得
  const { data: slot, error: slotError } = await supabase
    .from('trio_slots')
    .select('*')
    .eq('id', slotId)
    .single();

  if (slotError || !slot) return { success: false, error: 'スロットが見つかりません。' };

  if (slot.reserved_count > 0 || slot.status !== 'entry') {
    return { success: false, error: 'この枠は既にエントリー済みか募集が終了しています。' };
  }

  // トランザクション処理 (RPC推奨だが Server Action で簡易的に実装)
  const { error: entryError } = await supabase
    .from('trio_entries')
    .insert([{ slot_id: slotId, student_id: studentId, payment_status: 'pending' }]);

  if (entryError) return { success: false, error: 'エントリーに失敗しました。' };

  // スロットの状態を更新
  const { error: updateError } = await supabase
    .from('trio_slots')
    .update({ status: 'matching', reserved_count: 1 })
    .eq('id', slotId);

  if (updateError) return { success: false, error: 'スロット状態の更新に失敗しました。' };

  return { success: true };
}

// 3. マッチング確定 (参加/決済) ロジック
export async function confirmTrioSlot(slotId: string, studentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // ユーザー(生徒)情報の確保・チェック
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('trio_ticket_balance, is_trio')
    .eq('id', studentId)
    .single();

  if (studentError || !student) return { success: false, error: '生徒情報が見つかりません。' };
  if (!student.is_trio) return { success: false, error: 'THE TRIOの会員ではありません。' };
  if (student.trio_ticket_balance <= 0) return { success: false, error: 'チケット残高が不足しています。新規チケットを購入してください。' };

  // スロット状態を確認
  const { data: slot, error: slotError } = await supabase
    .from('trio_slots')
    .select('*')
    .eq('id', slotId)
    .single();

  if (slotError || !slot) return { success: false, error: 'スロットが見つかりません。' };
  if (slot.reserved_count >= 3 || slot.status === 'closed') return { success: false, error: 'この枠は満員か受付終了です。' };

  // チケット消費
  const { error: ticketError } = await supabase
    .from('students')
    .update({ trio_ticket_balance: student.trio_ticket_balance - 1 })
    .eq('id', studentId);

  if (ticketError) return { success: false, error: 'チケット処理に失敗しました。' };

  // エントリー追加
  const { error: entryError } = await supabase
    .from('trio_entries')
    .insert([{ slot_id: slotId, student_id: studentId, payment_status: 'paid' }]);

  if (entryError) return { success: false, error: 'エントリーに失敗しました。' };

  // スロット状態更新
  const newCount = slot.reserved_count + 1;
  const newStatus = newCount >= 2 ? 'confirmed' : slot.status;
  
  const { error: updateError } = await supabase
    .from('trio_slots')
    .update({ status: newStatus, reserved_count: newCount })
    .eq('id', slotId);

  if (updateError) return { success: false, error: 'スロット状態の更新に失敗しました。' };

  // 2名目で confirmed になった場合の後続処理（メール送信等）
  if (newCount === 2 && slot.reserved_count === 1) {
    // 参加者2名の student_id と contact_email を取得する
    const { data: entries } = await supabase
      .from('trio_entries')
      .select('student_id')
      .eq('slot_id', slotId);

    if (entries && entries.length > 0) {
      const studentIds = entries.map(e => e.student_id);
      
      const { data: participants } = await supabase
        .from('students')
        .select('full_name, contact_email')
        .in('id', studentIds)
        .not('contact_email', 'is', null);

      if (participants) {
        // [MVP対応]: emailService があればそれを利用。このファイル上部に直接インポートが無い場合は動的または標準でログ対応
        // 本番ではここで各ユーザー宛に開催決定メールを送る。
        try {
          const { emailService } = await import('@/lib/email');
          const formattedDate = new Date(slot.start_at).toLocaleString('ja-JP');
          
          for (const p of participants) {
            if (p.contact_email) {
               await emailService.sendTriggerEmail('trial_lesson_reserved', p.contact_email, {
                 full_name: p.full_name,
                 lesson_date: formattedDate,
                 location: 'THE TRIO 専用施設' // 固定またはマスタから引く
               });
            }
          }
        } catch (emailErr) {
          console.error('Failed to send TRIO confirmation emails:', emailErr);
        }
      }
    }

    // 今回のMVP枠組みとしては 1人目(pendingだった者)のpayment_statusを強制的に 'paid' に更新
    await supabase
      .from('trio_entries')
      .update({ payment_status: 'paid' })
      .eq('slot_id', slotId)
      .eq('payment_status', 'pending');
  }

  return { success: true };
}

// 4. 12名制限・Waitlist 判定チェック
export async function checkAvailableMembership(): Promise<{ isAvailable: boolean; count: number }> {
  const supabase = await createClient();
  
  // countのみ取得
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('is_trio', true)
    .eq('status', 'active'); // statusは既存のstudentsのステータスを利用

  const currentCount = count || 0;
  return {
    isAvailable: currentCount < 12,
    count: currentCount
  };
}

// 5. テスト用ユーザーのID取得 (MVPのテスト制約対応)
export async function getTestTaroId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('students')
    .select('id')
    .or('student_number.eq.0035,full_name.ilike.%テスト太郎%')
    .limit(1)
    .single();
  return data?.id || null;
}

// 6. 生徒の参加済みエントリー一覧取得
export async function getStudentEntries(studentId: string): Promise<{ entries?: any[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trio_entries')
    .select('slot_id, payment_status')
    .eq('student_id', studentId);

  if (error) return { error: error.message };
  return { entries: data };
}
