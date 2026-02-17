'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { LessonHistoryActions } from '@/components/coach/LessonHistoryActions'

interface Lesson {
    id: string
    student_id: string | null
    student_name: string
    lesson_date: string
    lesson_master_id: string
    location: string
    menu_description: string | null
    price: number
}

interface Props {
    lesson: Lesson
}

export function LessonHistoryRow({ lesson }: Props) {
    const [isDeleted, setIsDeleted] = useState(false)

    if (isDeleted) {
        return null
    }

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div className="flex flex-col">
                    <span>{format(new Date(lesson.lesson_date), 'M/d(E)', { locale: ja })}</span>
                </div>
            </TableCell>
            <TableCell>{lesson.student_name}</TableCell>
            <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                {lesson.location}
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                {lesson.menu_description}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                    <span>¥{lesson.price.toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 font-normal">完了</Badge>
                </div>
            </TableCell>
            <TableCell>
                <LessonHistoryActions
                    lesson={lesson}
                    onDelete={() => setIsDeleted(true)}
                />
            </TableCell>
        </TableRow>
    )
}
