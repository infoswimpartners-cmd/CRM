'use client'

import { Button } from '@/components/ui/button'
import { Link2, Loader2, Check, Copy } from 'lucide-react'
import { getInvitationUrl } from '@/app/actions/coach'
import { useState } from 'react'

interface CoachInviteLinkButtonProps {
    coachId: string
    coachName: string
}

export function CoachInviteLinkButton({ coachId, coachName }: CoachInviteLinkButtonProps) {
    const [isPending, setIsPending] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleCopy = async () => {
        setIsPending(true)
        try {
            const result = await getInvitationUrl(coachId)

            if (result.success && result.url) {
                await navigator.clipboard.writeText(result.url)
                setIsSuccess(true)
                setTimeout(() => setIsSuccess(false), 3000)
                // Optional: Show toast if available in context, currently using simple text feedback change
                alert('招待リンクをコピーしました。')
            } else {
                alert(result.error || 'リンクの取得に失敗しました。')
            }
        } catch (err) {
            console.error(err)
            alert('エラーが発生しました。')
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            disabled={isPending || isSuccess}
            title="招待リンクをコピー"
            className={isSuccess ? "text-green-600 hover:text-green-700" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSuccess ? (
                <Check className="h-4 w-4" />
            ) : (
                <Link2 className="h-4 w-4" />
            )}
        </Button>
    )
}
