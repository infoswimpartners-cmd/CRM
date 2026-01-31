'use client'

import { Button } from '@/components/ui/button'
import { Send, Loader2, Check } from 'lucide-react'
import { resendInvitation } from '@/app/actions/coach'
import { useState } from 'react'
import { toast } from 'sonner' // Assuming sonner is used, or console.log/alert if not sure. 
// Looking at previous files, 'alert' UI component is used. I don't see sonner.
// I'll use local state for feedback.

interface CoachResendButtonProps {
    coachId: string
    coachName: string
}

export function CoachResendButton({ coachId, coachName }: CoachResendButtonProps) {
    const [isPending, setIsPending] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleResend = async () => {
        if (!confirm(`${coachName} さんに招待メールを再送信しますか？\n(以前の招待リンクは無効になります)`)) {
            return
        }

        setIsPending(true)
        try {
            const result = await resendInvitation(coachId)

            if (result.success) {
                setIsSuccess(true)
                setTimeout(() => setIsSuccess(false), 3000)
                alert('招待メールを再送信しました。')
            } else {
                alert(result.error || '送信に失敗しました。')
            }
        } catch (err) {
            alert('エラーが発生しました。')
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleResend}
            disabled={isPending || isSuccess}
            title="招待メールを再送信"
            className={isSuccess ? "text-green-600 hover:text-green-700" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSuccess ? (
                <Check className="h-4 w-4" />
            ) : (
                <Send className="h-4 w-4" />
            )}
        </Button>
    )
}
