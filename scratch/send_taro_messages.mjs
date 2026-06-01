import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const testTaroLineId = "U0e5a7654874369ca5e38deb47fd783aa";

if (!accessToken) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN is not defined in .env.local");
  process.exit(1);
}

const messageText = `テスト太郎 様

いつもSwim Partnersをご利用いただきありがとうございます。
ご案内いたしました各種お手続きフォームのLINE公式リンク（LIFF URL）をお送りいたします。

こちらのリンクから開くことで、LINEアカウントと連携して自動的にログインされ、手動でのID入力なしでスマートにお手続きいただけます。

--------------------
🏊‍♂️ 【体験予約フォーム】
https://liff.line.me/2009159689-dWjvcfS7

✍️ 【入会フォーム】
https://liff.line.me/2009159689-Ugq1NLXe

🚪 【退会手続きフォーム】
https://liff.line.me/2009159689-kCnevEnL
--------------------

※ 退会手続きフォームは、自動ログインに成功すると上部のLINE ID手動入力欄が自動で非表示になり、お名前のみが美しく表示される仕様にアップデートされております。

何かご不明な点やご質問がございましたら、いつでもこのチャットよりお気軽にお問い合わせください。`;

async function sendMessage() {
  try {
    console.log(`Sending LIFF guidance message to Test Taro (LINE ID: ${testTaroLineId})...`);
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: testTaroLineId,
        messages: [
          {
            type: "text",
            text: messageText
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to send message: ${response.status} ${errText}`);
    }

    console.log("✅ Message sent successfully to Test Taro!");
  } catch (err) {
    console.error("Error occurred while sending message:", err);
  }
}

sendMessage();
