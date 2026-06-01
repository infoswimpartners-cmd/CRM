import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { submitWithdrawal } from '../src/actions/withdrawal';

async function runTest() {
  console.log('--- サーバーアクション submitWithdrawal のテスト開始 ---');
  
  // テスト太郎の情報を使用
  const testTaroLineUserId = 'U0e5a7654874369ca5e38deb47fd783aa';
  const testReason = 'time-finance';

  console.log(`テストユーザー LINE ID: ${testTaroLineUserId}`);
  console.log(`退会理由: ${testReason}`);

  try {
    const result = await submitWithdrawal({
      line_user_id: testTaroLineUserId,
      withdrawal_reason: testReason,
    });

    console.log('テスト結果:', result);
    if (result.success) {
      console.log('✅ サーバーアクションの呼び出しに成功しました！');
    } else {
      console.error('❌ サーバーアクションがエラーを返しました:', result.error);
    }
  } catch (error) {
    console.error('❌ 例外エラーが発生しました:', error);
  }
}

runTest();
