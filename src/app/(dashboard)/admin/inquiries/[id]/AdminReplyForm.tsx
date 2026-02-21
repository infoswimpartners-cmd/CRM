'use client'

import { useState } from 'react'
import { adminReplyInquiry } from '@/actions/admin-inquiry'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminReplyForm({ inquiryId }: { inquiryId: string }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async (formData: FormData) => {
        if (!message.trim()) return

        setLoading(true)
        formData.append('inquiryId', inquiryId)
        formData.append('message', message)

        try {
            const result = await adminReplyInquiry(formData)
            if (result.success) {
                setMessage('')
                toast.success('返信しました')
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
        <form action={handleSubmit} className="space-y-4">
            <Textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="返信内容を入力..."
                className="min-h-[150px]"
                required
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={loading || !message.trim()}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    返信を送信
                </Button>
            </div>
        </form>
    )
}
