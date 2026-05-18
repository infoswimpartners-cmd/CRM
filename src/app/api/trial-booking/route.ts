import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;


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
