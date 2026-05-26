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
        }
        fetchData()
    }, [studentId, supabase])

    const handleSelectChange = (val: string) => {
        setPendingTypeId(val)
        setIsDialogOpen(true)
    }

    const executeChange = async () => {
        if (pendingTypeId === null) return

        setIsDialogOpen(false)
        setLoading(true)

        try {
            const targetId = pendingTypeId === 'unassigned' ? null : pendingTypeId
            // @ts-ignore - waiting for server action signature update
            const result = await assignMembership(studentId, targetId, 'immediate')

            if (!result.success) {
                throw new Error(result.error)
            }

            setMembershipTypeId(pendingTypeId)
            toast.success('会員種別を更新しました')
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || '更新に失敗しました')
        } finally {
            setLoading(false)
            setPendingTypeId(null)
        }
    }

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

                {/* 予約バッジの表示箇所を削除しました */}
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>会員種別の変更確認</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    会員種別を <span className="font-bold text-indigo-600">「{isUnassigning ? '未設定' : pendingPlanName}」</span> に変更します。
                                    本当によろしいですか？
                                </p>
                                <p className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded p-2">
                                    ※変更は即座に反映され、生徒様のプランが有効になります。料金（初期費用やプラン変更時の差額）は、翌月1日の月謝請求に自動的に合算されます（即時引き落としは発生しません）。
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingTypeId(null)}>キャンセル</AlertDialogCancel>
                        <Button
                            variant="default"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={executeChange}
                        >
                            変更する
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
