'use client'

import { closeInquiry } from '@/actions/admin-inquiry'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'

export default function CloseButton({ inquiryId, isClosed }: { inquiryId: string, isClosed: boolean }) {
    const handleClose = async () => {
        if (!confirm('このお問い合わせを完了にしますか？')) return
        const result = await closeInquiry(inquiryId)
        if (result.success) {
            toast.success('完了にしました')
        } else {
            toast.error('エラーが発生しました')
        }
    }

    if (isClosed) return <Button variant="outline" disabled>完了済み</Button>

    return (
        <Button variant="outline" onClick={handleClose}>
            <CheckCircle className="mr-2 h-4 w-4" />
            完了にする
        </Button>
    )
}
