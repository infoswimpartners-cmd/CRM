'use client'

import { useState } from 'react'
import { Calendar, Ticket, ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { checkStudentLessonStatus } from '@/actions/lesson_schedule'
import { format, addMonths, subMonths, isSameMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

interface UsageStatusCardProps {
    studentId: string
    initialUsageData: any
    currentTickets: number
}

export function UsageStatusCard({ studentId, initialUsageData, currentTickets }: UsageStatusCardProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [usageData, setUsageData] = useState(initialUsageData)
    const [loading, setLoading] = useState(false)

    const fetchStatus = async (date: Date) => {
        setLoading(true)
        try {
            const res = await checkStudentLessonStatus(studentId, date.toISOString())
            if (res.success) {
                setUsageData(res)
            }
        } catch (error) {
            console.error('Failed to fetch usage status:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => {
        const nextDate = subMonths(currentDate, 1)
        setCurrentDate(nextDate)
        fetchStatus(nextDate)
    }

    const handleNextMonth = () => {
        const nextDate = addMonths(currentDate, 1)
        setCurrentDate(nextDate)
        fetchStatus(nextDate)
    }

    const handleResetMonth = () => {
        const now = new Date()
        if (isSameMonth(currentDate, now)) return
        setCurrentDate(now)
        fetchStatus(now)
    }

    const isCurrentMonth = isSameMonth(currentDate, new Date())

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-100/50 rounded-lg">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-slate-700">
                        {format(currentDate, 'yyyy年 MM月', { locale: ja })}
                    </span>
                    {!isCurrentMonth && (
                        <button
                            onClick={handleResetMonth}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                            <RefreshCcw className="h-2.5 w-2.5" /> 今月に戻る
                        </button>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {usageData && !usageData.isPackage && (
                <div className={cn("space-y-2 transition-opacity", loading ? "opacity-50" : "opacity-100")}>
                    <div className="flex flex-col p-3 rounded-lg border border-indigo-100 bg-indigo-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-indigo-800 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {format(currentDate, 'M月')}の予約枠状況
                            </span>
                            {usageData.isOverage && (
                                <Badge variant="destructive" className="text-[10px] h-4">上限超過</Badge>
                            )}
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="text-2xl font-black text-indigo-900 leading-none">
                                {usageData.count ?? 0} <span className="text-sm font-bold">/ {usageData.limit || '∞'} 回</span>
                            </div>
                            <div className="text-[10px] text-indigo-600 font-medium text-right">
                                {usageData.baseLimit && usageData.baseLimit > 0 ? (
                                    <>
                                        基本: {usageData.baseLimit}回<br />
                                        繰越: {usageData.rollover}回
                                    </>
                                ) : (
                                    "単発・体験利用"
                                )}
                            </div>
                        </div>

                        {typeof usageData.limit === 'number' && usageData.limit > 0 && (
                            <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-3 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        (usageData.count ?? 0) >= usageData.limit ? "bg-orange-500" : "bg-indigo-600"
                                    )}
                                    style={{ width: `${Math.min(100, ((usageData.count ?? 0) / usageData.limit) * 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transfer Ticket (振替) - 月を切り替えても共通（現在の残り） */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-700">
                        <Ticket className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-emerald-800">振替残数</div>
                        <div className="text-[10px] text-emerald-600">現在保持している未消化分</div>
                    </div>
                </div>
                <div className="text-xl font-black text-emerald-900">
                    {currentTickets} <span className="text-xs font-bold text-emerald-700">枚</span>
                </div>
            </div>
        </div>
    )
}
