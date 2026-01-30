'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDownIcon } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    trial_confirmed: 'bg-blue-100 text-blue-800', // Blue for confirmed
    trial_done: 'bg-purple-100 text-purple-800',
    active: 'bg-green-100 text-green-800',
    resting: 'bg-gray-200 text-gray-600',
    withdrawn: 'bg-red-100 text-red-800'
}

export function StudentStatusSelect({ studentId, currentStatus }: StudentStatusSelectProps) {
    const [status, setStatus] = useState(currentStatus || 'trial_pending')
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleChange = async (newStatus: string) => {
        // ... (existing logic)
        if (newStatus === status) return
        if (newStatus === 'withdrawn') {
            if (!confirm('ステータスを「退会」に変更しますか？\n\n※注意: Stripeのサブスクリプション（定期課金）が即座に解約され、会員種別も解除されます。')) {
                return
            }
        }

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

    return (
        <Select
            value={status}
            onValueChange={handleChange}
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
    )
}
