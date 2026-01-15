'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function StudentLessonHistory({ lessons }: { lessons: any[] }) {
    if (!lessons || lessons.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 border rounded-md">
                受講履歴はありません
            </div>
        )
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>担当コーチ</TableHead>
                        <TableHead>内容</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lessons.map((lesson) => (
                        <TableRow key={lesson.id}>
                            <TableCell>
                                {format(new Date(lesson.lesson_date), "yyyy/MM/dd", { locale: ja })}
                            </TableCell>
                            <TableCell>
                                {/* We might need to join profiles to get coach name properly if not already joined */}
                                {lesson.profiles?.full_name || '不明'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                                {lesson.menu_description}
                            </TableCell>
                            <TableCell className="text-right">
                                ¥{lesson.price.toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
