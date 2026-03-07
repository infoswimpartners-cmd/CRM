'use client'

import { useState } from 'react'
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
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LocationSelect } from '@/components/forms/LocationSelect'
import { updateLessonReport } from '@/actions/report'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
    price: z.number().min(0),
    billing_price: z.number().min(0),
})

interface EditReportDialogProps {
    report: any
    lessonMasters: any[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditReportDialog({ report, lessonMasters, open, onOpenChange, onSuccess }: EditReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            student_id: report.student_id || '',
            student_name: report.student_name,
            lesson_date: new Date(report.lesson_date),
            lesson_master_id: report.lesson_master_id,
            location: report.location,
            menu_description: report.menu_description || '',
            feedback_good: report.feedback_good || '',
            feedback_next: report.feedback_next || '',
            coach_comment: report.coach_comment || '',
            price: report.price,
            billing_price: report.billing_price !== null && report.billing_price !== undefined ? report.billing_price : report.price,
        },
    })

    const handleLessonMasterChange = (value: string) => {
        const selectedMaster = lessonMasters.find(m => m.id === value)
        if (selectedMaster) {
            form.setValue('price', selectedMaster.unit_price)
            form.setValue('billing_price', selectedMaster.unit_price)
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        try {
            // Need to reconstruct full ISO string if time is missing or just use date?
            // Original logic used ISO. Let's append time or just ensure format.
            // Actually, keep time if present? 
            // The input type="date" returns YYYY-MM-DD. 
            // Original data has full ISO. 
            // Let's assume user wants to edit Date, not Time? 
            // Or just save as YYYY-MM-DDT00:00:00?
            // The `report.ts` expects ISO string.

            // If they change date, time is lost unless we handle it. 
            // For now, let's just use what date picker gives + current time or 00:00.
            const dateObj = values.lesson_date
            const dateString = format(dateObj, 'yyyy-MM-dd')

            const result = await updateLessonReport(report.id, {
                ...values,
                lesson_date: dateString
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('レッスン報告を更新しました')
            onSuccess()
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>レッスン報告の編集</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="student_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>生徒名</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="lesson_master_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>レッスン種類</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                handleLessonMasterChange(value)
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="レッスン種類を選択" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {lessonMasters.map((master) => (
                                                    <SelectItem key={master.id} value={master.id}>
                                                        {master.name}
                                                        {master.is_trial ? ' (体験)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                        </div>
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
                                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="billing_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>請求金額 (生徒への請求)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                readOnly
                                                className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                            control={form.control}
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

                        {/* フィードバック良かった点 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
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
                            {/* フィードバック次回の課題 */}
                            <FormField
                                control={form.control}
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
                            control={form.control}
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? '保存中...' : '保存'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    )
}
