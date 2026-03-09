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
import { Calendar } from 'lucide-react'

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
        <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Select
                    value={membershipTypeId}
                    onValueChange={handleSelectChange}
                    disabled={loading}
                >
                    <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm shadow-none border-slate-200">
                        <SelectValue placeholder="会員種別を選択" />
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
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100/50 shadow-sm animate-in fade-in slide-in-from-left-2 duration-500">
                        <Calendar className="h-3 w-3 text-indigo-500" />
                        <span className="text-[11px] font-bold text-indigo-700">
                            次月予約: <span className="underline decoration-indigo-200 underline-offset-2">{nextPlanName}</span>
                        </span>
                    </div>
                )}
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>会員種別の変更確認</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    会員種別を <span className="font-bold text-indigo-600">「{isUnassigning ? '未設定' : pendingPlanName}」</span> に変更します。
                                    適用タイミングを選択してください。
                                </p>
                                <div className="text-sm space-y-2">
                                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                                        <span className="font-bold text-blue-600">① 来月から予約:</span><br />
                                        現在の契約を維持し、次回の更新日（1日）から新しいプランを適用します。
                                    </div>
                                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                                        <span className="font-bold text-red-600">② 今すぐ変更:</span><br />
                                        現在のサブスクリプションを即座に更新します。当月分の差額決済（または新規課金）が発生する場合があります。
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel onClick={() => setPendingTypeId(null)}>キャンセル</AlertDialogCancel>
                        <Button
                            variant="outline"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            onClick={() => executeChange(true)} // Next Month
                        >
                            来月から予約
                        </Button>
                        <Button
                            variant="default"
                            className="bg-indigo-600 hover:bg-indigo-700"
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
