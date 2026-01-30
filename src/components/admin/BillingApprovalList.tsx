'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { approveLessonSchedule, rejectLessonSchedule } from '@/actions/lesson_schedule'
import { formatCurrency } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'

interface BillingSchedule {
    id: string
    start_time: string
    title: string
    price: number | null
    student: {
        full_name: string | null
        second_student_name: string | null
    } | null
    lesson_master: {
        name: string
    } | null
}

interface BillingApprovalListProps {
    schedules: BillingSchedule[]
}

export function BillingApprovalList({ schedules }: BillingApprovalListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const router = useRouter()
    const approveId = searchParams.get('approve_id')

    // Effect to handle auto-selection/highlight logic if needed
    // For now, let's just highlight the row or scroll to it?
    // Or maybe show a confirmation dialog immediately?
    // Let's scroll to it and highlight.
    useEffect(() => {
        if (approveId) {
            const element = document.getElementById(`row-${approveId}`)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                element.classList.add('bg-yellow-100')
                setTimeout(() => element.classList.remove('bg-yellow-100'), 3000)
                toast.info('承認対象の請求を選択しました')
            }
        }
    }, [approveId, schedules])

    const handleApprove = async (id: string) => {
        setProcessingId(id)
        try {
            const result = await approveLessonSchedule(id)
            if (result.success) {
                toast.success('請求を承認しました')
                // Remove param if it was this one
                if (approveId === id) {
                    router.replace('/admin/billing')
                }
            } else {
                toast.error('承認に失敗しました: ' + result.error)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (id: string, name: string) => {
        if (!confirm(`${name}様の請求をキャンセルしますか？\n（レッスンも請求キャンセル扱いとなります）`)) return

        setProcessingId(id)
        try {
            const result = await rejectLessonSchedule(id)
            if (result.success) {
                toast.success('請求をキャンセルしました')
            } else {
                toast.error('キャンセルに失敗しました: ' + result.error)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setProcessingId(null)
        }
    }

    if (schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <CheckCircle className="h-12 w-12 mb-4 text-green-500/50" />
                <h3 className="text-lg font-medium">承認待ちの請求はありません</h3>
                <p className="text-sm">現在、確認が必要な追加請求項目はありません。</p>
            </div>
        )
    }

    return (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="h-5 w-5" />
                    <CardTitle>承認待ち一覧 ({schedules.length}件)</CardTitle>
                </div>
                <CardDescription>
                    以下のレッスンは月規定回数を超過しているか単発レッスンのため、請求承認が必要です。
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableHead className="w-[180px]">レッスン日時</TableHead>
                            <TableHead>生徒名</TableHead>
                            <TableHead>レッスン内容</TableHead>
                            <TableHead className="text-right">請求額</TableHead>
                            <TableHead className="text-center w-[200px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {schedules.map((schedule) => (
                            <TableRow
                                key={schedule.id}
                                id={`row-${schedule.id}`}
                                className={`group hover:bg-orange-50/30 transition-colors duration-500`}
                            >
                                <TableCell className="font-medium text-slate-700">
                                    {format(new Date(schedule.start_time), 'yyyy/MM/dd (eee)', { locale: ja })}
                                    <br />
                                    <span className="text-xs text-slate-500">
                                        {format(new Date(schedule.start_time), 'HH:mm')}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{schedule.student?.full_name || '不明'}</div>
                                    {schedule.student?.second_student_name && (
                                        <div className="text-xs text-slate-500">
                                            + {schedule.student.second_student_name}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-slate-700">{schedule.title}</div>
                                    {schedule.lesson_master && (
                                        <div className="text-xs bg-slate-100 inline-block px-1.5 py-0.5 rounded mt-1">
                                            {schedule.lesson_master.name}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800">
                                    {formatCurrency(schedule.price || 0)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(schedule.id)}
                                            disabled={!!processingId}
                                            className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                        >
                                            {processingId === schedule.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4 mr-1.5" />
                                                    承認
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleReject(schedule.id, schedule.student?.full_name || '')}
                                            disabled={!!processingId}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
