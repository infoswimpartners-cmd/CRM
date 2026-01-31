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
import { CalendarIcon, Loader2, ExternalLink } from 'lucide-react'
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
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select"
import { toast } from 'sonner'
import Link from 'next/link'
import { confirmTrialAndBill } from '@/actions/onboarding'
import { getStudentsForCoach, getLessonMasters as fetchMasters } from '@/actions/schedule'
import { createLessonSchedule } from '@/actions/lesson_schedule'
import { Checkbox } from '@/components/ui/checkbox'

interface Student {
    id: string
    full_name: string
    status?: string
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

    // Trial Logic
    const [isTrialMode, setIsTrialMode] = useState(false)
    const [sendTrialInvoice, setSendTrialInvoice] = useState(false)

    // Google Calendar Link State
    const [createdEventUrl, setCreatedEventUrl] = useState<string | null>(null)

    // Update date when initialDate changes or dialog opens
    useEffect(() => {
        if (open && initialDate) {
            setDate(initialDate)
        }
    }, [open, initialDate])

    // Initial Data Fetch (User Role, Coaches)
    // Lesson Masters and Status State
    const [lessonMasters, setLessonMasters] = useState<{ id: string, name: string, is_single_ticket?: boolean }[]>([])
    const [selectedMasterId, setSelectedMasterId] = useState<string>('default')
    const [isOverage, setIsOverage] = useState(false)
    const [membershipName, setMembershipName] = useState<string | null>(null)
    const [availableLessons, setAvailableLessons] = useState<any[]>([])
    const [lessonSelectorOpen, setLessonSelectorOpen] = useState(false)
    const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null)
    const [currentCount, setCurrentCount] = useState<number>(0)
    const [rolloverCount, setRolloverCount] = useState<number>(0)
    const [checkingStatus, setCheckingStatus] = useState(false)

    // Initial Data Fetch (User Role, Coaches, Lesson Masters)
    useEffect(() => {
        if (!open) return
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            setCurrentUser(user)
            setSelectedCoachId(user.id) // Default to self

            // Check Role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                setIsAdmin(true)
                const { data: allCoaches } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('role', ['coach', 'admin'])
                    .order('full_name') // access check?

                if (allCoaches) setCoaches(allCoaches as any)
            }

            // Fetch Masters (Static Import)
            try {
                const res = await fetchMasters()
                if (res.success && res.data) {
                    setLessonMasters(res.data)
                    console.log('Loaded Lesson Masters:', res.data)
                } else {
                    console.error('Failed to load lesson masters:', res.error)
                }
            } catch (err) {
                console.error('fetchMasters execution error:', err)
            }
        }
        init()
    }, [open])

    // Fetch Students (Server Action)
    useEffect(() => {
        if (!open || !selectedCoachId) return
        const fetchStudents = async () => {
            try {
                const res = await getStudentsForCoach(selectedCoachId)
                if (res.success && res.data) {
                    setStudents(res.data)
                } else {
                    console.error('Failed to fetch students:', res.error)
                    setStudents([])
                }
            } catch (error) {
                console.error('Fetch Students Error:', error)
                setStudents([])
            }
        }
        fetchStudents()
    }, [open, selectedCoachId])


    // Check Student Status when Student & Date selected
    useEffect(() => {
        if (studentId && studentId !== 'none' && date) {
            const check = async () => {
                setCheckingStatus(true)
                const { checkStudentLessonStatus } = await import('@/actions/lesson_schedule')
                const res = await checkStudentLessonStatus(studentId, date.toISOString())

                if (res.success) {
                    setIsOverage(!!res.isOverage)
                    setMembershipName(res.membershipName)
                    setMonthlyLimit(res.limit || 0)
                    setCurrentCount(res.count || 0)
                    setRolloverCount(res.rollover || 0)
                    setAvailableLessons(res.availableLessons || [])

                    const lessons = res.availableLessons || []

                    // Auto-select logic
                    if (lessons.length > 0) {
                        let targetId = 'default'

                        // 1. Try Default ID match
                        if (res.defaultLessonId) {
                            const match = lessons.find((l: any) => l.id === res.defaultLessonId)
                            if (match) targetId = res.defaultLessonId
                        }

                        // 2. Fallback to first item if still default
                        if (targetId === 'default') {
                            targetId = lessons[0].id
                        }

                        console.log('[AutoSelect] Selected:', targetId)
                        // Use setTimeout to ensure availableLessons state update is processed by Select component
                        setTimeout(() => setSelectedMasterId(targetId), 0)
                    } else {
                        setSelectedMasterId('default')
                    }
                }
                setCheckingStatus(false)
            }
            check()

            // Title Auto-generation
            const student = students.find(s => s.id === studentId)
            if (student) {
                setTitle(`${student.full_name}様 レッスン`)
                // Trial check ...
                if (student.status === 'trial_pending') {
                    setIsTrialMode(true)
                } else {
                    setIsTrialMode(false)
                    setSendTrialInvoice(false)
                }
            }
        } else {
            setIsOverage(false)
            setMembershipName(null)
            if (studentId === 'none') {
                setTitle('水泳レッスン')
                setIsTrialMode(false)
            }
        }
    }, [studentId, date, students, lessonMasters])

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

        const toGCalString = (d: Date) => {
            return d.toISOString().replace(/-|:|\./g, '').substring(0, 15) + 'Z'
        }

        const dates = `${toGCalString(startDateTime)}/${toGCalString(endDateTime)}`
        const details = encodeURIComponent(eventNotes || '')
        const text = encodeURIComponent(eventTitle)
        const loc = encodeURIComponent(eventLocation)

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${loc}`
    }

    // Auto-Calculate End Time based on Master or Default
    useEffect(() => {
        if (startTime && date) {
            let duration = 60 // Default 60 min

            if (isOverage && selectedMasterId !== 'default') {
                const master = lessonMasters.find(m => m.id === selectedMasterId)
                if (master) {
                    // Extract duration from name (e.g. "60分")
                    const match = master.name.match(/(\d+)分/)
                    if (match && match[1]) {
                        duration = parseInt(match[1])
                    }
                }
            } else if (studentId !== 'none') {
                // Monthly Member (Normal or Overage)
                // Fallback: If Membership Name contains 90 -> 90, else 60.
                if (membershipName && membershipName.includes('90')) {
                    duration = 90
                }
            }

            // Calc End Time
            const [sh, sm] = startTime.split(':').map(Number)
            const startD = new Date(date)
            startD.setHours(sh, sm, 0)
            const endD = new Date(startD.getTime() + duration * 60000)

            const eh = endD.getHours().toString().padStart(2, '0')
            const em = endD.getMinutes().toString().padStart(2, '0')
            setEndTime(`${eh}:${em}`)
        }
    }, [startTime, selectedMasterId, isOverage, membershipName, date, lessonMasters])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            if (!currentUser) throw new Error('Not authenticated')

            if (!date) {
                toast.error('日付を選択してください')
                return
            }

            if (studentId === 'none') {
                toast.error('生徒を選択してください')
                setLoading(false)
                return
            }

            // Combine Date and Times
            const startDateTime = new Date(date)
            const [sh, sm] = startTime.split(':').map(Number)
            startDateTime.setHours(sh, sm, 0)

            const endDateTime = new Date(date)
            const [eh, em] = endTime.split(':').map(Number)
            endDateTime.setHours(eh, em, 0)

            // Adjust Date if End Time crossed midnight? (Assume same day for simplified UI)
            if (eh < sh) {
                endDateTime.setDate(endDateTime.getDate() + 1)
            }


            // If sending trial invoice, use the Server Action
            if (isTrialMode && sendTrialInvoice && studentId !== 'none') {
                if (!confirm('体験確定と請求メール送信を実行しますか？\n（スケジュールも自動登録されます）')) {
                    setLoading(false)
                    return
                }

                // Use server action.
                // @ts-ignore
                const res = await confirmTrialAndBill(studentId, startDateTime, selectedCoachId)
                if (!res.success) throw new Error(res.error)

                toast.success('体験確定・請求送信・スケジュール登録が完了しました')

            } else {
                // NORMAL SCHEDULE creation
                // Auto-update trial_pending -> trial_confirmed
                if (studentId !== 'none') {
                    const student = students.find(s => s.id === studentId)
                    if (student?.status === 'trial_pending') {
                        await supabase.from('students').update({ status: 'trial_confirmed' }).eq('id', studentId)
                    }
                }

                // Use Server Action
                // @ts-ignore
                const result = await createLessonSchedule({
                    coach_id: selectedCoachId,
                    student_id: studentId === 'none' ? null : studentId,
                    lesson_master_id: (isOverage && selectedMasterId !== 'default') ? selectedMasterId : null,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    title: title,
                    location: location,
                    notes: notes
                })

                if (!result.success) throw new Error(result.error)

                if (result.isOverage) {
                    if (membershipName && membershipName.includes('単発')) {
                        toast.success('レッスンを追加し、レッスン料の請求処理予約を行いました。')
                    } else {
                        toast.warning('月の上限回数を超えているため、超過分（単発）として登録されました。')
                    }
                } else {
                    toast.success('スケジュールを追加しました')
                }
            }

            const gCalUrl = generateGoogleCalendarUrl(title, location, notes, date, startTime, endTime)
            setCreatedEventUrl(gCalUrl)

            // Do NOT call onSuccess immediately, so the dialog stays open to show Success View
            // if (onSuccess) onSuccess()

        } catch (error: any) {
            console.error('Schedule Save Error:', error)
            toast.error(`保存に失敗しました: ${error.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        // If we have a success state (url), refresh parent on close
        if (createdEventUrl && onSuccess) {
            onSuccess()
        }

        onOpenChange(false)
        setCreatedEventUrl(null)
        setStudentId('none')
        setDate(new Date())
        setStartTime('10:00')
        setEndTime('11:00')
        setLocation('')
        setNotes('')
        setTitle('')
        setIsTrialMode(false)
        setSendTrialInvoice(false)
        setIsOverage(false)
        setMembershipName(null)
        if (currentUser) setSelectedCoachId(currentUser.id)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) handleClose()
            else onOpenChange(v)
        }}>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>レッスンスケジュール登録</DialogTitle>
                    <DialogDescription>
                        新しいレッスンの予定を登録します。
                    </DialogDescription>
                </DialogHeader>

                {!createdEventUrl ? (
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
                            <Label>生徒 <span className="text-red-500">*</span></Label>
                            <Select value={studentId} onValueChange={setStudentId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="生徒を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none" disabled>生徒を選択してください</SelectItem>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{s.full_name}</span>
                                                {/* Show Membership Name */}
                                                {(s as any).membership_name && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                                                        {(s as any).membership_name}
                                                    </span>
                                                )}
                                                {s.status === 'trial_pending' && <span className="text-xs text-orange-500">(体験予定)</span>}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Membership Status Display (Separate Line) */}
                            {studentId !== 'none' && (
                                <div className="text-xs text-blue-600 flex items-center gap-2">
                                    {checkingStatus ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <>
                                            {membershipName ? `会員種別: ${membershipName}` : '会員種別: 未設定 (単発扱い)'}

                                            {/* Usage Count Display */}
                                            {/* Usage Count Display - Hide for Single Use */}
                                            {monthlyLimit !== null && monthlyLimit > 0 && (!membershipName || !membershipName.includes('単発')) && (
                                                <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                                    利用状況: {currentCount} / {monthlyLimit} 回
                                                    {rolloverCount > 0 && <span className="ml-1 text-[10px]">(繰越 {rolloverCount}回含)</span>}
                                                </span>
                                            )}

                                            {/* Message Logic */}
                                            {isOverage && (
                                                (!membershipName || (membershipName && membershipName.includes('単発'))) ? (
                                                    <span className="text-red-600 font-bold ml-2">※レッスン種別を選択してください</span>
                                                ) : (
                                                    <span className="text-red-600 font-bold ml-2">※月上限超過 (単発扱い)</span>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {/* Lesson Selector (Always visible, defaulting to Membership Default) */}
                            <div className="grid gap-2 mt-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                                <Label className="text-slate-800 font-bold">レッスン種別</Label>
                                <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="レッスンを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableLessons.length > 0 ? (
                                            availableLessons.map((l: any) => (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {l.name}
                                                    {isOverage && l.unit_price > 0 && (
                                                        <span className="ml-2 text-xs text-slate-500">
                                                            (¥{l.unit_price.toLocaleString()})
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-xs text-gray-500 text-center">
                                                選択可能なレッスンがありません
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                        {/* Trial Confirmation UI */}
                        {isTrialMode && (
                            <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-orange-600 font-bold text-sm">体験レッスン設定</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <Checkbox id="trial_confirm" checked={sendTrialInvoice} onCheckedChange={(c) => setSendTrialInvoice(!!c)} />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="trial_confirm"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            体験確定・請求送信を行う
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        {/* Updated Date Format */}
                                        {date ? format(date, "yyyy年M月d日") : <span>日付を選択</span>}
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
                                <div className="flex gap-2 items-center">
                                    <Select
                                        value={startTime.split(':')[0]}
                                        onValueChange={(h) => setStartTime(`${h}:${startTime.split(':')[1]}`)}
                                    >
                                        <SelectTrigger className="w-[80px]">
                                            <SelectValue placeholder="時" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 24 }).map((_, i) => {
                                                const h = i.toString().padStart(2, '0')
                                                return <SelectItem key={h} value={h}>{h}</SelectItem>
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm font-bold">:</span>
                                    <Select
                                        value={startTime.split(':')[1]}
                                        onValueChange={(m) => setStartTime(`${startTime.split(':')[0]}:${m}`)}
                                    >
                                        <SelectTrigger className="w-[80px]">
                                            <SelectValue placeholder="分" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const m = (i * 5).toString().padStart(2, '0')
                                                return <SelectItem key={m} value={m}>{m}</SelectItem>
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>終了時間 (自動)</Label>
                                <div className="flex h-9 w-full rounded-md border border-input bg-gray-100 px-3 py-1 text-base shadow-sm items-center text-gray-600">
                                    {endTime}
                                </div>
                                {/* Hidden Input not needed if we manage endTime state directly */}
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
                            <Button type="submit" disabled={loading || checkingStatus}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isTrialMode && sendTrialInvoice ? '確定して送信' : '保存'}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="py-6 space-y-6">
                        {/* Success View */}
                        <div className="bg-green-50 p-4 rounded-lg text-center space-y-2">
                            <div className="text-green-600 font-bold text-lg">登録完了</div>
                            <p className="text-sm text-green-700">
                                {isTrialMode && sendTrialInvoice
                                    ? '体験確定メール送信とスケジュール登録が完了しました。'
                                    : 'スケジュールを保存しました。'}
                            </p>
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
        </Dialog >
    )
}
