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

interface MembershipType {
    id: string
    name: string
}

interface Props {
    studentId: string
    initialMembershipTypeId: string | null
    compact?: boolean
}

export function StudentMembershipSelect({ studentId, initialMembershipTypeId, compact = false }: Props) {
    const [membershipTypeId, setMembershipTypeId] = useState<string>(initialMembershipTypeId || 'none')
    const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const fetchMembershipTypes = async () => {
            const { data } = await supabase
                .from('membership_types')
                .select('id, name')
                .eq('active', true)
                .order('fee', { ascending: true })

            if (data) {
                setMembershipTypes(data)
            }
        }
        fetchMembershipTypes()
    }, [])

    const handleChange = async (newId: string) => {
        setLoading(true)
        // Optimistic update
        const oldId = membershipTypeId
        setMembershipTypeId(newId)

        const updateValue = newId === 'none' ? null : newId

        try {
            const { error } = await supabase
                .from('students')
                .update({ membership_type_id: updateValue })
                .eq('id', studentId)

            if (error) {
                throw error
            }
            toast.success('会員区分を更新しました')
        } catch (error) {
            // Revert on error
            setMembershipTypeId(oldId)
            toast.error('会員区分の更新に失敗しました')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Select value={membershipTypeId} onValueChange={handleChange} disabled={loading}>
            <SelectTrigger
                className={cn(
                    "h-7 text-xs border-0 rounded-full font-medium transition-colors focus:ring-0 focus:ring-offset-0 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100",
                    compact && "h-6 px-2"
                )}
            >
                <div className="flex items-center gap-1">
                    <SelectValue placeholder="会員区分" />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">未設定</SelectItem>
                {membershipTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                        {type.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
