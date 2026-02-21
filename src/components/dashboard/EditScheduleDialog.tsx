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

import { approveSchedule, getStudentsForCoach } from '@/actions/schedule'

interface Schedule {
    id: string
    title: string
    start_time: string
    end_time: string
    location?: string
    notes?: string
    status?: string
    student?: { full_name: string }
    student_id?: string
    coach_id?: string
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

    // Admin & Coach State
    const [isAdmin, setIsAdmin] = useState(false)
    const [coaches, setCoaches] = useState<{ id: string, full_name: string | null }[]>([])
    const [selectedCoachId, setSelectedCoachId] = useState<string>('')
    const [currentUser, setCurrentUser] = useState<any>(null)


    // Form State
    const [studentId, setStudentId] = useState<string>('none')
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [startTime, setStartTime] = useState('10:00')
    const [endTime, setEndTime] = useState('11:00')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [title, setTitle] = useState('')

    // Initial Data Fetch (User Role, Coaches)
    useEffect(() => {
        if (!open) return
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            setCurrentUser(user)

            // Initial selected coach depends on schedule if exists
            // But we will handle that in the schedule-loading effect.
            // Here we just check role.

            // Check Role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                setIsAdmin(true)
                // Fetch All Coaches
                const { data: allCoaches } = await supabase
                    .from('profiles')
                    .select('id, full_name')

                if (allCoaches) setCoaches(allCoaches)
            }
        }
        init()
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

            // Set initial selected coach from schedule. 
            // Note: schedule object needs to contain coach_id. The interface defined above doesn't have it explicitly yet?
            // Actually supabase query usually returns all columns or we need to check how it passed.
            // Let's assume it might not be in the passed prop.
            // If not passed, we might default to self, but better safe.
            // Wait, standard `schedule` prop interface in this file:
            /*
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
            */
            // It is missing coach_id. We should update Interface or fetch it? 
            // Fetching single schedule detail is safer if prop is incomplete.
            // However, let's update the interface right now as well (I will do this via multiple replacements or just cast it)
            // For now let's assume `(schedule as any).coach_id`.
            if ((schedule as any).coach_id) {
                setSelectedCoachId((schedule as any).coach_id)
            } else {
                // Default to current user if not present (unlikely if created correctly)
                // set via other effect if needed
            }

            // Reset states
            setIsDeleting(false)
            setShowDeleteAlert(false)
        }
    }, [open, schedule])

    // Ensure selectedCoachId is set if schedule didn't have it (e.g. initial load logic overlap)
    useEffect(() => {
        if (open && !selectedCoachId && currentUser) {
            setSelectedCoachId(currentUser.id)
        }
    }, [open, currentUser, selectedCoachId])


    // Fetch Students (Depends on Selected Coach)
    useEffect(() => {
        if (!open || !selectedCoachId) return
        const fetchStudents = async () => {
            // If isAdmin and we want to allow selecting ANY student, or we need to keep currently selected student
            // For now, let's stick to "Students assigned to the selected coach (Main + Sub)"
            // But we can use 'all' if we want the same flexibility as AddScheduleDialog for admins
            const targetId = (isAdmin && studentId !== 'none' && studentId === schedule?.student_id) ? 'all' : selectedCoachId

            const res = await getStudentsForCoach(targetId)
            if (res.success && res.data) {
                setStudents(res.data)
            } else {
                setStudents([])
            }
        }
        fetchStudents()
    }, [open, selectedCoachId, isAdmin, studentId, schedule?.student_id])


    // Auto-generate title
    useEffect(() => {
        if (!open) return
        if (title === '') {
            if (studentId && studentId !== 'none') {
                const student = students.find(s => s.id === studentId)
                if (student) setTitle(`${student.full_name}様 レッスン`)
            }
        }
    }, [studentId, students, title, open])


    const handleApprove = async () => {
        if (!schedule) return
        setLoading(true)
        try {
            const result = await approveSchedule(schedule.id)
            if (!result.success) throw new Error(result.error)

            toast.success('予約を確定しました')
            if (onSuccess) onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error('Approve Error:', error)
            toast.error(error.message || '確定に失敗しました')
        } finally {
            setLoading(false)
        }
    }

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

            const updatePayload: any = {
                student_id: studentId === 'none' ? null : studentId,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                title: title,
                location: location,
                notes: notes
            }

            // Only update coach_id if admin and valid
            if (isAdmin && selectedCoachId) {
                updatePayload.coach_id = selectedCoachId
            }

            const { error } = await supabase
                .from('lesson_schedules')
                .update(updatePayload)
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
        // ... (unchanged)
        if (!schedule) return
        setIsDeleting(true)
        try {
            const { cancelSchedule } = await import('@/actions/schedule')
            const result = await cancelSchedule(schedule.id)
            if (!result.success) throw new Error(result.error)

            toast.success('スケジュールを削除しました')
            if (onSuccess) onSuccess()
            setShowDeleteAlert(false)
            onOpenChange(false)
        } catch (error: any) {
            console.error('Delete Error:', error)
            toast.error(error.message || '削除に失敗しました')
            setIsDeleting(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>スケジュールの編集</DialogTitle>
                        <DialogDescription>
                            予定の内容を変更または削除します。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">

                        {/* Admin: Coach Selector */}
                        {isAdmin && (
                            <div className="grid gap-2 p-3 bg-slate-50 border rounded-md">
                                <Label className="text-slate-700 font-bold">担当コーチ (管理者機能)</Label>
                                <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="コーチを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {coaches.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.full_name || '未設定'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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
                                <Select value={startTime} onValueChange={setStartTime}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="開始時間" />
                                    </SelectTrigger>
                                    <SelectContent className="h-[200px]">
                                        {Array.from({ length: 24 * 6 }).map((_, i) => {
                                            const h = Math.floor(i / 6)
                                            const m = (i % 6) * 10
                                            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                                            return (
                                                <SelectItem key={time} value={time}>
                                                    {time}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>終了時間</Label>
                                <Select value={endTime} onValueChange={setEndTime}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="終了時間" />
                                    </SelectTrigger>
                                    <SelectContent className="h-[200px]">
                                        {Array.from({ length: 24 * 6 }).map((_, i) => {
                                            const h = Math.floor(i / 6)
                                            const m = (i % 6) * 10
                                            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                                            return (
                                                <SelectItem key={time} value={time}>
                                                    {time}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
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
                                {schedule?.status === 'requested' && (
                                    <Button type="button" onClick={handleApprove} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        予約を確定
                                    </Button>
                                )}
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
