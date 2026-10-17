'use client'

import React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Clock, MapPin, User, Calendar, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface TodayScheduleItem {
    id: string
    title?: string
    start_time: string
    end_time: string
    location?: string
    student_name?: string
    student_id?: string
    student_number?: string
    coach: {
        id?: string
        full_name: string
        avatar_url?: string | null
    }
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string
}

export interface TodayScheduleTimelineProps {
    schedules?: TodayScheduleItem[] | null
    dateStr?: string
    hideEmptyState?: boolean
}

/**
 * 本日のレッスンスケジュール時系列タイムライン
 * 本日のレッスンを時系列で俯瞰・把握し、詳細確認やカルテへの導線を提供
 */
export function TodayScheduleTimeline({
    schedules,
    dateStr,
    hideEmptyState = false,
}: TodayScheduleTimelineProps) {
    // 防御的コーディング: null / undefinedの場合は空配列にフォールバック
    const safeSchedules: TodayScheduleItem[] = Array.isArray(schedules) ? schedules : []

    // 開始時刻で昇順ソート
    const sortedSchedules = [...safeSchedules].sort((a, b) => {
        const timeA = new Date(a.start_time).getTime()
        const timeB = new Date(b.start_time).getTime()
        return timeA - timeB
    })

    const formatTimeRange = (start: string, end: string) => {
        try {
            const startDate = typeof start === 'string' ? parseISO(start) : new Date(start)
            const endDate = typeof end === 'string' ? parseISO(end) : new Date(end)
            return `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
        } catch {
            return '時間未定'
        }
    }

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        報告済
                    </Badge>
                )
            case 'in_progress':
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
                        実施中
                    </Badge>
                )
            case 'cancelled':
                return (
                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-bold px-2 py-0.5">
                        中止
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold px-2 py-0.5">
                        予定
                    </Badge>
                )
        }
    }

    return (
        <div className="bg-white rounded-3xl p-5 md:p-7 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                            本日のレッスンスケジュール
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {dateStr || format(new Date(), 'yyyy年M月d日(E)', { locale: ja })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        本日 {sortedSchedules.length} 件
                    </span>
                    <Link
                        href="/coach/schedule"
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline hidden sm:inline-flex items-center"
                    >
                        全体スケジュール ➔
                    </Link>
                </div>
            </div>

            {/* タイムラインコンテンツ */}
            {sortedSchedules.length === 0 ? (
                !hideEmptyState && (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700">本日の予定はありません</p>
                            <p className="text-xs text-slate-400 mt-1">
                                スケジュール追加は「全体スケジュール」またはクイックアクションから行えます。
                            </p>
                        </div>
                        <Link
                            href="/coach/schedule"
                            className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-lg transition-colors"
                        >
                            スケジュールを確認・追加する
                        </Link>
                    </div>
                )
            ) : (
                <div className="mt-4 max-h-[460px] overflow-y-auto pr-1 space-y-3 divide-y divide-slate-100/80">
                    {sortedSchedules.map((item, index) => {
                        const studentTargetHref = item.student_id ? `/customers/${item.student_id}` : '#'
                        return (
                            <div
                                key={item.id || index}
                                className="pt-3 first:pt-0 group hover:bg-slate-50/70 p-3 rounded-2xl transition-all border border-transparent hover:border-slate-200/60"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    {/* 左側: 時間帯 ＆ 生徒情報 */}
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <div className="shrink-0 text-center bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                                            <span className="text-xs font-black text-slate-800 font-mono tracking-tight block">
                                                {formatTimeRange(item.start_time, item.end_time)}
                                            </span>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    href={studentTargetHref}
                                                    className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                                                >
                                                    {item.student_name || '生徒未指定'}
                                                </Link>
                                                {item.student_number && (
                                                    <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                                                        #{item.student_number}
                                                    </span>
                                                )}
                                                {getStatusBadge(item.status)}
                                            </div>

                                            {item.location && (
                                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 font-medium truncate">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                    <span className="truncate">{item.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 右側: 担当コーチ情報 ＆ アクション */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100/60">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6 border border-slate-200">
                                                <AvatarImage src={item.coach.avatar_url || ''} />
                                                <AvatarFallback className="text-[10px] bg-slate-100 font-bold text-slate-600">
                                                    {item.coach.full_name?.slice(0, 1) || 'C'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-semibold text-slate-600 truncate max-w-[100px]">
                                                {item.coach.full_name}
                                            </span>
                                        </div>

                                        <Link
                                            href={studentTargetHref}
                                            className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                                            title="カルテ詳細"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
