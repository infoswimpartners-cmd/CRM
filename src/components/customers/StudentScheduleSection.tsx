'use client'

import { format, isPast, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, Clock, MapPin, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location: string | null
    status: string
    notes: string | null
    coach_full_name?: string
}

interface StudentScheduleSectionProps {
    schedules: Schedule[]
}

// ステータスの表示定義
const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    pending: {
        label: '確認待ち',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: AlertCircle,
    },
    booked: {
        label: '確定済み',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
    },
    cancelled: {
        label: 'キャンセル',
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: XCircle,
    },
}

export function StudentScheduleSection({ schedules }: StudentScheduleSectionProps) {
    if (!schedules || schedules.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                <Calendar className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium">登録された予定はありません</p>
                <p className="text-xs text-slate-400 mt-1">スケジュールが追加されるとここに表示されます</p>
            </div>
        )
    }

    // 過去・今後に分類してソート
    const now = new Date()
    const upcoming = schedules.filter(s => !isPast(new Date(s.end_time)) && s.status !== 'cancelled')
    const past = schedules.filter(s => isPast(new Date(s.end_time)) || s.status === 'cancelled')

    return (
        <div className="space-y-6">
            {/* 今後の予定 */}
            {upcoming.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        今後の予定
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                            {upcoming.length}件
                        </span>
                    </h4>
                    <div className="space-y-3">
                        {upcoming.map(schedule => (
                            <ScheduleCard key={schedule.id} schedule={schedule} isUpcoming />
                        ))}
                    </div>
                </div>
            )}

            {/* 過去の予定 */}
            {past.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                        過去の予定
                        <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                            {past.length}件
                        </span>
                    </h4>
                    <div className="space-y-2">
                        {past.slice(0, 5).map(schedule => (
                            <ScheduleCard key={schedule.id} schedule={schedule} isUpcoming={false} />
                        ))}
                        {past.length > 5 && (
                            <p className="text-xs text-slate-400 text-center pt-1">
                                他 {past.length - 5} 件の過去の予定
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function ScheduleCard({ schedule, isUpcoming }: { schedule: Schedule; isUpcoming: boolean }) {
    const startDate = new Date(schedule.start_time)
    const endDate = new Date(schedule.end_time)
    const config = statusConfig[schedule.status] || statusConfig.pending
    const StatusIcon = config.icon
    const todayHighlight = isToday(startDate)

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                isUpcoming
                    ? todayHighlight
                        ? "bg-cyan-50 border-cyan-200 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    : "bg-slate-50/50 border-slate-100 opacity-75"
            )}
        >
            {/* 日付エリア */}
            <div className={cn(
                "flex flex-col items-center justify-center rounded-lg px-2 py-1.5 min-w-[48px] text-center",
                isUpcoming
                    ? todayHighlight
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-600"
            )}>
                <span className="text-[10px] font-medium leading-none">
                    {format(startDate, 'M月', { locale: ja })}
                </span>
                <span className="text-xl font-bold leading-tight">
                    {format(startDate, 'd', { locale: ja })}
                </span>
                <span className="text-[10px] leading-none opacity-80">
                    {format(startDate, '(E)', { locale: ja })}
                </span>
            </div>

            {/* 詳細エリア */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-sm text-slate-800 truncate">{schedule.title}</p>
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0.5 shrink-0 flex items-center gap-0.5", config.className)}
                    >
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                    </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {format(startDate, 'HH:mm', { locale: ja })}〜{format(endDate, 'HH:mm', { locale: ja })}
                    </span>
                    {schedule.location && (
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {schedule.location}
                        </span>
                    )}
                    {schedule.coach_full_name && (
                        <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            {schedule.coach_full_name}
                        </span>
                    )}
                </div>
                {schedule.notes && (
                    <p className="text-xs text-slate-500 mt-1.5 truncate italic">
                        {schedule.notes}
                    </p>
                )}
            </div>
        </div>
    )
}
