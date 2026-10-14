/**
 * レッスン報告スプレッドシート連携テストスクリプト
 * 
 * 厳格ルール:
 * テストを実施する際、顧客は会員番号0035、テスト太郎以外は使用しない。
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { appendLessonReportToSpreadsheet } from '../src/lib/google-sheets';

async function main() {
    console.log('--- レッスン報告スプレッドシート自動追記テスト開始 ---');
    console.log('対象顧客: 会員番号0035 / テスト太郎');

    const testLessonReport = {
        lessonId: `TEST-LESSON-0035-${Date.now().toString().slice(-4)}`,
        lessonDate: '2026-10-13',
        coachName: '中瀬コーチ',
        studentName: 'テスト太郎',
        studentNumber: '0035',
        lessonType: '体験レッスン',
        location: '世田谷区総合運動場温水プール',
        price: 5500,
        billingPrice: 5500,
        attendanceType: '通常',
        menuDescription: '【自動テスト実行】会員番号0035 テスト太郎 様の体験レッスン報告テスト。クロール息継ぎフォーム指導。',
        createdAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    };

    const targetSpreadsheetId = '1DLMYid10VpYGPoHWkpqXcIku92oVkZ4Y9aMMtVKxq4s';
    const result = await appendLessonReportToSpreadsheet(testLessonReport, targetSpreadsheetId);

    if (result.success) {
        console.log('✅ テスト成功: 指定のスプレッドシートへのレッスン報告の追記が正常に完了しました！');
    } else {
        console.log('ℹ️ 実行結果:', result.error);
        if (result.error?.includes('Google Sheets API has not been used') || result.error?.includes('disabled')) {
            console.log('👉 Google Cloud Consoleで「Google Sheets API」の有効化が必要です。');
            console.log('👉 有効化URL: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=627442472872');
        }
        if (result.error?.includes('permission') || result.error?.includes('403')) {
            console.log('👉 スプレッドシートの「共有」にサービスアカウントを追加してください：');
            console.log('   メールアドレス: analytics-reader@siwm-partners.iam.gserviceaccount.com （編集者権限）');
        }
    }
}

main().catch(err => {
    console.error('テスト実行エラー:', err);
});
