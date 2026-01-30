'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2 } from 'lucide-react'
import { EditReportDialog } from './EditReportDialog'
import { DeleteReportDialog } from './DeleteReportDialog'

interface ReportActionsProps {
    report: any
}

export function ReportActions({ report }: ReportActionsProps) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                onClick={() => setIsEditOpen(true)}
            >
                <Edit2 className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600"
                onClick={() => setIsDeleteOpen(true)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>

            <EditReportDialog
                report={report}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={() => {/* revalidate handled by action */ }}
            />

            <DeleteReportDialog
                reportId={report.id}
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                onSuccess={() => {/* revalidate */ }}
            />
        </div>
    )
}
