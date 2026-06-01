import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

    // 1. CRM (leadsテーブル) に顧客情報を追加
    try {
      const supabase = createAdminClient();
      
      let ageGroup = "未設定";
      if (payload.dob) {
        const birthDate = new Date(payload.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 12) ageGroup = "子供";
        else if (age < 20) ageGroup = "10代";
        else if (age < 30) ageGroup = "20代";
        else if (age < 40) ageGroup = "30代";
        else if (age < 50) ageGroup = "40代";
        else if (age < 60) ageGroup = "50代";
        else ageGroup = "60代以上";
      }
      
      const leadData = {
        line_user_id: payload.userId,
        name: payload.name,
        full_name_kana: payload.kana,
        birth_date: payload.dob || null,
        gender: payload.gender || null,
        second_student_name: payload.name2 || null,
        second_student_kana: payload.kana2 || null,
        second_student_birth_date: payload.dob2 || null,
        second_student_gender: payload.gender2 || null,
        email: payload.email,
        phone: payload.phone,
        area: payload.station || "未設定",
        datetime1: payload.datetime1 || null,
        datetime2: payload.datetime2 || null,
        datetime3: payload.datetime3 || null,
        available_times: payload.availableTimes || null,
        skill_level: payload.skillLevel || null,
        frequency: payload.frequency || null,
        notes: payload.notes || null,
        concern: payload.skillLevel || "体験申込み",
        age_group: ageGroup,
        status: "新規"
      };

      const { error: dbError } = await supabase.from('leads').insert(leadData);
      
      if (dbError) {
        console.error("CRM (leads) insert error:", dbError);
      } else {
        console.log("Successfully inserted lead to CRM:", payload.name);
      }
    } catch (dbEx) {
      console.error("CRM (leads) logic error:", dbEx);
    }

    // 2. Make Webhook へ送信
    if (webhookUrl) {
      try {
        // MakeのWebhook経由で直接JSONテンプレートに埋め込まれるため、
        // 制御文字（改行、タブなど）やダブルクォーテーションを「JSONのエスケープ文字列」に変換して送信する
        // これにより、Make側の設定変更一切なしで、改行付きのままエラーを完全防止できます。
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

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Make Webhook Error (${response.status}):`, errorText);
          // Makeのエラーで顧客の申し込み画面をストップさせないため、ここではエラーを返さずログに残すのみとします
        }
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
