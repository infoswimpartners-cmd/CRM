/**
 * 過去レッスン報告データ全件スプレッドシート一括同期スクリプト
 * 
 * 指定のスプレッドシート（GAS Webhook）へ、Supabaseの全レッスンデータを
 * 「新しい順（最新の実施日 → 過去）」に同期します。
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from '../src/lib/supabase/admin';

async function syncAllLessons() {
    const gasWebhookUrl = process.env.LESSON_REPORT_GAS_WEBHOOK_URL;
    if (!gasWebhookUrl) {
        console.error('❌ LESSON_REPORT_GAS_WEBHOOK_URL が設定されていません。');
        process.exit(1);
    }

    const supabase = createAdminClient();
    console.log('🔄 Supabase から全レッスン報告データを取得中...');

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
            id,
            lesson_date,
            student_name,
            location,
            price,
            billing_price,
            attendance_type,
            menu_description,
            created_at,
            profiles:coach_id ( full_name ),
            students:student_id ( student_number ),
            lesson_masters:lesson_master_id ( name )
        `)
        .order('lesson_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error || !lessons) {
        console.error('❌ レッスンデータ取得エラー:', error);
        process.exit(1);
    }

    const total = lessons.length;
    console.log(`📋 同期対象件数: ${total} 件（実施日の新しい順）`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i++) {
        const item = lessons[i];
        const dateStr = item.lesson_date ? item.lesson_date.split('T')[0] : '';
        const coachName = (item.profiles as any)?.full_name || 'コーチ';
        const studentNumber = (item.students as any)?.student_number || '';
        const lessonTypeName = (item.lesson_masters as any)?.name || '通常レッスン';

        const payload = {
            lessonId: item.id,
            lessonDate: dateStr,
            coachName,
            studentName: item.student_name || '',
            studentNumber,
            lessonType: lessonTypeName,
            location: item.location || '',
            price: item.price || 0,
            billingPrice: item.billing_price || 0,
            attendanceType: item.attendance_type === 'student_only' ? '生徒のみ' : '同伴あり',
            menuDescription: item.menu_description || '',
            createdAt: item.created_at ? new Date(item.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '',
        };

        try {
            const res = await fetch(gasWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                redirect: 'follow',
            });

            if (res.ok) {
                successCount++;
            } else {
                failCount++;
                console.warn(`⚠️ [${i + 1}/${total}] 送信失敗 (${res.status}): ${item.student_name}`);
            }
        } catch (err: any) {
            failCount++;
            console.error(`❌ [${i + 1}/${total}] 通信エラー:`, err.message);
        }

        if ((i + 1) % 20 === 0 || i + 1 === total) {
            console.log(`⏳ 進捗: ${i + 1} / ${total} 件完了 (成功: ${successCount}, 失敗: ${failCount})`);
        }

        // GAS側の過負荷を防ぐための短い待機
        await new Promise((r) => setTimeout(r, 80));
    }

    console.log('\n========================================');
    console.log(`🎉 全件同期完了！ 成功: ${successCount} 件, 失敗: ${failCount} 件`);
    console.log('========================================');
}

syncAllLessons().catch(err => {
    console.error('実行エラー:', err);
});
