import { NextResponse } from "next/server";
import https from "https";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

    // Make Webhook へ送信（Next.js独自のfetchによる自動リトライ挙動を回避するため、Node.js標準のhttpsを使用）
    if (webhookUrl) {
      try {
        const cleanPayload = Object.fromEntries(
          Object.entries(payload)
            .map(([key, value]) => {
              if (typeof value === "string") {
                let sanitized = value
                  .replace(/\\/g, "\\\\") // バックスラッシュをエスケープ
                  .replace(/"/g, "\\\"")  // ダブルクォートをエスケープ
                  .replace(/\n/g, "\\n")  // 改行を \n にエスケープ（Make側で改行として機能する）
                  .replace(/\r/g, "")     // CRは削除
                  .replace(/\t/g, "\\t"); // タブを \t にエスケープ
                  
                // 残りの見えない制御文字（JSONを破壊する原因）は完全に削除
                sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");
                
                return [key, sanitized];
              }
              return [key, value];
            })
            .filter(([_, value]) => value !== "" && value !== null)
        );

        const urlObj = new URL(webhookUrl);
        const postData = JSON.stringify(cleanPayload);

        await new Promise<void>((resolve, reject) => {
          const req = https.request({
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData)
            }
          }, (res) => {
            let responseBody = "";
            res.on("data", (chunk) => { responseBody += chunk; });
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
              } else {
                console.error(`Make Webhook Error (${res.statusCode}):`, responseBody);
                resolve(); // エラーで顧客の申し込み画面をストップさせない
              }
            });
          });

          req.on("error", (e) => {
            console.error("Make Webhook Connection Error:", e);
            resolve(); // エラーでも画面は止めない
          });

          req.write(postData);
          req.end();
        });
      } catch (webhookError) {
        console.error("Make Webhook Fetch Error:", webhookError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
