'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { LocationSelect } from '@/components/forms/LocationSelect'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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

const formSchema = z.object({
    student_key: z.string().min(1, '生徒名は必須です'), // Combined id:name for simplicity in edit mode if needed, or just name
    student_name: z.string().min(1, '生徒名は必須です'),
    lesson_date: z.date({
        message: 'レッスン日時は必須です',
    }),
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
    price: z.coerce.number().min(0, '金額は0円以上である必要があります'),
    feedback_good: z.string().optional(),
    feedback_next: z.string().optional(),
    coach_comment: z.string().optional(),
})

interface LessonMaster {
    id: string
    name: string
    unit_price: number
}

type FormValues = z.infer<typeof formSchema>

interface EditLessonReportDialogProps {
    lesson: {
        id: string
        student_id: string | null
        student_name: string
        lesson_date: string
        lesson_master_id: string
        location: string
        menu_description: string | null
        price: number
        feedback_good?: string
        feedback_next?: string
        coach_comment?: string
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditLessonReportDialog({ lesson, open, onOpenChange }: EditLessonReportDialogProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lessonMasters, setLessonMasters] = useState<LessonMaster[]>([])

    // Load lesson masters on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: masters } = await supabase
                .from('lesson_masters')
                .select('id, name, unit_price')
                .eq('active', true)

            if (masters) setLessonMasters(masters)
        }
        fetchData()
    }, [])

    const form = useForm<FormValues>({
        // @ts-ignore: Resolver type mismatch
        resolver: zodResolver(formSchema),
        defaultValues: {
            student_name: lesson.student_name,
            lesson_date: new Date(lesson.lesson_date),
            lesson_master_id: lesson.lesson_master_id,
            location: lesson.location,
            menu_description: lesson.menu_description || '',
            price: lesson.price,
            student_key: lesson.student_name,
            feedback_good: lesson.feedback_good || '',
            feedback_next: lesson.feedback_next || '',
            coach_comment: lesson.coach_comment || ''
        },
    })

    // Update form values if lesson prop changes (e.g. valid re-render)
    useEffect(() => {
        if (open) {
            form.reset({
                student_name: lesson.student_name,
                lesson_date: new Date(lesson.lesson_date),
                lesson_master_id: lesson.lesson_master_id,
                location: lesson.location,
                menu_description: lesson.menu_description || '',
                price: lesson.price,
                student_key: lesson.student_name,
                feedback_good: lesson.feedback_good || '',
                feedback_next: lesson.feedback_next || '',
                coach_comment: lesson.coach_comment || '',
            })
        }
    }, [open, lesson, form])

    // Watch lesson_master_id to auto-update price ONLY if it changes by user interaction
    // Note: We might want to allow custom price editing, so auto-update should be careful not to overwrite custom price unless master changes.
    // For simplicity, we'll update price when master changes, assuming standard pricing.
    // However, in edit mode, the user might want to keep the old price even if master changes, OR they might want the new standard price.
    // Let's stick to: if master changes, update price.
    const selectedMasterId = form.watch('lesson_master_id')

    // We need to track the previous master ID to know if it actually changed
    // But for a simple approach, we can just let it update. 
    // Ideally, we shouldn't overwrite the initial load price unless the user interacts with the Select.
    // The current useEffect logic in Create form updates on change.
    // To avoid overwriting initial value on mount, we can skip if it matches default.

    // Actually, in the Create form, we update price when `selectedMasterId` changes.
    // Here, we want to do the same but ONLY if it's a user change, not the initial reset.
    // The simplest way is to manually handle onValueChange for the Select.

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true)
        const supabase = createClient()

        try {
            const { data: facility } = await supabase
                .from('facilities')
                .select('is_facility_fee_applied')
                .eq('name', values.location)
                .single()

            const facilityFee = facility?.is_facility_fee_applied ? 1500 : 0
            const master = lessonMasters.find(m => m.id === values.lesson_master_id)
            const finalPrice = (master?.unit_price ?? values.price) + facilityFee

            const { error } = await supabase
                .from('lessons')
                .update({
                    student_name: values.student_name,
                    lesson_master_id: values.lesson_master_id,
                    lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
                    location: values.location,
                    menu_description: values.menu_description || '',
                    price: finalPrice,
                    feedback_good: values.feedback_good || '',
                    feedback_next: values.feedback_next || '',
                    coach_comment: values.coach_comment || '',
                })
                .eq('id', lesson.id)

            if (error) throw error

            toast.success('レッスン報告を更新しました')
            onOpenChange(false)
            window.location.reload()
        } catch (error: any) {
            console.error('Error updating report:', error)
            toast.error(error?.message || '更新に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleMasterChange = (value: string) => {
        form.setValue('lesson_master_id', value)
        const master = lessonMasters.find(m => m.id === value)
        if (master) {
            form.setValue('price', master.unit_price)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>レッスン報告の編集</DialogTitle>
                    <DialogDescription>
                        過去の報告内容を修正します。
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    {/* @ts-ignore: Type mismatch */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control as any}
                            name="student_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>生徒名</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        生徒の変更は現在できません（名前の修正のみ）
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
                                    <Select onValueChange={handleMasterChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="レッスンを選択" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {lessonMasters.map((master) => (
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="feedback_good"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            良かった点
                                            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100 font-normal">メンバーサイトに反映</Badge>
                                        </FormLabel>
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
                                        <FormLabel className="flex items-center gap-2">
                                            次回の課題
                                            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100 font-normal">メンバーサイトに反映</Badge>
                                        </FormLabel>
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

                        {/* コーチコメント */}
                        <FormField
                            control={form.control as any}
                            name="coach_comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>コーチコメント</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="コーチからのコメント" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* 金額 (自動計算) */}
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

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        更新
                                    </>
                                ) : (
                                    '更新する'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
