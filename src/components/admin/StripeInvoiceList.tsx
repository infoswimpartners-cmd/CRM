'use client'

import { useState, useTransition, useMemo } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    Receipt,
    ExternalLink,
    FileDown,
    Search,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    ChevronDown,
    ChevronUp,
    CreditCard,
    DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getStripeInvoices, StripeInvoiceSummary } from '@/actions/stripe'

interface StripeInvoiceListProps {
    initialInvoices: StripeInvoiceSummary[]
    initialHasMore?: boolean
    initialSearchQuery?: string
}

export function StripeInvoiceList({
    initialInvoices,
    initialHasMore = false,
    initialSearchQuery = '',
}: StripeInvoiceListProps) {
    const [invoices, setInvoices] = useState<StripeInvoiceSummary[]>(initialInvoices)
    const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery)
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // 再読み込み処理（最新の請求履歴を再取得）
    const handleRefresh = () => {
        startTransition(async () => {
            try {
                const res = await getStripeInvoices({
                    limit: 50,
                })
                if (res.success) {
                    setInvoices(res.data)
                    setHasMore(res.hasMore)
                    toast.success('Stripe請求履歴を最新に更新しました')
                } else {
                    toast.error('請求履歴の更新に失敗しました: ' + res.error)
                }
            } catch (error: any) {
                toast.error('エラーが発生しました: ' + error.message)
            }
        })
    }

    // 過去の請求履歴の追加読み込み（カーソルページネーション）
    const handleLoadMore = async () => {
        if (isLoadingMore || !hasMore || invoices.length === 0) return

        const lastInvoice = invoices[invoices.length - 1]
        setIsLoadingMore(true)
        try {
            const res = await getStripeInvoices({
                limit: 50,
                startingAfter: lastInvoice.id,
            })
            if (res.success) {
                setInvoices((prev) => {
                    const existingIds = new Set(prev.map((i) => i.id))
                    const newItems = res.data.filter((i) => !existingIds.has(i.id))
                    return [...prev, ...newItems]
                })
                setHasMore(res.hasMore)
                toast.success(`${res.data.length}件の請求履歴を追加取得しました`)
            } else {
                toast.error('追加取得に失敗しました: ' + res.error)
            }
        } catch (error: any) {
            toast.error('エラーが発生しました: ' + error.message)
        } finally {
            setIsLoadingMore(false)
        }
    }

    // 検索・絞り込みフィルタリング
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            // ステータスフィルタ
            if (statusFilter !== 'all' && inv.status !== statusFilter) {
                return false
            }

            // 検索クエリフィルタ
            if (!searchQuery.trim()) return true

            const q = searchQuery.toLowerCase().trim()
            const matchNumber = inv.number?.toLowerCase().includes(q)
            const matchId = inv.id.toLowerCase().includes(q)
            const matchCustomerId = inv.customer_id?.toLowerCase().includes(q)
            const matchCustomerName = inv.customer_name?.toLowerCase().includes(q)
            const matchCustomerEmail = inv.customer_email?.toLowerCase().includes(q)
            const matchStudentName = inv.student?.full_name?.toLowerCase().includes(q)
            const matchSecondStudentName = inv.student?.second_student_name?.toLowerCase().includes(q)
            const matchStudentNumber = inv.student?.student_number?.toLowerCase().includes(q)
            const matchLine = inv.lines.some((l) => l.description?.toLowerCase().includes(q))

            return (
                matchNumber ||
                matchId ||
                matchCustomerId ||
                matchCustomerName ||
                matchCustomerEmail ||
                matchStudentName ||
                matchSecondStudentName ||
                matchStudentNumber ||
                matchLine
            )
        })
    }, [invoices, statusFilter, searchQuery])

    // 集計データ
    const stats = useMemo(() => {
        const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid || inv.amount_due || 0), 0)
        const paidCount = filteredInvoices.filter((inv) => inv.status === 'paid').length
        const openCount = filteredInvoices.filter((inv) => inv.status === 'open').length

        return {
            totalCount: filteredInvoices.length,
            totalAmount,
            paidCount,
            openCount,
        }
    }, [filteredInvoices])

    // 請求理由の日本語表記
    const formatBillingReason = (reason: string | null) => {
        switch (reason) {
            case 'subscription_cycle':
                return '月額定期課金'
            case 'subscription_create':
                return 'プラン新規登録'
            case 'subscription_update':
                return 'プラン変更'
            case 'manual':
                return '都度請求'
            case 'upcoming':
                return '予定請求'
            default:
                return reason || '通常請求'
        }
    }

    // ステータスバッジの描画
    const renderStatusBadge = (status: string | null) => {
        switch (status) {
            case 'paid':
                return (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-semibold gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        決済完了
                    </Badge>
                )
            case 'open':
                return (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 font-semibold gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        支払待ち
                    </Badge>
                )
            case 'draft':
                return (
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-300 font-medium text-[11px]">
                        下書き
                    </Badge>
                )
            case 'void':
                return (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border border-rose-300 font-medium text-[11px]">
                        無効
                    </Badge>
                )
            case 'uncollectible':
                return (
                    <Badge className="bg-red-200 text-red-800 hover:bg-red-200 border border-red-400 font-medium text-[11px]">
                        回収不能
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="text-slate-600 text-[11px]">
                        {status || '不明'}
                    </Badge>
                )
        }
    }

    return (
        <div className="space-y-6">
            {/* 統計サマリーカード */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">表示中の請求総額</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {formatCurrency(stats.totalAmount)}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">全請求件数</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {stats.totalCount} <span className="text-xs font-normal text-slate-500">件</span>
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">決済完了件数</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">
                                {stats.paidCount} <span className="text-xs font-normal text-slate-500">件</span>
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">支払待ち（未払い）</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">
                                {stats.openCount} <span className="text-xs font-normal text-slate-500">件</span>
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 一覧カード */}
            <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-200/80 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                Stripe請求・インボイス履歴
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Stripe上で発行・処理された請求書および決済状況をリアルタイムに確認できます。
                            </CardDescription>
                        </div>

                        {/* 更新ボタン */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isPending}
                            className="h-9 px-3 gap-1.5 text-xs self-start sm:self-auto shrink-0 border-slate-300"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-blue-600' : ''}`} />
                            最新に更新
                        </Button>
                    </div>

                    {/* 絞り込み・検索バー */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="生徒名、会員番号、メール、請求番号などで検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs bg-white border-slate-200"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-slate-200">
                                    <SelectValue placeholder="ステータス" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのステータス</SelectItem>
                                    <SelectItem value="paid">決済完了 (paid)</SelectItem>
                                    <SelectItem value="open">支払待ち (open)</SelectItem>
                                    <SelectItem value="draft">下書き (draft)</SelectItem>
                                    <SelectItem value="void">無効 (void)</SelectItem>
                                    <SelectItem value="uncollectible">回収不能</SelectItem>
                                </SelectContent>
                            </Select>

                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSearchQuery('')}
                                    className="h-9 text-xs text-slate-500 hover:text-slate-800"
                                >
                                    クリア
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 text-xs">
                                <TableHead className="w-[160px]">請求番号 / 日時</TableHead>
                                <TableHead className="min-w-[180px]">顧客・生徒情報</TableHead>
                                <TableHead className="w-[120px]">請求区分</TableHead>
                                <TableHead className="text-right w-[110px]">請求金額</TableHead>
                                <TableHead className="text-center w-[110px]">ステータス</TableHead>
                                <TableHead className="text-center w-[120px]">請求書 / 操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertCircle className="w-6 h-6 text-slate-400" />
                                            <p className="text-sm">該当するStripe請求履歴が見つかりません</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvoices.map((inv) => {
                                    const isExpanded = expandedInvoiceId === inv.id
                                    const createdDate = new Date(inv.created * 1000)

                                    return (
                                        <TableRow key={inv.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                                            {/* 請求番号・日時 */}
                                            <TableCell className="align-top py-3">
                                                <div className="font-mono font-semibold text-slate-800 text-[11px]">
                                                    {inv.number || inv.id.substring(0, 14) + '...'}
                                                </div>
                                                <div className="text-slate-500 text-[11px] mt-0.5">
                                                    {format(createdDate, 'yyyy/MM/dd HH:mm', { locale: ja })}
                                                </div>
                                            </TableCell>

                                            {/* 顧客・生徒情報 */}
                                            <TableCell className="align-top py-3">
                                                {inv.student ? (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                                                            <Link
                                                                href={`/customers/${inv.student.id}`}
                                                                className="hover:text-blue-600 hover:underline flex items-center gap-1"
                                                            >
                                                                <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                                <span>
                                                                    {inv.student.full_name || inv.customer_name || '名称未設定'}
                                                                    {inv.student.second_student_name ? `・${inv.student.second_student_name}` : ''}
                                                                </span>
                                                            </Link>
                                                            {inv.student.student_number && (
                                                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono text-slate-600 bg-slate-50">
                                                                    #{inv.student.student_number}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                            {inv.customer_email || 'メール未登録'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium text-slate-800">
                                                            {inv.customer_name || 'ゲスト・未連携顧客'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                            {inv.customer_email || inv.customer_id || '-'}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 内訳・明細トグル */}
                                                {inv.lines.length > 0 && (
                                                    <div className="mt-1.5">
                                                        <button
                                                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium"
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    <ChevronUp className="w-3 h-3" />
                                                                    明細を閉じる ({inv.lines.length}件)
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="w-3 h-3" />
                                                                    明細を表示 ({inv.lines.length}件)
                                                                </>
                                                            )}
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-200/80 space-y-1">
                                                                {inv.lines.map((line) => (
                                                                    <div key={line.id} className="flex justify-between items-start text-[11px] text-slate-600">
                                                                        <span className="truncate pr-2 font-medium">
                                                                            {line.description || 'レッスン・会費'}
                                                                        </span>
                                                                        <span className="font-mono shrink-0">
                                                                            {formatCurrency(line.amount)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* 請求区分 */}
                                            <TableCell className="align-top py-3 text-slate-600">
                                                <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                                    {formatBillingReason(inv.billing_reason)}
                                                </span>
                                            </TableCell>

                                            {/* 請求金額 */}
                                            <TableCell className="align-top py-3 text-right">
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {formatCurrency(inv.amount_due)}
                                                </div>
                                                {inv.status === 'paid' && inv.amount_paid !== inv.amount_due && (
                                                    <div className="text-[10px] text-emerald-600">
                                                        支払済: {formatCurrency(inv.amount_paid)}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* ステータス */}
                                            <TableCell className="align-top py-3 text-center">
                                                {renderStatusBadge(inv.status)}
                                            </TableCell>

                                            {/* 操作・リンク */}
                                            <TableCell className="align-top py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {inv.hosted_invoice_url ? (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-[10px] border-slate-300 gap-1 text-slate-700 hover:text-blue-600"
                                                            title="Stripe公式の請求書ページを開く"
                                                        >
                                                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="w-3 h-3" />
                                                                請求書
                                                            </a>
                                                        </Button>
                                                    ) : null}

                                                    {inv.invoice_pdf ? (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                                                            title="PDFをダウンロード"
                                                        >
                                                            <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                                                <FileDown className="w-3.5 h-3.5" />
                                                            </a>
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* 追加読み込み（ページネーション） */}
                    {hasMore && (
                        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="text-xs text-slate-700 hover:text-blue-600 gap-1.5 h-8 bg-white border-slate-300 shadow-xs"
                            >
                                {isLoadingMore ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                )}
                                さらに過去の請求履歴を読み込む
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
