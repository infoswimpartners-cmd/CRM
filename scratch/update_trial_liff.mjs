import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!accessToken) {
  console.error("LINE_CHANNEL_ACCESS_TOKEN is not defined in .env.local");
  process.exit(1);
}

const targetLiffId = "2009159689-dWjvcfS7";
const targetUrl = "https://member.swim-partners.com/trial";

async function run() {
  try {
    // 1. 既存のLIFFアプリのエンドポイントURLを更新する
    console.log(`Updating existing LIFF App (${targetLiffId}) endpoint to ${targetUrl} using Channel Access Token...`);
    const updateRes = await fetch(`https://api.line.me/liff/v1/apps/${targetLiffId}/view`, {
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

    // 2. 現在のLIFFアプリ一覧を取得して確認
    console.log("Fetching LIFF apps list to verify...");
    const listRes = await fetch('https://api.line.me/liff/v1/apps', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      console.log("=== Updated LIFF Apps ===");
      console.log(JSON.stringify(listData, null, 2));
    }

  } catch (err) {
    console.error("Error occurred:", err);
  }
}

run();
