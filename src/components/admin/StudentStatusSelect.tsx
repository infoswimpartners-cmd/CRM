'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
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

// statusLabels and statusColors are now handled dynamically via state fetched from DB


export function StudentStatusSelect({ studentId, currentStatus }: StudentStatusSelectProps) {
    const [status, setStatus] = useState(currentStatus || 'trial_pending')
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)
    const [statuses, setStatuses] = useState<any[]>([])
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        setMounted(true)
        fetchStatuses()
    }, [])

    const fetchStatuses = async () => {
        const { data } = await supabase
            .from('student_statuses')
            .select('*')
            .order('display_order', { ascending: true })
        if (data) setStatuses(data)
    }

    const getStatusLabel = (id: string) => statuses.find(s => s.id === id)?.name || id
    const getStatusColor = (id: string) => statuses.find(s => s.id === id)?.color_class || 'bg-gray-100 text-gray-800'


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
            const label = getStatusLabel(newStatus)

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

    if (!mounted || statuses.length === 0) {
        return (
            <div
                className={cn(
                    "w-[140px] h-7 text-xs font-medium border-0 shadow-none focus:ring-0 flex items-center justify-between px-3 rounded-md pointer-events-none opacity-50",
                    getStatusColor(status)
                )}
            >
                <span className="truncate">{getStatusLabel(status)}</span>
                <ChevronDownIcon className="size-4 opacity-50" />
            </div>
        )
    }

    const pendingLabel = pendingStatus ? getStatusLabel(pendingStatus) : ''

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
                        getStatusColor(status)
                    )}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                                    生徒のステータスを <span className="font-bold text-slate-900">「{getStatusLabel(status)}」</span> から
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
