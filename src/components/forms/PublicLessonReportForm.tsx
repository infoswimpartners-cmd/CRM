'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from 'lucide-react'

import { submitPublicLessonReport } from '@/actions/report'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"


const formSchema = z.object({
    coach_id: z.string().min(1, 'コーチを選択してください'),
    student_id: z.string().optional(), // Can be empty if searching fails, but name is required
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.date({
        message: 'レッスン日時は必須です',
    }),
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    price: z.coerce.number().min(0, '金額は0円以上である必要があります'),
})

type FormValues = z.infer<typeof formSchema>

interface LessonMaster {
    id: string
    name: string
    unit_price: number
}

interface Coach {
    id: string
    full_name: string
}

interface Student {
    id: string
    full_name: string
    default_master_id?: string
}

export function PublicLessonReportForm() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])
    const [coaches, setCoaches] = useState<Coach[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [openStudentSelect, setOpenStudentSelect] = useState(false)
    const [coachNumber, setCoachNumber] = useState('')
    const [foundCoach, setFoundCoach] = useState<Coach | null>(null)
    const [isLoadingCoach, setIsLoadingCoach] = useState(false)
    const [restrictedLessonId, setRestrictedLessonId] = useState<string | null>(null)

    // Filter masters based on restriction
    const displayMasters = restrictedLessonId
        ? lessonMasters.filter(m => m.id === restrictedLessonId)
        : lessonMasters

    // Load static data on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()

            // Fetch active lesson masters
            const { data: masters, error: mastersError } = await supabase
                .from('lesson_masters')
                .select('id, name, unit_price')
                .eq('active', true)

            if (masters) setLessonMasters(masters)
            if (mastersError) console.error("Error fetching masters (public):", mastersError)

            // Fetch Coaches (Public Profiles)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'coach')
                .order('full_name')

            if (profiles) setCoaches(profiles)
        }
        fetchData()
    }, [])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            coach_id: '',
            student_id: '',
            student_name: '',
            // @ts-ignore
            lesson_date: undefined,
            lesson_master_id: '',
            location: '',
            menu_description: '',
            price: 0,
        },
    })

    const selectedCoachId = form.watch('coach_id')
    const selectedMasterId = form.watch('lesson_master_id')

    // Find Coach by Number
    const handleCoachLookup = async () => {
        if (!coachNumber) return
        setIsLoadingCoach(true)
        setFoundCoach(null)
        form.setValue('coach_id', '')

        const supabase = createClient()
        const searchId = `C${coachNumber}`

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('coach_number', searchId)
            .single()

        if (data) {
            setFoundCoach(data)
            form.setValue('coach_id', data.id)
            toast.success(`担当コーチ: ${data.full_name}`)
        } else {
            toast.error('コーチが見つかりません。IDを確認してください。')
        }
        setIsLoadingCoach(false)
    }

    // Fetch students when coach is selected
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedCoachId) {
                setStudents([])
                setRestrictedLessonId(null)
                form.setValue('student_id', '')
                form.setValue('student_name', '')
                return
            }
            const supabase = createClient()
            const { data, error } = await supabase.rpc('get_students_for_coach_public', {
                p_coach_id: selectedCoachId
            })
            if (data) setStudents(data)
            if (error) console.error("Error fetching students via RPC:", error)
        }
        fetchStudents()
    }, [selectedCoachId])

    // Update price when master changes
    useEffect(() => {
        const master = lessonMasters.find(m => m.id === selectedMasterId)
        if (master) {
            form.setValue('price', master.unit_price)
        }
    }, [selectedMasterId, lessonMasters, form])

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)

        try {
            // Server Action
            const result = await submitPublicLessonReport({
                ...values,
                lesson_date: values.lesson_date.toISOString() as any,
            })

            if (!result.success) {
                console.error('Server Action Error:', result.error, result.details)
                throw new Error(result.error as string)
            }

            toast.success('レポートを送信しました！')
            form.reset()
            router.push('/')
        } catch (error: any) {
            console.error('Error submitting report:', error)
            toast.error(error.message || '送信に失敗しました。')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (

        <Form {...form}>
            {/* @ts-ignore */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Step 1: Input Coach ID */}
                <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                    <FormItem>
                        <FormLabel>コーチID</FormLabel>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">C</span>
                                <Input
                                    className="pl-8 h-12 text-base md:text-sm"
                                    placeholder="0000"
                                    value={coachNumber}
                                    onChange={(e) => {
                                        // Allow only numbers
                                        const val = e.target.value.replace(/[^0-9]/g, '')
                                        setCoachNumber(val)
                                    }}
                                    // Trigger lookup on Enter?
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleCoachLookup()
                                        }
                                    }}
                                    maxLength={4} // Assuming 4 digits based on C-0000 placeholder
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={handleCoachLookup}
                                disabled={isLoadingCoach || !coachNumber}
                                className="h-12 px-6"
                            >
                                {isLoadingCoach ? <Loader2 className="h-4 w-4 animate-spin" /> : '検索'}
                            </Button>
                        </div>
                        <FormDescription>
                            お手元のIDカード等に記載されたIDを入力してください
                        </FormDescription>
                    </FormItem>

                    {foundCoach && (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                            <Check className="h-4 w-4" />
                            <span className="font-bold">{foundCoach.full_name}</span> コーチを確認しました
                        </div>
                    )}

                    {/* Hidden field for coach_id logic to work with form validation */}
                    <div className="hidden">
                        <FormField
                            control={form.control as any}
                            name="coach_id"
                            render={({ field }) => (
                                <Input {...field} />
                            )}
                        />
                    </div>
                </div>

                {/* Step 2: Select Student */}
                <FormField
                    control={form.control as any}
                    name="student_name"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>生徒名</FormLabel>
                            <Popover open={openStudentSelect} onOpenChange={setOpenStudentSelect}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between h-12 text-base md:text-sm",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            disabled={!selectedCoachId} // Disable until coach is selected
                                        >
                                            {field.value || "生徒を選択..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="名前で検索..." className="h-12 text-base md:text-sm" />
                                        <CommandList>
                                            <CommandEmpty>見つかりません</CommandEmpty>
                                            <CommandGroup>
                                                {students.map((student) => (
                                                    <CommandItem
                                                        value={student.full_name}
                                                        key={student.id}
                                                        className="py-3 text-base md:text-sm"
                                                        onSelect={() => {
                                                            form.setValue("student_id", student.id)
                                                            form.setValue("student_name", student.full_name)

                                                            // Auto-select and Restrict Default Lesson Master if exists
                                                            if (student.default_master_id) {
                                                                form.setValue("lesson_master_id", student.default_master_id)
                                                                setRestrictedLessonId(student.default_master_id)

                                                                // Find master name for toast
                                                                const masterName = lessonMasters.find(m => m.id === student.default_master_id)?.name
                                                                toast.success(masterName ? `レッスン種別を「${masterName}」に固定しました` : 'レッスン種別を自動設定しました')
                                                            } else {
                                                                setRestrictedLessonId(null)
                                                            }

                                                            setOpenStudentSelect(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                student.full_name === field.value
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {student.full_name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                ※担当コーチを選択するとリストが表示されます
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Step 3: Lesson Details (Same as normal) */}
                <FormField
                    control={form.control as any}
                    name="lesson_master_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>レッスンの種類</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 text-base md:text-sm">
                                        <SelectValue placeholder="レッスンを選択" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {displayMasters.map((master) => (
                                        <SelectItem key={master.id} value={master.id} className="py-3 text-base md:text-sm">
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
                                                "w-full pl-3 text-left font-normal h-12 text-base md:text-sm",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
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
                                    />
                                </PopoverContent>
                            </Popover>
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
                                <Input placeholder="〇〇市民プール" {...field} className="h-12 text-base md:text-sm" />
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
                            <FormLabel>メニュー / 内容</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="W-UP, 50m x 10 クロール..."
                                    className="resize-none text-base md:text-sm min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
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
                                <Input type="number" {...field} className="h-12 text-base md:text-sm" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
