/**
 * M1 DBマイグレーション＆CRUD動作検証スクリプト
 * 
 * 実行方法:
 *   npx tsx scripts/verify_line_marketing_db.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
    console.log('=== [M1 LINE Marketing DB Verification] ===\n');

    console.log('--- 1. テーブル存在確認 ---');
    const t1 = await supabase.from('line_broadcast_campaigns').select('id').limit(1);
    const t2 = await supabase.from('line_step_rules').select('*');
    const t3 = await supabase.from('line_step_student_progress').select('id').limit(1);
    const t4 = await supabase.from('line_delivery_logs').select('id').limit(1);

    const errors = [t1.error, t2.error, t3.error, t4.error].filter(Boolean);
    if (errors.length > 0) {
        console.warn('⚠️  テーブルがまだSupabase DBに作成されていません。');
        console.warn('   未検出エラー:', errors.map(e => e?.message).join(' | '));
        console.log('\n📌 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してテーブルを作成してください:');
        console.log('   ファイル: supabase/migrations/20260930120000_line_marketing_system.sql');
        console.log('   URL: https://supabase.com/dashboard/project/svsmgjulytmhlxcaczge/sql/new\n');
        return;
    }

    console.log('✅ 4テーブル（line_broadcast_campaigns, line_step_rules, line_step_student_progress, line_delivery_logs）すべて正常にクエリ可能');
    console.log(`✅ line_step_rules シード件数: ${t2.data?.length || 0} 件`);

    console.log('\n--- 2. テスト太郎（会員番号0035）を用いたCRUD整合性テスト ---');
    const TEST_STUDENT_ID = 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff'; // 会員番号0035
    const TEST_LINE_USER_ID = 'U0e5a7654874369ca5e38deb47fd783aa';

    // 進行状態のテスト登録
    const { data: progress, error: progErr } = await supabase
        .from('line_step_student_progress')
        .upsert({
            student_id: TEST_STUDENT_ID,
            current_step_order: 1,
            status: 'in_progress',
            trigger_date: '2026-09-30',
            next_scheduled_at: new Date().toISOString()
        })
        .select()
        .single();
    if (progErr) throw progErr;
    console.log('✅ line_step_student_progress 正常作成/更新');

    // 配信ログのテスト登録（is_test_preview: true）
    const { data: log, error: logErr } = await supabase
        .from('line_delivery_logs')
        .insert({
            delivery_type: 'test_preview',
            student_id: TEST_STUDENT_ID,
            student_number: '0035',
            student_name: 'テスト太郎 ',
            line_user_id: TEST_LINE_USER_ID,
            message_body: '【テスト配信】M1 検証メッセージ',
            rendered_message: '【テスト配信】M1 検証メッセージ',
            status: 'sent',
            is_test_preview: true
        })
        .select()
        .single();
    if (logErr) throw logErr;
    console.log('✅ line_delivery_logs 正常記録');

    // テストレコードのクリーンアップ
    await supabase.from('line_delivery_logs').delete().eq('id', log.id);
    await supabase.from('line_step_student_progress').delete().eq('id', progress.id);
    console.log('✅ テストデータの安全なクリーンアップ完了');
    console.log('\n🎉 M1 DBマイグレーション検証全項目合格！');
}

verify().catch(e => {
    console.error('❌ 検証失敗:', e);
    process.exit(1);
});
