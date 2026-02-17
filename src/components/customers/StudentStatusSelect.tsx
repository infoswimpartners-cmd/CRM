'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
    studentId: string
    initialStatus: string | null
    compact?: boolean
}

const statusLabels: Record<string, string> = {
    inquiry: '問合せ対応中',
    trial_pending: '体験予定',
    trial_done: '体験受講済',
    active: '会員',
    resting: '休会中',
    withdrawn: '退会'
}

const statusColors: Record<string, string> = {
    inquiry: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    trial_pending: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    trial_done: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    active: 'bg-green-100 text-green-800 hover:bg-green-200',
    resting: 'bg-gray-200 text-gray-600 hover:bg-gray-300',
    withdrawn: 'bg-red-100 text-red-800 hover:bg-red-200'
}

export function StudentStatusSelect({ studentId, initialStatus, compact = false }: Props) {
    const [status, setStatus] = useState(initialStatus || 'trial_pending')
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true)
        // Optimistic update
        const oldStatus = status
        setStatus(newStatus)

        try {
            const { error } = await supabase
                .from('students')
                .update({ status: newStatus })
                .eq('id', studentId)

            if (error) {
                throw error
            }
            toast.success('ステータスを更新しました')
        } catch (error) {
            // Revert on error
            setStatus(oldStatus)
            toast.error('ステータスの更新に失敗しました')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
            <SelectTrigger
                className={cn(
                    "h-7 text-xs border-0 rounded-full font-medium transition-colors focus:ring-0 focus:ring-offset-0 px-3",
                    statusColors[status],
                    compact && "h-6 px-2"
                )}
            >
                <div className="flex items-center gap-1">
                    <SelectValue placeholder="ステータス" />
                </div>
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
