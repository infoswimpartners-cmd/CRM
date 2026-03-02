'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarPlus } from 'lucide-react'
import { AddScheduleDialog } from '@/components/dashboard/AddScheduleDialog'

interface StudentScheduleButtonProps {
    studentId: string
}

// 生徒詳細ページから直接スケジュールを追加するボタン
export function StudentScheduleButton({ studentId }: StudentScheduleButtonProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setOpen(true)}
            >
                <CalendarPlus className="h-4 w-4" />
                予定を追加
            </Button>

            <AddScheduleDialog
                open={open}
                onOpenChange={setOpen}
                initialStudentId={studentId}
                onSuccess={() => setOpen(false)}
            />
        </>
    )
}
