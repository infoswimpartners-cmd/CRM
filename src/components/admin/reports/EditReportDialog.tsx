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
    lesson_date: z.string(),
    lesson_master_id: z.string().min(1, 'レッスンの種類を選択してください'),
    location: z.string().min(1, '場所は必須です'),
    menu_description: z.string().optional(),
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
            lesson_date: new Date(report.lesson_date).toISOString().split('T')[0], // YYYY-MM-DD
            lesson_master_id: report.lesson_master_id,
            location: report.location,
            menu_description: report.menu_description || '',
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
        if (!confirm('変更内容を保存しますか？')) return

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
            const dateObj = new Date(values.lesson_date)
            const isoString = dateObj.toISOString()

            const result = await updateLessonReport(report.id, {
                ...values,
                lesson_date: isoString
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
            <DialogContent className="sm:max-w-[500px]">
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
                                    <FormItem>
                                        <FormLabel>実施日</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
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
                                    <FormLabel>売上金額</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            {...field}
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
                                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
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
                            control={form.control}
                            name="menu_description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>メモ・記録</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} rows={5} />
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
