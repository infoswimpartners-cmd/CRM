
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { sendReceptionEmail } from '@/actions/entry'
import { toast } from 'sonner'
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

interface Props {
    studentId: string
    studentName: string
    status: string | null
    email?: string | null
}

export function ReceptionEmailButton({ studentId, studentName, status, email }: Props) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [isSent, setIsSent] = useState(false)

    // Supports 'trial_pending' and 'inquiry'
    if (status !== 'trial_pending' && status !== 'inquiry') return null
    if (isSent) return null

    const handleSend = async () => {
        setLoading(true)
        // 楽観的更新：送信処理開始と同時に閉じる（ただし成功確認まではボタン自体は消さない？いや、消してほしいという要望なので消すか、loadingにするか）
        // 要望は「即座にボタンがなくなる」なので、isSentを即座にtrueにする
        setIsSent(true)
        setOpen(false)

        try {
            // For inquiry_pending, we might want to use a specific action or template
            // But for now, reusing sendReceptionEmail (which sends "reception_completed") is fine
            // as it's generic enough "お申し込みを受け付けました".
            const result = await sendReceptionEmail(studentId)

            if (result.success) {
                toast.success('受付メールを送信しました')
                // 成功時は何もしない（既に消えている）
            } else {
                setIsSent(false) // 失敗時は復活
                toast.error(result.error || '送信に失敗しました')
            }
        } catch (error) {
            console.error(error)
            setIsSent(false) // エラー時は復活
            toast.error('エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    if (!email) return null // Cannot send if no email

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Mail className="h-3 w-3" />
                    受付承認
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>受付メールを送信しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                        {studentName} 様へ申し込み受付完了のメールを送信します。<br />
                        これにより申し込みが承認されたことになります。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsSent(false)}>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => {
                        e.preventDefault()
                        handleSend()
                    }} disabled={loading}>
                        {loading ? '送信中...' : '送信する'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
