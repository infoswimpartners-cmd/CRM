'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Plus, Trash2, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { addCoachAvailability, deleteCoachAvailability, updateBaseArea } from "@/actions/coach-availability"

interface Availability {
    id: string
    day_of_week: string
    time_of_day: string
    area: string
    notes?: string | null
}

interface CoachAvailabilitySettingsProps {
    coachId: string
    initialAvailabilities: Availability[]
    baseArea: string | null
}

const DAYS_OF_WEEK = ['月', '火', '水', '木', '金', '土', '日']
const TIMES_OF_DAY = ['午前', '午後', '夕方', '終日']

export function CoachAvailabilitySettings({ coachId, initialAvailabilities, baseArea }: CoachAvailabilitySettingsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // フォームの入力項目
    const [selectedDays, setSelectedDays] = useState<string[]>([])
    const [timeMode, setTimeMode] = useState<'preset' | 'range' | 'until'>('preset')
    const [timeOfDayPreset, setTimeOfDayPreset] = useState('午前')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [area, setArea] = useState('')
    const [notes, setNotes] = useState('')

    // ダイアログが開いたときに基本エリアをプリフィルする
    useEffect(() => {
        if (isOpen) {
            setArea(baseArea || '')
        }
    }, [isOpen, baseArea])

    // 基本エリアのローカルステート
    const [localBaseArea, setLocalBaseArea] = useState(baseArea || '')
    const [isSavingBaseArea, setIsSavingBaseArea] = useState(false)

    // baseArea propsが更新されたら同期する
    useEffect(() => {
        setLocalBaseArea(baseArea || '')
    }, [baseArea])

    const handleSaveBaseArea = async () => {
        setIsSavingBaseArea(true)
        try {
            const res = await updateBaseArea(coachId, localBaseArea)
            if (res.success) {
                toast.success('基本エリアを更新しました')
            } else {
                toast.error(res.error || '基本エリアの更新に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('基本エリアの更新に失敗しました')
        } finally {
            setIsSavingBaseArea(false)
        }
    }

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        )
    }

    const selectWeekdays = () => {
        setSelectedDays(['月', '火', '水', '木', '金'])
    }

    const selectWeekends = () => {
        setSelectedDays(['土', '日'])
    }

    const handleAdd = () => {
        if (selectedDays.length === 0) {
            toast.error('曜日を選択してください')
            return
        }

        // 時間帯の組み立て
        let timeVal = ''
        if (timeMode === 'preset') {
            timeVal = timeOfDayPreset
        } else if (timeMode === 'range') {
            if (!startTime || !endTime) {
                toast.error('開始時間と終了時間を選択してください')
                return
            }
            timeVal = `${startTime}〜${endTime}`
        } else if (timeMode === 'until') {
            if (!endTime) {
                toast.error('終了時間を選択してください')
                return
            }
            timeVal = `〜${endTime}`
        }

        if (!area.trim()) {
            toast.error('エリアを入力してください')
            return
        }

        startTransition(async () => {
            const res = await addCoachAvailability(coachId, selectedDays, timeVal, area, notes)
            if (res.success) {
                toast.success('稼働可能枠を追加しました')
                setSelectedDays([])
                setStartTime('')
                setEndTime('')
                setArea('')
                setNotes('')
                setIsOpen(false)
            } else {
                toast.error(res.error || '追加に失敗しました')
            }
        })
    }

    const handleDelete = (id: string) => {
        setDeletingId(id)
        startTransition(async () => {
            const res = await deleteCoachAvailability(id, coachId)
            if (res.success) {
                toast.success('稼働可能枠を削除しました')
            } else {
                toast.error(res.error || '削除に失敗しました')
            }
            setDeletingId(null)
        })
    }

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-cyan-600" />
                        稼働可能枠設定
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-slate-500">
                        レッスン可能な曜日、時間帯、エリアを登録します。
                    </CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-1 rounded-xl">
                            <Plus className="h-4 w-4" />
                            追加
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>稼働可能枠の追加</DialogTitle>
                            <DialogDescription>
                                コーチが稼働できる条件を入力してください。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>曜日（複数選択可）</Label>
                                <div className="grid grid-cols-4 gap-2 pt-1">
                                    {DAYS_OF_WEEK.map(day => {
                                        const isChecked = selectedDays.includes(day)
                                        return (
                                            <div key={day} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`day-${day}`}
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleDay(day)}
                                                />
                                                <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm">{day}曜日</Label>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={selectWeekdays}
                                        className="text-xs text-cyan-700 border-cyan-200 hover:bg-cyan-50 h-8 rounded-lg"
                                    >
                                        平日のみ (月〜金)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={selectWeekends}
                                        className="text-xs text-cyan-700 border-cyan-200 hover:bg-cyan-50 h-8 rounded-lg"
                                    >
                                        土日のみ (土・日)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedDays([])}
                                        className="text-xs text-slate-500 h-8 rounded-lg hover:bg-slate-50"
                                    >
                                        クリア
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>時間帯の指定方法</Label>
                                <Tabs value={timeMode} onValueChange={(v: any) => setTimeMode(v)} className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full h-9 p-1 bg-slate-100 rounded-lg mb-2">
                                        <TabsTrigger value="preset" className="text-xs font-bold py-1">時間帯</TabsTrigger>
                                        <TabsTrigger value="range" className="text-xs font-bold py-1">時間指定</TabsTrigger>
                                        <TabsTrigger value="until" className="text-xs font-bold py-1">〜何時まで</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="preset" className="pt-1">
                                        <Select value={timeOfDayPreset} onValueChange={setTimeOfDayPreset}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="時間帯を選択" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIMES_OF_DAY.map(time => (
                                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TabsContent>
                                    <TabsContent value="range" className="pt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="grid flex-1 gap-1">
                                                <Label htmlFor="start_time" className="text-[10px] text-slate-500">開始時刻</Label>
                                                <Input
                                                    id="start_time"
                                                    type="time"
                                                    value={startTime}
                                                    onChange={e => setStartTime(e.target.value)}
                                                    className="h-9"
                                                />
                                            </div>
                                            <span className="text-slate-400 mt-4">〜</span>
                                            <div className="grid flex-1 gap-1">
                                                <Label htmlFor="end_time" className="text-[10px] text-slate-500">終了時刻</Label>
                                                <Input
                                                    id="end_time"
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="until" className="pt-1">
                                        <div className="grid gap-1">
                                            <Label htmlFor="until_time" className="text-[10px] text-slate-500">終了時刻</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id="until_time"
                                                    type="time"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                    className="h-9 flex-1"
                                                />
                                                <span className="text-sm text-slate-600 font-semibold whitespace-nowrap">まで</span>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="area">エリア</Label>
                                <Input
                                    id="area"
                                    value={area}
                                    onChange={e => setArea(e.target.value)}
                                    placeholder="例: 新宿・渋谷、城東エリア"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">自由記入欄（メモ）</Label>
                                <Input
                                    id="notes"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="例: 日によっては可能、15時以降のみ など"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                                キャンセル
                            </Button>
                            <Button onClick={handleAdd} disabled={isPending} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                追加する
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 基本エリア設定のインラインUI */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 border rounded-xl">
                    <div className="grid gap-1">
                        <Label htmlFor="base_area_input" className="text-sm font-bold text-slate-700">基本エリア</Label>
                        <span className="text-[10px] text-slate-500">このコーチが主に稼働するエリア（新規登録時のデフォルト）</span>
                    </div>
                    <div className="flex flex-1 gap-2 max-w-md items-center sm:ml-auto w-full">
                        <Input
                            id="base_area_input"
                            value={localBaseArea}
                            onChange={e => setLocalBaseArea(e.target.value)}
                            placeholder="例: 新宿・渋谷、城東エリア"
                            className="bg-white h-9"
                        />
                        <Button
                            size="sm"
                            onClick={handleSaveBaseArea}
                            disabled={isSavingBaseArea}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-9 rounded-lg shrink-0 px-4"
                        >
                            {isSavingBaseArea ? <Loader2 className="h-4 w-4 animate-spin" /> : '基本エリア保存'}
                        </Button>
                    </div>
                </div>

                {initialAvailabilities.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
                        登録されている稼働可能枠はありません。
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="w-[80px] font-bold text-slate-700">曜日</TableHead>
                                    <TableHead className="w-[100px] font-bold text-slate-700">時間帯</TableHead>
                                    <TableHead className="w-[150px] font-bold text-slate-700">エリア</TableHead>
                                    <TableHead className="font-bold text-slate-700">自由記入欄（メモ）</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialAvailabilities.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-900">{item.day_of_week}曜日</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
                                                {item.time_of_day}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-700">{item.area}</TableCell>
                                        <TableCell className="text-slate-600 text-sm whitespace-pre-wrap">
                                            {item.notes || <span className="text-slate-400 italic text-xs">未入力</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                                title="削除"
                                            >
                                                {deletingId === item.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
