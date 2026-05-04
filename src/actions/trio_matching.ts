'use server';

import { createClient } from '@/lib/supabase/server';
import { TrioSlot } from '@/types/trio';
import { revalidatePath } from 'next/cache';

// 有効期限切れの未払いエントリーをクリーンアップする内部関数
export async function cleanupExpiredEntries() {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  
  // 有効期限が切れた pending エントリーを取得
  const { data: expiredEntries } = await supabase
    .from('trio_entries')
    .select('id, slot_id')
    .eq('payment_status', 'pending')
    .lt('expires_at', now);

  if (expiredEntries && expiredEntries.length > 0) {
    for (const entry of expiredEntries) {
      // エントリーを削除
      await supabase.from('trio_entries').delete().eq('id', entry.id);
      
      // スロットの予約数を減らし、ステータスを更新
      const { data: slot } = await supabase.from('trio_slots').select('reserved_count, status').eq('id', entry.slot_id).single();
      if (slot) {
        const newCount = Math.max(0, slot.reserved_count - 1);
        // 0人なら entry, 1人なら matching, 2人以上なら confirmed
        let newStatus = 'entry';
        if (newCount === 1) newStatus = 'matching';
        else if (newCount >= 2) newStatus = 'confirmed';
        
        await supabase.from('trio_slots').update({ 
          reserved_count: newCount,
          status: newStatus
        }).eq('id', entry.slot_id);
      }
    }
  }
}

// 1. スロット一覧の取得
export async function getTrioSlots(): Promise<{ slots?: TrioSlot[]; error?: string }> {
  const supabase = await createClient();
  
  // 一覧取得前に期限切れを掃除
  await cleanupExpiredEntries();

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

  if (entryError) return { success: false, error: `エントリーに失敗しました: ${entryError.message}` };

  // スロットの状態を更新
  const { error: updateError } = await supabase
    .from('trio_slots')
    .update({ status: 'matching', reserved_count: 1 })
    .eq('id', slotId);

  if (updateError) return { success: false, error: 'スロット状態の更新に失敗しました。' };

  return { success: true };
}

// 3. マッチング確定 (参加/決済) ロジック
export async function confirmTrioSlot(slotId: string, studentId: string, customClient?: any): Promise<{ success: boolean; error?: string }> {
  const supabase = customClient || await createClient();

  // ユーザー(生徒)情報の確保・チェック
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('trio_ticket_balance, is_trio')
    .eq('id', studentId)
    .single();

  if (studentError || !student) return { success: false, error: '生徒情報が見つかりません。' };
  // スロット状態を確認
  const { data: slot, error: slotError } = await supabase
    .from('trio_slots')
    .select('*')
    .eq('id', slotId)
    .single();

  if (slotError || !slot) return { success: false, error: 'スロットが見つかりません。' };
  if (slot.reserved_count >= 3 || slot.status === 'closed') return { success: false, error: 'この枠は満員か受付終了です。' };

  // 会員の場合はチケット残高をチェックし、消費する
  if (student.is_trio) {
    if (student.trio_ticket_balance <= 0) return { success: false, error: 'チケット残高が不足しています。新規チケットを購入してください。' };

    // チケット消費
    const { error: ticketError } = await supabase
      .from('students')
      .update({ trio_ticket_balance: student.trio_ticket_balance - 1 })
      .eq('id', studentId);

    if (ticketError) return { success: false, error: 'チケット処理に失敗しました。' };
  }

  // エントリー追加
  // 体験参加（pending）の場合は10分間の有効期限を設定
  const expiresAt = !student.is_trio ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;

  const { error: entryError } = await supabase
    .from('trio_entries')
    .insert([{ 
      slot_id: slotId, 
      student_id: studentId, 
      payment_status: student.is_trio ? 'paid' : 'pending',
      expires_at: expiresAt
    }]);

  if (entryError && entryError.code !== '23505') {
    return { success: false, error: `エントリーに失敗しました: ${entryError.message}` };
  }

  // スロット状態更新（実際のレコード数に基づいて更新し、不整合を防ぐ）
  const { count: actualCount } = await supabase
    .from('trio_entries')
    .select('*', { count: 'exact', head: true })
    .eq('slot_id', slotId);

  const newCount = actualCount || 0;
  const newStatus = newCount >= 2 ? 'confirmed' : 'matching';
  
  const { error: updateError } = await supabase
    .from('trio_slots')
    .update({ status: newStatus, reserved_count: newCount })
    .eq('id', slotId);

  if (updateError) {
      console.error('Failed to update slot count:', updateError);
  }

  if (updateError) return { success: false, error: 'スロット状態の更新に失敗しました。' };

  // --- 追加: 予約した本人への即時通知 ---
  try {
    const { data: currentStudent } = await supabase
      .from('students')
      .select('full_name, line_user_id')
      .eq('id', studentId)
      .single();

    if (currentStudent?.line_user_id) {
      const { lineService } = await import('@/lib/line');
      const formattedDate = new Date(slot.start_at).toLocaleString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
      const message = `【THE TRIO】予約受付完了のお知らせ\n\n${currentStudent.full_name}様\nセッションの予約を受け付けました。\n\n日時：${formattedDate}\n場所：THE TRIO 専用施設\n\n2名以上の予約でマッチング成立（開催確定）となります。確定次第、改めてご連絡いたします。`;
      await lineService.pushMessage(currentStudent.line_user_id, message);
    }
  } catch (err) {
    console.error('Failed to send instant LINE notification:', err);
  }
  // ----------------------------------

    // 2名目で confirmed になった場合の後続処理
    if (newCount === 2 && slot.reserved_count === 1) {
      // 参加者の情報を取得
      const { data: entries } = await supabase
        .from('trio_entries')
        .select('student_id')
        .eq('slot_id', slotId);

      if (entries && entries.length > 0) {
        const studentIds = entries.map((e: any) => e.student_id);
        const { data: participants } = await supabase
          .from('students')
          .select('full_name, contact_email, line_user_id')
          .in('id', studentIds);

        if (participants) {
          try {
            const formattedDate = new Date(slot.start_at).toLocaleString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
            
            for (const p of participants) {
              // LINE通知の送信
              if (p.line_user_id) {
                const { lineService } = await import('@/lib/line');
                const message = `【THE TRIO】マッチング成立のお知らせ\n\n${p.full_name}様、お待たせいたしました！\n以下のセッションのマッチングが成立し、開催が確定しました。\n\n日時：${formattedDate}\n場所：THE TRIO 専用施設\n\n当日のご来場を心よりお待ちしております。`;
                await lineService.pushMessage(p.line_user_id, message);
              }

              // メール通知の送信 (既存)
              if (p.contact_email) {
                const { emailService } = await import('@/lib/email');
                await emailService.sendTriggerEmail('trial_lesson_reserved', p.contact_email, {
                  full_name: p.full_name,
                  lesson_date: formattedDate,
                  location: 'THE TRIO 専用施設'
                });
              }
            }
          } catch (err) {
            console.error('Failed to send TRIO confirmation notifications:', err);
          }
        }
      }

      // 今回のMVP枠組みとしては 1人目(pendingだった者)のpayment_statusを強制的に 'paid' に更新
      // 同時に有効期限をクリア
      await supabase
        .from('trio_entries')
        .update({ payment_status: 'paid', expires_at: null })
        .eq('slot_id', slotId)
        .eq('payment_status', 'pending');
    }

  revalidatePath('/trio');
  revalidatePath('/member/dashboard');
  return { success: true };
}

