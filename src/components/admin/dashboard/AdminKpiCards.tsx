import React from 'react'
import Link from 'next/link'
import { Users, CalendarCheck, UserCheck, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AdminKpiCardsProps {
    totalStudents: number
    todayLessonsCount: number
    activeCoachesCount: number
    totalCoachesCount?: number
    totalSales: number
    grossProfit?: number
    uncollectedAmount?: number
    uncollectedCount?: number
    diffSales?: number
    diffGrossProfit?: number
    targetMonth?: string
}

/**
 * 管理者ダッシュボード SchoolHub 4大KPI統計カード
 * 在籍生徒数、本日のレッスン数、稼働コーチ数、今月売上・未回収
 */
export function AdminKpiCards({
    totalStudents,
    todayLessonsCount,
    activeCoachesCount,
    totalCoachesCount,
    totalSales,
    grossProfit,
    uncollectedAmount = 0,
    uncollectedCount = 0,
    diffSales = 0,
    diffGrossProfit = 0,
    targetMonth,
}: AdminKpiCardsProps) {
    return (
        <section aria-label="4大KPI統計" className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* 1. 在籍生徒数カード */}
                <Link href="/customers" className="block group">
                    <div className="h-full bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-sky-200 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100/80 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                                    <Users className="w-6 h-6" />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full ring-1 ring-sky-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                    受講中
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                在籍生徒数
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                                    {totalStudents.toLocaleString()}
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-slate-500">名</span>
                            </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>会員カルテ管理</span>
                            <span className="text-sky-600 font-bold group-hover:translate-x-0.5 transition-transform">
                                一覧へ ➔
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 2. 本日のレッスン数カード */}
                <div className="h-full bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/80 flex items-center justify-center">
                                <CalendarCheck className="w-6 h-6" />
                            </div>
                            <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-100">
                                本日稼働
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            本日のレッスン数
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                                {todayLessonsCount.toLocaleString()}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-500">件</span>
                        </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>タイムライン連動</span>
                        <span className="text-emerald-600 font-bold">当日スケジュール</span>
                    </div>
                </div>

                {/* 3. 稼働コーチ数カード */}
                <Link href="/admin/coaches" className="block group">
                    <div className="h-full bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/80 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full ring-1 ring-indigo-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Active
                                </span>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                稼働コーチ数
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                                    {activeCoachesCount.toLocaleString()}
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-slate-500">
                                    {totalCoachesCount ? `/ ${totalCoachesCount} 名` : '名'}
                                </span>
                            </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>コーチシフト管理</span>
                            <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                                詳細 ➔
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 4. 今月売上・未回収カード */}
                <Link href="/admin/analytics" className="block group">
                    <div className="h-full bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-amber-200 transition-all duration-300 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100/80 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                {diffSales !== undefined && (
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full",
                                            diffSales >= 0
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                                        )}
                                    >
                                        {diffSales >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {diffSales >= 0 ? '+' : ''}{diffSales.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                今月売上・未回収 {targetMonth && `(${targetMonth})`}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                                    ¥{totalSales.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                            {grossProfit !== undefined && (
                                <div className="flex items-center justify-between text-slate-500">
                                    <span>粗利額</span>
                                    <span className="font-bold text-slate-700">¥{grossProfit.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">未回収額</span>
                                <span className={cn(
                                    "font-bold",
                                    uncollectedAmount > 0 ? "text-amber-600" : "text-slate-500"
                                )}>
                                    ¥{uncollectedAmount.toLocaleString()}
                                    {uncollectedCount > 0 && ` (${uncollectedCount}件)`}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </section>
    )
}
