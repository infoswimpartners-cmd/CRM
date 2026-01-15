'use client'

import { useEffect, useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Coach {
    id: string
    full_name: string
    avatar_url: string | null
}

interface CoachSelectProps {
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    excludeId?: string
}

export function CoachSelect({ value, onValueChange, placeholder = "コーチを選択", excludeId }: CoachSelectProps) {
    const [coaches, setCoaches] = useState<Coach[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCoaches = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'coach')
                .order('full_name')

            if (data) {
                setCoaches(data.filter(c => c.id !== excludeId))
            }
            setLoading(false)
        }
        fetchCoaches()
    }, [excludeId])

    return (
        <Select value={value} onValueChange={onValueChange} disabled={loading}>
            <SelectTrigger>
                <SelectValue placeholder={loading ? "読み込み中..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={coach.avatar_url || undefined} />
                                <AvatarFallback>{(coach.full_name || '?')[0]}</AvatarFallback>
                            </Avatar>
                            {coach.full_name || '名称未設定'}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
