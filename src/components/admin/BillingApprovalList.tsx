'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { approveLessonSchedule, rejectLessonSchedule, approveLessonScheduleManually } from '@/actions/lesson_schedule'
import { formatCurrency } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'
import { RefundDialog } from './RefundDialog'

interface BillingSchedule {
    id: string
    start_time: string
    title: string
    price: number | null
    status: string
    billing_status: string
    stripe_invoice_item_id: string | null
    student: {
        full_name: string | null
        second_student_name: string | null
    } | null
    lesson_master: {
        name: string
    } | null
}

interface BillingApprovalListProps {
    unpaidSchedules: BillingSchedule[]
    paidSchedules: BillingSchedule[]
    unpaidRegularSchedules?: BillingSchedule[]
    paidRegularSchedules?: BillingSchedule[]
}

export function BillingApprovalList({
    unpaidSchedules,
    paidSchedules,
    unpaidRegularSchedules = [],
    paidRegularSchedules = []
}: BillingApprovalListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [unpaidFilter, setUnpaidFilter] = useState<string>('awaiting_approval')
    const [regularFilter, setRegularFilter] = useState<string>('ready_to_invoice')
    const [activeTab, setActiveTab] = useState<'trial' | 'regular'>('trial')
    const searchParams = useSearchParams()
    const router = useRouter()
    const approveId = searchParams.get('approve_id')

    // Handle initial scrolling
    useEffect(() => {
        if (approveId) {
            const element = document.getElementById(`row-${approveId}`)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                element.classList.add('bg-yellow-100')
                setTimeout(() => element.classList.remove('bg-yellow-100'), 3000)
                toast.info('対象の請求を選択しました')
            }
        }
    }, [approveId, unpaidSchedules, unpaidRegularSchedules])

    const handleReject = async (id: string, name: string) => {
        if (!confirm(`${name}様の予約をキャンセルしますか？\n（請求も取り消されます）`)) return

        setProcessingId(id)
        try {
            const result = await rejectLessonSchedule(id)
            if (result.success) {
                toast.success('予約をキャンセルしました')
                router.refresh()
            } else {
                toast.error('キャンセルに失敗しました: ' + result.error)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setProcessingId(null)
        }
    }

    const handleManualApprove = async (id: string, name: string) => {
        if (!confirm(`${name}様の決済を手動で完了（Stripe外での入金確認済み）としてマークしますか？`)) return

        setProcessingId(id)
        try {
            const result = await approveLessonScheduleManually(id)
            if (result.success) {
                toast.success('決済完了としてマークしました')
                router.refresh()
            } else {
                toast.error('エラーが発生しました: ' + (result as any).error)
            }
        } catch (error) {
            toast.error('通信エラーが発生しました')
        } finally {
            setProcessingId(null)
        }
    }

    const filteredUnpaidSchedules = unpaidSchedules.filter(schedule => {
        if (unpaidFilter === 'all') return true;
        return schedule.billing_status === unpaidFilter;
    });

    const filteredRegularSchedules = unpaidRegularSchedules.filter(schedule => {
        if (regularFilter === 'all') return true;
        return schedule.billing_status === regularFilter;
    });

    const handleApprove = async (id: string, name: string) => {
        if (!confirm(`${name}様の追加レッスンを承認し、請求を行いますか？`)) return

        setProcessingId(id)
        console.log('[BillingList] Approving ID:', id, 'Name:', name)
        try {
            const result = await approveLessonSchedule(id)
            if (result.success) {
                toast.success('承認し、請求書を発行しました')
                router.refresh()
            } else {
                toast.error('承認に失敗しました: ' + (result as any).error)
            }
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setProcessingId(null)
        }
    }

    const TableContent = ({ schedules, isPaid }: { schedules: BillingSchedule[], isPaid: boolean }) => (
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
                {schedules.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                            データがありません
                        </TableCell>
                    </TableRow>
                ) : (
                    schedules.map((schedule) => {
                        const isApprovalPending = schedule.billing_status === 'awaiting_approval'
                        const isPaymentPending = schedule.billing_status === 'awaiting_payment'
                        const isApproved = schedule.billing_status === 'approved'
                        const isReadyToInvoice = schedule.billing_status === 'ready_to_invoice'

                        return (
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
                                    <div className="mt-1">
                                        {isPaid ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-green-50 text-green-600 border-green-200">
                                                決済済み
                                            </span>
                                        ) : isReadyToInvoice ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-50 text-purple-600 border-purple-200">
                                                保留中（次月合算）
                                            </span>
                                        ) : isApprovalPending ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
                                                承認待ち
                                            </span>
                                        ) : isApproved ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-200">
                                                請求予約済み
                                            </span>
                                        ) : (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-yellow-50 text-yellow-600 border-yellow-200">
                                                支払待ち
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800">
                                    {formatCurrency(schedule.price || 0)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {isPaid ? (
                                            <RefundDialog
                                                scheduleId={schedule.id}
                                                title={schedule.title}
                                                amount={schedule.price || 0}
                                                studentName={schedule.student?.full_name || ''}
                                                onRefundComplete={() => router.refresh()}
                                            />
                                        ) : (
                                            <>
                                                {isApprovalPending && (
                                                    <div className="flex flex-col gap-1">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleApprove(schedule.id, schedule.student?.full_name || '')}
                                                            disabled={!!processingId}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-[10px]"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Stripeで請求
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleManualApprove(schedule.id, schedule.student?.full_name || '')}
                                                            disabled={!!processingId}
                                                            className="border-blue-600 text-blue-600 hover:bg-blue-50 h-7 text-[10px]"
                                                        >
                                                            <RefreshCw className="h-3 w-3 mr-1" />
                                                            手動決済
                                                        </Button>
                                                    </div>
                                                )}
                                                {isReadyToInvoice && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-slate-500 italic block mb-1">自動請求登録済み</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleManualApprove(schedule.id, schedule.student?.full_name || '')}
                                                            disabled={!!processingId}
                                                            className="border-blue-600 text-blue-600 hover:bg-blue-50 h-7 text-[10px]"
                                                        >
                                                            <RefreshCw className="h-3 w-3 mr-1" />
                                                            手動決済
                                                        </Button>
                                                    </div>
                                                )}
                                                {!isApprovalPending && !isReadyToInvoice && isPaymentPending && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleManualApprove(schedule.id, schedule.student?.full_name || '')}
                                                        disabled={!!processingId}
                                                        className="border-green-600 text-green-600 hover:bg-green-50 h-8 text-xs"
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        手動決済
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleReject(schedule.id, schedule.student?.full_name || '')}
                                                    disabled={!!processingId}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs"
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    {isApprovalPending ? '却下' : 'キャンセル'}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })
                )}
            </TableBody>
        </Table >
    )

    return (
        <div className="space-y-6">
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('trial')}
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'trial'
                            ? 'border-cyan-600 text-cyan-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <CreditCard className="h-4 w-4" />
                    体験レッスン決済管理
                    {unpaidSchedules.length > 0 && (
                        <span className="ml-1.5 bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {unpaidSchedules.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('regular')}
                    className={`py-3 px-6 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'regular'
                            ? 'border-cyan-600 text-cyan-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <RefreshCw className="h-4 w-4" />
                    通常レッスン請求管理
                    {unpaidRegularSchedules.filter(s => s.billing_status === 'ready_to_invoice').length > 0 && (
                        <span className="ml-1.5 bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {unpaidRegularSchedules.filter(s => s.billing_status === 'ready_to_invoice').length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'trial' ? (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-2">
                        <div>
                            <CardTitle className="text-slate-800">体験決済管理</CardTitle>
                            <CardDescription>体験レッスンの決済状況（完了・未完了）の管理</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="unpaid" className="w-full">
                            <div className="px-4 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50">
                                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                                    <TabsTrigger value="unpaid" className="data-[state=active]:bg-white data-[state=active]:text-cyan-600 data-[state=active]:shadow-sm">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        体験決済未完了
                                        {unpaidSchedules.length > 0 && (
                                            <span className="ml-2 bg-cyan-100 text-cyan-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                                {unpaidSchedules.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="paid" className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        体験決済完了
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="unpaid" className="m-0">
                                <div className="p-4 bg-cyan-50/10 border-b border-cyan-100/50 mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <p className="text-xs text-slate-600 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-cyan-600" />
                                        未払いの体験レッスンです。Stripe請求または手動で決済を完了してください。
                                    </p>
                                    <Select value={unpaidFilter} onValueChange={setUnpaidFilter}>
                                        <SelectTrigger className="w-[180px] bg-white text-xs h-8">
                                            <SelectValue placeholder="絞り込み" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">すべて表示</SelectItem>
                                            <SelectItem value="awaiting_approval">承認待ち</SelectItem>
                                            <SelectItem value="approved">請求予約済み</SelectItem>
                                            <SelectItem value="awaiting_payment">支払待ち</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <TableContent schedules={filteredUnpaidSchedules} isPaid={false} />
                            </TabsContent>

                            <TabsContent value="paid" className="m-0">
                                <TableContent schedules={paidSchedules} isPaid={true} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-2">
                        <div>
                            <CardTitle className="text-slate-800">通常レッスン（単発・追加）請求管理</CardTitle>
                            <CardDescription>単発会員のレッスンおよび月2回・4回会員の追加レッスンの請求管理</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="unpaid" className="w-full">
                            <div className="px-4 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50">
                                <TabsList className="grid w-full max-w-[440px] grid-cols-2">
                                    <TabsTrigger value="unpaid" className="data-[state=active]:bg-white data-[state=active]:text-cyan-600 data-[state=active]:shadow-sm">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        保留中（次月合算待ち）
                                        {unpaidRegularSchedules.filter(s => s.billing_status === 'ready_to_invoice').length > 0 && (
                                            <span className="ml-2 bg-cyan-100 text-cyan-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                                {unpaidRegularSchedules.filter(s => s.billing_status === 'ready_to_invoice').length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="paid" className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        請求・決済完了履歴
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="unpaid" className="m-0">
                                <div className="p-4 bg-cyan-50/10 border-b border-cyan-100/50 mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <p className="text-xs text-slate-600 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-cyan-600" />
                                        コーチの報告により自動でStripeの保留中請求に追加されたレッスンです。翌月の定期決済時に合算されます。
                                    </p>
                                    <Select value={regularFilter} onValueChange={setRegularFilter}>
                                        <SelectTrigger className="w-[180px] bg-white text-xs h-8">
                                            <SelectValue placeholder="絞り込み" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">すべて表示</SelectItem>
                                            <SelectItem value="ready_to_invoice">保留中（次月合算）</SelectItem>
                                            <SelectItem value="awaiting_approval">承認待ち</SelectItem>
                                            <SelectItem value="approved">請求予約済み</SelectItem>
                                            <SelectItem value="awaiting_payment">支払待ち</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <TableContent schedules={filteredRegularSchedules} isPaid={false} />
                            </TabsContent>

                            <TabsContent value="paid" className="m-0">
                                <TableContent schedules={paidRegularSchedules} isPaid={true} />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
