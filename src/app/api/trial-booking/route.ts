import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

    // 1. Supabase (leadsテーブル) に保存
    const supabaseAdmin = createAdminClient();
    const { error: dbError } = await supabaseAdmin
      .from('leads')
      .insert({
        name: payload.name,
        full_name_kana: payload.kana,
        birth_date: payload.dob || null,
        second_student_name: payload.name2 || null,
        second_student_kana: payload.kana2 || null,
        second_student_birth_date: payload.dob2 || null,
        email: payload.email,
        phone: payload.phone,
        area: payload.station, // 「最寄駅もしくは希望エリア」をareaに保存
        datetime1: payload.datetime1 || null,
        datetime2: payload.datetime2 || null,
        datetime3: payload.datetime3 || null,
        frequency: payload.frequency,
        notes: payload.notes,
        skill_level: payload.skillLevel,
        line_user_id: payload.userId,
        status: '新規' // 初期ステータス
      });

    if (dbError) {
      console.error("Supabase Save Error:", dbError);
      // DB保存に失敗してもMakeへの送信は試みる、あるいはエラーを返すか検討が必要
    }

    // 2. Make Webhook へ送信
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL is not configured" }, { status: 500 });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Make Webhook Error:", errorText);
      return NextResponse.json({ error: "Failed to send to Make" }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
