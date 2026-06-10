/**
 * Google Chat Webhook 送信ヘルパー
 */

interface SendGchatParams {
    webhookUrl: string
    title: string
    content: string
}

/**
 * Google Chat Webhook にお知らせを通知します。
 */
export async function sendGoogleChatNotification({ webhookUrl, title, content }: SendGchatParams): Promise<boolean> {
    try {
        console.log(`[GoogleChat] Sending notification to webhook. Title: ${title}`)
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com'
        
        // Google Chat 向けのマークダウンテキストを整形
        const messageText = `*【お知らせ】新しい投稿がありました*

*■ タイトル*: ${title}

*■ 内容*:
${content}

━━━━━━━━━━━━━━━━━━━━━━━━
▼ ログインして確認する
${appUrl}/coach
━━━━━━━━━━━━━━━━━━━━━━━━`

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                text: messageText,
            }),
        })

        if (!response.ok) {
            console.error(`[GoogleChat] Webhook response error: ${response.status} ${response.statusText}`)
            return false
        }

        console.log('[GoogleChat] Notification sent successfully.')
        return true
    } catch (error) {
        console.error('[GoogleChat] Failed to send notification:', error)
        return false
    }
}
