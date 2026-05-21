'use server';

/**
 * 退会申請データをMake (Webhook) に送信するサーバーアクション
 */
export async function submitWithdrawal(data: {
  line_user_id: string;
  withdrawal_reason: string;
}) {
  try {
    const webhookUrl = process.env.MAKE_WITHDRAWAL_WEBHOOK_URL;

    // バリデーション
    if (!data.line_user_id) {
      return { success: false, error: 'LINEユーザーIDが取得できませんでした。' };
    }
    if (!data.withdrawal_reason) {
      return { success: false, error: '退会理由が選択されていません。' };
    }

    const payload = {
      line_user_id: data.line_user_id,
      withdrawal_reason: data.withdrawal_reason,
      agreed_timestamp: new Date().toISOString(), // ISO 8601形式
    };

    if (!webhookUrl) {
      console.warn('MAKE_WITHDRAWAL_WEBHOOK_URL is not set. Simulating success in development.');
      console.log('Simulated Webhook Payload:', payload);
      
      // テスト環境で動作確認できるように擬似的な成功レスポンスを返す
      return { success: true, simulated: true };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook送信エラー: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in submitWithdrawal server action:', error);
    return {
      success: false,
      error: error.message || '退会申請の送信中に予期せぬエラーが発生しました。',
    };
  }
}
