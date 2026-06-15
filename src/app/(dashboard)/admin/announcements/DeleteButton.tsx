'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteAnnouncementAction } from '@/actions/announcement'
import { toast } from 'sonner'

interface DeleteAnnouncementButtonProps {
    id: string
}

export function DeleteAnnouncementButton({ id }: DeleteAnnouncementButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm('このお知らせを削除してもよろしいですか？')) {
            return
        }

        setIsDeleting(true)
        try {
            const res = await deleteAnnouncementAction(id)
            if (res.success) {
                toast.success('お知らせを削除しました')
            } else {
                toast.error(res.error || '削除に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
        >
            {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="h-4 w-4" />
            )}
        </Button>
    )
}
