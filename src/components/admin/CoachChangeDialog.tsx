'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CoachSelect } from './CoachSelect'
import { updateStudentCoachAction } from '@/actions/student'

interface CoachChangeDialogProps {
    studentId: string
    // 現在の担当コーチID（students.coach_id）
    currentCoachId?: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CoachChangeDialog({
    studentId,
    currentCoachId,
    open,
    onOpenChange,
}: CoachChangeDialogProps) {
    const [selectedCoachId, setSelectedCoachId] = useState(currentCoachId || '')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateStudentCoachAction(
                studentId,
                selectedCoachId || null
            )

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('担当コーチを更新しました')
            onOpenChange(false)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(`更新に失敗しました: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>担当コーチの変更</DialogTitle>
                    <DialogDescription>
                        担当コーチを選択してください。変更すると即時に反映されます。
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <CoachSelect
                        value={selectedCoachId}
                        onValueChange={setSelectedCoachId}
                        placeholder="担当コーチを選択"
                    />
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        キャンセル
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? '保存中...' : '保存する'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
