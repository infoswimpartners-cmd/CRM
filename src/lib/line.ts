
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

interface LineMessage {
    type: 'text'
    text: string
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

        try {
            const response = await fetch(LINE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    to: lineUserId,
                    messages: [{ type: 'text', text: message }]
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
