'use client'

import { useState } from 'react'
// Card コンポーネントは使用しない（div ベースのレイアウトに変更済み）
import { Calendar, MapPin, Edit } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ScheduleDetailModal } from './ScheduleDetailModal'
import { Badge } from "@/components/ui/badge"

interface Schedule {
    id: string
    start_time: string
    end_time: string
    location: string
    lesson_master_id: string
    students: {
        id: string
        full_name: string
    } | {
        id: string
        full_name: string
    }[]
}

export function TodayScheduleList({ schedules }: { schedules: Schedule[] }) {
    const [selectedStudent, setSelectedStudent] = useState<{ id: string, name: string } | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleStudentClick = (studentId: string, studentName: string) => {
        if (!studentId) return
        setSelectedStudent({ id: studentId, name: studentName })
        setIsModalOpen(true)
    }

    if (!schedules || schedules.length === 0) {
        return (
            <div className="flex items-center justify-center bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg rounded-2xl px-8 py-10 overflow-hidden relative border border-cyan-500/30">
                <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex flex-col items-center text-center gap-5 relative z-10 w-full">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                        <Calendar className="h-8 w-8 text-cyan-50" />
                    </div>
                    <div className="space-y-1.5">
                        <p className="font-bold text-white text-lg tracking-wide">本日の予定はありません</p>
                        <p className="text-sm text-cyan-100 font-medium">明日の予定を確認するか、新しい予定を登録してください</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="shadow-xl bg-white rounded-2xl overflow-hidden ring-1 ring-cyan-100/50 flex flex-col">
                <div className="bg-gradient-to-br from-cyan-600 to-blue-700 py-6 px-6 sm:px-8 relative overflow-hidden flex items-center justify-between">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-300/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <h3 className="text-xl font-bold flex items-center gap-3 text-white relative z-10 m-0">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md border border-white/10">
                            <Calendar className="h-5 w-5 text-cyan-50" />
                        </div>
                        本日のスケジュール
                    </h3>
                    <span className="text-xs font-semibold text-cyan-50 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 tracking-wide relative z-10 shrink-0">
                        {format(new Date(), 'MM/dd (E)', { locale: ja })}
                    </span>
                </div>
                <div className="bg-slate-50/50">
                    <div className="divide-y divide-slate-100/80">
                        {schedules.map((schedule) => {
                            const startTime = new Date(schedule.start_time)
                            const endTime = new Date(schedule.end_time)
                            const students: any = schedule.students
                            const student = Array.isArray(students) ? students[0] : students
                            const studentName = student?.full_name
                            const studentId = student?.id

                            return (
                                <div key={schedule.id} className="p-5 sm:p-6 lg:py-7 lg:px-8 group hover:bg-white transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden border-b border-slate-100/80 last:border-0">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />

                                    <div
                                        className="flex items-start sm:items-center gap-4 sm:gap-6 flex-1 cursor-pointer min-w-0"
                                        onClick={() => handleStudentClick(studentId, studentName)}
                                    >
                                        <div className="bg-white group-hover:bg-cyan-50/80 group-hover:border-cyan-200 text-slate-700 font-mono px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl text-center min-w-[90px] sm:min-w-[120px] border border-cyan-100 shadow-sm transition-all duration-300 shrink-0">
                                            <div className="font-bold text-lg sm:text-xl text-slate-900 group-hover:text-cyan-700 transition-colors tracking-tight">{format(startTime, 'HH:mm')}</div>
                                            <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 font-medium">↓ {format(endTime, 'HH:mm')}</div>
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-1 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <h4 className="font-bold text-slate-800 text-base sm:text-xl group-hover:text-cyan-600 transition-colors truncate">
                                                    {studentName || '生徒未設定'}
                                                </h4>
                                                {studentId && (
                                                    <Badge variant="secondary" className="text-[10px] sm:text-[11px] h-5 sm:h-6 bg-cyan-50 text-cyan-700 font-bold border-none group-hover:bg-cyan-100 transition-colors px-2 sm:px-3 rounded-full shrink-0">
                                                        カルテを確認する
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-4 pt-0.5 sm:pt-1 text-xs sm:text-sm text-slate-500">
                                                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-slate-100 shadow-sm transition-colors group-hover:border-cyan-100 group-hover:bg-cyan-50/30 max-w-full">
                                                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-500 shrink-0" />
                                                    <span className="font-medium text-slate-600 truncate" title={schedule.location || '場所未設定'}>{schedule.location || '場所未設定'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 sm:mt-0 w-full sm:w-auto shrink-0 flex justify-end">
                                        <Button asChild size="default" className="w-full sm:w-auto bg-slate-900 hover:bg-cyan-600 text-white border-none shadow-md hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 rounded-xl font-bold tracking-wide">
                                            <Link href={`/coach/report?scheduleId=${schedule.id}`}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                報告を入力
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <ScheduleDetailModal
                studentId={selectedStudent?.id || null}
                studentName={selectedStudent?.name || ''}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}
