
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

interface LineMessage {
    type: 'text'
    text: string
}

/**
 * LINEに送信するメッセージをスマートフォンで読みやすく整形・最適化するヘルパー関数
 */
export function formatLineMessage(text: string): string {
    if (!text) return ''

    let formatted = text
    
    // 1. <br> や <br /> タグを改行文字 \n に置換
    formatted = formatted.replace(/<br\s*\/?>/gi, '\n')
    
    // 2. <p> や <div> などのブロック要素の開始・終了タグを適宜改行に置換
    formatted = formatted.replace(/<\/p>/gi, '\n')
    formatted = formatted.replace(/<\/div>/gi, '\n')
    
    // 3. 残りのすべてのHTMLタグを除去
    formatted = formatted.replace(/<[^>]*>/g, '')
    
    // 4. HTMLエンティティのデコード
    formatted = formatted
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

    // 5. 復帰改行（\r\n）を通常の改行（\n）に統一
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // 6. 3つ以上連続する改行を2つに制限（スマートフォン上の無駄な空白スクロールを削減し読みやすくする）
    formatted = formatted.replace(/\n{3,}/g, '\n\n')

    // 7. 文頭・文末の余分な空白・改行をトリミング
    return formatted.trim()
}

export class LineService {
    private accessToken: string

    constructor() {
        this.accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
        if (!this.accessToken) {
            console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set')
        }
    }

    async pushMessage(lineUserId: string, message: string): Promise<boolean> {
        if (!this.accessToken) {
            console.error('Cannot send LINE message: Access Token missing')
            return false
        }

        // 送信前にメッセージをスマートフォン向けに最適化
        const formattedMessage = formatLineMessage(message)

        try {
            const response = await fetch(LINE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    to: lineUserId,
                    messages: [{ type: 'text', text: formattedMessage }]
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('LINE API Error:', errorData)
                return false
            }

            return true
        } catch (error) {
            console.error('Network Error sending LINE message:', error)
            return false
        }
    }
}

export const lineService = new LineService()
