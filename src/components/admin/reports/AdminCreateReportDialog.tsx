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
    feedback_good: z.string().optional(),
    feedback_next: z.string().optional(),
    coach_comment: z.string().optional(),
    price: z.number().min(0),
})

interface AdminCreateReportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AdminCreateReportDialog({ open, onOpenChange }: AdminCreateReportDialogProps) {
    const [loading, setLoading] = useState(false)
    const [coaches, setCoaches] = useState<any[]>([])
    const [lessonMasters, setLessonMasters] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    const [restrictedLessonIds, setRestrictedLessonIds] = useState<string[] | null>(null)
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
            feedback_good: '',
            feedback_next: '',
            coach_comment: '',
            price: 0,
        },
    })

    // コーチ・レッスン種類をロード
    useEffect(() => {
        if (!open) return
        const fetchInitialData = async () => {
            const supabase = createClient()
            const [{ data: coachList }, { data: masters }] = await Promise.all([
                supabase.from('profiles').select('id, full_name').in('role', ['coach', 'admin', 'owner']).order('full_name'),
                supabase.from('lesson_masters').select('id, name, unit_price').eq('active', true).order('display_order'),
            ])
            if (coachList) setCoaches(coachList)
            if (masters) setLessonMasters(masters)
        }
        fetchInitialData()
        form.reset()
        setStudents([])
        setRestrictedLessonIds(null)
    }, [open, form])

    // コーチが変わったら担当生徒を再フェッチ
    const selectedCoachId = form.watch('coach_id')
    useEffect(() => {
        if (!selectedCoachId) {
            setStudents([])
            return
        }
        const fetchStudents = async () => {
            const supabase = createClient()
            // junction テーブルから生徒を取得
            const [{ data: directStudents }, { data: junctionStudents }] = await Promise.all([
                supabase.from('students').select('id, full_name').eq('coach_id', selectedCoachId).order('full_name'),
                supabase.from('student_coaches').select('students(id, full_name)').eq('coach_id', selectedCoachId),
            ])
            const combined: { id: string; full_name: string }[] = [...(directStudents || [])]
            junctionStudents?.forEach((j: any) => {
                const s = j.students
                if (s && !combined.find(c => c.id === s.id)) combined.push(s)
            })
            combined.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ja'))
            setStudents(combined)
            // コーチ変更時に生徒選択をリセット
            form.setValue('student_id', '')
            form.setValue('student_name', '')
        }
        fetchStudents()
    }, [selectedCoachId, form])

    // 生徒が変わったら許可レッスンを制限
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
                .select('membership_type_id')
                .eq('id', selectedStudentId)
                .single()
            if (!student?.membership_type_id) { setRestrictedLessonIds(null); return }
            const { data: allowed } = await supabase
                .from('membership_type_lessons')
                .select('lesson_master_id')
                .eq('membership_type_id', student.membership_type_id)
            if (allowed && allowed.length > 0) {
                const ids = allowed.map((a: any) => a.lesson_master_id)
                setRestrictedLessonIds(ids)
                const current = form.getValues('lesson_master_id')
                if (!current || !ids.includes(current)) {
                    form.setValue('lesson_master_id', ids.length === 1 ? ids[0] : '')
                    if (ids.length !== 1) form.setValue('price', 0)
                }
            } else {
                setRestrictedLessonIds([])
                form.setValue('lesson_master_id', '')
                form.setValue('price', 0)
            }
        }
        fetchAllowed()
    }, [selectedStudentId, form])

    // レッスン種別が変わったら金額を更新
    const handleLessonMasterChange = (value: string) => {
        const master = lessonMasters.find(m => m.id === value)
        if (master) form.setValue('price', master.unit_price)
    }

    const displayMasters = restrictedLessonIds !== null
        ? lessonMasters.filter(m => restrictedLessonIds.includes(m.id))
        : lessonMasters

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
                feedback_good: values.feedback_good || '',
                feedback_next: values.feedback_next || '',
                coach_comment: values.coach_comment || '',
                price: values.price,
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
                                            onValueChange={(val) => {
                                                if (val === '__manual__') {
                                                    form.setValue('student_id', '')
                                                } else {
                                                    const s = students.find(s => s.id === val)
                                                    form.setValue('student_id', val)
                                                    form.setValue('student_name', s?.full_name || '')
                                                }
                                            }}
                                            disabled={!selectedCoachId}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder={selectedCoachId ? "生徒を選択" : "先にコーチを選択"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__manual__">手入力</SelectItem>
                                                {students.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                                ))}
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

                        {/* フィードバック */}
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
                                            <Textarea placeholder="以前より改善された点など" className="resize-none min-h-[70px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                            <Textarea placeholder="次回意識すべきポイントなど" className="resize-none min-h-[70px]" {...field} />
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
