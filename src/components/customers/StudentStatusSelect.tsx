'use client'

import { useState, useEffect } from 'react'
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

export function StudentStatusSelect({ studentId, initialStatus, compact = false }: Props) {
    const [status, setStatus] = useState(initialStatus || 'trial_pending')
    const [loading, setLoading] = useState(false)
    const [statuses, setStatuses] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchStatuses = async () => {
            const { data } = await supabase
                .from('student_statuses')
                .select('*')
                .order('display_order', { ascending: true })
            if (data) setStatuses(data)
        }
        fetchStatuses()
    }, [])

    const currentStatusConfig = statuses.find(s => s.id === status)
    const displayColor = currentStatusConfig?.color_class || 'bg-gray-100 text-gray-800'

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
                    displayColor,
                    compact && "h-6 px-2"
                )}
            >
                <div className="flex items-center gap-1">
                    <SelectValue placeholder="ステータス" />
                </div>
            </SelectTrigger>
            <SelectContent>
                {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                        {s.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
