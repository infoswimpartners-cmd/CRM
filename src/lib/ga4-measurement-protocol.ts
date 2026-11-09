/**
 * Google Analytics 4 (GA4) Measurement Protocol 送信ユーティリティ
 * 
 * LINE内ブラウザ（LIFF）等のブラウザ側Cookie制限（ITP）やリダイレクトによる
 * 計測漏れを防止し、サーバーサイドから100%確実にコンバージョンをGA4へ送信します。
 */

interface GA4EventParams {
  [key: string]: string | number | boolean | undefined;
}

interface SendGA4EventOptions {
  eventName?: string;
  clientId?: string;
  userId?: string;
  params?: GA4EventParams;
}

/**
 * GA4 Measurement Protocol にイベントを送信する
 */
export async function sendGA4ConversionEvent({
  eventName = 'generate_lead',
  clientId,
  userId,
  params = {},
}: SendGA4EventOptions = {}): Promise<{ success: boolean; error?: string }> {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();

  if (!measurementId || !apiSecret) {
    console.warn('[GA4 Measurement Protocol] スキップ: GA4_MEASUREMENT_ID または GA4_API_SECRET が未設定です');
    return { success: false, error: 'Measurement ID or API Secret is missing' };
  }

  // client_id の解決（必須パラメータ）: 指定がない場合は userId または擬似UUIDを生成
  const effectiveClientId =
    clientId?.trim() ||
    (userId ? `line.${userId.replace(/^U/, '')}` : `mp.${Date.now()}.${Math.floor(Math.random() * 1000000)}`);

  const payload: any = {
    client_id: effectiveClientId,
    events: [
      {
        name: eventName,
        params: {
          engagement_time_msec: 100,
          ...params,
        },
      },
    ],
  };

  if (userId) {
    payload.user_id = userId;
  }

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    measurementId
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`[GA4 Measurement Protocol] 送信成功: イベント=${eventName}, clientId=${effectiveClientId}`);
      return { success: true };
    } else {
      const errorText = await res.text().catch(() => '');
      console.error(`[GA4 Measurement Protocol] 送信失敗 (Status ${res.status}):`, errorText);
      return { success: false, error: errorText };
    }
  } catch (err: any) {
    console.error('[GA4 Measurement Protocol] 通信エラー:', err);
    return { success: false, error: err.message };
  }
}
