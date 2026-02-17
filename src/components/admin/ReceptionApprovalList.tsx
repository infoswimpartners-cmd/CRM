
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import { CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { sendReceptionEmail, completeReceptionManually } from '@/actions/entry'
import { useRouter } from 'next/navigation'

interface Student {
    id: string
    full_name: string
    status: string
    created_at: string
    contact_email: string
    notes: string | null
}

interface ReceptionApprovalListProps {
    students: Student[]
}

export function ReceptionApprovalList({ students }: ReceptionApprovalListProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[180px]">申込日時</TableHead>
                    <TableHead>氏名</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="text-center w-[200px]">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                            承認待ちの申し込みはありません
                        </TableCell>
                    </TableRow>
                ) : (
                    students.map((student) => (
                        <ReceptionStudentRow key={student.id} student={student} />
                    ))
                )}
            </TableBody>
        </Table>
    )
}

function ReceptionStudentRow({ student }: { student: Student }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [isDeleted, setIsDeleted] = useState(false)
    const router = useRouter()

    const handleApprove = async () => {
        if (!confirm(`${student.full_name}様へ受付メールを送信して承認しますか？`)) return

        setIsProcessing(true)
        setIsDeleted(true) // 楽観的削除

        try {
            const result = await sendReceptionEmail(student.id)
            if (result.success) {
                toast.success('受付メールを送信しました')
                router.refresh()
                // 成功時は isDeleted = true のまま（非表示維持）
            } else {
                setIsDeleted(false) // 失敗時は復活
                toast.error('送信に失敗しました: ' + result.error)
            }
        } catch (error) {
            setIsDeleted(false)
            toast.error('エラーが発生しました')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleManualComplete = async () => {
        if (!confirm(`${student.full_name}様を「手動対応済み」として完了しますか？\n（メールは送信されません）`)) return

        setIsProcessing(true)
        setIsDeleted(true) // 楽観的削除

        try {
            const result = await completeReceptionManually(student.id)
            if (result.success) {
                toast.success('手動対応済みとして完了しました')
                router.refresh()
                // 成功時は isDeleted = true のまま
            } else {
                setIsDeleted(false)
                toast.error('処理に失敗しました: ' + result.error)
            }
        } catch (error) {
            setIsDeleted(false)
            toast.error('エラーが発生しました')
        } finally {
            setIsProcessing(false)
        }
    }

    if (isDeleted) {
        return null // DOMから完全に消す（nullを返すと何もレンダリングされない）
    }

    return (
        <TableRow className="hover:bg-slate-50">
            <TableCell className="font-medium text-slate-700">
                {format(new Date(student.created_at), 'yyyy/MM/dd (eee)', { locale: ja })}
                <br />
                <span className="text-xs text-slate-500">
                    {format(new Date(student.created_at), 'HH:mm')}
                </span>
            </TableCell>
            <TableCell>
                <div className="font-medium">{student.full_name}</div>
                <div className="text-xs text-slate-500">
                    {student.status === 'inquiry' ? '問合せ' : '体験待ち'}
                </div>
            </TableCell>
            <TableCell>{student.contact_email}</TableCell>
            <TableCell className="max-w-[200px] truncate text-xs text-slate-500" title={student.notes || ''}>
                {student.notes}
            </TableCell>
            <TableCell className="text-center">
                <div className="flex flex-col gap-2">
                    <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
                    >
                        <Mail className="h-3 w-3 mr-2" />
                        受付承認
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualComplete}
                        disabled={isProcessing}
                        className="text-slate-500 text-xs h-7"
                    >
                        <CheckCircle className="h-3 w-3 mr-2" />
                        手動で完了
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}
