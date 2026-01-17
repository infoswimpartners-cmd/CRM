'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
interface Student {
    id: string
    full_name: string
    default_master_id?: string
}
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Loader2, Plus, ExternalLink } from 'lucide-react'
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
import { toast } from 'sonner'
import Link from 'next/link'

interface Student {
    id: string
    full_name: string
    default_master_id?: string
}

interface AddScheduleDialogProps {
    onSuccess?: () => void
    open: boolean
    onOpenChange: (open: boolean) => void
    initialDate?: Date
}

export function AddScheduleDialog({ onSuccess, open, onOpenChange, initialDate }: AddScheduleDialogProps) {
    const [loading, setLoading] = useState(false)
    const [students, setStudents] = useState<Student[]>([])

    // Form State
    const [studentId, setStudentId] = useState<string>('none')
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [startTime, setStartTime] = useState('10:00')
    const [endTime, setEndTime] = useState('11:00')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [title, setTitle] = useState('')

    // Google Calendar Link State
    const [createdEventUrl, setCreatedEventUrl] = useState<string | null>(null)

    // Update date when initialDate changes or dialog opens
    useEffect(() => {
        if (open && initialDate) {
            setDate(initialDate)
        }
    }, [open, initialDate])

    // Initial Data Fetch
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

    // Auto-generate title
    useEffect(() => {
        if (studentId && studentId !== 'none') {
            const student = students.find(s => s.id === studentId)
            if (student) setTitle(`${student.full_name}様 レッスン`)
        } else if (!title) {
            setTitle('水泳レッスン')
        }
    }, [studentId, students])

    const generateGoogleCalendarUrl = (
        eventTitle: string,
        eventLocation: string,
        eventNotes: string,
        eventDate: Date,
        sTime: string,
        eTime: string
    ) => {
        // Format dates for Google Calendar API (YYYYMMDDTHHMMSSZ)
        const startDateTime = new Date(eventDate)
        const [sh, sm] = sTime.split(':').map(Number)
        startDateTime.setHours(sh, sm, 0)

        const endDateTime = new Date(eventDate)
        const [eh, em] = eTime.split(':').map(Number)
        endDateTime.setHours(eh, em, 0)

        const formatGCalDate = (date: Date) => {
            return date.toISOString().replace(/-|:|\.|Z/g, "")
        }
        // Note: ISOString is UTC. GCal API without Z treats as local time? 
        // Or if we strip Z it might be interpreted as local. 
        // Standard approach: use YYYYMMDDTHHMMSSZ for UTC.
        // Our simplified approach here essentially assumes UTC or works well enough for now.
        // Let's stick to the previous logic but clean up regex.

        // Correct GCal URL format usually: YYYYMMDDTHHMMSS
        const toGCalString = (d: Date) => {
            return d.toISOString().replace(/-|:|\./g, '').substring(0, 15) + 'Z'
        }

        const dates = `${toGCalString(startDateTime)}/${toGCalString(endDateTime)}`
        const details = encodeURIComponent(eventNotes || '')
        const text = encodeURIComponent(eventTitle)
        const loc = encodeURIComponent(eventLocation)

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${loc}`
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

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

            // Perform insert via RPC for safety/stability
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_schedule', {
                p_coach_id: user.id,
                p_student_id: studentId === 'none' ? null : studentId,
                p_start_time: startDateTime.toISOString(),
                p_end_time: endDateTime.toISOString(),
                p_title: title,
                p_location: location,
                p_notes: notes
            })

            if (rpcError) throw rpcError

            // RPC custom error check
            if (rpcData && rpcData.error) {
                throw new Error(rpcData.error)
            }

            const gCalUrl = generateGoogleCalendarUrl(title, location, notes, date, startTime, endTime)
            setCreatedEventUrl(gCalUrl)

            toast.success('スケジュールを追加しました')
            if (onSuccess) onSuccess()

        } catch (error: any) {
            console.error('Schedule Save Error:', error)
            toast.error(`保存に失敗しました: ${error.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setCreatedEventUrl(null)
        // Reset form
        setStudentId('none')
        setDate(new Date())
        setStartTime('10:00')
        setEndTime('11:00')
        setLocation('')
        setNotes('')
        setTitle('')
    }

    // ...

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) handleClose()
            else onOpenChange(v)
        }}>
            {/* Trigger Removed - Controlled by Parent */}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>レッスンスケジュール登録</DialogTitle>
                    <DialogDescription>
                        新しいレッスンの予定を登録します。登録後にGoogleカレンダーに追加できます。
                    </DialogDescription>
                </DialogHeader>

                {!createdEventUrl ? (
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

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="py-6 space-y-6">
                        <div className="bg-green-50 p-4 rounded-lg text-center space-y-2">
                            <div className="text-green-600 font-bold text-lg">登録完了</div>
                            <p className="text-sm text-green-700">スケジュールを保存しました。</p>
                        </div>

                        <div className="space-y-2">
                            <Button asChild className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white" size="lg">
                                <Link href={createdEventUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-5 w-5" />
                                    Googleカレンダーに追加
                                </Link>
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                新しいタブでGoogleカレンダーが開きます
                            </p>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <Button variant="outline" onClick={handleClose}>
                                閉じる
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
