import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBroadcast() {
    console.log('=== LINE一括配信システムの徹底健全性診断 ===\n');

    // 1. 環境変数の設定確認
    console.log('1. LINE API 認証情報の確認:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('- LINE_CHANNEL_ACCESS_TOKEN (env):', !!process.env.LINE_CHANNEL_ACCESS_TOKEN ? '設定あり (文字数: ' + process.env.LINE_CHANNEL_ACCESS_TOKEN?.length + ')' : '未設定');

    // app_configs 内のトークン確認
    const { data: tokenConfig } = await supabase
        .from('app_configs')
        .select('key, value, updated_at')
        .eq('key', 'line_channel_access_token')
        .maybeSingle();
    console.log('- line_channel_access_token (app_configs):', tokenConfig ? '設定あり (文字数: ' + tokenConfig.value?.length + ', 更新日時: ' + tokenConfig.updated_at + ')' : '未設定');

    // 2. LINE Messaging APIへの疎通テスト（/v2/bot/info）
    const effectiveToken = tokenConfig?.value || process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (effectiveToken) {
        console.log('\n2. LINE公式アカウント疎通テスト (https://api.line.me/v2/bot/info):');
        try {
            const res = await fetch('https://api.line.me/v2/bot/info', {
                headers: { 'Authorization': `Bearer ${effectiveToken}` }
            });
            const data = await res.json();
            if (res.ok) {
                console.log('  [OK] LINE API 認証成功!');
                console.log('  ボット表示名:', data.displayName);
                console.log('  ベーシックID:', data.basicId);
                console.log('  プレミアムID:', data.premiumId || 'なし');
            } else {
                console.error('  [NG] LINE API 認証エラー:', res.status, data);
            }
        } catch (e: any) {
            console.error('  [NG] LINE API 接続エラー:', e.message);
        }
    } else {
        console.error('\n2. [CRITICAL] LINEアクセストークンが設定されていません！');
    }

    // 3. 一括配信キャンペーンデータ確認 (line_broadcast_campaigns vs app_configs)
    console.log('\n3. 一括配信キャンペーン履歴・予約状況の確認:');
    
    // DBテーブル確認
    const { data: dbCampaigns, error: dbCampErr } = await supabase
        .from('line_broadcast_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (dbCampErr) {
        console.log('  - line_broadcast_campaigns テーブル:', dbCampErr.message);
    } else {
        console.log('  - line_broadcast_campaigns テーブル件数:', dbCampaigns?.length || 0);
        if (dbCampaigns && dbCampaigns.length > 0) {
            console.log('    最新レコード:', dbCampaigns.slice(0, 3));
        }
    }

    // app_configs フォールバック確認
    const { data: fbCampaignsConfig } = await supabase
        .from('app_configs')
        .select('key, value, updated_at')
        .eq('key', 'line_broadcast_campaigns_data_v1')
        .maybeSingle();

    if (fbCampaignsConfig?.value) {
        try {
            const parsed = JSON.parse(fbCampaignsConfig.value);
            console.log('  - app_configs フォールバックキャンペーン数:', parsed.length);
            console.log('    最新3件のキャンペーン概要:');
            parsed.slice(0, 3).forEach((c: any, i: number) => {
                console.log(`    [#${i + 1}] ID: ${c.id}, タイトル: "${c.title}", 状態: ${c.status}, 対象: ${c.target_count}名, 成功: ${c.success_count || c.sent_count || 0}, 失敗: ${c.failed_count || 0}, 作成: ${c.created_at || c.updated_at}, 予定日時: ${c.scheduled_at}`);
            });
        } catch (e) {
            console.error('  - app_configs JSON パースエラー:', e);
        }
    } else {
        console.log('  - app_configs フォールバックキャンペーン: データなし');
    }

    // 4. 配信ログの確認 (line_delivery_logs vs app_configs)
    console.log('\n4. 送信配信ログの確認:');
    const { data: dbLogs, error: dbLogErr } = await supabase
        .from('line_delivery_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    if (dbLogErr) {
        console.log('  - line_delivery_logs テーブル:', dbLogErr.message);
    } else {
        console.log('  - line_delivery_logs テーブルログ数:', dbLogs?.length || 0);
    }

    const { data: fbLogsConfig } = await supabase
        .from('app_configs')
        .select('key, value, updated_at')
        .eq('key', 'line_delivery_logs_data_v1')
        .maybeSingle();

    if (fbLogsConfig?.value) {
        try {
            const logs = JSON.parse(fbLogsConfig.value);
            console.log('  - app_configs 配信ログ数:', logs.length);
            console.log('    最新3件のログ詳細:');
            logs.slice(0, 3).forEach((l: any, i: number) => {
                console.log(`    [#${i + 1}] 生徒: ${l.student_name} (${l.student_number || '-'}), 区分: ${l.delivery_type}, 状態: ${l.status}, 日時: ${l.sent_at}, エラー: ${l.error_message || 'なし'}`);
            });
        } catch (e) {
            console.error('  - app_configs ログ JSON パースエラー:', e);
        }
    } else {
        console.log('  - app_configs 配信ログ: データなし');
    }

    // 5. 配信対象となる生徒（LINE連携済み生徒）の確認
    console.log('\n5. LINE連携済み生徒（配信対象候補）の確認:');
    const { data: lineStudents } = await supabase
        .from('students')
        .select('id, full_name, student_number, status, line_user_id')
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '');

    console.log('  - LINE連携済み生徒の総数:', lineStudents?.length || 0);
    console.log('  - LINE連携済み生徒サンプル:', lineStudents?.slice(0, 5).map(s => ({
        name: s.full_name,
        num: s.student_number,
        status: s.status,
        lineUserId: s.line_user_id ? s.line_user_id.substring(0, 8) + '...' : null
    })));
}

checkBroadcast().catch(console.error);
