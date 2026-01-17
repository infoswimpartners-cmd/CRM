'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteCoach } from '@/app/actions/coach'

interface CoachDeleteButtonProps {
    coachId: string
    coachName: string
}

export function CoachDeleteButton({ coachId, coachName }: CoachDeleteButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteCoach(coachId)
            if (result.error) {
                alert(result.error) // Simple alert for now, could be toast
            } else {
                setOpen(false)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>コーチを削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                        <strong>{coachName}</strong> を削除しようとしています。<br />
                        この操作は取り消せません。<br />
                        <span className="text-xs text-muted-foreground mt-2 block">
                            ※担当生徒やレッスン履歴がある場合、データの整合性を守るため削除は拒否されます。
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleDelete()
                        }}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        削除実行
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
