'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { AdminCreateReportDialog } from './AdminCreateReportDialog'

// 管理者代理報告作成ボタン（Client Component）
export function AdminCreateReportButton() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                size="sm"
            >
                <PlusCircle className="h-4 w-4" />
                代理報告を作成
            </Button>

            <AdminCreateReportDialog
                open={open}
                onOpenChange={setOpen}
            />
        </>
    )
}
