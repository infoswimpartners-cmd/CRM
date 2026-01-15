'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'

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
    const [restrictedLessonId, setRestrictedLessonId] = useState<string | null>(null)

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
            price: 0,
        },
    })

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
        const fetchDefaultLesson = async () => {
            if (!selectedStudentId) {
                setRestrictedLessonId(null)
                return
            }

            const supabase = createClient()
            const { data } = await supabase
                .from('students')
                .select(`
                    membership_types (
                        default_lesson_master_id
                    )
                `)
                .eq('id', selectedStudentId)
                .single()

            // Safe navigation to get the default lesson ID
            // @ts-ignore: Complex generic type inference with Supabase joins
            const defaultLessonId = data?.membership_types?.default_lesson_master_id

            if (defaultLessonId) {
                form.setValue('lesson_master_id', defaultLessonId)
                setRestrictedLessonId(defaultLessonId)
            } else {
                setRestrictedLessonId(null)
            }
        }
        fetchDefaultLesson()
    }, [selectedStudentId, form])

    const displayMasters = restrictedLessonId
        ? lessonMasters.filter(m => m.id === restrictedLessonId)
        : lessonMasters

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        const supabase = createClient()

        // Get current user (coach)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            toast.error('レポートを送信するにはログインが必要です')
            setIsSubmitting(false)
            return
        }

        try {
            const { error } = await supabase.from('lessons').insert({
                coach_id: user.id,
                student_id: values.student_id || null, // Optional for now
                student_name: values.student_name,
                lesson_master_id: values.lesson_master_id,
                lesson_date: values.lesson_date.toISOString(),
                location: values.location,
                menu_description: values.menu_description || '',
                price: values.price,
            })

            if (error) throw error

            toast.success('レッスン報告を送信しました！')
            router.push('/coach')
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
                            <FormLabel>メニュー / 内容</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="W-UP, 50m x 10 クロール..."
                                    className="resize-none"
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
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormDescription>
                                このレッスンの売上金額を入力してください。
                            </FormDescription>
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
