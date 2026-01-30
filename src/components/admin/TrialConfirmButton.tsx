
'use client'

import { useState } from 'react'
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
import { confirmTrialAndBill } from '@/actions/onboarding'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

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
}

export function TrialConfirmButton({ studentId, studentName, coaches, assignedCoachId }: Props) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState('')
    const [coachId, setCoachId] = useState('')
    const [location, setLocation] = useState('') // Add location state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    // Auto-select coach when dialog opens if assigned
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen && assignedCoachId && !coachId) {
            setCoachId(assignedCoachId)
        }
    }

    const handleConfirm = async () => {
        if (!date) {
            toast({ title: '日時を選択してください', variant: 'destructive' })
            return
        }
        if (!coachId) {
            toast({ title: '担当コーチを選択してください', variant: 'destructive' })
            return
        }
        if (!location.trim()) {
            toast({ title: 'レッスン場所を入力してください', variant: 'destructive' })
            return
        }

        setIsSubmitting(true)
        try {
            const lessonDate = new Date(date)
            // @ts-ignore - server action signature update pending
            const res = await confirmTrialAndBill(studentId, lessonDate, coachId, location)

            if (res.success) {
                toast({ title: '体験確定処理が完了しました', description: '決済メールを送信しました。' })
                setOpen(false)
                router.refresh()
            } else {
                toast({ title: 'エラーが発生しました', description: res.error, variant: 'destructive' })
            }
        } catch (e) {
            console.error(e)
            toast({ title: '通信エラー', variant: 'destructive' })
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>体験レッスンの確定</DialogTitle>
                    <DialogDescription>
                        {studentName} 様の体験レッスン日程を確定し、決済リンクをメール送信します。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            日時
                        </Label>
                        <Input
                            id="date"
                            type="datetime-local"
                            step="600"
                            className="col-span-3"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="coach" className="text-right">
                            担当コーチ
                        </Label>
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
                        <Label htmlFor="location" className="text-right">
                            場所
                        </Label>
                        <Input
                            id="location"
                            type="text"
                            placeholder="例: 〇〇市民プール"
                            className="col-span-3"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>キャンセル</Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        確定して送信
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
