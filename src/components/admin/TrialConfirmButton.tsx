
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { confirmTrialAndBill, getTrialEmailPreview } from '@/actions/onboarding'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { LocationSelect } from '@/components/forms/LocationSelect'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useRouter } from 'next/navigation'

interface Props {
    studentId: string
    studentName: string
    coaches: { id: string, full_name: string | null }[]
    assignedCoachId?: string | null // Add this to auto-select coach
    trialMasters: { id: string, name: string, unit_price: number, pair_unit_price: number | null, email_template_id: string | null }[]
    isPair?: boolean
}

export function TrialConfirmButton({ studentId, studentName, coaches, assignedCoachId, trialMasters = [], isPair = false }: Props) {
    const [open, setOpen] = useState(false)
    const [trialMasterId, setTrialMasterId] = useState(trialMasters[0]?.id || '')
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('10:00')
    const [endTime, setEndTime] = useState('11:00')
    const [coachId, setCoachId] = useState('')
    const [location, setLocation] = useState('') // Add location state
    const [isConfirming, setIsConfirming] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const router = useRouter()

    // 終了時間を常に開始時間＋60分に自動設定
    useEffect(() => {
        if (startTime) {
            const [sh, sm] = startTime.split(':').map(Number)
            const endD = new Date()
            endD.setHours(sh, sm, 0)
            endD.setMinutes(endD.getMinutes() + 60)

            const eh = endD.getHours().toString().padStart(2, '0')
            const em = endD.getMinutes().toString().padStart(2, '0')
            setEndTime(`${eh}:${em}`)
        }
    }, [startTime])

    // Auto-select coach when dialog opens if assigned
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        setIsConfirming(false) // リセット
        if (isOpen && assignedCoachId && !coachId) {
            setCoachId(assignedCoachId)
        }
    }

    const handleNext = async () => {
        if (!date) {
            toast.error('日時を選択してください')
            return
        }
        if (!coachId) {
            toast.error('担当コーチを選択してください')
            return
        }
        if (!location.trim()) {
            toast.error('レッスン場所を入力してください')
            return
        }

        setIsPreviewLoading(true)
        try {
            const startDateTime = new Date(date)
            const [sh, sm] = startTime.split(':').map(Number)
            startDateTime.setHours(sh, sm, 0)

            const res = await getTrialEmailPreview(studentId, startDateTime, trialMasterId)
            if (res.success && res.subject && res.body) {
                setEmailSubject(res.subject)
                setEmailBody(res.body)
                setIsConfirming(true)
            } else {
                toast.error('メールプレビューの取得に失敗しました', { description: res.error })
            }
        } catch (e: any) {
            console.error(e)
            toast.error('プレビュー通信エラー')
        } finally {
            setIsPreviewLoading(false)
        }
    }

    const handleConfirm = async () => {
        if (!date || !coachId || !location.trim()) return;

        setIsSubmitting(true)
        try {
            const startDateTime = new Date(date)
            const [sh, sm] = startTime.split(':').map(Number)
            startDateTime.setHours(sh, sm, 0)

            // @ts-ignore - server action signature update pending
            const res = await confirmTrialAndBill(studentId, startDateTime, coachId, location, trialMasterId, { subject: emailSubject, body: emailBody })

            if (res.success) {
                toast.success('体験確定処理が完了しました', { description: '決済メールを送信しました。' })
                setOpen(false)
                router.refresh()
            } else {
                toast.error('エラーが発生しました', { description: res.error })
            }
        } catch (e) {
            console.error(e)
            toast.error('通信エラー')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                    体験日程確定 & 請求
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>体験レッスンの確定</DialogTitle>
                    <DialogDescription>
                        {isConfirming
                            ? "以下の内容で体験レッスンを確定し、決済リンクを含むご案内メールを送信します。メール内容は編集可能です。"
                            : `${studentName} 様の体験レッスン日程を確定し、決済リンクをメール送信します。`
                        }
                    </DialogDescription>
                </DialogHeader>

                {!isConfirming ? (
                    <>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="trialType" className="text-right">体験種別</Label>
                                <div className="col-span-3">
                                    <Select value={trialMasterId} onValueChange={setTrialMasterId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="種別を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {trialMasters.map(m => {
                                                const price = isPair && m.pair_unit_price !== null ? m.pair_unit_price : m.unit_price;
                                                return (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.name} ({price.toLocaleString()}円)
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">日時</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    className="col-span-3"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4 mt-2">
                                <Label className="text-right mt-3">時間</Label>
                                <div className="col-span-3 flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs text-slate-500 w-8">開始</span>
                                        <Select
                                            value={startTime.split(':')[0]}
                                            onValueChange={(h) => setStartTime(`${h}:${startTime.split(':')[1]}`)}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="時" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 24 }).map((_, i) => {
                                                    const h = i.toString().padStart(2, '0')
                                                    return <SelectItem key={h} value={h}>{h}</SelectItem>
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm font-bold">:</span>
                                        <Select
                                            value={startTime.split(':')[1]}
                                            onValueChange={(m) => setStartTime(`${startTime.split(':')[0]}:${m}`)}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="分" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const m = (i * 5).toString().padStart(2, '0')
                                                    return <SelectItem key={m} value={m}>{m}</SelectItem>
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="text-xs text-slate-500 w-8">終了</span>
                                        <div className="flex flex-1 h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm shadow-sm items-center text-gray-600">
                                            {endTime} (自動)
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="coach" className="text-right">担当コーチ</Label>
                                <div className="col-span-3">
                                    <Select value={coachId} onValueChange={setCoachId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="コーチを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {coaches.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.full_name || '未設定のお客様'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">場所</Label>
                                <div className="col-span-3">
                                    <LocationSelect value={location} onChange={setLocation} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting || isPreviewLoading}>キャンセル</Button>
                            <Button onClick={handleNext} disabled={isSubmitting || isPreviewLoading}>
                                {isPreviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                確認画面へ
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <div className="grid gap-4 py-4 p-4 bg-slate-50 rounded-md border text-sm">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-slate-500 font-medium">体験種別</div>
                                <div className="col-span-2 font-bold">{trialMasters.find(m => m.id === trialMasterId)?.name || '未設定'}</div>

                                <div className="text-slate-500 font-medium">生徒名</div>
                                <div className="col-span-2 font-bold">{studentName} 様</div>

                                <div className="text-slate-500 font-medium">日時</div>
                                <div className="col-span-2">
                                    {new Date(date).toLocaleDateString('ja-JP')} <span className="ml-2 font-bold">{startTime} 〜 {endTime}</span>
                                </div>

                                <div className="text-slate-500 font-medium">担当コーチ</div>
                                <div className="col-span-2">{coaches.find(c => c.id === coachId)?.full_name || '未設定'}</div>

                                <div className="text-slate-500 font-medium">場所</div>
                                <div className="col-span-2">{location}</div>
                            </div>
                            <div className="mt-2 text-xs text-orange-600 font-bold mb-4">
                                ※ 確定と同時に、以下のメールが顧客へ送信されます。
                            </div>

                            <div className="flex flex-col gap-3 mt-4">
                                <div>
                                    <Label className="text-slate-600 font-bold">メール件名</Label>
                                    <Input
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-600 font-bold">メール本文</Label>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        className="mt-1 w-full min-h-[250px] p-2 border rounded-md text-sm leading-relaxed max-h-[400px]"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>戻る</Button>
                            <Button onClick={handleConfirm} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                確定して送信
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
