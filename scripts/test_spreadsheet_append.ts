/**
 * スプレッドシート連携テストスクリプト
 * 
 * 厳格ルール:
 * テストを実施する際、顧客は会員番号0035、テスト太郎以外は使用しない。
 */
import { appendTrialBookingToSpreadsheet } from '../src/lib/google-sheets';

async function main() {
    console.log('--- スプレッドシート自動追記テスト開始 ---');
    console.log('対象顧客: 会員番号0035 / テスト太郎');

    const testData = {
        inquiryId: `INQ-TEST-0035-${Date.now().toString().slice(-4)}`,
        inquiryDate: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        membershipNumber: '0035',
        customerName: 'テスト太郎',
        channel: 'Googleリスティング広告',
        searchIntent: '世田谷区 水泳 個人レッスン',
        targetCategory: '小学生低学年',
        concernPurpose: 'スイミングスクール進級停滞',
        preferredArea: '世田谷区',
        trialStatus: '申込済',
        trialDate: '2026-10-15',
        enrollmentStatus: '検討中',
        initialAmount: 0,
        coachName: '未定',
        notes: '【自動テスト実行】会員番号0035 テスト太郎 様による体験レッスン申込テスト。',
    };

    const result = await appendTrialBookingToSpreadsheet(testData);

    if (result.success) {
        console.log('✅ テスト成功: スプレッドシートへの追記が正常に完了しました。');
    } else {
        console.log('ℹ️ 実行結果:', result.error);
        if (result.error?.includes('スプレッドシートID')) {
            console.log('👉 .env.local に GOOGLE_ANALYTICS_SPREADSHEET_ID を設定すると実シートに書き込まれます。');
        }
    }
}

main().catch(err => {
    console.error('テスト実行エラー:', err);
});
