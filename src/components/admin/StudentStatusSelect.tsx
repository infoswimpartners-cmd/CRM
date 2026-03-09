'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDownIcon, AlertTriangle } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { updateStudentStatus } from '@/actions/student'
import { cn } from '@/lib/utils'

interface StudentStatusSelectProps {
    studentId: string
    currentStatus: string
}

export const statusLabels: Record<string, string> = {
    trial_pending: '体験予定',
    trial_confirmed: '体験確定',
    trial_done: '体験受講済',
    active: '会員',
    resting: '休会中',
    withdrawn: '退会'
}

export const statusColors: Record<string, string> = {
    trial_pending: 'bg-gray-100 text-gray-800',
    trial_confirmed: 'bg-blue-100 text-blue-800',
    trial_done: 'bg-purple-100 text-purple-800',
    active: 'bg-green-100 text-green-800',
    resting: 'bg-gray-200 text-gray-600',
    withdrawn: 'bg-red-100 text-red-800'
}

export function StudentStatusSelect({ studentId, currentStatus }: StudentStatusSelectProps) {
    const [status, setStatus] = useState(currentStatus || 'trial_pending')
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSelectChange = (newStatus: string) => {
        if (newStatus === status) return
        setPendingStatus(newStatus)
        setIsDialogOpen(true)
    }

    const executeStatusChange = async () => {
        if (!pendingStatus) return

        const newStatus = pendingStatus
        setIsDialogOpen(false)
        setLoading(true)

        try {
            const result = await updateStudentStatus(studentId, newStatus)
            if (!result.success) throw new Error(result.error)

            setStatus(newStatus)
            const label = statusLabels[newStatus] || newStatus

            if (newStatus === 'withdrawn') {
                toast.warning(`ステータスを「${label}」に変更しました。課金は停止されました。`)
            } else {
                toast.success(`ステータスを「${label}」に変更しました`)
            }
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setLoading(false)
            setPendingStatus(null)
        }
    }

    if (!mounted) {
        return (
            <div
                className={cn(
                    "w-[140px] h-7 text-xs font-medium border-0 shadow-none focus:ring-0 flex items-center justify-between px-3 rounded-md pointer-events-none opacity-50",
                    statusColors[status] || 'bg-gray-100'
                )}
            >
                <span className="truncate">{statusLabels[status]}</span>
                <ChevronDownIcon className="size-4 opacity-50" />
            </div>
        )
    }

    const pendingLabel = pendingStatus ? statusLabels[pendingStatus] : ''

    return (
        <>
            <Select
                value={status}
                onValueChange={handleSelectChange}
                disabled={loading}
            >
                <SelectTrigger
                    className={cn(
                        "w-[140px] h-7 text-xs font-medium border-0 shadow-none focus:ring-0",
                        statusColors[status] || 'bg-gray-100'
                    )}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ステータス変更の確認
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <p>
                                    生徒のステータスを <span className="font-bold text-slate-900">「{statusLabels[status]}」</span> から
                                    <span className="font-bold text-indigo-600">「{pendingLabel}」</span> に変更しますか？
                                </p>
                                {pendingStatus === 'withdrawn' && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-800 text-sm">
                                        <strong>注意:</strong> 「退会」に変更すると、Stripeのサブスクリプション（定期課金）が即座に解約され、会員種別も解除されます。この操作は慎重行ってください。
                                    </div>
                                )}
                                {pendingStatus === 'active' && status !== 'active' && (
                                    <p className="text-sm text-slate-500">
                                        ※ 「会員」に変更すると、すでに会員種別が設定されている場合は課金が発生する可能性があります。
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingStatus(null)}>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeStatusChange}
                            className={cn(pendingStatus === 'withdrawn' ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700")}
                        >
                            変更する
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
