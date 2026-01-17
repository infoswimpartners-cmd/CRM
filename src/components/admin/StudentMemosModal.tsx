'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { getStudentMemos } from '@/app/actions/getStudentMemos'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Loader2, FileText, User } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface StudentMemosModalProps {
    studentId: string | null
    studentName: string | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

interface Memo {
    id: string
    lesson_date: string
    menu_description: string | null
    profiles: {
        full_name: string
    } | null
}

export function StudentMemosModal({ studentId, studentName, isOpen, onOpenChange }: StudentMemosModalProps) {
    const [memos, setMemos] = useState<Memo[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && studentId) {
            setLoading(true)
            getStudentMemos(studentId)
                .then(res => {
                    if (res.success && res.data) {
                        // @ts-ignore
                        setMemos(res.data)
                    }
                })
                .finally(() => setLoading(false))
        }
    }, [isOpen, studentId])

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-600" />
                            {studentName}のメモ履歴
                        </DialogTitle>
                        {studentId && (
                            <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                                <Link href={`/customers/${studentId}`}>
                                    カルテ詳細へ
                                </Link>
                            </Button>
                        )}
                    </div>
                    <DialogDescription>
                        直近のレッスン記録・メモを表示します
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : memos.length > 0 ? (
                        <ScrollArea className="h-[50vh] pr-4">
                            <div className="space-y-4">
                                {memos.map((memo) => (
                                    <div key={memo.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                {format(new Date(memo.lesson_date), 'yyyy年M月d日 (E)', { locale: ja })}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <User className="h-3 w-3" />
                                                {memo.profiles?.full_name}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {memo.menu_description || 'メモなし'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            履歴はありません
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
