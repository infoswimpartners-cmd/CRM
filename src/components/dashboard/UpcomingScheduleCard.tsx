'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, MapPin, Plus, Clock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AddScheduleDialog } from './AddScheduleDialog'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    students?: { full_name: string }
}

interface UpcomingScheduleCardProps {
    schedules: Schedule[]
}

export function UpcomingScheduleCard({ schedules }: UpcomingScheduleCardProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const router = useRouter()

    const handleSuccess = () => {
        setIsAddOpen(false)
        router.refresh()
    }

    return (
        <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                        <CalendarIcon className="h-5 w-5 text-cyan-600" />
                        今後のレッスン
                    </CardTitle>
                    <Button size="sm" variant="outline" className="h-8 bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100 hover:text-cyan-700" onClick={() => setIsAddOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        追加
                    </Button>
                </div>
                <CardDescription className="text-slate-500">直近 {schedules.length} 件のレッスン</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
                {schedules.length > 0 ? (
                    <div className="space-y-3">
                        {schedules.map((schedule) => (
                            <div key={schedule.id} className="group relative flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-cyan-200 transition-all duration-300">
                                {/* Time Column */}
                                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white border border-slate-200 group-hover:border-cyan-200 shadow-sm">
                                    <span className="text-xs font-bold text-cyan-600 uppercase">
                                        {format(new Date(schedule.start_time), 'MMM', { locale: ja })}
                                    </span>
                                    <span className="text-lg font-bold text-slate-900 leading-none mt-0.5">
                                        {format(new Date(schedule.start_time), 'd')}
                                    </span>
                                </div>

                                {/* Info Column */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-900 truncate group-hover:text-cyan-700 transition-colors">
                                        {schedule.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {format(new Date(schedule.start_time), 'HH:mm')}
                                        </div>
                                        {schedule.students?.full_name && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-sm" />
                                                {schedule.students.full_name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge (Simulated) */}
                                <div className="text-right">
                                    <Badge variant="secondary" className="bg-cyan-50 text-cyan-600 border-cyan-100 text-[10px] h-5 hover:bg-cyan-100">
                                        予約済み
                                    </Badge>
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

                <div className="mt-auto pt-2">
                    <Button asChild variant="ghost" className="w-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs uppercase tracking-wider">
                        <Link href="/coach/schedule">カレンダー全体を見る</Link>
                    </Button>
                </div>
            </CardContent>

            <AddScheduleDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                onSuccess={handleSuccess}
                initialDate={new Date()}
            />
        </Card>
    )
}
