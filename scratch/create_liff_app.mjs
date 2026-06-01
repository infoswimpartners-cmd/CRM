import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!token) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN is not defined in .env.local");
  process.exit(1);
}

// ユーザー要望: 本番URL "https://member.swim-partners.com/withdraw" へのLIFFアプリの作成
const targetUrl = "https://member.swim-partners.com/withdraw";

async function createLiffApp() {
  try {
    const res = await fetch('https://api.line.me/liff/v1/apps', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        view: {
          type: 'full',
          url: targetUrl
        },
        description: 'Swim Partners 退会お手続き',
        features: {
          ble: false,
          qrCode: false,
          zoomRedirectBehavior: 'inAppBrowser'
        },
        permanentLinkPattern: 'concat'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    console.log("=== LIFF App Created Successfully ===");
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nNew LIFF ID: ${data.liffId}`);
  } catch (err) {
    console.error("Failed to create LIFF app:", err);
  }
}

createLiffApp();