// 4. LINE ID に紐づく生徒情報を取得
export async function getTrioStudentProfile(lineUserId: string): Promise<{ student?: any; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();

  if (error && error.code !== 'PGRST116') return { error: error.message };
  return { student: data };
}

// 5. 未登録ユーザーのエントリーと同時登録アクション
export async function registerAndEntryTrioSlot(
  slotId: string, 
  data: { 
    lastName: string; 
    firstName: string; 
    lastNameKana: string; 
    firstNameKana: string; 
    email: string; 
    phone: string; 
    birthDate: string;
    swimmingLevel?: string;
    concerns?: string;
    lineUserId?: string;
  }
): Promise<{ success: boolean; error?: string; url?: string | null }> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabaseAdmin = createAdminClient();

  try {
    let studentId: string;
    const fullName = `${data.lastName} ${data.firstName}`;
    const fullNameKana = `${data.lastNameKana} ${data.firstNameKana}`;
    const combinedNotes = `【水泳レベル】${data.swimmingLevel || '未設定'}\n【お悩み】${data.concerns || '特になし'}`;

    // 1. 既存ユーザーのチェック (LINE ID または Email)
    let existingStudent = null;
    if (data.lineUserId) {
      const { data: byLine } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('line_user_id', data.lineUserId)
        .single();
      existingStudent = byLine;
    }

    if (!existingStudent) {
      const { data: byEmail } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('contact_email', data.email)
        .single();
      existingStudent = byEmail;
    }

    if (existingStudent) {
      // 既存ユーザーの更新
      studentId = existingStudent.id;
      const { error: updateError } = await supabaseAdmin
        .from('students')
        .update({
          full_name: fullName,
          full_name_kana: fullNameKana,
          contact_phone: data.phone || null,
          birth_date: data.birthDate || null,
          notes: combinedNotes,
          line_user_id: data.lineUserId,
          is_trio: false // 体験なので false
        })
        .eq('id', studentId);

      if (updateError) throw updateError;
    } else {
      // 新規顧客（students）の作成
      const { data: newStudent, error: createError } = await supabaseAdmin
        .from('students')
        .insert([{
          full_name: fullName,
          full_name_kana: fullNameKana,
          contact_email: data.email,
          contact_phone: data.phone || null,
          birth_date: data.birthDate || null,
          notes: combinedNotes,
          line_user_id: data.lineUserId,
          status: 'active',
          is_trio: false
        }])
        .select('id')
        .single();

      if (createError || !newStudent) {
        console.error('Failed to create new student:', createError);
        return { success: false, error: '顧客情報の登録に失敗しました。' };
      }
      studentId = newStudent.id;
    }

    // 2. 作成した studentId を使ってエントリー処理を呼び出す
    const confirmRes = await confirmTrioSlot(slotId, studentId, supabaseAdmin);
    if (!confirmRes.success) {
      return confirmRes;
    }

    // 3. Stripe Checkout セッションの作成
    try {
      const { stripe } = await import('@/lib/stripe');
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const origin = headersList.get('origin') || headersList.get('referer') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // 末尾のスラッシュを除去
      const APP_URL = origin.replace(/\/$/, '');
      
      let lineItems: any[] = [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: 'THE TRIO 体験エントリー',
          },
          unit_amount: 5000,
        },
        quantity: 1,
      }];

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${APP_URL}/trio?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/trio?payment=cancel`,
        metadata: {
          type: 'trio_trial',
          studentId: studentId,
          slotId: slotId
        },
      });

      revalidatePath('/trio');
      revalidatePath('/member/dashboard');
      return { success: true, url: session.url };
    } catch (stripeError) {
      console.error('Stripe session creation failed:', stripeError);
      return { success: false, error: '決済画面の生成に失敗しました。' };
    }
  } catch (err: any) {
    console.error('registerAndEntryTrioSlot error:', err);
    return { success: false, error: '処理中にエラーが発生しました。' };
  }
}

// 5. 12名制限・Waitlist 判定チェック
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

// 7. 生徒の予約詳細（スロット情報込み）を取得
export async function getDetailedStudentEntries(studentId: string): Promise<{ entries?: any[]; error?: string }> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('trio_entries')
    .select(`
      id,
      payment_status,
      slot:trio_slots!inner (
        id,
        start_at,
        end_at,
        status,
        reserved_count
      )
    `)
    .eq('student_id', studentId)
    .gt('slot.start_at', new Date().toISOString())
    .order('start_at', { ascending: true, foreignTable: 'slot' });

  if (error) return { error: error.message };
  return { entries: data as any[] };
}

// 8. ポータル用の統合データ取得（NextAuth & Supabase Auth 両対応）
export async function getTrioPortalData(): Promise<{ 
  student: any | null; 
  entries: any[];
  isLoggedIn: boolean;
}> {
  const { getServerSession } = await import('next-auth/next');
  const { authOptions } = await import('@/lib/auth');
  const { createClient } = await import('@/lib/supabase/server');
  const { createAdminClient } = await import('@/lib/supabase/admin');
  
  const nextAuthSession = await getServerSession(authOptions);
  const supabaseServer = await createClient();
  const { data: { user: supabaseUser } } = await supabaseServer.auth.getUser();

  const lineUserId = nextAuthSession?.user ? (nextAuthSession.user as any).id : null;
  const authUserId = supabaseUser?.id || null;

  if (!lineUserId && !authUserId) {
    return { student: null, entries: [], isLoggedIn: false };
  }

  const supabaseAdmin = createAdminClient();
  let query = supabaseAdmin.from('students').select('id, is_trio, trio_ticket_balance, full_name, full_name_kana, contact_email, contact_phone, birth_date');
  
  if (lineUserId && authUserId) {
    query = query.or(`auth_user_id.eq.${authUserId},line_user_id.eq.${lineUserId}`);
  } else if (lineUserId) {
    query = query.eq('line_user_id', lineUserId);
  } else if (authUserId) {
    query = query.eq('auth_user_id', authUserId);
  }

  const { data: student } = await query.single();

  if (!student) {
    return { student: null, entries: [], isLoggedIn: true }; // logged in but no student profile
  }

  const { entries } = await getDetailedStudentEntries(student.id);

  return { student, entries: entries || [], isLoggedIn: true };
}

// 8. 生徒によるエントリーのキャンセル
export async function cancelTrioEntryByStudent(slotId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/lib/auth');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { success: false, error: 'セッションが切れています。再度ログインしてください。' };
    }

    const lineUserId = (session.user as any).id;
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    // 1. 学生レコードを特定
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (studentError || !student) {
      console.error('Student not found for lineUserId:', lineUserId);
      return { success: false, error: '学生情報が見つかりません。' };
    }

    // 2. エントリーを削除 (match を使用して確実に特定)
    const { error: deleteError } = await supabaseAdmin
      .from('trio_entries')
      .delete()
      .match({ slot_id: slotId, student_id: student.id });

    if (deleteError) {
      console.error('Delete entry error:', deleteError);
      return { success: false, error: '予約の取り消しに失敗しました。' };
    }

    // 3. スロットの人数を再計算して更新
    const { data: entries } = await supabaseAdmin
      .from('trio_entries')
      .select('id')
      .eq('slot_id', slotId);

    const newCount = entries?.length || 0;
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

    revalidatePath('/trio');
    revalidatePath('/trio/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('cancelTrioEntryByStudent error:', err);
    return { success: false, error: '通信エラーが発生しました。' };
  }
}
