'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { Search, AlertCircle, TrendingUp, Filter, CheckCircle, CreditCard, XCircle, Send, MoreHorizontal, Mail, FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { PaymentDashboardData, PaymentTableRow, PaymentState } from '@/actions/payments'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'

export function PaymentManagementDashboard({ initialData }: { initialData: PaymentDashboardData }) {
    const [data, setData] = useState(initialData)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')

    const filteredRows = data.rows.filter(row => {
        const matchesSearch = row.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (row.studentId && row.studentId.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesFilter =
            filterStatus === 'all' ||
            (filterStatus === 'error' && row.paymentState === 'error') ||
            (filterStatus === 'trial_unpaid' && row.trialPaymentOk === false) ||
            (filterStatus === 'unregistered' && row.paymentMethod === 'unregistered')

        return matchesSearch && matchesFilter
    })

    const handleRemindSelected = () => {
        toast.info('一括催促機能は順次実装予定です。')
    }

    const [confirmAction, setConfirmAction] = useState<{ type: 'manualPay' | 'remind', studentId: string, studentName: string } | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleConfirmManualPay = async () => {
        if (!confirmAction) return
        setIsProcessing(true)
        try {
            // モック: 実際には action を呼び出して DB 更新 (例: await approveLessonScheduleManually(studentId))
            await new Promise(resolve => setTimeout(resolve, 800)) // 疑似ローディング

            // 楽観的UI更新（Optimistic Update）: 該当顧客のステータスを即座に「paid」に書き換える
            setData(prev => ({
                ...prev,
                actionRequiredCount: Math.max(0, prev.actionRequiredCount - 1),
                rows: prev.rows.map(row =>
                    row.studentId === confirmAction.studentId
                        ? { ...row, paymentState: 'paid', trialPaymentOk: true, errorMessage: undefined }
                        : row
                )
            }))

            toast.success(`${confirmAction.studentName}様の支払いを手動で完了（消込）しました`)
        } catch (error) {
            toast.error('エラーが発生しました')
        } finally {
            setIsProcessing(false)
            setConfirmAction(null)
        }
    }

    const getStateBadge = (state: PaymentState, trialOk?: boolean | null) => {
        switch (state) {
            case 'paid':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>
            case 'pending':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">待機中</Badge>
            case 'error':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"><XCircle className="w-3 h-3 mr-1" />要対応</Badge>
            case 'unbilled':
                return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-200">未請求</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-l-4 border-l-red-500 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            要対応件数 (決済エラー・未払い)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{data.actionRequiredCount}件</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            至急確認および再決済依頼が必要です
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            今月の着地予想
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.expectedMonthlyLanding)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            確定売上と決済待ち金額の合計
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Section */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="名前、メール、顧客ID..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-auto">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="ステータスフィルタ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべて</SelectItem>
                                    <SelectItem value="error" className="text-red-600 focus:text-red-700">エラー発生</SelectItem>
                                    <SelectItem value="trial_unpaid" className="text-orange-600 focus:text-orange-700">初回未払い</SelectItem>
                                    <SelectItem value="unregistered">引落未設定</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-auto">
                            <Button variant="secondary" onClick={handleRemindSelected}>
                                <Send className="w-4 h-4 mr-2" />
                                選択対象に一括催促
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>決済状況一覧</CardTitle>
                    <CardDescription>リアルタイムの決済ステータス</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>顧客名</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>プラン</TableHead>
                                <TableHead>支払方法</TableHead>
                                <TableHead>決済状況</TableHead>
                                <TableHead>体験決済</TableHead>
                                <TableHead>次回予定日</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                                        データが見つかりません
                                    </TableCell>
                                </TableRow>
                            ) : filteredRows.map((row) => (
                                <TableRow key={row.studentId} className={row.paymentState === 'error' ? 'bg-red-50/50 hover:bg-red-50' : ''}>
                                    <TableCell className="font-medium">
                                        <Link href={`/admin/customers/${row.studentId}`} className="hover:underline text-blue-600 flex items-center gap-2">
                                            {row.studentName}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {row.customerStatus === 'active' && <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">ｱｸﾃｨﾌﾞ</Badge>}
                                        {row.customerStatus === 'paused' && <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600">休会</Badge>}
                                        {row.customerStatus === 'unregistered' && <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-700">未契約</Badge>}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {row.planName}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-slate-600">
                                            {row.paymentMethod === 'card' && <><CreditCard className="w-4 h-4" /> クレカ</>}
                                            {row.paymentMethod === 'unregistered' && <span className="text-orange-500">未設定</span>}
                                            {row.paymentMethod === 'transfer' && '銀行振込'}
                                            {row.paymentMethod === 'cash' && '現金'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {row.errorMessage ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        {getStateBadge(row.paymentState)}
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-red-600 text-white">
                                                        <p>{row.errorMessage}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : getStateBadge(row.paymentState)}
                                    </TableCell>
                                    <TableCell>
                                        {row.trialPaymentOk === true && <span className="text-green-500">✅済</span>}
                                        {row.trialPaymentOk === false && <span className="text-red-500 font-bold">⚠️未</span>}
                                        {row.trialPaymentOk === null && <span className="text-slate-300">-</span>}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {row.nextBillingDate ? row.nextBillingDate.replace(/-/g, '/') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">メニュー</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[200px]">
                                                <DropdownMenuLabel>直感アクション</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => window.location.href = `/admin/customers/${row.studentId}`}>
                                                    <FileText className="mr-2 w-4 h-4 text-slate-500" />
                                                    顧客詳細を開く
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {row.paymentState === 'error' && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => toast.success(`${row.studentName}様へ未払い通知を送信しました（※順次実装）`)} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                                                            <Mail className="mr-2 w-4 h-4" />
                                                            未払い通知を送信
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setConfirmAction({ type: 'manualPay', studentId: row.studentId, studentName: row.studentName })} className="text-blue-600 focus:bg-blue-50 focus:text-blue-700 cursor-pointer">
                                                            <CheckCircle className="mr-2 w-4 h-4" />
                                                            手動で完了消込
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                {row.paymentState === 'pending' && (
                                                    <DropdownMenuItem onClick={() => toast.success('決済リンクを再送しました（※順次実装）')} className="cursor-pointer">
                                                        <Send className="mr-2 w-4 h-4 text-slate-500" />
                                                        決済リンクを送信
                                                    </DropdownMenuItem>
                                                )}
                                                {row.paymentMethod === 'unregistered' && (
                                                    <DropdownMenuItem onClick={() => toast.success('カード登録依頼を送信しました（※順次実装）')} className="cursor-pointer">
                                                        <CreditCard className="mr-2 w-4 h-4 text-slate-500" />
                                                        カード登録依頼
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Confirm Actions Dialog */}
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>手動で支払いを完了にしますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.studentName} 様の決済ステータスを「完了 (消込済み)」に変更します。
                            現金や銀行振込での入金が確認できた場合のみ実行してください。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmManualPay()
                            }}
                            disabled={isProcessing}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? '処理中...' : '完了としてマーク'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
