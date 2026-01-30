'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarIcon, Clock, User, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useState } from 'react'
import { StudentMemosModal } from '@/components/admin/StudentMemosModal'
import { Button } from '@/components/ui/button'

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
}

interface AllCoachesScheduleWidgetProps {
    schedules: Schedule[]
    title?: string
}

export function AllCoachesScheduleWidget({ schedules, title = '全コーチの今後の予定' }: AllCoachesScheduleWidgetProps) {
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleStudentClick = (studentId: string, studentName: string) => {
        setSelectedStudentId(studentId)
        setSelectedStudentName(studentName)
        setIsModalOpen(true)
    }

    return (
        <>
            <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                            <CalendarIcon className="h-5 w-5 text-indigo-600" />
                            {title}
                        </CardTitle>
                        <Button variant="outline" size="sm" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50" asChild>
                            <Link href="/coach/schedule">
                                <Plus className="h-4 w-4" />
                                予定を追加
                            </Link>
                        </Button>
                    </div>
                    <CardDescription className="text-slate-500">直近 {schedules.length} 件のレッスン</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
                    {schedules.length > 0 ? (
                        <div className="space-y-3">
                            {schedules.map((schedule) => (
                                <div key={schedule.id} className="group relative flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-indigo-200 transition-all duration-300">
                                    {/* Time Column */}
                                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-200 shadow-sm shrink-0">
                                        <span className="text-xs font-bold text-indigo-600 uppercase">
                                            {format(new Date(schedule.start_time), 'MMM', { locale: ja })}
                                        </span>
                                        <span className="text-lg font-bold text-slate-900 leading-none mt-0.5">
                                            {format(new Date(schedule.start_time), 'd')}
                                        </span>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-[10px] h-5 bg-white border-slate-200 text-slate-600 flex items-center gap-1 pl-1 pr-2">
                                                <Avatar className="h-3 w-3">
                                                    <AvatarImage src={schedule.coach.avatar_url || undefined} />
                                                    <AvatarFallback className="text-[8px]">{schedule.coach.full_name[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[80px]">{schedule.coach.full_name}</span>
                                            </Badge>
                                        </div>

                                        <h4 className="font-medium text-slate-900 truncate text-sm">
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

                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 w-full">
                                            <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                {format(new Date(schedule.start_time), 'HH:mm')} - {format(new Date(schedule.end_time), 'HH:mm')}
                                            </div>
                                            {schedule.location && (
                                                <div className="flex items-center gap-1 min-w-0 overflow-hidden flex-1">
                                                    <span className="text-slate-300 shrink-0">|</span>
                                                    <span className="truncate" title={schedule.location}>
                                                        {schedule.location}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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

            <StudentMemosModal
                studentId={selectedStudentId}
                studentName={selectedStudentName}
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    )
}
