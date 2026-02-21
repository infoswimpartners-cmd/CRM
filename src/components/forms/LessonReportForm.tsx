'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { submitLessonReport } from '@/actions/report'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { parseISO } from 'date-fns'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { StudentSelect } from './StudentSelect'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    student_id: z.string().optional(),
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.date({
        message: 'レッスン日時は必須です',
    }),
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    feedback_good: z.string().optional(),
    feedback_next: z.string().optional(),
    coach_comment: z.string().optional(),
    price: z.coerce.number().min(0, '金額は0円以上である必要があります'),
})

interface LessonMaster {
    id: string
    name: string
    unit_price: number
}

// Define the form values type explicitly
type FormValues = z.infer<typeof formSchema>

export function LessonReportForm() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])
    const [coachId, setCoachId] = useState<string>('')
    const [restrictedLessonIds, setRestrictedLessonIds] = useState<string[] | null>(null)
    const [keepValues, setKeepValues] = useState(true)
    const searchParams = useSearchParams()
    const scheduleId = searchParams.get('scheduleId')

    // Load lesson masters and current user on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()

            // Fetch masters
            const { data: masters } = await supabase
                .from('lesson_masters')
                .select('id, name, unit_price')
                .eq('active', true)

            if (masters) setLessonMasters(masters)

            // Fetch current user (coach)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setCoachId(user.id)
        }
        fetchData()
    }, [])

    const form = useForm<FormValues>({
        // @ts-ignore: Resolver type mismatch workaround
        resolver: zodResolver(formSchema),
        defaultValues: {
            student_id: '',
            student_name: '',
            // @ts-ignore: Intentionally undefined for initial state to force user selection
            lesson_date: undefined,
            lesson_master_id: '',
            location: '',
            menu_description: '',
            feedback_good: '',
            feedback_next: '',
            coach_comment: '',
            price: 0,
        },
    })

    // Load schedule data if scheduleId is provided
    useEffect(() => {
        if (!scheduleId || !coachId) return

        const fetchSchedule = async () => {
            const supabase = createClient()
            const { data: schedule } = await supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students (
                        id,
                        full_name
                    )
                `)
                .eq('id', scheduleId)
                .single()

            if (schedule) {
                // Handle students which could be an object or an array depending on Supabase query result
                const studentsData: any = schedule.students
                const student = Array.isArray(studentsData) ? studentsData[0] : studentsData

                const studentId = student?.id
                const studentName = student?.full_name

                if (studentId) form.setValue('student_id', studentId)
                if (studentName) form.setValue('student_name', studentName)
                if (schedule.lesson_master_id) form.setValue('lesson_master_id', schedule.lesson_master_id)
                if (schedule.start_time) form.setValue('lesson_date', new Date(schedule.start_time))
                if (schedule.location) form.setValue('location', schedule.location)
            }
        }
        fetchSchedule()
    }, [scheduleId, coachId, form])

    // Watch lesson_master_id to auto-update price
    const selectedMasterId = form.watch('lesson_master_id')
    useEffect(() => {
        const master = lessonMasters.find(m => m.id === selectedMasterId)
        if (master) {
            form.setValue('price', master.unit_price)
        }
    }, [selectedMasterId, lessonMasters, form])

    // Watch student_id to auto-select default lesson based on membership type AND restrict options
    const selectedStudentId = form.watch('student_id')
    useEffect(() => {
        const fetchAllowedLessons = async () => {
            if (!selectedStudentId) {
                setRestrictedLessonIds(null)
                // Only clear if not already empty (to avoid unnecessary form dirtying)
                if (form.getValues('lesson_master_id')) {
                    form.setValue('lesson_master_id', '')
                    form.setValue('price', 0)
                }
                return
            }

            const supabase = createClient()

            // 1. Get Student's Membership Type ID
            const { data: student } = await supabase
                .from('students')
                .select('membership_type_id')
                .eq('id', selectedStudentId)
                .single()

            if (!student?.membership_type_id) {
                setRestrictedLessonIds(null)
                return
            }

            // 2. Get Allowed Lessons for that Membership Type
            const { data: allowed } = await supabase
                .from('membership_type_lessons')
                .select('lesson_master_id')
                .eq('membership_type_id', student.membership_type_id)

            if (allowed && allowed.length > 0) {
                const ids = allowed.map(a => a.lesson_master_id)
                setRestrictedLessonIds(ids)

                // IMPORTANT: Only reset if the current selection is NOT allowed for this student
                const currentMasterId = form.getValues('lesson_master_id')
                if (!currentMasterId || !ids.includes(currentMasterId)) {
                    // Auto-select if only one option, otherwise clear
                    if (ids.length === 1) {
                        form.setValue('lesson_master_id', ids[0])
                    } else {
                        form.setValue('lesson_master_id', '')
                        form.setValue('price', 0)
                    }
                }
            } else {
                setRestrictedLessonIds([]) // No allowed lessons found
                form.setValue('lesson_master_id', '')
                form.setValue('price', 0)
            }
        }
        fetchAllowedLessons()
    }, [selectedStudentId, form])

    const displayMasters = restrictedLessonIds !== null
        ? lessonMasters.filter(m => restrictedLessonIds.includes(m.id))
        : lessonMasters

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)

        try {
            // Convert date to ISO string for server action
            const payload = {
                ...values,
                lesson_date: values.lesson_date.toISOString(),
            }

            const result = await submitLessonReport(payload)

            if (!result.success) {
                throw new Error(typeof result.error === 'string' ? result.error : 'Submission failed')
            }

            toast.success('レッスン報告を送信しました！')

            if (keepValues) {
                // Keep Date, Location. Reset Student-specific fields
                const currentValues = form.getValues()
                form.reset({
                    ...currentValues,
                    student_id: '',
                    student_name: '',
                    menu_description: '',
                    feedback_good: '',
                    feedback_next: '',
                    price: 0,
                    lesson_master_id: '' // Clear this to force re-selection or auto-select based on new student
                })
                // Clear any restricted lessons state
                setRestrictedLessonIds(null)

                // Scroll to top to encourage next entry
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                router.push('/coach')
            }
        } catch (error) {
            console.error('Error submitting report:', error)
            toast.error('送信に失敗しました。もう一度お試しください。')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            {/* @ts-ignore: Type mismatch in SubmitHandler */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control as any}
                    name="student_name"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>生徒名</FormLabel>
                            <FormControl>
                                <StudentSelect
                                    onSelect={(id, name) => {
                                        form.setValue('student_id', id || '')
                                        form.setValue('student_name', name)
                                    }}
                                    selectedName={field.value}
                                    coachId={coachId}
                                />
                            </FormControl>
                            <FormDescription>
                                リストから検索するか、見つからない場合は手入力してください（手入力機能は未実装のため、現在は検索のみを推奨）
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="lesson_master_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>レッスンの種類</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="レッスンを選択" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {displayMasters.map((master) => (
                                        <SelectItem key={master.id} value={master.id}>
                                            {master.name} (¥{master.unit_price.toLocaleString()})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="lesson_date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>日時</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP", { locale: ja })
                                            ) : (
                                                <span>日付を選択</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                            date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                        locale={ja}
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                レッスン実施日を選択してください。
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>場所</FormLabel>
                            <FormControl>
                                <Input placeholder="〇〇市民プール" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="menu_description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>メニュー内容 / メモ</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="実施したメニューや練習内容"
                                    className="resize-none min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control as any}
                        name="feedback_good"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>良かった点</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="以前より改善された点など"
                                        className="resize-none min-h-[80px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control as any}
                        name="feedback_next"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>次回の課題</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="次回意識すべきポイントなど"
                                        className="resize-none min-h-[80px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control as any}
                    name="coach_comment"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>コーチからのコメント</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="保護者や生徒へのメッセージ"
                                    className="resize-none min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                生徒のダッシュボードに「前回のレポート」として表示されます。
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>金額 (円)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                                このレッスンの売上金額を入力してください。
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center space-x-2 py-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <Checkbox
                        id="keepValues"
                        checked={keepValues}
                        onCheckedChange={(checked) => setKeepValues(checked as boolean)}
                    />
                    <label
                        htmlFor="keepValues"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 cursor-pointer select-none"
                    >
                        続けて次の報告を作成する（日時・場所を保持）
                    </label>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            送信中...
                        </>
                    ) : (
                        'レポートを送信'
                    )}
                </Button>
            </form>
        </Form>
    )
}
