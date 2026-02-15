'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, User, DollarSign } from 'lucide-react'

export function StudentLessonHistory({ lessons }: { lessons: any[] }) {
    const [selectedLesson, setSelectedLesson] = useState<any | null>(null)

    if (!lessons || lessons.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 border rounded-md bg-white">
                受講履歴はありません
            </div>
        )
    }

    return (
        <>
            <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[120px]">日時</TableHead>
                            <TableHead className="w-[150px]">担当コーチ</TableHead>
                            <TableHead>内容</TableHead>
                            <TableHead className="text-right w-[100px]">金額</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lessons.map((lesson) => (
                            <TableRow
                                key={lesson.id}
                                className="cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setSelectedLesson(lesson)}
                            >
                                <TableCell className="font-medium">
                                    {format(new Date(lesson.lesson_date), "yyyy/MM/dd", { locale: ja })}
                                </TableCell>
                                <TableCell>
                                    {lesson.profiles?.full_name || '不明'}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-slate-600">
                                    {lesson.menu_description || '報告なし'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                    ¥{lesson.price.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-cyan-600" />
                            レッスン詳細
                        </DialogTitle>
                        <DialogDescription>
                            実施されたレッスンの詳細内容です
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLesson && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> 実施日
                                    </span>
                                    <p className="text-sm font-medium">
                                        {format(new Date(selectedLesson.lesson_date), "yyyy年MM月dd日", { locale: ja })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <User className="h-3 w-3" /> 担当コーチ
                                    </span>
                                    <p className="text-sm font-medium">
                                        {selectedLesson.profiles?.full_name || '不明'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> 金額
                                    </span>
                                    <p className="text-sm font-bold text-blue-600">
                                        ¥{selectedLesson.price.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs text-slate-500 block">メニュー詳細・報告内容</span>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedLesson.menu_description || '詳細な報告内容はありません。'}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
