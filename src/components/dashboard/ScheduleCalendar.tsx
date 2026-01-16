'use client'

import * as React from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { AddScheduleDialog } from './AddScheduleDialog'
import { EditScheduleDialog } from './EditScheduleDialog'

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    notes?: string
    student?: { full_name: string } // Joined data structure
}

export function ScheduleCalendar() {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
    const [schedules, setSchedules] = React.useState<Schedule[]>([])
    const [loading, setLoading] = React.useState(false)

    // View Mode State
    const [viewMode, setViewMode] = React.useState<'calendar' | 'list'>('calendar')
    const [listSchedules, setListSchedules] = React.useState<Schedule[]>([])

    // Edit Dialog State
    const [selectedSchedule, setSelectedSchedule] = React.useState<Schedule | null>(null)
    const [isEditOpen, setIsEditOpen] = React.useState(false)

    const handleScheduleClick = (schedule: Schedule) => {
        setSelectedSchedule(schedule)
        setIsEditOpen(true)
    }

    // Fetch schedules for the displayed month (Calendar Mode)
    React.useEffect(() => {
        if (viewMode !== 'calendar') return

        const fetchSchedules = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const start = startOfWeek(startOfMonth(currentMonth)).toISOString()
            const end = endOfWeek(endOfMonth(currentMonth)).toISOString()

            const { data } = await supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students ( full_name )
                `)
                .eq('coach_id', user.id)
                .gte('start_time', start)
                .lte('start_time', end)

            if (data) {
                setSchedules(data as any)
            }
            setLoading(false)
        }
        fetchSchedules()
    }, [currentMonth, viewMode])

    // Fetch ALL upcoming schedules (List Mode)
    React.useEffect(() => {
        if (viewMode !== 'list') return

        const fetchListSchedules = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const now = new Date().toISOString()

            const { data } = await supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students ( full_name )
                `)
                .eq('coach_id', user.id)
                .gte('start_time', now)
                .order('start_time', { ascending: true })
                .limit(50) // Reasonable limit

            if (data) {
                setListSchedules(data as any)
            }
            setLoading(false)
        }
        fetchListSchedules()
    }, [viewMode])

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    // Generate calendar grid
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }), // Sunday start
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    })

    const selectedDaySchedules = schedules.filter(s => isSameDay(new Date(s.start_time), selectedDate))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    // Success handler for Add Dialog (refresh data)
    const handleSuccess = () => {
        if (viewMode === 'calendar') {
            setCurrentMonth(new Date(currentMonth))
        } else {
            // Re-trigger list fetch by toggling mode or just forcing update
            // Simple hack: set viewMode to list again (might not trigger effect dep)
            // Better: separate loading trigger or just a boolean `refresh` state
            // For now, toggle temporarily to calendar then back? No that flashes.
            // Just reload page? No.
            // Let's rely on the user navigating or just accept it might not refresh instantly without a trigger.
            // Actually, force a re-fetch manually?
            setViewMode('calendar')
            setTimeout(() => setViewMode('list'), 10)
        }
    }

    const ScheduleCard = ({ schedule }: { schedule: Schedule }) => (
        <Card
            key={schedule.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleScheduleClick(schedule)}
        >
            <CardContent className="p-4 flex gap-4">
                <div className="flex flex-col items-center justify-center min-w-[60px] border-r pr-4">
                    <span className="text-sm font-bold text-gray-900">
                        {/* Different display for List View vs Month View? Month view implies date context. List view needs Date AND Time */}
                        {viewMode === 'list' ? (
                            <>
                                <span className="text-xs text-gray-500">{format(new Date(schedule.start_time), 'M/d')}</span>
                                <span className="text-lg text-blue-600">{format(new Date(schedule.start_time), 'E', { locale: ja })}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-sm font-bold text-gray-900">{format(new Date(schedule.start_time), 'HH:mm')}</span>
                                <span className="text-xs text-gray-500">{format(new Date(schedule.end_time), 'HH:mm')}</span>
                            </>
                        )}
                    </span>
                    {viewMode === 'list' && (
                        <span className="text-xs text-gray-500 mt-1">
                            {format(new Date(schedule.start_time), 'HH:mm')}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold truncate">{schedule.title}</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        {schedule.location && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {schedule.location}
                            </div>
                        )}
                        {(schedule as any).students?.full_name && (
                            <div className="flex items-center gap-1.5 text-blue-600">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                {(schedule as any).students.full_name}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                {/* View Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            viewMode === 'calendar' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        カレンダー
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        リスト (今後)
                    </button>
                </div>
                <AddScheduleDialog onSuccess={handleSuccess} />
            </div>

            {viewMode === 'calendar' ? (
                <>
                    <div className="flex flex-col space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                            </h2>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" onClick={prevMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={nextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border">
                            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                                <div key={day} className={cn(
                                    "bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500",
                                    i === 0 && "text-red-500",
                                    i === 6 && "text-blue-500"
                                )}>
                                    {day}
                                </div>
                            ))}
                            {days.map((day, dayIdx) => {
                                const isSelected = isSameDay(day, selectedDate)
                                const isCurrentMonth = isSameMonth(day, currentMonth)

                                return (
                                    <button
                                        key={day.toString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={cn(
                                            "relative bg-white min-h-[60px] p-1 flex flex-col items-center justify-start hover:bg-gray-50 transition-colors",
                                            !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                                            isSelected && "ring-2 ring-inset ring-blue-500 z-10"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm w-7 h-7 flex items-center justify-center rounded-full",
                                            isSameDay(day, new Date()) && "bg-blue-600 text-white font-bold",
                                            !isSameDay(day, new Date()) && isSelected && "bg-blue-100 text-blue-700 font-bold"
                                        )}>
                                            {format(day, 'd')}
                                        </span>

                                        <div className="mt-1 flex flex-wrap gap-0.5 justify-center">
                                            {/* Dots for events */}
                                            {schedules.filter(s => isSameDay(new Date(s.start_time), day)).map((s, i) => (
                                                <div key={s.id} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            ))}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Selected Date Details */}
                    <div className="space-y-4">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-2">
                            {format(selectedDate, 'M月d日 (E)', { locale: ja })} の予定
                            <Badge variant="secondary">{selectedDaySchedules.length}件</Badge>
                        </h3>

                        <div className="space-y-3">
                            {selectedDaySchedules.length > 0 ? (
                                selectedDaySchedules.map(schedule => (
                                    <ScheduleCard key={schedule.id} schedule={schedule} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                    予定はありません
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* List View */
                <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2 border-b pb-2">
                        今後の予定 (直近順)
                        <Badge variant="secondary">{listSchedules.length}件</Badge>
                    </h3>

                    <div className="space-y-3">
                        {listSchedules.length > 0 ? (
                            listSchedules.map(schedule => (
                                <ScheduleCard key={schedule.id} schedule={schedule} />
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                今後の予定はありません
                            </div>
                        )}
                    </div>
                </div>
            )}

            <EditScheduleDialog
                schedule={selectedSchedule}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
