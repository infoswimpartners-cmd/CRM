'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarIcon } from 'lucide-react'
import { format, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface AddOpenSlotsDialogProps {
    onSuccess?: () => void
    open: boolean
    onOpenChange: (open: boolean) => void
}

// 曜日の定義
const DAYS_OF_WEEK = [
    { label: '日', value: 0 },
    { label: '月', value: 1 },
    { label: '火', value: 2 },
    { label: '水', value: 3 },
    { label: '木', value: 4 },
    { label: '金', value: 5 },
    { label: '土', value: 6 },
]

export function AddOpenSlotsDialog({ onSuccess, open, onOpenChange }: AddOpenSlotsDialogProps) {
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [coaches, setCoaches] = useState<{ id: string, full_name: string | null }[]>([])
    const [selectedCoachId, setSelectedCoachId] = useState<string>('')
    const [currentUser, setCurrentUser] = useState<any>(null)

    // フォーム用ステート
    const [selectedDays, setSelectedDays] = useState<number[]>([]) // 選択された曜日 [0-6]
    const [startTime, setStartTime] = useState('10:00')
    const [endTime, setEndTime] = useState('11:00')
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

    // 初期化処理
    useEffect(() => {
        if (!open) return
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            setCurrentUser(user)
            setSelectedCoachId(user.id)

            // ロール確認
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                setIsAdmin(true)
                // 管理者の場合は全コーチのリストを取得
                const { data: allCoaches } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('role', ['coach', 'admin'])
                    .order('full_name')

                if (allCoaches) setCoaches(allCoaches as any)
            }
        }
        init()
    }, [open])

    // 開始時間が変更されたら自動的に1時間後を終了時間に設定
    const handleStartTimeChange = (time: string) => {
        setStartTime(time)
        const [h, m] = time.split(':').map(Number)
        const endHour = (h + 1) % 24
        const formattedEnd = `${endHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        setEndTime(formattedEnd)
    }

    const toggleDay = (dayVal: number) => {
        setSelectedDays(prev => 
            prev.includes(dayVal) 
                ? prev.filter(d => d !== dayVal) 
                : [...prev, dayVal]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDate) {
            toast.error('日付を選択してください')
            return
        }

        setLoading(true)
        const supabase = createClient()

        try {
            let records: any[] = []

            if (selectedDays.length > 0) {
                // 曜日が選択されている場合：定期会員枠と単発枠をその月の該当曜日に一括登録
                const start = startOfMonth(selectedDate)
                const end = endOfMonth(selectedDate)
                const allDates = eachDayOfInterval({ start, end })
                
                // 選択された曜日に合致する日付を抽出
                const targetDates = allDates.filter(date => selectedDays.includes(date.getDay()))

                if (targetDates.length === 0) {
                    toast.error('選択した日付の月内に、指定した曜日はありません')
                    setLoading(false)
                    return
                }

                targetDates.forEach(date => {
                    const startSlot = new Date(date)
                    const [sh, sm] = startTime.split(':').map(Number)
                    startSlot.setHours(sh, sm, 0)

                    const endSlot = new Date(date)
                    const [eh, em] = endTime.split(':').map(Number)
                    endSlot.setHours(eh, em, 0)

                    // 終了時間が開始時間より前の場合は翌日扱いにする
                    if (eh < sh) {
                        endSlot.setDate(endSlot.getDate() + 1)
                    }

                    // 1. 定期会員の枠
                    records.push({
                        coach_id: selectedCoachId,
                        student_id: null,
                        lesson_master_id: null,
                        start_time: startSlot.toISOString(),
                        end_time: endSlot.toISOString(),
                        title: '【定期】空き枠',
                        location: '',
                        notes: '空き枠定期登録',
                        is_overage: false,
                        billing_status: 'pending',
                        price: null
                    })

                    // 2. 単発の枠
                    records.push({
                        coach_id: selectedCoachId,
                        student_id: null,
                        lesson_master_id: null,
                        start_time: startSlot.toISOString(),
                        end_time: endSlot.toISOString(),
                        title: '【単発】空き枠',
                        location: '',
                        notes: '空き枠単発登録',
                        is_overage: false,
                        billing_status: 'pending',
                        price: null
                    })
                })
            } else {
                // 曜日が選択されていない場合：選択された日付に単発の空き枠を登録
                const startSlot = new Date(selectedDate)
                const [sh, sm] = startTime.split(':').map(Number)
                startSlot.setHours(sh, sm, 0)

                const endSlot = new Date(selectedDate)
                const [eh, em] = endTime.split(':').map(Number)
                endSlot.setHours(eh, em, 0)

                // 終了時間が開始時間より前の場合は翌日扱いにする
                if (eh < sh) {
                    endSlot.setDate(endSlot.getDate() + 1)
                }

                records.push({
                    coach_id: selectedCoachId,
                    student_id: null,
                    lesson_master_id: null,
                    start_time: startSlot.toISOString(),
                    end_time: endSlot.toISOString(),
                    title: '【単発】空き枠',
                    location: '',
                    notes: '空き枠単発個別登録',
                    is_overage: false,
                    billing_status: 'pending',
                    price: null
                })
            }

            // Supabaseへ一括インサート
            const { error } = await supabase
                .from('lesson_schedules')
                .insert(records)

            if (error) throw error

            toast.success(`${records.length}件の空き枠を登録しました`)
            
            // 成功ハンドラーの実行
            if (onSuccess) {
                onSuccess()
            }
            handleClose()
        } catch (err: any) {
            console.error('Failed to add open slots:', err)
            toast.error(`登録に失敗しました: ${err.message || '不明なエラー'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setSelectedDays([])
        setStartTime('10:00')
        setEndTime('11:00')
        setSelectedDate(undefined)
        if (currentUser) setSelectedCoachId(currentUser.id)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) handleClose()
            else onOpenChange(v)
        }}>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="text-lg font-bold text-slate-800">空き枠の一括登録</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                        指定期間内の特定の曜日に、予約可能な「空き枠」のスケジュールをまとめて登録します。
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-3">
                    {/* 管理者用：コーチ選択 */}
                    {isAdmin && (
                        <div className="grid gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <Label className="text-slate-700 font-bold text-xs">担当コーチ (管理者機能)</Label>
                            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                                <SelectTrigger className="bg-white text-xs h-9">
                                    <SelectValue placeholder="コーチを選択" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {coaches.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name || '未設定'}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* 曜日選択 */}
                    <div className="space-y-2">
                        <div className="flex flex-col gap-0.5">
                            <Label className="text-xs font-bold text-slate-700">登録する曜日 (定期/単発一括登録)</Label>
                            <span className="text-[10px] text-slate-400 leading-normal">
                                曜日を選択した場合は、選択日付の月に自動で定期会員枠と単発枠の双方を一括登録します。曜日を選択しない場合は、選択日付に単発枠のみを登録します。
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                            {DAYS_OF_WEEK.map((day) => {
                                const isChecked = selectedDays.includes(day.value)
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleDay(day.value)}
                                        className={cn(
                                            "flex-1 h-9 rounded-lg border font-bold text-xs transition-all flex items-center justify-center cursor-pointer",
                                            isChecked
                                                ? "bg-cyan-50 border-cyan-300 text-cyan-700 shadow-sm shadow-cyan-50"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {day.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 時間帯選択 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">開始時間</Label>
                            <Select value={startTime} onValueChange={handleStartTimeChange}>
                                <SelectTrigger className="bg-white text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] bg-white">
                                    {Array.from({ length: 24 * 4 }).map((_, i) => {
                                        const h = Math.floor(i / 4).toString().padStart(2, '0')
                                        const m = ((i % 4) * 15).toString().padStart(2, '0')
                                        const time = `${h}:${m}`
                                        return <SelectItem key={time} value={time} className="text-xs">{time}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">終了時間</Label>
                            <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger className="bg-white text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] bg-white">
                                    {Array.from({ length: 24 * 4 }).map((_, i) => {
                                        const h = Math.floor(i / 4).toString().padStart(2, '0')
                                        const m = ((i % 4) * 15).toString().padStart(2, '0')
                                        const time = `${h}:${m}`
                                        return <SelectItem key={time} value={time} className="text-xs">{time}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 日付選択 */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                        <Label className="text-xs font-bold text-slate-700">日付 <span className="text-red-500">*</span></Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-white h-9 text-xs border-slate-200",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                                    {selectedDate ? format(selectedDate, "yyyy/MM/dd") : <span>日付を選択</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white border shadow-lg" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* アクションフッター */}
                    <DialogFooter className="border-t border-slate-100 pt-3 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs h-9 cursor-pointer"
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm text-xs h-9 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    登録中...
                                </>
                            ) : (
                                '登録する'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
