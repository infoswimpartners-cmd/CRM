import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const clientId = process.env.LINE_CLIENT_ID;
const clientSecret = process.env.LINE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("LINE_CLIENT_ID or LINE_CLIENT_SECRET is not defined in .env.local");
  process.exit(1);
}

// ターゲットとなる退会フォームのURL
const targetUrl = "https://member.swim-partners.com/withdraw";

async function run() {
  try {
    // 1. チャネルアクセストークンを取得 (Client Credentials Grant)
    console.log(`Fetching access token for Channel ID: ${clientId}...`);
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to get OAuth token: ${tokenRes.status} ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    console.log("Access token retrieved successfully!");

    // 2. LIFFアプリ一覧を取得
    console.log("Fetching LIFF apps list...");
    const listRes = await fetch('https://api.line.me/liff/v1/apps', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Failed to list LIFF apps: ${listRes.status} ${errText}`);
    }

    const listData = await listRes.json();
    console.log("=== Current LIFF Apps ===");
    console.log(JSON.stringify(listData, null, 2));

    // 3. 既存のLIFFアプリの更新、または新規追加
    const existingLiffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const existingApp = listData.apps?.find(app => app.liffId === existingLiffId);

    if (existingApp) {
      // 既存のLIFFアプリがある場合、そのエンドポイントURLを更新する
      console.log(`Updating existing LIFF App (${existingLiffId}) endpoint to ${targetUrl}...`);
      const updateRes = await fetch(`https://api.line.me/liff/v1/apps/${existingLiffId}/view`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'full',
          url: targetUrl
        })
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Failed to update LIFF view: ${updateRes.status} ${errText}`);
      }

      console.log("✅ LIFF App View updated successfully!");
    } else {
      // 存在しない場合は新規にLIFFアプリを追加する
      console.log(`Creating a NEW LIFF App for URL: ${targetUrl}...`);
      const createRes = await fetch('https://api.line.me/liff/v1/apps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create LIFF app: ${createRes.status} ${errText}`);
      }

      const createData = await createRes.json();
      console.log("✅ NEW LIFF App created successfully!");
      console.log(`New LIFF ID: ${createData.liffId}`);
      console.log("IMPORTANT: Please update NEXT_PUBLIC_LIFF_ID with this new ID in your .env files!");
    }

  } catch (err) {
    console.error("Error occurred:", err);
  }
}

run();
