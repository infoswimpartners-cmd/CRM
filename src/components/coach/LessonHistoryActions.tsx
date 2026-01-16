'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { EditLessonReportDialog } from './EditLessonReportDialog'

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
    onDelete?: () => void
}

export function LessonHistoryActions({ lesson, onDelete }: Props) {
    const router = useRouter()
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        const supabase = createClient()

        // Optimistic update
        onDelete?.()

        try {
            const { error } = await supabase
                .from('lessons')
                .delete()
                .eq('id', lesson.id)

            if (error) throw error

            toast.success('レッスン履歴を削除しました')
            router.refresh()
        } catch (error) {
            console.error('Error deleting lesson:', error)
            toast.error('削除に失敗しました')
        } finally {
            setIsDeleting(false)
            setIsDeleteOpen(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">メニューを開く</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>操作</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        編集する
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setIsDeleteOpen(true)}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除する
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <EditLessonReportDialog
                lesson={lesson}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。
                            {lesson.lesson_date.split('T')[0]} の {lesson.student_name} さんのレッスン記録が永久に削除されます。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? '削除中...' : '削除する'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
