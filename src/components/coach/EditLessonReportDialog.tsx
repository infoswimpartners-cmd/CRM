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
            student_key: lesson.student_name // Just using name for display/validation consistency for now
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
                student_key: lesson.student_name
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
            const { error } = await supabase
                .from('lessons')
                .update({
                    student_name: values.student_name,
                    lesson_master_id: values.lesson_master_id,
                    lesson_date: values.lesson_date.toISOString(),
                    location: values.location,
                    menu_description: values.menu_description || '',
                    price: values.price,
                })
                .eq('id', lesson.id)

            if (error) throw error

            toast.success('レッスン報告を更新しました')
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error('Error updating report:', error)
            toast.error('更新に失敗しました')
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
                                        <Input {...field} />
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
                                            className="resize-none h-20"
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
