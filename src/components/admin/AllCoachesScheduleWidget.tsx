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
    hideCard?: boolean
}

export function AllCoachesScheduleWidget({ schedules: initialSchedules, title = '全コーチの今後の予定', hideCard = false }: AllCoachesScheduleWidgetProps) {
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

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        if (hideCard) return <div className="flex flex-col h-full">{children}</div>
        return (
            <Card className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 ring-1 ring-slate-200/50 flex flex-col overflow-hidden">
                {children}
            </Card>
        )
    }

    return (
        <>
            <Wrapper>
                {!hideCard && (
                    <CardHeader className="pb-3 border-b border-slate-100 px-6">
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="flex items-center gap-2 text-slate-900 text-lg whitespace-nowrap min-w-0">
                                <CalendarIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                                <span className="truncate">{title}</span>
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs shrink-0" asChild>
                                <Link href="/coach/schedule">
                                    <Plus className="h-4 w-4" />
                                    追加
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                )}
                <CardContent className={`flex flex-col ${hideCard ? 'p-0' : 'p-6'}`}>
                    {schedules.length > 0 ? (
                        <div className="space-y-4">
                            {schedules.slice(0, 5).map((schedule) => (
                                <div key={schedule.id} className="group relative flex items-center gap-4 p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all duration-300">
                                    {/* Date Column */}
                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors shrink-0">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                            {format(new Date(schedule.start_time), 'MMM', { locale: ja })}
                                        </span>
                                        <span className="text-base font-black text-slate-900 leading-none mt-0.5">
                                            {format(new Date(schedule.start_time), 'd')}
                                        </span>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Avatar className="h-4 w-4 ring-1 ring-slate-200">
                                                <AvatarImage src={schedule.coach.avatar_url || undefined} />
                                                <AvatarFallback className="text-[8px] bg-slate-100 text-slate-400">{schedule.coach.full_name[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] text-slate-400 font-bold truncate">{schedule.coach.full_name}</span>
                                        </div>

                                        <h4 className="font-bold text-slate-800 truncate text-sm leading-tight text-left">
                                            {schedule.student_id ? (
                                                <button
                                                    onClick={() => handleStudentClick(schedule.student_id!, schedule.student_name!)}
                                                    className="hover:text-blue-600 transition-colors"
                                                >
                                                    {schedule.student_name}
                                                </button>
                                            ) : (
                                                schedule.student_name || schedule.title
                                            )}
                                        </h4>

                                        <div className="flex flex-wrap items-center gap-x-3 mt-1 text-[10px] text-slate-400 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(schedule.start_time), 'HH:mm')} - {format(new Date(schedule.end_time), 'HH:mm')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-slate-300 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                        onClick={() => handleEditClick(schedule)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 py-12 gap-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                <CalendarIcon className="h-6 w-6 text-slate-200" />
                            </div>
                            <p className="font-medium">今後の予定はありません</p>
                        </div>
                    )}
                </CardContent>
            </Wrapper>

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
