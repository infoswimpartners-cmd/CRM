import { NextResponse } from "next/server";
import https from "https";
import { createAdminClient } from "@/lib/supabase/admin";
import { stopStepReminderForUser } from "@/lib/line-step-reminders";
import { sendGoogleChatMessage } from "@/lib/google-chat";
import { markConversionForUser } from "@/lib/line-tracking-service";
import { appendTrialBookingToSpreadsheet, appendTrialBookingToMasterSpreadsheet } from "@/lib/google-sheets";
import { emailService } from "@/lib/email";
import { lineService } from "@/lib/line";

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
      let targetStudent: any = null;

      // 2.1. LINE ID での既存生徒検索（複数レコード存在時も最新かつfriend_only優先で取得）
      if (payload.userId) {
        const { data: studentsByLine } = await supabase
          .from('students')
          .select('id, status, full_name, contact_email, contact_phone')
          .eq('line_user_id', payload.userId)
          .order('created_at', { ascending: false });

        if (studentsByLine && studentsByLine.length > 0) {
          targetStudent = studentsByLine.find(s => s.status === 'friend_only') || studentsByLine[0];
        }
      }

      // 2.2. LINE IDで見つからない場合、メールアドレスで検索
      if (!targetStudent && payload.email) {
        const { data: studentsByEmail } = await supabase
          .from('students')
          .select('id, status, full_name, contact_email, contact_phone')
          .ilike('contact_email', payload.email.trim())
          .order('created_at', { ascending: false });

        if (studentsByEmail && studentsByEmail.length > 0) {
          targetStudent = studentsByEmail[0];
        }
      }

      // 2.3. メールアドレスでも見つからない場合、電話番号で検索
      if (!targetStudent && payload.phone) {
        const cleanPhone = payload.phone.replace(/[-]/g, '').trim();
        const { data: studentsByPhone } = await supabase
          .from('students')
          .select('id, status, full_name, contact_phone')
          .order('created_at', { ascending: false });

        if (studentsByPhone && studentsByPhone.length > 0) {
          targetStudent = studentsByPhone.find(s => {
            const sp = (s.contact_phone || '').replace(/[-]/g, '').trim();
            return sp && (sp === cleanPhone || sp.endsWith(cleanPhone) || cleanPhone.endsWith(sp));
          });
        }
      }

      const applicantName = (payload.name || '').trim();
      const applicantKana = (payload.kana || '').trim();

      if (targetStudent) {
        // 既存生徒が存在する場合、氏名や連絡先、ステータスを確実に更新
        const updateData: any = {
          status: 'applied',
        };

        // 申し込み氏名を最優先で顧客名に反映（空でなければ上書き）
        if (applicantName) {
          updateData.full_name = applicantName;
        }
        if (applicantKana) {
          updateData.full_name_kana = applicantKana;
        }
        if (payload.email) updateData.contact_email = payload.email.trim();
        if (payload.phone) updateData.contact_phone = payload.phone.trim();
        if (payload.dob) updateData.birth_date = payload.dob;
        if (payload.gender) updateData.gender = payload.gender;
        if (payload.name2) updateData.second_student_name = payload.name2.trim();
        if (payload.kana2) updateData.second_student_name_kana = payload.kana2.trim();
        if (payload.dob2) updateData.second_student_birth_date = payload.dob2;
        if (payload.gender2) updateData.second_student_gender = payload.gender2;
        if (payload.userId) updateData.line_user_id = payload.userId;

        const { error: updateErr } = await supabase
          .from('students')
          .update(updateData)
          .eq('id', targetStudent.id);

        if (updateErr) {
          console.error('[Trial Booking] Failed to update existing student:', updateErr);
        } else {
          console.log(`[Trial Booking] Successfully updated student (${targetStudent.id}) name to "${applicantName || targetStudent.full_name}"`);
        }
      } else {
        // 新規作成
        const { data: newStudentData, error: insertErr } = await supabase
          .from('students')
          .insert({
            full_name: applicantName || '未入力',
            full_name_kana: applicantKana || null,
            line_user_id: payload.userId || null,
            contact_email: payload.email ? payload.email.trim() : null,
            contact_phone: payload.phone ? payload.phone.trim() : null,
            birth_date: payload.dob || null,
            gender: payload.gender || null,
            second_student_name: payload.name2 ? payload.name2.trim() : null,
            second_student_name_kana: payload.kana2 ? payload.kana2.trim() : null,
            second_student_birth_date: payload.dob2 || null,
            second_student_gender: payload.gender2 || null,
            status: 'applied',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error('[Trial Booking] Failed to insert student record:', insertErr);
        } else {
          targetStudent = newStudentData;
          console.log(`[Trial Booking] Registered new student record for "${applicantName}" (${newStudentData?.id})`);
        }
      }

      // 2.4. counseling_sheets テーブルへ泳力・お悩み・目標を保存
      const finalStudentId = targetStudent?.id;
      if (finalStudentId && payload.skillLevel) {
        try {
          const { error: csError } = await supabase
            .from('counseling_sheets')
            .insert({
              student_id: finalStudentId,
              goals: payload.skillLevel,
              swimming_experience: null,
              health_conditions: null,
              created_at: new Date().toISOString()
            });

          if (csError) {
            console.error('[Trial Booking] Failed to save counseling sheet:', csError);
          } else {
            console.log(`[Trial Booking] Saved counseling sheet for student: ${finalStudentId}`);
          }
        } catch (csEx) {
          console.error('[Trial Booking] Exception saving counseling sheet:', csEx);
        }
      }
    } catch (studentErr) {
      console.error('[Trial Booking] Exception updating student record:', studentErr);
    }

    // 3. 公式LINEステップ配信を停止（申込済ステータスへ移行＆表示名を申込氏名に更新）
    if (payload.userId) {
      try {
        await stopStepReminderForUser(payload.userId, 'applied', payload.name || undefined);
      } catch (stepErr) {
        console.error('[Trial Booking] Failed to stop step reminder:', stepErr);
      }

      // 3.2. トラッキングログのコンバージョン（CV）更新＆タグ付与（trial_applied）
      try {
        await markConversionForUser(payload.userId, undefined, referrer);
      } catch (convErr) {
        console.error('[Trial Booking] Failed to mark tracking conversion:', convErr);
      }

      // 3.3. 公式LINEへ申し込み受付完了メッセージを直接送信（Makeから完全移行）
      try {
        const applicantName = (payload.name || 'お客様').trim();
        const lineMessage = `${applicantName}様

この度は、スイムパートナーズの体験レッスンにお申し込みいただき、誠にありがとうございます。

お客様のお申し込み内容と、ご希望の日程を確認いたしました。
────────────────

【ご希望日程として承った日程】
 ・第1希望: ${payload.datetime1 || '未指定'}
 ・第2希望: ${payload.datetime2 || '未指定'}
 ・第3希望: ${payload.datetime3 || '未指定'}

お送りいただいたご希望日をもとに、専任コーチの調整と正式な日程調整を進めさせていただきます。なお、コーチの調整には最大3日程度お時間をいただいております。あらかじめご了承ください。

【今後の流れ】
 ・事務局よりLINEにてご連絡（コーチ調整状況のご報告と日程調整）
 ・担当コーチの決定
 ・お客様へ担当コーチのLINEアカウントをご案内
 ・お客様とコーチ間で直接連絡開始（体験レッスン詳細確認）
 ・体験レッスン実施！

ご不明な点がございましたら、お気軽にお問い合わせください。
あなたと一緒にプールでお会いできることを心より楽しみにしております！
────────────────
SWIM PARTNERS/スイムパートナーズ事務局`;

        const lineSent = await lineService.pushMessage(payload.userId, lineMessage);
        if (lineSent) {
          console.log(`[Trial Booking] Successfully sent reception LINE message to user: ${payload.userId}`);
        } else {
          console.error(`[Trial Booking] Failed to send reception LINE message to user: ${payload.userId}`);
        }
      } catch (lineErr) {
        console.error('[Trial Booking] Exception sending reception LINE message:', lineErr);
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

    // 6. Googleスプレッドシート（分析用ファネルシート）への自動追記
    try {
      await appendTrialBookingToSpreadsheet({
        customerName: payload.name || '未入力',
        channel: referrer ? 'ご紹介' : (payload.channel || 'WEB申込'),
        searchIntent: payload.notes || '',
        targetCategory: payload.gender || '小学生',
        concernPurpose: payload.skillLevel || '',
        preferredArea: payload.station || '',
        trialStatus: '申込済',
        trialDate: payload.datetime1 || '',
        enrollmentStatus: '検討中',
        notes: combinedNotes || '',
      });
    } catch (sheetErr) {
      console.warn('[Trial Booking] Google Sheets append failed (non-blocking):', sheetErr);
    }

    // 6.2. 申し込みマスターシート（Make移行先スプレッドシート）への直接自動追記
    try {
      await appendTrialBookingToMasterSpreadsheet({
        conversionDateTime: new Date().toISOString(),
        name: payload.name || '',
        kana: payload.kana || '',
        birthDate: payload.dob || '',
        name2: payload.name2 || '',
        kana2: payload.kana2 || '',
        birthDate2: payload.dob2 || '',
        station: payload.station || '',
        date1: payload.date1 || (payload.datetime1 ? payload.datetime1.split(' ')[0] : ''),
        time1Start: payload.time1Start || '',
        time1End: payload.time1End || '',
        date2: payload.date2 || (payload.datetime2 ? payload.datetime2.split(' ')[0] : ''),
        time2Start: payload.time2Start || '',
        time2End: payload.time2End || '',
        date3: payload.date3 || (payload.datetime3 ? payload.datetime3.split(' ')[0] : ''),
        time3Start: payload.time3Start || '',
        time3End: payload.time3End || '',
        skillLevel: payload.skillLevel || '',
        notes: combinedNotes || '',
        frequency: payload.frequency || '',
        availableTimes: payload.availableTimes || '',
        email: payload.email || '',
        phone: payload.phone || '',
        transactionId: payload.userId || '',
      });
    } catch (masterSheetErr) {
      console.warn('[Trial Booking] Master Booking Spreadsheet append failed (non-blocking):', masterSheetErr);
    }

    // 7. 顧客への自動返信メール（reception_completed）送信
    if (payload.email) {
      try {
        const formattedName = payload.name2 ? `${payload.name}・${payload.name2}` : (payload.name || 'お客様');
        await emailService.sendTriggerEmail('reception_completed', payload.email, {
          name: formattedName,
          email: payload.email,
          phone: payload.phone || '',
          area: payload.station || '',
          datetime1: payload.datetime1 || '',
          datetime2: payload.datetime2 || '',
          datetime3: payload.datetime3 || '',
          第一希望: payload.datetime1 || '未指定',
          第二希望: payload.datetime2 || '未指定',
          第三希望: payload.datetime3 || '未指定',
          skill_level: payload.skillLevel || '',
          notes: combinedNotes || '',
        }, undefined, { forceEmail: true });
        console.log(`[Trial Booking] Successfully sent reception_completed email to: ${payload.email}`);
      } catch (emailErr) {
        console.error('[Trial Booking] Failed to send reception email to customer:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
