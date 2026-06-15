const webhookUrl = "https://chat.googleapis.com/v1/spaces/AAQAw4LdANk/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=dYJAffwPeSxeLiaO8b01VnvpgtiMp3wel675MMwyFR0";

async function testGChat() {
    const threadKey = "test_thread_" + Date.now();

    console.log("1. Sending first notification with threadKey:", threadKey);
    const separator1 = webhookUrl.includes('?') ? '&' : '?';
    const url1 = `${webhookUrl}${separator1}threadKey=${encodeURIComponent(threadKey)}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`;
    
    try {
        const res1 = await fetch(url1, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "📢 【テスト】新規案件の募集を開始しました！ (ThreadKey: " + threadKey + ")" })
        });
        const text1 = await res1.text();
        console.log("First message response code:", res1.status);
        console.log("First message response body:", text1);

        if (!res1.ok) {
            console.error("First message failed.");
            return;
        }

        // 2秒待ってからアサイン確定メッセージ（リプライ）を送信
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("2. Sending assignment confirmation with the SAME threadKey:", threadKey);
        const url2 = `${webhookUrl}${separator1}threadKey=${encodeURIComponent(threadKey)}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`;
        const res2 = await fetch(url2, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "✅ 【テスト】アサイン確定！\n・確定顧客： テスト太郎 様" })
        });
        const text2 = await res2.text();
        console.log("Second message (reply) response code:", res2.status);
        console.log("Second message (reply) response body:", text2);

    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testGChat();
