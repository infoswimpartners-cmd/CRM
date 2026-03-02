/**
 * Google Chat Webhook 送信ユーティリティ
 * Google Chat の Incoming Webhook へ Card メッセージを送信する
 */

export interface GoogleChatCardSection {
    header?: string
    widgets: {
        keyValue?: { topLabel: string; content: string }
        textParagraph?: { text: string }
    }[]
}

/**
 * シンプルなテキストメッセージを送信する
 */
export async function sendGoogleChatMessage(
    webhookUrl: string,
    text: string
): Promise<boolean> {
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        })
        if (!res.ok) {
            console.error('[GoogleChat] Failed to send message:', res.status, await res.text())
            return false
        }
        console.log('[GoogleChat] Message sent successfully')
        return true
    } catch (e) {
        console.error('[GoogleChat] Error:', e)
        return false
    }
}

/**
 * リッチなカード形式のメッセージを送信する
 */
export async function sendGoogleChatCard(
    webhookUrl: string,
    title: string,
    subtitle: string,
    sections: GoogleChatCardSection[]
): Promise<boolean> {
    try {
        const payload = {
            cards: [
                {
                    header: {
                        title,
                        subtitle,
                        imageUrl: 'https://www.svgrepo.com/show/349395/mail.svg',
                        imageStyle: 'IMAGE'
                    },
                    sections: sections.map(section => ({
                        header: section.header || '',
                        widgets: section.widgets
                    }))
                }
            ]
        }

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!res.ok) {
            console.error('[GoogleChat] Failed to send card:', res.status, await res.text())
            return false
        }
        console.log('[GoogleChat] Card sent successfully')
        return true
    } catch (e) {
        console.error('[GoogleChat] Card Error:', e)
        return false
    }
}

/**
 * テンプレート文字列の変数を置換する（{{変数名}} 形式）
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [k, v] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
        result = result.replace(regex, v)
    }
    return result
}
