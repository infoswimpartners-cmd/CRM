
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface Lesson {
    id: string
    created_at: string
    lesson_date: string
    student_name: string
    location: string
    price: number | null
    profiles: {
        full_name: string | null
        email: string | null
    } | null
}

interface LessonTableProps {
    lessons: Lesson[]
}

export function LessonTable({ lessons }: LessonTableProps) {
    return (
        <div className="space-y-4">
            {/* Desktop View (Table) */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>日付</TableHead>
                            <TableHead>担当コーチ</TableHead>
                            <TableHead>生徒名</TableHead>
                            <TableHead>場所</TableHead>
                            <TableHead className="text-right">金額</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lessons.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    報告データはありません。
                                </TableCell>
                            </TableRow>
                        ) : (
                            lessons.map((lesson) => (
                                <TableRow key={lesson.id}>
                                    <TableCell className="font-medium">
                                        {format(new Date(lesson.lesson_date), 'yyyy/MM/dd')}
                                    </TableCell>
                                    <TableCell>
                                        {lesson.profiles?.full_name || lesson.profiles?.email || '不明'}
                                    </TableCell>
                                    <TableCell>{lesson.student_name}</TableCell>
                                    <TableCell>{lesson.location}</TableCell>
                                    <TableCell className="text-right">
                                        ¥{lesson.price?.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
                {lessons.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                        報告データはありません。
                    </div>
                ) : (
                    lessons.map((lesson) => (
                        <div key={lesson.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-slate-900">{format(new Date(lesson.lesson_date), 'yyyy/MM/dd')}</p>
                                    <p className="text-sm text-slate-500 mt-0.5">{lesson.location}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600">¥{lesson.price?.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-between text-sm">
                                <div>
                                    <p className="text-xs text-slate-400 mb-0.5">生徒</p>
                                    <p className="font-medium text-slate-700">{lesson.student_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 mb-0.5">担当コーチ</p>
                                    <p className="font-medium text-slate-700">{lesson.profiles?.full_name || '不明'}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
