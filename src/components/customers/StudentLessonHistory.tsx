'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Calendar, User, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StudentLessonHistory({ lessons }: { lessons: any[] }) {
    const [selectedLesson, setSelectedLesson] = useState<any | null>(null)

    if (!lessons || lessons.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 border border-dashed rounded-xl bg-slate-50/50">
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium">受講履歴はありません</p>
                <p className="text-xs text-slate-400 mt-1">レッスン記録が登録されるとここに表示されます</p>
            </div>
        )
    }

    return (
        <>
            <ScrollArea className="h-[400px]">
                <div className="space-y-3 p-4">
                    {lessons.map((lesson, index) => {
                        const isEven = index % 2 === 0
                        return (
                            <div
                                key={lesson.id}
                                className={cn(
                                    "group relative flex flex-col gap-2 p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                                    "bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/30"
                                )}
                                onClick={() => setSelectedLesson(lesson)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg font-bold text-slate-800">
                                                    {format(new Date(lesson.lesson_date), "yyyy/MM/dd", { locale: ja })}
                                                </span>
                                                <Badge variant="outline" className="ml-2 bg-white text-slate-600 border-slate-200 font-normal text-xs px-2 py-0.5 shadow-sm whitespace-nowrap">
                                                    {lesson.lesson_name || '不明'}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-slate-600 flex items-center gap-1.5 truncate">
                                                <span className="text-xs text-slate-400">担当:</span>
                                                <span className="font-medium truncate">
                                                    {lesson.coach_full_name || lesson.profiles?.full_name || '不明'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2" />
                                </div>

                                {lesson.menu_description && (
                                    <div className="mt-2 pl-[60px] hidden sm:block">
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-md border border-slate-100/50 group-hover:bg-white/80 transition-colors">
                                            {lesson.menu_description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <FileText className="h-4 w-4" />
                            </span>
                            レッスン詳細
                        </DialogTitle>
                        <DialogDescription>
                            実施されたレッスンの詳細記録です
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLesson && (
                        <div className="space-y-6 pt-2">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">実施日時</p>
                                    <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {format(new Date(selectedLesson.lesson_date), "yyyy年MM月dd日", { locale: ja })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 mb-1">担当コーチ</p>
                                    <p className="text-sm font-bold text-slate-700 flex items-center justify-end gap-1">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        {selectedLesson.coach_full_name || selectedLesson.profiles?.full_name || '不明'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                                        レッスン内容
                                    </h4>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                                        {selectedLesson.menu_description || '詳細な報告内容はありません。'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-400 justify-end">
                                    <span>レッスンID: {selectedLesson.id.slice(0, 8)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
