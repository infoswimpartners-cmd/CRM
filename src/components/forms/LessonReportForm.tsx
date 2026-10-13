'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { submitLessonReport } from '@/actions/report'
import { getCurrentCoachRewardRate } from '@/actions/coaches'
import { getPendingSchedulesAction } from '@/actions/schedule'
import { cn, formatCurrency } from '@/lib/utils'
import { calculateLessonReward, DEFAULT_REWARD_SETTINGS, RewardSettings } from '@/lib/reward-system'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
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
import { LocationSelect } from './LocationSelect'
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
    price: z.coerce.number().min(0, '金額は0円以上である必要があります'),
    schedule_id: z.string().optional(),
    attendance_type: z.string().optional(),
})

interface LessonMaster {
    id: string
    name: string
    unit_price: number
    pair_unit_price?: number | null
    is_trial: boolean
}

// 体験レッスンの最適なlesson_master_idを自動判定するヘルパー
function determineTrialMasterId(
    scheduleOrDuration: { 
        lesson_master_id?: string | null, 
        start_time?: string, 
        end_time?: string, 
        title?: string, 
        notes?: string,
        lesson_master?: { id: string, name: string, is_trial?: boolean, unit_price?: number } | null 
    } | null,
    masters: LessonMaster[]
): string {
    const trialMasters = masters.filter(m => m.is_trial)
    if (trialMasters.length === 0) return ''

    // 1. スケジュールに紐づくマスタ情報の取得
    const linkedMaster = scheduleOrDuration?.lesson_master || 
        (scheduleOrDuration?.lesson_master_id ? masters.find(m => m.id === scheduleOrDuration.lesson_master_id) : null)

    // 2. 90分判定（所要時間 >= 80分、またはタイトル/備考/紐づくマスタ名に「90」が含まれるか）
    let is90Min = false
    if (scheduleOrDuration?.start_time && scheduleOrDuration?.end_time) {
        const start = new Date(scheduleOrDuration.start_time).getTime()
        const end = new Date(scheduleOrDuration.end_time).getTime()
        const duration = Math.round((end - start) / 60000)
        if (duration >= 80) is90Min = true
    }
    if (scheduleOrDuration?.title?.includes('90') || scheduleOrDuration?.notes?.includes('90')) {
        is90Min = true
    }
    if (linkedMaster?.name?.includes('90') || (linkedMaster?.unit_price && linkedMaster.unit_price >= 9000 && !linkedMaster.name?.includes('2名'))) {
        is90Min = true
    }

    const master90 = trialMasters.find(m => m.name.includes('90') || (m.unit_price && m.unit_price >= 9000 && !m.name.includes('2名')))
    const master60 = trialMasters.find(m => !m.name.includes('90') && m.name.includes('初回') && !m.name.includes('2名'))
        || trialMasters.find(m => !m.name.includes('90') && !m.name.includes('2名'))
        || trialMasters[0]

    if (is90Min) {
        // 90分の場合は90分マスタを優先
        if (scheduleOrDuration?.lesson_master_id) {
            const matched = trialMasters.find(m => m.id === scheduleOrDuration.lesson_master_id)
            if (matched && (matched.name.includes('90') || matched.unit_price >= 9000)) {
                return matched.id
            }
        }
        return master90?.id || master60?.id || ''
    } else {
        // 60分の場合は60分マスタを優先（スケジュールに既に有効な60分体験マスタが紐づいていればそれを使用）
        if (scheduleOrDuration?.lesson_master_id) {
            const matched = trialMasters.find(m => m.id === scheduleOrDuration.lesson_master_id)
            if (matched && !matched.name.includes('90') && matched.id !== '9e4e15a8-38f0-47b5-b548-831377bdf427') {
                return matched.id
            }
        }
        return master60?.id || ''
    }
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
    const [isCancellation, setIsCancellation] = useState(false)
    const [coachRate, setCoachRate] = useState<number>(0.5)
    const [isAdminRole, setIsAdminRole] = useState(false)
    const [student, setStudent] = useState<any>(null)
    const [isTwoPersonLesson, setIsTwoPersonLesson] = useState(false)
    const [isDefaultDistantOption, setIsDefaultDistantOption] = useState(false)
    const [coachDistantFee, setCoachDistantFee] = useState(0)
    const [isFacilityFeeApplied, setIsFacilityFeeApplied] = useState(false)
    const [rewardSettings, setRewardSettings] = useState<RewardSettings>(DEFAULT_REWARD_SETTINGS)
    const [estimatedReward, setEstimatedReward] = useState<number>(0)
    const [pendingSchedules, setPendingSchedules] = useState<any[]>([])
    const searchParams = useSearchParams()
    const scheduleIdFromUrl = searchParams.get('scheduleId')
    const isFillingFromScheduleRef = useRef(false)

    // Load lesson masters and current user on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()

            // Fetch masters
            const { data: masters } = await supabase
                .from('lesson_masters')
                .select('id, name, unit_price, pair_unit_price, is_trial')
                .eq('active', true)
                .order('display_order', { ascending: true })

            if (masters) setLessonMasters(masters as any)

            // Fetch current user (coach)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setCoachId(user.id)
                // Fetch rate and profile info (distant fee)
                const rateResult = await getCurrentCoachRewardRate(user.id)
                if (rateResult.success) {
                    setCoachRate(rateResult.rate)
                    // @ts-ignore (isAdmin returned from action)
                    setIsAdminRole(!!rateResult.isAdmin)
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('distant_reward_fee')
                    .eq('id', user.id)
                    .single()
                if (profile) setCoachDistantFee(profile.distant_reward_fee || 0)
                
                // Fetch Reward Settings
                const { data: config } = await supabase
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'reward_settings')
                    .single()
                if (config) {
                    try {
                        setRewardSettings(JSON.parse(config.value))
                    } catch (e) {
                        console.error('Error parsing reward settings:', e)
                    }
                }

                // Fetch pending schedules
                const schedulesResult = await getPendingSchedulesAction(user.id)
                if (schedulesResult.success) setPendingSchedules(schedulesResult.data || [])
            }
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
            price: 0,
            schedule_id: scheduleIdFromUrl || '',
            attendance_type: 'both',
        },
    })

    // Helper to fill form from schedule
    const fillFormFromSchedule = (schedule: any) => {
        if (!schedule) return

        isFillingFromScheduleRef.current = true

        const studentsData: any = schedule.students
        const student = Array.isArray(studentsData) ? studentsData[0] : studentsData

        const studentId = student?.id
        let studentName = student?.full_name

        if (schedule.attendance_type === 'student2' && student?.second_student_name) {
            studentName = student.second_student_name
        } else if (schedule.attendance_type === 'both' && student?.second_student_name) {
            studentName = `${student.full_name} & ${student.second_student_name}`
        }

        form.setValue('schedule_id', schedule.id)
        if (studentId) form.setValue('student_id', studentId)
        if (studentName) form.setValue('student_name', studentName)
        if (schedule.start_time) form.setValue('lesson_date', new Date(schedule.start_time))
        if (schedule.location) {
            form.setValue('location', schedule.location)
            const supabase = createClient()
            supabase.from('facilities').select('is_facility_fee_applied').eq('name', schedule.location).single()
                .then(({ data }) => setIsFacilityFeeApplied(!!data?.is_facility_fee_applied))
        }
        form.setValue('attendance_type', schedule.attendance_type || 'both')
        setIsTwoPersonLesson(!!student?.is_two_person_lesson)
        setIsDefaultDistantOption(!!student?.is_default_distant_option)
        setStudent(student)

        // 体験レッスンおよびレッスン種別の即座自動選択ロジック
        const membership = Array.isArray(student?.membership_types)
            ? student.membership_types[0]
            : student?.membership_types

        const isTrialStudent = ['trial_pending', 'trial_confirmed', 'trial_billed', 'trial_done', 'applied', 'inquired'].includes(student?.status) ||
            (!student?.membership_type_id && !membership?.id && student?.status !== 'active' && student?.status !== 'withdrawn')

        const isTrial = 
            schedule.lesson_master?.is_trial === true ||
            (schedule.lesson_master_id && lessonMasters.find(m => m.id === schedule.lesson_master_id)?.is_trial) ||
            schedule.title?.includes('体験') ||
            schedule.notes?.includes('体験') ||
            isTrialStudent

        if (isTrial) {
            const trialMasters = lessonMasters.filter(m => m.is_trial)
            const trialIds = trialMasters.map(m => m.id)
            setRestrictedLessonIds(trialIds)

            const targetMasterId = determineTrialMasterId(schedule, lessonMasters)
            if (targetMasterId) {
                form.setValue('lesson_master_id', targetMasterId)
            }
        } else if (membership?.id) {
            const allowed = membership.membership_type_lessons || []
            const ids = allowed.map((a: any) => a.lesson_master_id)
            if (ids.length > 0) {
                setRestrictedLessonIds(ids)
                if (schedule.lesson_master_id && ids.includes(schedule.lesson_master_id)) {
                    form.setValue('lesson_master_id', schedule.lesson_master_id)
                } else if (membership.default_lesson_master_id && ids.includes(membership.default_lesson_master_id)) {
                    form.setValue('lesson_master_id', membership.default_lesson_master_id)
                } else {
                    form.setValue('lesson_master_id', ids[0])
                }
            } else {
                setRestrictedLessonIds(null)
                if (schedule.lesson_master_id) {
                    form.setValue('lesson_master_id', schedule.lesson_master_id)
                }
            }
        } else {
            setRestrictedLessonIds(null)
            if (schedule.lesson_master_id) {
                form.setValue('lesson_master_id', schedule.lesson_master_id)
            }
        }
    }

    // Load schedule data if scheduleIdFromUrl is provided
    useEffect(() => {
        if (!scheduleIdFromUrl || !coachId || lessonMasters.length === 0) return

        const fetchSchedule = async () => {
            const supabase = createClient()
            const { data: schedule } = await supabase
                .from('lesson_schedules')
                .select(`
                    *,
                    students (
                        id,
                        full_name,
                        second_student_name,
                        is_two_person_lesson,
                        is_default_distant_option,
                        status,
                        membership_type_id,
                        apply_pair_pricing,
                        membership_types!students_membership_type_id_fkey (
                            id,
                            name,
                            default_lesson_master_id,
                            membership_type_lessons (lesson_master_id, reward_price)
                        )
                    ),
                    lesson_master:lesson_masters (
                        id,
                        name,
                        unit_price,
                        pair_unit_price,
                        is_trial
                    )
                `)
                .eq('id', scheduleIdFromUrl)
                .single()

            if (schedule) {
                fillFormFromSchedule(schedule)
            }
        }
        fetchSchedule()
    }, [scheduleIdFromUrl, coachId, lessonMasters])

    // Watch lesson_master_id and student to auto-update price
    const selectedMasterId = form.watch('lesson_master_id')
    const attendanceType = form.watch('attendance_type') || 'both'
    useEffect(() => {
        const master = lessonMasters.find(m => m.id === selectedMasterId)
        if (!master) return

        const facilityFee = isFacilityFeeApplied ? 1500 : 0
        const isPair = !!student?.is_two_person_lesson && attendanceType === 'both'
        const applyPairPrice = !!student?.apply_pair_pricing && isPair

        let basePrice = master.unit_price
        if (applyPairPrice && master.pair_unit_price) {
            basePrice = master.pair_unit_price
        }

        form.setValue('price', basePrice + facilityFee)
    }, [selectedMasterId, student, attendanceType, isFacilityFeeApplied, lessonMasters, form])

    useEffect(() => {
        if (isCancellation) {
            form.setValue('location', 'キャンセル')
            form.setValue('menu_description', '前日12時以降のキャンセル')
            if (!form.getValues('lesson_date')) {
                form.setValue('lesson_date', new Date())
            }
        } else {
            form.setValue('location', '')
            form.setValue('menu_description', '')
        }
    }, [isCancellation, form])

    // Watch student_id to auto-select default lesson based on membership type AND restrict options
    const selectedStudentId = form.watch('student_id')
    useEffect(() => {
        const fetchAllowedLessons = async () => {
            if (!selectedStudentId) {
                setRestrictedLessonIds(null)
                setStudent(null)
                return
            }

            // スケジュール選択直後で既に一括反映されている場合は二重フェッチ・上書きをスキップ
            if (isFillingFromScheduleRef.current) {
                isFillingFromScheduleRef.current = false
                return
            }

            const supabase = createClient()

            // 1. Get Student's Membership Type ID, Status and Pair flag
            const { data: studentData } = await supabase
                .from('students')
                .select(`
                    membership_type_id, 
                    is_two_person_lesson, 
                    is_default_distant_option, 
                    full_name, 
                    second_student_name, 
                    apply_pair_pricing,
                    status,
                    membership_types!students_membership_type_id_fkey (
                        id,
                        default_lesson_master_id,
                        membership_type_lessons (lesson_master_id, reward_price)
                    )
                `)
                .eq('id', selectedStudentId)
                .single()

            if (studentData) {
                setStudent(studentData)
                setIsTwoPersonLesson(!!studentData.is_two_person_lesson)
                setIsDefaultDistantOption(!!studentData.is_default_distant_option)
            }

            const membership = Array.isArray(studentData?.membership_types)
                ? studentData.membership_types[0]
                : studentData?.membership_types

            // 体験生徒の判定
            const isTrialStudent = 
                ['trial_pending', 'trial_confirmed', 'trial_billed', 'trial_done', 'applied', 'inquired'].includes(studentData?.status) ||
                (!studentData?.membership_type_id && !membership?.id && studentData?.status !== 'active' && studentData?.status !== 'withdrawn')

            if (isTrialStudent) {
                const trialMasters = lessonMasters.filter(m => m.is_trial)
                const trialIds = trialMasters.map(m => m.id)
                setRestrictedLessonIds(trialIds)

                const currentMasterId = form.getValues('lesson_master_id')
                // 既に有効な体験レッスンが選択されている場合は維持し、そうでなければ即座に自動選択
                if (!currentMasterId || !trialIds.includes(currentMasterId)) {
                    const targetMasterId = determineTrialMasterId(null, lessonMasters)
                    if (targetMasterId) {
                        form.setValue('lesson_master_id', targetMasterId)
                    }
                }
                return
            }

            if (!membership?.id) {
                setRestrictedLessonIds(null)
                return
            }

            // 2. Get Allowed Lessons for that Membership Type
            const { data: allowed } = await supabase
                .from('membership_type_lessons')
                .select('lesson_master_id')
                .eq('membership_type_id', membership.id)

            if (allowed && allowed.length > 0) {
                const ids = allowed.map(a => a.lesson_master_id)
                setRestrictedLessonIds(ids)

                // IMPORTANT: Only reset if the current selection is NOT allowed for this student
                const currentMasterId = form.getValues('lesson_master_id')
                if (!currentMasterId || !ids.includes(currentMasterId)) {
                    // Auto-select if default lesson exists or fallback
                    if (membership.default_lesson_master_id && ids.includes(membership.default_lesson_master_id)) {
                        form.setValue('lesson_master_id', membership.default_lesson_master_id)
                    } else if (ids.length === 1) {
                        form.setValue('lesson_master_id', ids[0])
                    } else {
                        form.setValue('lesson_master_id', ids[0])
                    }
                }
            } else {
                setRestrictedLessonIds([]) // No allowed lessons found
                form.setValue('lesson_master_id', '')
                form.setValue('price', 0)
            }
        }
        fetchAllowedLessons()
    }, [selectedStudentId, form, lessonMasters])

    // Watch location to update facility fee flag
    const selectedLocation = form.watch('location')
    useEffect(() => {
        if (!selectedLocation) {
            setIsFacilityFeeApplied(false)
            return
        }
        const fetchFacility = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('facilities')
                .select('is_facility_fee_applied')
                .eq('name', selectedLocation)
                .single()
            setIsFacilityFeeApplied(!!data?.is_facility_fee_applied)
        }
        fetchFacility()
    }, [selectedLocation])

    // Recalculate estimated reward
    const currentPrice = form.watch('price')
    useEffect(() => {
        if (isCancellation) {
            setEstimatedReward(0)
            return
        }

        const masterRaw = lessonMasters.find(m => m.id === selectedMasterId)
        if (!masterRaw) {
            setEstimatedReward(0)
            return
        }

        // Use core calculation logic to ensure consistency
        const mockLesson: any = {
            price: currentPrice,
            attendance_type: form.watch('attendance_type') || 'both',
            lesson_masters: masterRaw,
            students: {
                is_two_person_lesson: isTwoPersonLesson,
                is_default_distant_option: isDefaultDistantOption,
                membership_types: student?.membership_types
            },
            profiles: {
                role: isAdminRole ? 'admin' : 'coach',
                distant_reward_fee: coachDistantFee
            }
        }
        
        setEstimatedReward(calculateLessonReward(mockLesson, coachRate, rewardSettings))
    }, [selectedMasterId, coachRate, isTwoPersonLesson, isFacilityFeeApplied, isDefaultDistantOption, coachDistantFee, isCancellation, lessonMasters, currentPrice, isAdminRole, rewardSettings])

    const displayMasters = restrictedLessonIds !== null
        ? lessonMasters.filter(m => restrictedLessonIds.includes(m.id))
        : lessonMasters

    const handleAttendanceTypeChange = (value: string) => {
        if (student) {
            if (value === 'student1') {
                form.setValue('student_name', student.full_name)
            } else if (value === 'student2' && student.second_student_name) {
                form.setValue('student_name', student.second_student_name)
            } else if (value === 'both' && student.second_student_name) {
                form.setValue('student_name', `${student.full_name} & ${student.second_student_name}`)
            }
        }
    }

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)

        try {
            // Convert date to ISO string for server action
            const payload = {
                ...values,
                lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
                schedule_id: values.schedule_id || undefined,
            }

            const result = await submitLessonReport(payload)

            if (!result.success) {
                throw new Error(typeof result.error === 'string' ? result.error : 'Submission failed')
            }

            // Show success toast with optional action
            const lessonId = (result as any).lessonId
            toast.success('レッスン報告を送信しました！', {
                action: lessonId ? {
                    label: '動画を追加',
                    onClick: () => router.push(`/coach/lessons/${lessonId}/media`)
                } : undefined,
                duration: 5000,
            })

            if (keepValues) {
                // Keep Date, Location, Menu, Comment, Lesson Type. Reset only Student
                const currentValues = form.getValues()
                form.reset({
                    ...currentValues,
                    student_id: '',
                    student_name: '',
                    schedule_id: '',
                }, { keepDefaultValues: false }) // Reset to these as new defaults

                // Clear scheduleId from URL to prevent unwanted re-fills while staying on page
                if (scheduleIdFromUrl) {
                    router.replace('/coach/report', { scroll: false })
                }

                // Scroll to top to encourage next entry
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setIsCancellation(false)
            } else {
                router.push('/coach')
            }
        } catch (error: any) {
            console.error('Error submitting report:', error)
            const message = error.message || '送信に失敗しました。もう一度お試しください。'
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }


    return (
        <Form {...form}>
            {/* @ts-ignore: Type mismatch in SubmitHandler */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <FormLabel className="text-slate-700 font-bold mb-2 block">登録済みのスケジュールから選択</FormLabel>
                    <Select 
                        onValueChange={(id) => {
                            if (id === 'none') {
                                form.setValue('schedule_id', '')
                                return
                            }
                            const schedule = pendingSchedules.find(s => s.id === id)
                            if (schedule) fillFormFromSchedule(schedule)
                        }}
                        value={form.watch('schedule_id') || 'none'}
                    >
                        <SelectTrigger className="bg-white w-full overflow-hidden">
                            <div className="truncate w-full text-left">
                                <SelectValue placeholder="未報告のスケジュールを選択（任意）" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-slate-400 italic">選択解除（手動入力）</SelectItem>
                            {pendingSchedules.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {format(new Date(s.start_time), 'MM/dd HH:mm')} - {s.students?.full_name || '名称未設定'} {s.title ? `(${s.title})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-500 mt-2">
                        ※スケジュールを選択すると、生徒名・日時・場所・レッスン種別が自動入力されます。
                    </p>
                </div>

                <FormField
                    control={form.control as any}
                    name="student_name"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>生徒名</FormLabel>
                            <FormControl>
                                <StudentSelect
                                    onSelect={(id, name) => {
                                        form.setValue('schedule_id', '')
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

                {isTwoPersonLesson && (
                    <FormField
                        control={form.control as any}
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
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="出席区分を選択" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="both">2名とも出席 (ペア)</SelectItem>
                                        <SelectItem value="student1">{student?.full_name || '1人目'} のみ出席 (単体)</SelectItem>
                                        <SelectItem value="student2">{student?.second_student_name || '2人目'} のみ出席 (単体)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control as any}
                    name="lesson_master_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>レッスンの種類</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-full overflow-hidden">
                                        <div className="truncate w-full text-left">
                                            <SelectValue placeholder="レッスンを選択" />
                                        </div>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {displayMasters.map((master) => (
                                        <SelectItem key={master.id} value={master.id}>
                                            <div className="flex justify-between w-full items-center gap-2 overflow-hidden">
                                                <span className="truncate flex-1">{master.name}</span>
                                                <span className="text-slate-400 text-[10px] shrink-0">¥{master.unit_price.toLocaleString()}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="py-2 border-y border-slate-100 my-4">
                    <div className="flex flex-col gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(
                                "w-full md:w-auto font-bold transition-colors",
                                isCancellation
                                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                                    : "text-slate-600 hover:bg-slate-100"
                            )}
                            onClick={() => setIsCancellation(!isCancellation)}
                        >
                            {isCancellation ? "キャンセル報告モード（クリックで解除）" : "キャンセルの報告（入力項目の免除）"}
                        </Button>
                        <p className="text-sm font-bold text-red-500">
                            ※注意事項：前日12時以降のキャンセルのみ適応
                        </p>
                    </div>
                </div>

                <div className={cn("space-y-6", isCancellation && "hidden")}>
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
                                    <LocationSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                                <FormDescription>
                                    登録済みの施設マスタから場所を選択してください。
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control as any}
                        name="menu_description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    メニュー内容 / メモ
                                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100 font-normal">メンバーサイトに反映</Badge>
                                </FormLabel>
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

                </div>
                <FormField
                    control={form.control as any}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>金額 (円)</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    {...field}
                                    readOnly
                                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                />
                            </FormControl>
                            <FormDescription>
                                レッスンの種類に応じて自動的に計算されます。
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                    <div>
                        <p className="text-xs text-blue-600 font-bold mb-1 italic">想定報酬単価（ランク計上分込）</p>
                        <p className="text-2xl font-black text-blue-900 leading-none">
                            {formatCurrency(estimatedReward)}
                        </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-blue-100">
                        <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 py-1">
                            適用レート: {isAdminRole ? '100% (管理者)' : `${(coachRate * 100).toFixed(0)}%`}
                        </Badge>
                        {!isAdminRole && isTwoPersonLesson && (
                            <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full" />
                                ペア手当 (¥1,000) 適用中
                            </div>
                        )}
                        {isDefaultDistantOption && (
                            <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full" />
                                遠方対応手当 (¥{coachDistantFee.toLocaleString()}) 適用中
                            </div>
                        )}
                        {isFacilityFeeApplied && (
                            <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                                <span className="w-1 h-1 bg-blue-400 rounded-full" />
                                施設利用手当 (¥1,500) 適用中
                            </div>
                        )}
                    </div>
                </div>

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
