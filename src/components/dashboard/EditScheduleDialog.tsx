'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    notes?: string
    student?: { full_name: string }
    student_id?: string
}

interface EditScheduleDialogProps {
    schedule: Schedule | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface Student {
    id: string
    full_name: string
}

export function EditScheduleDialog({ schedule, open, onOpenChange, onSuccess }: EditScheduleDialogProps) {
    const [loading, setLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [students, setStudents] = useState<Student[]>([])

    // Form State
    const [studentId, setStudentId] = useState<string>('none')
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [startTime, setStartTime] = useState('10:00')
    const [endTime, setEndTime] = useState('11:00')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [title, setTitle] = useState('')

    // Initial Data Fetch (Students)
    useEffect(() => {
        if (!open) return
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase.rpc('get_students_for_coach_public', {
                p_coach_id: user.id
            })
            if (data) setStudents(data)
        }
        fetchData()
    }, [open])

    // Load Schedule Data
    useEffect(() => {
        if (open && schedule) {
            const start = new Date(schedule.start_time)
            const end = new Date(schedule.end_time)

            setDate(start)
            setStartTime(format(start, 'HH:mm'))
            setEndTime(format(end, 'HH:mm'))
            setTitle(schedule.title)
            setLocation(schedule.location || '')
            setNotes(schedule.notes || '')
            setStudentId(schedule.student_id || 'none')
        }
    }, [open, schedule])

    // Auto-generate title (Only if it looks like a default title or user wants it)
    // In Edit mode, maybe we shouldn't auto-update title as aggressively to avoid overwriting user edits?
    // Let's only update if the title matches the old student name pattern or is empty.
    useEffect(() => {
        if (!open) return
        // Simple logic: If existing title was "[OldName]様 レッスン" and we change student, update it.
        // For now, let's just leave it manual in edit mode unless explicitly empty, to be safe.
        if (title === '') {
            if (studentId && studentId !== 'none') {
                const student = students.find(s => s.id === studentId)
                if (student) setTitle(`${student.full_name}様 レッスン`)
            }
        }
    }, [studentId, students, title, open])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!schedule) return

        setLoading(true)
        const supabase = createClient()

        try {
            if (!date) {
                toast.error('日付を選択してください')
                return
            }

            // Combine Date and Times
            const startDateTime = new Date(date)
            const [sh, sm] = startTime.split(':').map(Number)
            startDateTime.setHours(sh, sm, 0)

            const endDateTime = new Date(date)
            const [eh, em] = endTime.split(':').map(Number)
            endDateTime.setHours(eh, em, 0)

            const { error } = await supabase
                .from('lesson_schedules')
                .update({
                    student_id: studentId === 'none' ? null : studentId,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    title: title,
                    location: location,
                    notes: notes
                })
                .eq('id', schedule.id)

            if (error) throw error

            toast.success('スケジュールを更新しました')
            if (onSuccess) onSuccess()
            onOpenChange(false)

        } catch (error: any) {
            console.error('Schedule Update Error:', error)
            toast.error(`更新に失敗しました: ${error.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!schedule) return
        setIsDeleting(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('lesson_schedules')
                .delete()
                .eq('id', schedule.id)

            if (error) throw error

            toast.success('スケジュールを削除しました')
            if (onSuccess) onSuccess()
            setShowDeleteAlert(false)
            onOpenChange(false)
        } catch (error: any) {
            console.error('Delete Error:', error)
            toast.error('削除に失敗しました')
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>スケジュールの編集</DialogTitle>
                        <DialogDescription>
                            予定の内容を変更または削除します。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>生徒 (任意)</Label>
                            <Select value={studentId} onValueChange={setStudentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="生徒を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">選択しない</SelectItem>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>件名</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 水泳レッスン" required />
                        </div>

                        <div className="grid gap-2">
                            <Label>日付</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>日付を選択</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>開始時間</Label>
                                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>終了時間</Label>
                                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>場所</Label>
                            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="〇〇市民プール" />
                        </div>

                        <div className="grid gap-2">
                            <Label>メモ</Label>
                            <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="練習内容の予定など"
                            />
                        </div>

                        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => setShowDeleteAlert(true)}
                                className="mr-auto"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    キャンセル
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    更新
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。予定が完全に削除されます。
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
