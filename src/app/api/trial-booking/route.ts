import { NextResponse } from "next/server";
import https from "https";
import { createAdminClient } from "@/lib/supabase/admin";
import { stopStepReminderForUser } from "@/lib/line-step-reminders";
import { sendGoogleChatMessage } from "@/lib/google-chat";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabase = createAdminClient();

    const referrer = (payload.referrerName || "").trim();
    const referrerNote = referrer ? `【ご紹介者様】${referrer} 様（お友達紹介キャンペーン対象: 特別価格3,500円）` : "";
    const combinedNotes = [referrerNote, payload.notes].filter(Boolean).join("\n\n") || null;

    // 1. Supabaseの leads テーブルに直接保存（/admin/leads で即座に確認可能に）
    try {
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          name: payload.name || '未入力',
          full_name_kana: payload.kana || null,
          birth_date: payload.dob || null,
          gender: payload.gender || null,
          second_student_name: payload.name2 || null,
          second_student_kana: payload.kana2 || null,
          second_student_birth_date: payload.dob2 || null,
          second_student_gender: payload.gender2 || null,
          email: payload.email || null,
          phone: payload.phone || null,
          area: payload.station || null,
          datetime1: payload.datetime1 || null,
          datetime2: payload.datetime2 || null,
          datetime3: payload.datetime3 || null,
          available_times: payload.availableTimes || null,
          skill_level: payload.skillLevel || null,
          frequency: payload.frequency || null,
          notes: combinedNotes,
          line_user_id: payload.userId || null,
          status: '新規',
          created_at: new Date().toISOString()
        })
        .select()
        .maybeSingle();

      if (leadError) {
        console.error('[Trial Booking] Failed to save lead to DB:', leadError);
      } else {
        console.log('[Trial Booking] Lead successfully saved to DB:', newLead?.id);
      }
    } catch (dbErr) {
      console.error('[Trial Booking] Exception saving lead to DB:', dbErr);
    }

    // 2. students テーブルとの連動（status: 'applied' へ更新または作成）
    try {
      if (payload.userId) {
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id, status')
          .eq('line_user_id', payload.userId)
          .maybeSingle();

        if (existingStudent) {
          await supabase
            .from('students')
            .update({
              status: 'applied',
              full_name: payload.name || undefined,
              full_name_kana: payload.kana || undefined,
              contact_email: payload.email || undefined,
              contact_phone: payload.phone || undefined,
              birth_date: payload.dob || undefined,
              gender: payload.gender || undefined,
              second_student_name: payload.name2 || undefined,
              second_student_name_kana: payload.kana2 || undefined,
              second_student_birth_date: payload.dob2 || undefined,
              second_student_gender: payload.gender2 || undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingStudent.id);
        } else {
          await supabase
            .from('students')
            .insert({
              full_name: payload.name || '未入力',
              full_name_kana: payload.kana || null,
              line_user_id: payload.userId,
              contact_email: payload.email || null,
              contact_phone: payload.phone || null,
              birth_date: payload.dob || null,
              gender: payload.gender || null,
              second_student_name: payload.name2 || null,
              second_student_name_kana: payload.kana2 || null,
              second_student_birth_date: payload.dob2 || null,
              second_student_gender: payload.gender2 || null,
              status: 'applied',
              created_at: new Date().toISOString()
            });
        }
      }
    } catch (studentErr) {
      console.error('[Trial Booking] Exception updating student record:', studentErr);
    }

    // 3. 公式LINEステップ配信を停止（申込済ステータスへ移行）
    if (payload.userId) {
      try {
        await stopStepReminderForUser(payload.userId, 'applied');
      } catch (stepErr) {
        console.error('[Trial Booking] Failed to stop step reminder:', stepErr);
      }
    }

    // 4. 管理者へGoogle Chat通知
    try {
      let gchatWebhookUrl: string | null = null;
      const { data: adminTrigger } = await supabase
        .from('email_triggers')
        .select('google_chat_webhook_url, google_chat_enabled')
        .eq('id', 'line_schedule_detected')
        .maybeSingle();

      if (adminTrigger && adminTrigger.google_chat_enabled !== false && adminTrigger.google_chat_webhook_url) {
        gchatWebhookUrl = adminTrigger.google_chat_webhook_url;
      }

      if (!gchatWebhookUrl) {
        const { data: defaultWebhook } = await supabase
          .from('google_chat_webhooks')
          .select('webhook_url')
          .or('space_name.ilike.%公式ライン%,space_name.ilike.%日程調整%')
          .eq('active', true)
          .limit(1)
          .maybeSingle();

        if (defaultWebhook?.webhook_url) {
          gchatWebhookUrl = defaultWebhook.webhook_url;
        }
      }

      if (!gchatWebhookUrl) {
        gchatWebhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || null;
      }

      if (gchatWebhookUrl) {
        const gchatMessage = 
          `🏊‍♂️ *【体験レッスンお申し込みを受信しました】*\n` +
          `・氏名: *${payload.name || '未入力'}* 様（${payload.kana || ''}）\n` +
          (referrer ? `・🎁 *ご紹介者様*: *${referrer}* 様（*お友達紹介特別価格 3,500円適用*）\n` : '') +
          `・希望エリア/最寄駅: ${payload.station || '未指定'}\n` +
          `・第1希望: ${payload.datetime1 || '未指定'}\n` +
          `・第2希望: ${payload.datetime2 || '未指定'}\n` +
          `・第3希望: ${payload.datetime3 || '未指定'}\n` +
          `・電話番号: ${payload.phone || '未入力'}\n` +
          `・メール: ${payload.email || '未入力'}\n` +
          `・泳力・目標: ${payload.skillLevel || 'なし'}\n` +
          (payload.name2 ? `・2人目: ${payload.name2} 様\n` : '') +
          `※管理画面の「体験レッスン案件（/admin/leads）」に登録されました。コーチのアサインをお願いします。`;

        await sendGoogleChatMessage(gchatWebhookUrl, gchatMessage);
      }
    } catch (chatErr) {
      console.error('[Trial Booking] Failed to send Google Chat notification:', chatErr);
    }

    // 5. Make Webhook へ転送（既存連携を完全維持）
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const cleanPayload = Object.fromEntries(
          Object.entries(payload)
            .map(([key, value]) => {
              if (typeof value === "string") {
                let sanitized = value
                  .replace(/\\/g, "\\\\")
                  .replace(/"/g, "\\\"")
                  .replace(/\n/g, "\\n")
                  .replace(/\r/g, "")
                  .replace(/\t/g, "\\t");
                  
                sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");
                return [key, sanitized];
              }
              return [key, value];
            })
            .filter(([_, value]) => value !== "" && value !== null)
        );

        const urlObj = new URL(webhookUrl);
        const postData = JSON.stringify(cleanPayload);

        await new Promise<void>((resolve) => {
          const makeReq = https.request({
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
                resolve();
              }
            });
          });

          makeReq.on("error", (e) => {
            console.error("Make Webhook Connection Error:", e);
            resolve();
          });

          makeReq.write(postData);
          makeReq.end();
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
