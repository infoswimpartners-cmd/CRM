'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CoachChangeDialog } from './CoachChangeDialog'

interface CoachChangeButtonProps {
    studentId: string
    currentCoachId?: string | null
}

export function CoachChangeButton({ studentId, currentCoachId }: CoachChangeButtonProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setOpen(true)}
            >
                変更
            </Button>
            <CoachChangeDialog
                studentId={studentId}
                currentCoachId={currentCoachId}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    )
}
