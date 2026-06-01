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

async function listLiffApps() {
  try {
    const res = await fetch('https://api.line.me/liff/v1/apps', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    console.log("=== LIFF Apps ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to fetch LIFF apps:", err);
  }
}

listLiffApps();
