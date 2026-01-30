'use client'

import { useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteLessonReport } from '@/actions/report'
import { toast } from 'sonner'

import { useRouter } from 'next/navigation'

interface DeleteReportDialogProps {
    reportId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function DeleteReportDialog({ reportId, open, onOpenChange, onSuccess }: DeleteReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteLessonReport(reportId)
            if (!result.success) {
                throw new Error(result.error)
            }
            toast.success('レッスン報告を削除しました')
            onSuccess()
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>警告: レッスン報告の削除</AlertDialogTitle>
                    <AlertDialogDescription>
                        本当にこのレッスン報告を削除しますか？<br />
                        この操作は取り消せません。
                        <br /><br />
                        <span className="font-bold text-red-500">
                            注意: すでに請求済みのレッスンの場合、Stripeの請求データとの整合性が取れなくなる可能性があります。
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
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {loading ? '削除中...' : '削除する'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
