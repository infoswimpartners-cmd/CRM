'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CoachSelect } from './CoachSelect'

interface TransferStudentsDialogProps {
    studentIds: string[]
    currentCoachId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function TransferStudentsDialog({ studentIds, currentCoachId, open, onOpenChange, onSuccess }: TransferStudentsDialogProps) {
    const [targetCoachId, setTargetCoachId] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleTransfer = async () => {
        if (!targetCoachId) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('students')
                .update({ coach_id: targetCoachId })
                .in('id', studentIds)

            if (error) throw error

            toast.success(`${studentIds.length}名の生徒を引き継ぎました`)
            onSuccess()
            onOpenChange(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('引き継ぎに失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>生徒の引継ぎ</DialogTitle>
                    <DialogDescription>
                        選択した{studentIds.length}名の生徒を別のコーチに担当変更します。
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">引継ぎ先コーチ</label>
                        <CoachSelect
                            value={targetCoachId}
                            onValueChange={setTargetCoachId}
                            excludeId={currentCoachId}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
                    <Button onClick={handleTransfer} disabled={!targetCoachId || loading}>
                        {loading ? '処理中...' : '引き継ぐ'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
