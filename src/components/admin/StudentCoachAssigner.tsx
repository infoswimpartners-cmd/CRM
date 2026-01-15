'use client'

import { useState } from 'react'
import { CoachSelect } from './CoachSelect'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface StudentCoachAssignerProps {
    studentId: string
    currentCoachId?: string | null
}

export function StudentCoachAssigner({ studentId, currentCoachId }: StudentCoachAssignerProps) {
    const [coachId, setCoachId] = useState(currentCoachId || '')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSave = async (newCoachId: string) => {
        setLoading(true)
        try {
            // Update student
            const { error } = await supabase
                .from('students')
                .update({ coach_id: newCoachId || null })
                .eq('id', studentId)

            if (error) throw error

            setCoachId(newCoachId)
            toast.success('担当コーチを更新しました')
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('更新に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <CoachSelect
                value={coachId}
                onValueChange={handleSave}
                placeholder="担当コーチなし"
            />
        </div>
    )
}
