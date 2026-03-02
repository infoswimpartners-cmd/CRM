
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { completeReceptionManually } from '@/actions/entry'
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

    const handleManualComplete = async () => {
        if (!confirm(`${student.full_name}様を「手動対応済み」として完了しますか？`)) return

        setIsProcessing(true)
        setIsDeleted(true)

        try {
            const result = await completeReceptionManually(student.id)
            if (result.success) {
                toast.success('対応済みとして完了しました')
                router.refresh()
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

    if (isDeleted) return null

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
            <TableCell>
                <Dialog>
                    <DialogTrigger asChild>
                        <button className="max-w-[200px] truncate text-xs text-slate-500 hover:text-cyan-600 hover:underline text-left" title="詳細を見る">
                            {student.notes || 'なし'}
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{student.full_name}様の問い合わせ内容</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 p-4 bg-slate-50 rounded-md border border-slate-100">
                            {student.notes || '備考・メッセージはありません。'}
                        </div>
                    </DialogContent>
                </Dialog>
            </TableCell>
            <TableCell className="text-center">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualComplete}
                    disabled={isProcessing}
                    className="text-slate-500 text-xs h-7 gap-1"
                >
                    <CheckCircle className="h-3 w-3" />
                    対応済みにする
                </Button>
            </TableCell>
        </TableRow>
    )
}
