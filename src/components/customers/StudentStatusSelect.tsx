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
import { updateStudentStatus } from '@/actions/student'

interface Props {
    studentId: string
    initialStatus: string | null
    compact?: boolean
    statuses?: any[]
}

/**
 * SchoolHubデザインシステムに基づくステータストークン配色
 * 受講中: ミント (emerald)
 * 体験系: ゴールド (amber)
 * 休会: ペリウィンクル (indigo)
 * 退会: グレー (slate)
 * 問合せ: スカイ (sky)
 */
function getSchoolHubStatusColor(statusId: string | null, fallbackColor?: string): string {
    switch (statusId) {
        case 'active':
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/70'
        case 'trial_pending':
        case 'trial_billed':
        case 'trial_confirmed':
        case 'trial_done':
            return 'bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100/70'
        case 'resting':
            return 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100/70'
        case 'withdrawn':
            return 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70'
        case 'inquiry':
            return 'bg-sky-50 text-sky-700 border border-sky-200/80 hover:bg-sky-100/70'
        default:
            return fallbackColor || 'bg-slate-50 text-slate-600 border border-slate-200'
    }
}

export function StudentStatusSelect({ studentId, initialStatus, compact = false, statuses: propStatuses }: Props) {
    const [status, setStatus] = useState(initialStatus || 'trial_pending')
    const [loading, setLoading] = useState(false)
    const [localStatuses, setLocalStatuses] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus)
        }
    }, [initialStatus])

    useEffect(() => {
        if (propStatuses && propStatuses.length > 0) {
            setLocalStatuses(propStatuses)
            return
        }

        const fetchStatuses = async () => {
            const { data } = await supabase
                .from('student_statuses')
                .select('*')
                .order('display_order', { ascending: true })
            if (data) setLocalStatuses(data)
        }
        fetchStatuses()
    }, [propStatuses])

    const currentStatusConfig = localStatuses.find(s => s.id === status)
    const displayColor = getSchoolHubStatusColor(status, currentStatusConfig?.color_class)

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true)
        // 楽観的更新
        const oldStatus = status
        setStatus(newStatus)

        try {
            // Stripe解約やLINEステップ配信自動停止トリガーを含むServer Actionを実行
            const res = await updateStudentStatus(studentId, newStatus)
            if (res && !res.success) {
                throw new Error(res.error || 'ステータスの更新に失敗しました')
            }
            toast.success('ステータスを更新しました')
        } catch (error: any) {
            // エラー時はロールバック
            setStatus(oldStatus)
            toast.error(error?.message || 'ステータスの更新に失敗しました')
            console.error('[StudentStatusSelect] Update Error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
            <SelectTrigger
                className={cn(
                    "h-7 text-xs rounded-full font-medium transition-colors focus:ring-0 focus:ring-offset-0 px-3 shadow-2xs",
                    displayColor,
                    compact && "h-6 px-2"
                )}
            >
                <div className="flex items-center gap-1">
                    <SelectValue placeholder="ステータス" />
                </div>
            </SelectTrigger>
            <SelectContent>
                {localStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                        {s.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

