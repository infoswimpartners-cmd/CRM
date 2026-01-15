
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
        <div className="rounded-md border">
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
    )
}
