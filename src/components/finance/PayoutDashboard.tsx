'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Download, Search, CheckCircle2, AlertCircle, Clock, RefreshCcw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PayoutModal } from '@/components/finance/PayoutModal'
import { PaymentSlipModal } from '@/components/finance/PaymentSlipModal'
import { PaymentHistoryModal } from '@/components/finance/PaymentHistoryModal'

type PayoutStatus = {
    coach_id: string
    full_name: string
    avatar_url: string
    target_month: string
    total_sales: number
    total_reward: number
    paid_amount: number
    unpaid_amount: number
    pending_amount: number
    status: 'paid' | 'partial' | 'unpaid'
    rate: number
    details: any[]
    payouts: any[]
    baseAmount: number
    consumptionTax: number
    withholdingTax: number
    systemFee: number
    transferFee: number
    finalAmount: number
}

interface PayoutDashboardProps {
    data: PayoutStatus[]
    targetMonth: string
    companyInfo: any // Record<string, string>
}

export function PayoutDashboard({ data, targetMonth, companyInfo }: PayoutDashboardProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Filter Logic
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchStatus = statusFilter === 'all' || item.status === statusFilter
            const matchSearch = item.full_name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchPending = statusFilter === 'pending' ? item.pending_amount > 0 : true

            if (statusFilter === 'pending') return matchPending && matchSearch
            return matchStatus && matchSearch
        })
    }, [data, statusFilter, searchQuery])

    // Summary Calculations
    const summary = useMemo(() => {
        return {
            totalReward: data.reduce((sum, item) => sum + item.total_reward, 0),
            totalPaid: data.reduce((sum, item) => sum + item.paid_amount, 0),
            totalPending: data.reduce((sum, item) => sum + item.pending_amount, 0),
            totalUnpaid: data.reduce((sum, item) => sum + item.unpaid_amount, 0),
            countUnpaid: data.filter(item => item.status === 'unpaid').length
        }
    }, [data])

    // CSV Export
    const handleDownloadCSV = () => {
        const headers = ['対象月', 'コーチ名', '適用レート', '売上合計', '報酬確定額', '支払済額', '処理中金額', '未払い残高', 'ステータス']
        const rows = filteredData.map(item => [
            item.target_month,
            item.full_name,
            `${(item.rate * 100).toFixed(0)}%`,
            item.total_sales,
            item.total_reward,
            item.paid_amount,
            item.pending_amount,
            item.unpaid_amount,
            item.status === 'paid' ? '支払完了' : item.status === 'partial' ? '一部支払い' : '未払い'
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `payouts_${targetMonth}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">報酬確定総額</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">¥{summary.totalReward.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">支払完了</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">¥{summary.totalPaid.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">処理中(未確定)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">¥{summary.totalPending.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm ring-1 ring-red-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">実質未払い残高</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ¥{Math.max(0, summary.totalUnpaid - summary.totalPending).toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            (振込予約等を含むと残り ¥{(summary.totalUnpaid - summary.totalPending).toLocaleString()})
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="コーチ名で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="ステータス" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全てのステータス</SelectItem>
                            <SelectItem value="unpaid">未払いのみ</SelectItem>
                            <SelectItem value="pending">処理中あり</SelectItem>
                            <SelectItem value="partial">一部支払い</SelectItem>
                            <SelectItem value="paid">支払い完了</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                    <Download className="h-4 w-4" />
                    CSVダウンロード
                </Button>
            </div>

            {/* Table */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 font-medium">コーチ</th>
                                <th className="px-6 py-3 font-medium text-right">適用レート</th>
                                <th className="px-6 py-3 font-medium text-right">売上(月次)</th>
                                <th className="px-6 py-3 font-medium text-right">確定報酬額</th>
                                <th className="px-6 py-3 font-medium text-right">支払済/処理中</th>
                                <th className="px-6 py-3 font-medium text-right">未払い残高</th>
                                <th className="px-6 py-3 font-medium text-center">ステータス</th>
                                <th className="px-6 py-3 font-medium text-center">書類</th>
                                <th className="px-6 py-3 font-medium text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        該当するデータがありません
                                    </td>
                                </tr>
                            ) : filteredData.map((item) => (
                                <tr key={item.coach_id} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={item.avatar_url} />
                                                <AvatarFallback>{item.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <Link href={`/admin/coaches/${item.coach_id}`} className="font-medium text-slate-700 hover:text-cyan-600 hover:underline">
                                                {item.full_name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        {(item.rate * 100).toFixed(0)}%
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600">
                                        ¥{item.total_sales.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                                        ¥{item.total_reward.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <PaymentHistoryModal
                                            coachName={item.full_name}
                                            targetMonth={item.target_month}
                                            payouts={item.payouts}
                                            triggerContent={
                                                <div className="flex flex-col items-end cursor-pointer group">
                                                    <span className="text-green-600 font-medium group-hover:underline">
                                                        ¥{item.paid_amount.toLocaleString()}
                                                    </span>
                                                    {item.pending_amount > 0 && (
                                                        <span className="text-blue-500 text-xs mt-0.5 group-hover:underline">
                                                            (+¥{item.pending_amount.toLocaleString()} 処理中)
                                                        </span>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600">
                                        ¥{item.unpaid_amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.status === 'paid' && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />完了
                                            </Badge>
                                        )}
                                        {item.status === 'partial' && (
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                一部
                                            </Badge>
                                        )}
                                        {item.status === 'unpaid' && (
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                <AlertCircle className="w-3 h-3 mr-1" />未払い
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <PaymentSlipModal
                                            coachName={item.full_name}
                                            targetMonth={item.target_month}
                                            rate={item.rate}
                                            details={item.details}
                                            baseAmount={item.baseAmount}
                                            consumptionTax={item.consumptionTax}
                                            withholdingTax={item.withholdingTax}
                                            systemFee={item.systemFee}
                                            transferFee={item.transferFee}
                                            finalAmount={item.finalAmount}
                                            companyInfo={companyInfo}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {item.unpaid_amount > 0 && (
                                            <PayoutModal
                                                coachId={item.coach_id}
                                                coachName={item.full_name}
                                                targetMonth={item.target_month}
                                                unpaidAmount={item.unpaid_amount}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
