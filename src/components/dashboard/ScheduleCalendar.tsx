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
import { ChevronLeft, ChevronRight, MapPin, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { AddScheduleDialog } from './AddScheduleDialog'
import { EditScheduleDialog } from './EditScheduleDialog'
import { formatStudentNames } from '@/lib/utils'


import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    notes?: string
    student?: { full_name: string, second_student_name?: string | null } // Joined data structure
    coach_id: string
    profiles?: { full_name: string, avatar_url: string } // Joined Coach data
}

interface ScheduleCalendarProps {
    adminView?: boolean
}

export function ScheduleCalendar({ adminView = false }: ScheduleCalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
    const [schedules, setSchedules] = React.useState<Schedule[]>([])
    const [loading, setLoading] = React.useState(false)

    // Admin Filter State
    const [selectedCoachFilter, setSelectedCoachFilter] = React.useState<string>('all')
    const [coaches, setCoaches] = React.useState<{ id: string, full_name: string }[]>([])

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

    // Fetch Coaches (Admin Only)
    React.useEffect(() => {
        if (!adminView) return
        const fetchCoaches = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'coach') // or all?
            if (data) setCoaches(data)
        }
        fetchCoaches()
    }, [adminView])

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

            let query = supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students ( full_name, second_student_name ),
                    profiles ( full_name, avatar_url )
                `)
                .gte('start_time', start)
                .lte('start_time', end)

            // Apply Filters
            if (adminView) {
                // Admin Mode
                if (selectedCoachFilter !== 'all') {
                    query = query.eq('coach_id', selectedCoachFilter)
                }
            } else {
                // Coach Mode (Restrict to self)
                query = query.eq('coach_id', user.id)
            }

            const { data } = await query

            if (data) {
                setSchedules(data as any)
            }
            setLoading(false)
        }
        fetchSchedules()
    }, [currentMonth, viewMode, adminView, selectedCoachFilter])

    // Fetch ALL upcoming schedules (List Mode)
    React.useEffect(() => {
        if (viewMode !== 'list') return

        const fetchListSchedules = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const now = new Date().toISOString()

            let query = supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students ( full_name, second_student_name ),
                    profiles ( full_name, avatar_url )
                `)
                .gte('start_time', now)
                .order('start_time', { ascending: true })
                .limit(50)

            // Apply Filters
            if (adminView) {
                // Admin Mode
                if (selectedCoachFilter !== 'all') {
                    query = query.eq('coach_id', selectedCoachFilter)
                }
            } else {
                // Coach Mode (Restrict to self)
                query = query.eq('coach_id', user.id)
            }

            const { data } = await query

            if (data) {
                setListSchedules(data as any)
            }
            setLoading(false)
        }
        fetchListSchedules()
    }, [viewMode, adminView, selectedCoachFilter])

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    // Generate calendar grid
    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }), // Sunday start
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    })

    const selectedDaySchedules = schedules.filter(s => isSameDay(new Date(s.start_time), selectedDate))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    // Add Dialog State
    const [isAddOpen, setIsAddOpen] = React.useState(false)
    const [addDialogDate, setAddDialogDate] = React.useState<Date | undefined>(new Date())

    const handleDateDoubleClick = (date: Date) => {
        setAddDialogDate(date)
        setIsAddOpen(true)
    }

    // Success handler for Add Dialog (refresh data)
    const handleSuccess = () => {
        setIsAddOpen(false)
        if (viewMode === 'calendar') {
            // Force refresh by toggling something or just re-running effect?
            // Simplest is to just re-set current Month date object to trigger effect
            setCurrentMonth(new Date(currentMonth))
        } else {
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
                                {formatStudentNames((schedule as any).students)}
                            </div>
                        )}
                        {/* Admin View: Show Coach Name */}
                        {adminView && (schedule as any).profiles?.full_name && (
                            <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                <span className="font-bold">担当:</span> {(schedule as any).profiles.full_name}
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
                    {/* ... (existing toggle buttons) ... */}
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

                {/* Admin: Coach Filter */}
                {adminView && (
                    <div className="w-[200px]">
                        <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="コーチ絞り込み" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全員を表示</SelectItem>
                                {coaches.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}


                {/* Manual Add Button */}
                <Button onClick={() => {
                    setAddDialogDate(new Date())
                    setIsAddOpen(true)
                }}>
                    <Clock className="mr-2 h-4 w-4" />
                    予定を追加
                </Button>
            </div>

            {viewMode === 'calendar' ? (
                <>
                    <div className="flex flex-col space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                            </h2>
                            {/* ... */}
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
                                        onDoubleClick={() => handleDateDoubleClick(day)}
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
                                                <div key={s.id} className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    // If adminView active, maybe color code? For now just blue default.
                                                    "bg-blue-400"
                                                )} />
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
                            <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => handleDateDoubleClick(selectedDate)}>
                                <Plus className="w-4 h-4 mr-1" />
                                追加
                            </Button>
                        </h3>

                        <div className="space-y-3">
                            {selectedDaySchedules.length > 0 ? (
                                selectedDaySchedules.map(schedule => (
                                    <ScheduleCard key={schedule.id} schedule={schedule} />
                                ))
                            ) : (
                                <div
                                    className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleDateDoubleClick(selectedDate)}
                                >
                                    予定はありません<br />
                                    <span className="text-xs text-blue-500 block mt-1">ダブルクリックまたはここをクリックして追加</span>
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

            <AddScheduleDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                onSuccess={handleSuccess}
                initialDate={addDialogDate}
            />

            <EditScheduleDialog
                schedule={selectedSchedule}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={handleSuccess}
            />
        </div>
    )
}
