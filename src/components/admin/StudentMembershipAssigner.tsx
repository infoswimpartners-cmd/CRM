'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assignMembership } from '@/actions/stripe'
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface StudentMembershipAssignerProps {
    studentId: string
    currentMembershipTypeId?: string | null
}

export function StudentMembershipAssigner({ studentId, currentMembershipTypeId }: StudentMembershipAssignerProps) {
    const [membershipTypeId, setMembershipTypeId] = useState(currentMembershipTypeId || '')
    const [nextMembershipTypeId, setNextMembershipTypeId] = useState<string | null>(null)
    const [membershipTypes, setMembershipTypes] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(false)

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [pendingTypeId, setPendingTypeId] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Types
            const { data: types } = await supabase
                .from('membership_types')
                .select('id, name')
                .eq('active', true)
                .order('fee')
            if (types) setMembershipTypes(types)

            // Fetch Reservation
            const { data: student } = await supabase
                .from('students')
                .select('next_membership_type_id')
                .eq('id', studentId)
                .single()

            if (student?.next_membership_type_id) {
                setNextMembershipTypeId(student.next_membership_type_id)
            }
        }
        fetchData()
    }, [studentId, supabase])

    const handleSelectChange = (val: string) => {
        setPendingTypeId(val)
        setIsDialogOpen(true)
    }

    const executeChange = async (isNextMonth: boolean) => {
        if (pendingTypeId === null) return

        setIsDialogOpen(false)
        setLoading(true)

        try {
            const targetId = pendingTypeId === 'unassigned' ? null : pendingTypeId
            const result = await assignMembership(studentId, targetId, isNextMonth)

            if (!result.success) {
                throw new Error(result.error)
            }

            if (isNextMonth) {
                setNextMembershipTypeId(targetId)
                toast.success('来月からの変更を予約しました')
                // Reset select to current since we only reserved
                // But wait, user might want to see the change?
                // Visual feedback is the "Reservation" badge.
                // The select should technically stay on "Current" unless immediate.
            } else {
                setMembershipTypeId(pendingTypeId)
                setNextMembershipTypeId(null) // Cleared by server on immediate change
                toast.success('会員種別を即時更新しました')
            }
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setLoading(false)
            setPendingTypeId(null)
        }
    }

    const nextPlanName = membershipTypes.find(t => t.id === nextMembershipTypeId)?.name || '未設定'
    const pendingPlanName = membershipTypes.find(t => t.id === pendingTypeId)?.name || '未設定'
    const isUnassigning = pendingTypeId === 'unassigned'

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
                <Select
                    value={membershipTypeId}
                    onValueChange={handleSelectChange}
                    disabled={loading}
                >
                    <SelectTrigger className="w-[180px] h-8 text-sm">
                        <SelectValue placeholder="未設定" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">未設定</SelectItem>
                        {membershipTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                                {type.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {nextMembershipTypeId && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                        来月からの予約: <strong>{nextPlanName}</strong>
                    </div>
                )}
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>会員種別の変更タイミング</AlertDialogTitle>
                        <AlertDialogDescription>
                            「{isUnassigning ? '未設定' : pendingPlanName}」への変更をいつ適用しますか？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel onClick={() => setPendingTypeId(null)}>キャンセル</AlertDialogCancel>
                        <Button
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => executeChange(true)} // Next Month
                        >
                            来月から予約
                        </Button>
                        <Button
                            variant="destructive" // Use destructive or different color to signify IMMEDIATE impact
                            onClick={() => executeChange(false)} // Immediate
                        >
                            今すぐ変更
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
