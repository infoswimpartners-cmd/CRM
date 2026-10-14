import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    // 1. 全生徒数とステータス内訳
    const { data: allStatuses, count: totalCount } = await supabase
        .from('students')
        .select('status, created_at', { count: 'exact' });

    console.log('=== 1. 生徒全体のステータス内訳 (総数:', totalCount, ') ===');
    const counts: Record<string, number> = {};
    allStatuses?.forEach(s => {
        counts[s.status] = (counts[s.status] || 0) + 1;
    });
    console.table(counts);

    // 2. 直近3ヶ月の新規登録推移
    const { data: recentStudents } = await supabase
        .from('students')
        .select('id, full_name, status, created_at, line_user_id')
        .order('created_at', { ascending: false })
        .limit(40);

    console.log('\n=== 2. 直近40名のステータス内訳 ===');
    const recentCounts: Record<string, number> = {};
    recentStudents?.forEach(s => {
        recentCounts[s.status] = (recentCounts[s.status] || 0) + 1;
    });
    console.table(recentCounts);

    // 3. LIFFトラッキングログの解析
    const { data: liffLogsConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'liff_tracking_logs_v1')
        .maybeSingle();

    if (liffLogsConfig?.value) {
        const logs = JSON.parse(liffLogsConfig.value);
        console.log('\n=== 3. LIFFフォーム閲覧トラッキングログ (総数:', logs.length, ') ===');
        const converted = logs.filter((l: any) => l.is_converted);
        console.log('閲覧総数:', logs.length);
        console.log('申込完了(CV)数:', converted.length);
        console.log('離脱(未申込)数:', logs.length - converted.length);
        console.log('CV率:', logs.length > 0 ? (converted.length / logs.length * 100).toFixed(1) + '%' : '0%');
        
        console.log('\n直近の閲覧ログサンプル (最新5件):');
        console.log(logs.slice(0, 5).map((l: any) => ({
            displayName: l.display_name,
            viewedAt: l.viewed_at,
            isConverted: l.is_converted,
            utmSource: l.utm_source,
            referrer: l.referrer_name,
        })));
    } else {
        console.log('\n=== 3. LIFFトラッキングログ: 未保存 ===');
    }

    // 4. 公式LINE友だち追加リード（line_step:*）の集計
    const { data: stepConfigs } = await supabase
        .from('app_configs')
        .select('key, value, updated_at')
        .ilike('key', 'line_step:U%')
        .limit(100);

    console.log('\n=== 4. LINEステップ配信対象リード数:', stepConfigs?.length || 0, '件 ===');
    if (stepConfigs && stepConfigs.length > 0) {
        const stageCounts: Record<string, number> = {};
        stepConfigs.forEach(sc => {
            try {
                const parsed = JSON.parse(sc.value);
                const key = `stage_${parsed.step_stage}_status_${parsed.status}`;
                stageCounts[key] = (stageCounts[key] || 0) + 1;
            } catch {}
        });
        console.table(stageCounts);
    }
}

main().catch(console.error);
