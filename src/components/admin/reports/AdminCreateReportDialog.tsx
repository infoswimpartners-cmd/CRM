'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, Loader2, UserCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LocationSelect } from '@/components/forms/LocationSelect'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from '@/lib/supabase/client'
import { submitAdminProxyReport } from '@/actions/report'

// フォームスキーマ定義
const formSchema = z.object({
    coach_id: z.string().min(1, 'コーチを選択してください'),
    student_id: z.string().optional(),
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.date({ message: 'レッスン日時は必須です' }),
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    coach_comment: z.string().optional(),
    price: z.number().min(0),
    attendance_type: z.string().optional(),
})

interface AdminCreateReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AdminCreateReportDialog({ open, onOpenChange }: AdminCreateReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const [coaches, setCoaches] = useState<any[]>([])
    const [lessonMasters, setLessonMasters] = useState<any[]>([])
    const [allStudents, setAllStudents] = useState<any[]>([])
    const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set())
    const [restrictedLessonIds, setRestrictedLessonIds] = useState<string[] | null>(null)
    const [isTwoPersonLesson, setIsTwoPersonLesson] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            coach_id: '',
            student_id: '',
            student_name: '',
            // @ts-ignore
            lesson_date: undefined,
            lesson_master_id: '',
            location: '',
            menu_description: '',
            coach_comment: '',
            price: 0,
            attendance_type: 'both',
        },
    })

    // コーチ・レッスン種類・全生徒をロード
    useEffect(() => {
        if (!open) return
        const fetchInitialData = async () => {
            const supabase = createClient()
            const [{ data: coachList }, { data: masters }, { data: studentList }] = await Promise.all([
                supabase.from('profiles').select('id, full_name').in('role', ['coach', 'admin', 'owner']).order('full_name'),
                supabase.from('lesson_masters').select('id, name, unit_price, pair_unit_price, is_trial').eq('active', true).order('display_order'),
                supabase.from('students').select('id, full_name, second_student_name, coach_id, status').neq('status', 'withdrawn').order('full_name'),
            ])
            if (coachList) setCoaches(coachList)
            if (masters) setLessonMasters(masters)
            if (studentList) setAllStudents(studentList)
        }
        fetchInitialData()
        form.reset()
        setAssignedStudentIds(new Set())
        setRestrictedLessonIds(null)
        setIsTwoPersonLesson(false)
        setSelectedStudent(null)
    }, [open, form])

    // コーチが変わったら担当生徒IDを特定
    const selectedCoachId = form.watch('coach_id')
    useEffect(() => {
        if (!selectedCoachId) {
            setAssignedStudentIds(new Set())
            return
        }
        const fetchAssigned = async () => {
            const supabase = createClient()
            const [{ data: directStudents }, { data: junctionStudents }] = await Promise.all([
                supabase.from('students').select('id').eq('coach_id', selectedCoachId).neq('status', 'withdrawn'),
                supabase.from('student_coaches').select('student_id').eq('coach_id', selectedCoachId),
            ])
            const idSet = new Set<string>()
            directStudents?.forEach(s => idSet.add(s.id))
            junctionStudents?.forEach(j => { if (j.student_id) idSet.add(j.student_id) })
            setAssignedStudentIds(idSet)
        }
        fetchAssigned()
    }, [selectedCoachId])

    // 生徒が変わったら許可レッスンを判定
    const selectedStudentId = form.watch('student_id')
    useEffect(() => {
        if (!selectedStudentId) {
            setRestrictedLessonIds(null)
            return
        }
        const fetchAllowed = async () => {
            const supabase = createClient()
            const { data: student } = await supabase
                .from('students')
                .select('status, membership_type_id')
                .eq('id', selectedStudentId)
                .single()

            const isTrialStudent = ['trial_pending', 'trial_confirmed', 'trial_billed', 'trial_done', 'applied', 'inquired'].includes(student?.status || '') ||
                (!student?.membership_type_id && student?.status !== 'active' && student?.status !== 'withdrawn')

            if (isTrialStudent) {
                const trialMasters = lessonMasters.filter(m => m.is_trial)
                const trialIds = trialMasters.map(m => m.id)
                setRestrictedLessonIds(trialIds)
                if (trialIds.length > 0) {
                    const current = form.getValues('lesson_master_id')
                    if (!current || !trialIds.includes(current)) {
                        form.setValue('lesson_master_id', trialIds[0])
                        handleLessonMasterChange(trialIds[0])
                    }
                }
                return
            }

            if (!student?.membership_type_id) {
                setRestrictedLessonIds(null)
                return
            }

            const { data: allowed } = await supabase
                .from('membership_type_lessons')
                .select('lesson_master_id')
                .eq('membership_type_id', student.membership_type_id)

            if (allowed && allowed.length > 0) {
                const ids = allowed.map((a: any) => a.lesson_master_id)
                setRestrictedLessonIds(ids)
                const current = form.getValues('lesson_master_id')
                if (!current || !ids.includes(current)) {
                    const nextId = ids.length === 1 ? ids[0] : (ids[0] || '')
                    form.setValue('lesson_master_id', nextId)
                    if (nextId) handleLessonMasterChange(nextId)
                }
            } else {
                // 会員プランに個別レッスンが登録されていない場合は選択不能にせず全レッスンから選択可能にする
                setRestrictedLessonIds(null)
            }
        }
        fetchAllowed()
    }, [selectedStudentId, form, lessonMasters])

    // レッスン種別が変わったら金額を更新
    const handleLessonMasterChange = (value: string) => {
        const master = lessonMasters.find(m => m.id === value)
        if (!master) return
        const attType = form.getValues('attendance_type') || 'both'
        const isPair = isTwoPersonLesson && (attType === 'both')
        const price = (isPair && master.pair_unit_price) ? master.pair_unit_price : master.unit_price
        form.setValue('price', price)
    }

    const displayMasters = restrictedLessonIds !== null
        ? lessonMasters.filter(m => restrictedLessonIds.includes(m.id))
        : lessonMasters

    const handleAttendanceTypeChange = (value: string) => {
        if (selectedStudent) {
            if (value === 'student1') {
                form.setValue('student_name', selectedStudent.full_name)
            } else if (value === 'student2' && selectedStudent.second_student_name) {
                form.setValue('student_name', selectedStudent.second_student_name)
            } else if (value === 'both' && selectedStudent.second_student_name) {
                form.setValue('student_name', `${selectedStudent.full_name} & ${selectedStudent.second_student_name}`)
            }
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        try {
            // Server Action（Admin Client）経由で RLS をバイパスして INSERT
            const result = await submitAdminProxyReport({
                coach_id: values.coach_id,
                student_id: values.student_id || undefined,
                student_name: values.student_name,
                lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
                lesson_master_id: values.lesson_master_id,
                location: values.location,
                menu_description: values.menu_description || '',
                coach_comment: values.coach_comment || '',
                price: values.price,
                attendance_type: values.attendance_type || 'both',
            })

            if (!result.success) throw new Error(result.error)

            toast.success('レッスン報告を代理で作成しました')
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || '作成に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-blue-600" />
                        代理レッスン報告作成
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        管理者が他のコーチに代わってレッスン報告を作成します
                    </p>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* コーチ選択 */}
                        <FormField
                            control={form.control}
                            name="coach_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-1">
                                        コーチ
                                        <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-700 bg-orange-50 font-normal">代理</Badge>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="コーチを選択" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {coaches.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 生徒選択 */}
                        <FormField
                            control={form.control}
                            name="student_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>生徒</FormLabel>
                                    <div className="flex gap-2">
                                        <Select
                                            value={form.watch('student_id') || ''}
                                            onValueChange={async (val) => {
                                                if (val === '__manual__') {
                                                    form.setValue('student_id', '')
                                                    setIsTwoPersonLesson(false)
                                                    setSelectedStudent(null)
                                                } else {
                                                    const s = allStudents.find(s => s.id === val)
                                                    form.setValue('student_id', val)
                                                    const displayName = s?.second_student_name 
                                                        ? `${s.full_name} & ${s.second_student_name}`
                                                        : s?.full_name || ''
                                                    form.setValue('student_name', displayName)

                                                    // コーチ未選択で生徒に主担当コーチが設定されている場合は自動補完
                                                    if (!form.getValues('coach_id') && s?.coach_id) {
                                                        form.setValue('coach_id', s.coach_id)
                                                    }

                                                    const supabase = createClient()
                                                    const { data: studentData } = await supabase
                                                        .from('students')
                                                        .select('is_two_person_lesson, apply_pair_pricing, full_name, second_student_name')
                                                        .eq('id', val)
                                                        .single()

                                                    if (studentData) {
                                                        setSelectedStudent(studentData)
                                                        setIsTwoPersonLesson(!!studentData.is_two_person_lesson)
                                                    } else {
                                                        setIsTwoPersonLesson(false)
                                                        setSelectedStudent(null)
                                                    }
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="生徒を選択（全生徒から選択可能）" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                <SelectItem value="__manual__">手入力</SelectItem>
                                                {assignedStudentIds.size > 0 && (
                                                    <>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                                                            選択中コーチの担当生徒
                                                        </div>
                                                        {allStudents
                                                            .filter(s => assignedStudentIds.has(s.id))
                                                            .map(s => (
                                                                <SelectItem key={`assigned-${s.id}`} value={s.id}>
                                                                    {s.full_name}
                                                                    {s.second_student_name && ` & ${s.second_student_name}`}
                                                                </SelectItem>
                                                            ))}
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border-t mt-1">
                                                            その他の生徒
                                                        </div>
                                                        {allStudents
                                                            .filter(s => !assignedStudentIds.has(s.id))
                                                            .map(s => (
                                                                <SelectItem key={`other-${s.id}`} value={s.id}>
                                                                    {s.full_name}
                                                                    {s.second_student_name && ` & ${s.second_student_name}`}
                                                                </SelectItem>
                                                            ))}
                                                    </>
                                                )}
                                                {assignedStudentIds.size === 0 && (
                                                    allStudents.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {s.full_name}
                                                            {s.second_student_name && ` & ${s.second_student_name}`}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="生徒名を入力（手入力またはリスト選択後）"
                                            className="mt-2"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isTwoPersonLesson && (
                            <FormField
                                control={form.control}
                                name="attendance_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>出席区分</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                handleAttendanceTypeChange(value)
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="出席区分を選択" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="both">2名とも出席 (ペア)</SelectItem>
                                                <SelectItem value="student1">{selectedStudent?.full_name || '1人目'} のみ出席 (単体)</SelectItem>
                                                <SelectItem value="student2">{selectedStudent?.second_student_name || '2人目'} のみ出席 (単体)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* レッスン種類 */}
                            <FormField
                                control={form.control}
                                name="lesson_master_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>レッスン種類</FormLabel>
                                        <Select
                                            onValueChange={(v) => { field.onChange(v); handleLessonMasterChange(v) }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="種類を選択" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {displayMasters.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 実施日 */}
                            <FormField
                                control={form.control}
                                name="lesson_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>実施日</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value ? format(field.value, "PPP", { locale: ja }) : <span>日付を選択</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                    initialFocus
                                                    locale={ja}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* 売上金額 */}
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>売上金額 (円)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
                                            readOnly
                                            className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* 場所 */}
                        <FormField
                            control={form.control as any}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>場所</FormLabel>
                                    <FormControl>
                                        <LocationSelect value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* メニュー内容 */}
                        <FormField
                            control={form.control}
                            name="menu_description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        メニュー内容 / メモ
                                        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100 font-normal">メンバーサイトに反映</Badge>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="実施したメニューや練習内容" className="resize-none min-h-[80px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* コーチコメント */}
                        <FormField
                            control={form.control}
                            name="coach_comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>コーチコメント</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="コーチからのコメント" className="resize-none min-h-[70px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />作成中...</> : '代理報告を作成'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
