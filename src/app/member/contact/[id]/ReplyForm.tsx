'use client'

import { useState } from 'react'
import { replyInquiry } from '@/actions/inquiry'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ReplyForm({ inquiryId }: { inquiryId: string }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async (formData: FormData) => {
        if (!message.trim()) return

        setLoading(true)
        formData.append('inquiryId', inquiryId)
        formData.append('message', message)

        try {
            const result = await replyInquiry(formData)
            if (result.success) {
                setMessage('')
                toast.success('送信しました')
            } else {
                toast.error(result.error as string || '送信エラー')
            }
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="flex gap-2 p-2 bg-white border-t border-gray-200">
            <Textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力..."
                className="min-h-[50px] max-h-[150px] resize-none"
                required
            />
            <Button type="submit" size="icon" disabled={loading || !message.trim()} className="h-[50px] w-[50px] shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </form>
    )
}
