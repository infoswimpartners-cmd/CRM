'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Download, CheckCircle2, DollarSign, Calendar, Users, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface StudentData {
    id: string
    full_name: string
    student_number: string
    status: string
    membership_name: string
    membership_fee: number
}

interface LessonData {
    id: string
    student_id: string
    lesson_date: string
    billing_price: number
    stripe_invoice_item_id: string | null
}

interface ScheduleData {
    id: string
    student_id: string
    start_time: string
    price: number
    is_overage: boolean
    is_reported: boolean
    stripe_invoice_item_id: string | null
}

interface CustomerSalesSummaryProps {
    students: StudentData[]
    lessons: LessonData[]
    schedules: ScheduleData[]
    year: number
}

export function CustomerSalesSummary({ students, lessons, schedules, year }: CustomerSalesSummaryProps) {
    const today = new Date()
    const currentMonth = year === today.getFullYear() ? today.getMonth() + 1 : 4 // 対象年が今年なら今月、そうでなければ4月をデフォルトに

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(currentMonth)
    const [checkedStudents, setCheckedStudents] = useState<Record<string, boolean>>({})

    // ローカルストレージキーのプレフィックス決定
    const getStorageKey = (studentId: string, month: number | 'all') => {
        return `stripe_checked_${year}_${month}_${studentId}`
    }

    // マウント時および条件変更時にローカルストレージからチェック状態をロード
    useEffect(() => {
        const loaded: Record<string, boolean> = {}
        students.forEach(student => {
            const key = getStorageKey(student.id, selectedMonth)
            const val = localStorage.getItem(key)
            if (val === 'true') {
                loaded[student.id] = true
            }
        })
        setCheckedStudents(loaded)
    }, [selectedMonth, year, students])

    // チェック状態の変更ハンドラー
    const handleCheckChange = (studentId: string, checked: boolean) => {
        const key = getStorageKey(studentId, selectedMonth)
        if (checked) {
            localStorage.setItem(key, 'true')
            setCheckedStudents(prev => ({ ...prev, [studentId]: true }))
        } else {
            localStorage.removeItem(key)
            setCheckedStudents(prev => {
                const copy = { ...prev }
                delete copy[studentId]
                return copy
            })
        }
    }

    // 月別のレッスン絞り込みと、生徒ごとの集計計算
    const summaryData = useMemo(() => {
        // 1. 対象期間のレッスンおよびスケジュールを抽出
        const filteredLessons = lessons.filter(l => {
            const date = new Date(l.lesson_date)
            if (selectedMonth === 'all') return true
            return date.getMonth() + 1 === selectedMonth
        })

        const filteredSchedules = schedules.filter(s => {
            const date = new Date(s.start_time)
            if (selectedMonth === 'all') return true
            return date.getMonth() + 1 === selectedMonth
        })

        // 2. 生徒ごとに集計
        return students.map(student => {
            const studentLessons = filteredLessons.filter(l => l.student_id === student.id)
            const studentSchedules = filteredSchedules.filter(s => s.student_id === student.id)

            const lessonCount = studentLessons.length
            
            // レッスン実績料（lessons.billing_priceの合計）
            const lessonBillingTotal = studentLessons.reduce((sum, l) => sum + l.billing_price, 0)
            
            // 月謝会員（会費 > 0）の場合、追加レッスンの基本料（lesson_schedules.price）を加算する
            // 単発会員の場合は、すでに lessons.billing_price に総額が入っているので加算しない（二重加算を防ぐため）
            const isMonthlyMember = student.membership_fee > 0
            
            let overageBillingTotal = 0
            if (isMonthlyMember) {
                // 月謝会員の追加レッスン（is_overage = true 且つ reported = true）の価格を合計
                const overageSchedules = studentSchedules.filter(s => s.is_overage && s.is_reported)
                overageBillingTotal = overageSchedules.reduce((sum, s) => sum + s.price, 0)
            }

            // レッスン請求額の総和（実績料 ＋ 追加基本料）
            const totalLessonBilling = lessonBillingTotal + overageBillingTotal
            
            // 月謝会費の決定
            let membershipFee = student.membership_fee
            if (selectedMonth === 'all') {
                membershipFee = student.membership_fee * 12
            } else {
                if (student.status === 'withdrawn' && lessonCount === 0) {
                    membershipFee = 0
                }
            }

            const totalBilling = membershipFee + totalLessonBilling

            // Stripe ID の収集
            const stripeItemIds = [
                ...studentLessons.map(l => l.stripe_invoice_item_id),
                ...studentSchedules.filter(s => s.is_overage && s.is_reported).map(s => s.stripe_invoice_item_id)
            ].filter((id): id is string => !!id)
            
            const uniqueStripeItemIds = Array.from(new Set(stripeItemIds))

            return {
                ...student,
                lessonCount,
                lessonBillingTotal: totalLessonBilling,
                membershipFee,
                totalBilling,
                stripeItemIds: uniqueStripeItemIds,
                isChecked: !!checkedStudents[student.id]
            }
        })
    }, [students, lessons, schedules, selectedMonth, checkedStudents])

    // 検索語および表示対象（実績がある、または月謝会員、または検索ワード一致）で絞り込み
    const filteredSummary = useMemo(() => {
        const query = searchTerm.toLowerCase().trim()
        
        return summaryData.filter(item => {
            // 検索マッチ判定
            const matchesSearch = 
                item.full_name.toLowerCase().includes(query) ||
                item.student_number.includes(query) ||
                (item.membership_name && item.membership_name.toLowerCase().includes(query))

            if (!matchesSearch) return false

            // 実績あり、またはアクティブな月謝会員、または検索ワードが入力されている場合に表示
            const hasActivity = item.lessonCount > 0 || item.membershipFee > 0
            const isActive = item.status === 'active' || item.status === 'trial_confirmed'
            
            // 検索ワードが入っている場合は全て表示、そうでない場合は無稼働の非アクティブ生徒は除外
            if (query.length > 0) return true
            return hasActivity || isActive
        })
    }, [summaryData, searchTerm])

    // CSVダウンロードエクスポート
    const handleExportCSV = () => {
        const headers = ['対象月', '会員番号', '生徒氏名', 'ステータス', '会員プラン', 'レッスン回数', 'レッスン請求額', '月謝会費', '総請求額', 'Stripe請求ID']
        
        const rows = filteredSummary.map(item => [
            selectedMonth === 'all' ? '通年' : `${selectedMonth}月`,
            item.student_number,
            item.full_name,
            item.status === 'active' ? '有効' : item.status === 'withdrawn' ? '退会' : item.status,
            item.membership_name,
            item.lessonCount,
            item.lessonBillingTotal,
            item.membershipFee,
            item.totalBilling,
            item.stripeItemIds.join('; ')
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        // UTF-8 BOM を付加して文字化けを防止
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `${year}年_${selectedMonth === 'all' ? '通年' : `${selectedMonth}月`}_顧客別請求集計.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // チェック状態のサマリー計算
    const progressStats = useMemo(() => {
        const total = filteredSummary.length
        const checked = filteredSummary.filter(item => item.isChecked).length
        return {
            total,
            checked,
            percent: total > 0 ? Math.round((checked / total) * 100) : 0
        }
    }, [filteredSummary])

    return (
        <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300">
            <CardHeader className="border-b border-slate-100 p-6 bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">顧客別レッスン・請求額集計（Stripe照合用）</CardTitle>
                            <p className="text-xs text-slate-500 mt-1">
                                Stripeの売上・請求履歴と照合するための顧客別月次集計表です。
                            </p>
                        </div>
                    </div>
                    <Button 
                        onClick={handleExportCSV}
                        className="h-10 px-4 font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-2 self-start md:self-auto"
                    >
                        <Download className="h-4 w-4" />
                        集計データをCSV出力
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* フィルター・コントローラー */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-none">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        {/* 顧客検索 */}
                        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="名前・かな・会員番号で検索..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-10 bg-white border-slate-200 rounded-lg focus-visible:ring-indigo-500 text-sm"
                            />
                        </div>

                        {/* 月の選択 */}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[120px]"
                            >
                                <option value="all">通年 (合計)</option>
                                {Array.from({ length: 12 }, (_, i) => {
                                    const m = i + 1
                                    return <option key={m} value={m}>{m}月</option>
                                })}
                            </select>
                            <div className="pointer-events-none relative -left-7 flex items-center">
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 照合進捗率 */}
                    {progressStats.total > 0 && (
                        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>Stripe照合進捗:</span>
                            <span className="text-indigo-600">{progressStats.checked} / {progressStats.total} 件</span>
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{progressStats.percent}%</span>
                        </div>
                    )}
                </div>

                {/* 集計テーブル */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                                <TableRow>
                                    <TableHead className="w-12 text-center">照合</TableHead>
                                    <TableHead className="w-24">会員番号</TableHead>
                                    <TableHead className="w-40">生徒氏名</TableHead>
                                    <TableHead className="w-32">プラン</TableHead>
                                    <TableHead className="w-24 text-right">レッスン回数</TableHead>
                                    <TableHead className="w-28 text-right">レッスン請求</TableHead>
                                    <TableHead className="w-28 text-right">月謝会費</TableHead>
                                    <TableHead className="w-28 text-right font-bold text-slate-800">請求総額</TableHead>
                                    <TableHead className="w-44">Stripe請求詳細</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-slate-400 font-medium">
                                            該当するデータが見つかりませんでした。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSummary.map((item) => (
                                        <TableRow 
                                            key={item.id}
                                            className={`transition-colors duration-150 ${
                                                item.isChecked 
                                                    ? 'bg-emerald-50/30 border-emerald-100/70 hover:bg-emerald-50/50' 
                                                    : 'hover:bg-slate-50/30'
                                            }`}
                                        >
                                            <TableCell className="text-center py-3">
                                                <Checkbox
                                                    checked={item.isChecked}
                                                    onCheckedChange={(checked) => handleCheckChange(item.id, checked === true)}
                                                    className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded"
                                                />
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600 py-3">
                                                #{item.student_number || '---'}
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-800 py-3">
                                                {item.full_name}
                                                {item.status === 'withdrawn' && (
                                                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">退会</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 py-3 truncate max-w-[120px]">
                                                {item.membership_name}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-700 py-3">
                                                {item.lessonCount} 回
                                            </TableCell>
                                            <TableCell className="text-right text-slate-600 py-3 font-medium">
                                                ¥{item.lessonBillingTotal.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-slate-600 py-3 font-medium">
                                                ¥{item.membershipFee.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-indigo-700 py-3">
                                                ¥{item.totalBilling.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {item.stripeItemIds.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {item.stripeItemIds.slice(0, 2).map((id) => (
                                                            <span 
                                                                key={id}
                                                                className="inline-block font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[160px] border border-slate-200/50"
                                                                title={id}
                                                            >
                                                                {id}
                                                            </span>
                                                        ))}
                                                        {item.stripeItemIds.length > 2 && (
                                                            <span className="text-[9px] text-slate-400 font-semibold pl-1">
                                                                他 {item.stripeItemIds.length - 2} 件のアイテム
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-medium italic">
                                                        {item.totalBilling === 0 ? '請求なし' : 'Stripe未作成'}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
