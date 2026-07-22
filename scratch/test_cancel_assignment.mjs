import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// .env.local をロード
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const LEAD_ID = '93ff53a9-fba4-4cda-a96a-b8e7c2c51fd6'; // テスト太郎のリードID
const STUDENT_ID = 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff'; // テスト太郎の生徒ID
const COACH_ID = '7e37b1f0-955c-4c31-86f7-657bec2366fe'; // アサインされたコーチID

async function run() {
    console.log('--- アサイン解除前の状態確認 ---');
    const { data: leadBefore } = await supabase.from('leads').select('*').eq('id', LEAD_ID).single();
    const { data: studentBefore } = await supabase.from('students').select('*').eq('id', STUDENT_ID).single();
    const { data: relsBefore } = await supabase.from('student_coaches').select('*').eq('student_id', STUDENT_ID);

    console.log('Lead status:', leadBefore?.status, '/ coach:', leadBefore?.assigned_coach_id);
    console.log('Student status:', studentBefore?.status, '/ coach:', studentBefore?.coach_id);
    console.log('Relations before:', relsBefore?.map(r => `${r.coach_id} (${r.role})`));

    console.log('\n--- アサインキャンセル（解除）の処理開始 ---');
    
    // 1. リードの更新
    const { error: leadUpdateErr } = await supabase
        .from('leads')
        .update({
            assigned_coach_id: null,
            status: '募集開始',
            assigned_at: null,
            confirmed_datetime: null,
            confirmed_location: null
        })
        .eq('id', LEAD_ID);
    if (leadUpdateErr) throw leadUpdateErr;
    console.log('leads テーブル更新完了');

    // 2. 生徒の更新
    const { error: studentUpdateErr } = await supabase
        .from('students')
        .update({
            coach_id: null,
            status: 'trial_pending'
        })
        .eq('id', STUDENT_ID);
    if (studentUpdateErr) throw studentUpdateErr;
    console.log('students テーブル更新完了');

    // 3. student_coaches の削除
    const { error: relDeleteErr } = await supabase
        .from('student_coaches')
        .delete()
        .eq('student_id', STUDENT_ID)
        .eq('coach_id', COACH_ID);
    if (relDeleteErr) throw relDeleteErr;
    console.log('student_coaches レコード削除完了');

    console.log('\n--- アサイン解除後の状態確認 ---');
    const { data: leadAfter } = await supabase.from('leads').select('*').eq('id', LEAD_ID).single();
    const { data: studentAfter } = await supabase.from('students').select('*').eq('id', STUDENT_ID).single();
    const { data: relsAfter } = await supabase.from('student_coaches').select('*').eq('student_id', STUDENT_ID);

    console.log('Lead status:', leadAfter?.status, '/ coach:', leadAfter?.assigned_coach_id);
    console.log('Student status:', studentAfter?.status, '/ coach:', studentAfter?.coach_id);
    console.log('Relations after:', relsAfter?.map(r => `${r.coach_id} (${r.role})`));

    // テスト後にアサイン状態へ戻す復元処理
    console.log('\n--- 元の状態（アサイン完了状態）へ復元中 ---');
    await supabase.from('leads').update({
        assigned_coach_id: COACH_ID,
        status: '体験確定',
        assigned_at: leadBefore?.assigned_at,
        confirmed_datetime: leadBefore?.confirmed_datetime,
        confirmed_location: leadBefore?.confirmed_location
    }).eq('id', LEAD_ID);

    await supabase.from('students').update({
        coach_id: COACH_ID,
        status: 'trial_confirmed'
    }).eq('id', STUDENT_ID);

    // 関係を再追加（既に存在しなければ追加）
    const hasRel = relsBefore?.some(r => r.coach_id === COACH_ID);
    if (hasRel) {
        const { error: relInsertErr } = await supabase.from('student_coaches').insert({
            student_id: STUDENT_ID,
            coach_id: COACH_ID,
            role: 'sub' // 元の状態が 'sub' だったので 'sub' で復元
        });
        if (relInsertErr) console.error('Failed to restore relation:', relInsertErr);
    }
    console.log('アサイン完了状態への復元が完了しました');
}

run().catch(console.error);
