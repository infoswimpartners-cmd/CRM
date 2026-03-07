import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarIcon, Clock, User, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ScheduleDetailModal } from '@/components/dashboard/ScheduleDetailModal'
import { Button } from '@/components/ui/button'
import { EditScheduleDialog } from '@/components/dashboard/EditScheduleDialog'
import { Edit2 } from 'lucide-react'

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    student_name?: string
    student_id?: string
    coach: {
        full_name: string
        avatar_url?: string | null
    }
    notes?: string
    status?: string
    coach_id?: string
}

interface AllCoachesScheduleWidgetProps {
    schedules: Schedule[]
    title?: string
}

export function AllCoachesScheduleWidget({ schedules: initialSchedules, title = '全コーチの今後の予定' }: AllCoachesScheduleWidgetProps) {
    const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules)
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Edit Dialog State
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        const fetchSchedules = async () => {
            const { data, error } = await supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students ( id, full_name ),
                    profiles ( full_name, avatar_url )
                `)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(20)

            if (error) {
                console.error('Error fetching schedules:', error)
                return
            }

            if (data) {
                const formatted = data.map((s: any) => {
                    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
                    const student = Array.isArray(s.students) ? s.students[0] : s.students
                    return {
                        ...s,
                        coach: profile || { full_name: '不明' },
                        student_name: student?.full_name,
                        student_id: student?.id
                    }
                })
                setSchedules(formatted)
            }
        }

        // Initial fetch
        fetchSchedules()

        // Realtime subscription
        const channel = supabase
            .channel('public:lesson_schedules')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lesson_schedules' },
                () => {
                    fetchSchedules()
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to lesson_schedules changes')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const handleStudentClick = (studentId: string, studentName: string) => {
        setSelectedStudentId(studentId)
        setSelectedStudentName(studentName)
        setIsModalOpen(true)
    }

    const handleEditClick = (schedule: Schedule) => {
        // Map data to match EditScheduleDialog's expectation if needed
        setSelectedSchedule({
            ...schedule,
            student_id: schedule.student_id
        })
        setIsEditOpen(true)
    }

    return (
        <>
            <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 px-4 sm:px-6">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-slate-900 text-base sm:text-lg whitespace-nowrap min-w-0">
                            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 shrink-0" />
                            <span className="truncate">{title}</span>
                            <span className="text-xs font-normal text-slate-400 ml-1">
                                {schedules.length > 0 ? `${Math.min(schedules.length, 3)}件` : ''}
                            </span>
                        </CardTitle>
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs shrink-0" asChild>
                            <Link href="/coach/schedule">
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                追加
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col p-3 sm:p-4">
                    {schedules.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                            {schedules.slice(0, 3).map((schedule) => (
                                <div key={schedule.id} className="group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-indigo-200 transition-all duration-300">
                                    {/* Date Column */}
                                    <div className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-200 shadow-sm shrink-0">
                                        <span className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase">
                                            {format(new Date(schedule.start_time), 'MMM', { locale: ja })}
                                        </span>
                                        <span className="text-base sm:text-lg font-bold text-slate-900 leading-none mt-0.5">
                                            {format(new Date(schedule.start_time), 'd')}
                                        </span>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Avatar className="h-4 w-4 shrink-0">
                                                <AvatarImage src={schedule.coach.avatar_url || undefined} />
                                                <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-600">{schedule.coach.full_name[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[80px] sm:max-w-none">{schedule.coach.full_name}</span>
                                        </div>

                                        <h4 className="font-semibold text-slate-900 truncate text-sm">
                                            {schedule.student_id ? (
                                                <button
                                                    onClick={() => handleStudentClick(schedule.student_id!, schedule.student_name!)}
                                                    className="hover:text-indigo-600 hover:underline transition-colors text-left"
                                                >
                                                    {schedule.student_name}
                                                </button>
                                            ) : (
                                                schedule.student_name || schedule.title
                                            )}
                                        </h4>

                                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-3 mt-0.5 text-[10px] sm:text-xs text-slate-500">
                                            <div className="flex items-center gap-1 whitespace-nowrap">
                                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                                {format(new Date(schedule.start_time), 'HH:mm')} - {format(new Date(schedule.end_time), 'HH:mm')}
                                            </div>
                                            {schedule.location && (
                                                <span className="truncate text-slate-400" title={schedule.location}>
                                                    {schedule.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleEditClick(schedule)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-500 py-8 gap-2">
                            <CalendarIcon className="h-8 w-8 text-slate-300 mb-2 opacity-50" />
                            今後の予定はありません
                        </div>
                    )}
                </CardContent>
            </Card>

            <ScheduleDetailModal
                studentId={selectedStudentId}
                studentName={selectedStudentName || ''}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <EditScheduleDialog
                schedule={selectedSchedule}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
        </>
    )
}
