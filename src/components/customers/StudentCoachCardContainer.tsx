'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentMultiCoachSelect } from './StudentMultiCoachSelect'
import { StudentCoachOptionEditor } from './StudentCoachOptionEditor'

interface AssignedCoach {
    coach_id: string
    role?: string
    option_reward_fee?: number | null
    option_reward_note?: string | null
    profiles?: any
}

interface Coach {
    id: string
    full_name: string
    avatar_url?: string | null
}

interface Props {
    studentId: string
    initialAssignedCoaches: AssignedCoach[]
    coaches: Coach[]
    isAdmin: boolean
}

export function StudentCoachCardContainer({
    studentId,
    initialAssignedCoaches,
    coaches,
    isAdmin
}: Props) {
    const [assignedCoaches, setAssignedCoaches] = useState<AssignedCoach[]>(initialAssignedCoaches)

    useEffect(() => {
        setAssignedCoaches(initialAssignedCoaches)
    }, [initialAssignedCoaches])

    const handleSaveSuccess = (updated: AssignedCoach[]) => {
        setAssignedCoaches(updated)
    }

    const handleUpdateFeeSuccess = (coachId: string, newFee: number) => {
        setAssignedCoaches(prev => prev.map(ac => {
            if (ac.coach_id === coachId) {
                return { ...ac, option_reward_fee: newFee }
            }
            return ac
        }))
    }

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold">担当コーチ</CardTitle>
                {isAdmin && (
                    <StudentMultiCoachSelect
                        studentId={studentId}
                        initialAssignedCoaches={assignedCoaches}
                        coaches={coaches}
                        triggerText="変更 / 追加"
                        variant="outline"
                        onSaveSuccess={handleSaveSuccess}
                    />
                )}
            </CardHeader>
            <CardContent>
                <StudentCoachOptionEditor
                    studentId={studentId}
                    assignedCoaches={assignedCoaches}
                    isAdmin={isAdmin}
                    onUpdateSuccess={handleUpdateFeeSuccess}
                />
            </CardContent>
        </Card>
    )
}
