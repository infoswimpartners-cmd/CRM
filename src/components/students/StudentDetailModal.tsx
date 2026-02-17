'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentChart } from '@/components/customers/StudentChart'
import { StudentCounseling } from '@/components/customers/StudentCounseling'
import { StudentLessonHistory } from '@/components/customers/StudentLessonHistory'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { statusLabels, statusColors } from '@/components/admin/StudentStatusSelect'
import { cn } from '@/lib/utils'

interface StudentDetailModalProps {
    student: any | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function StudentDetailModal({ student, isOpen, onOpenChange }: StudentDetailModalProps) {
    const [lessons, setLessons] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && student) {
            const fetchLessons = async () => {
                setLoading(true)
                const supabase = createClient()
                const { data, error } = await supabase
                    .rpc('get_student_lesson_history_public', {
                        p_student_id: student.id
                    })

                if (error) {
                    console.error('Error fetching student lesson history via RPC:', error.message, error)
                }

                if (data) setLessons(data)
                setLoading(false)
            }
            fetchLessons()
        }
    }, [isOpen, student])

    const getMembershipName = () => {
        if (!student.membership_types) return '未設定'
        if (Array.isArray(student.membership_types)) {
            return student.membership_types[0]?.name || '未設定'
        }
        return student.membership_types.name || '未設定'
    }

    if (!student) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[96vw] md:max-w-4xl p-0 max-h-[92vh] flex flex-col overflow-hidden bg-slate-50">
                <DialogHeader className="p-4 pr-12 bg-white border-b border-slate-100 flex-shrink-0">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <DialogTitle className="text-xl md:text-2xl font-bold flex flex-wrap items-center gap-2 text-slate-900">
                                    {student.full_name}
                                </DialogTitle>
                                <p className="text-sm text-slate-500 font-medium">
                                    {student.full_name_kana || '-'}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                <Badge variant="secondary" className={cn(
                                    "border-0 px-2.5 py-0.5 text-xs font-semibold",
                                    statusColors[student.status] || 'bg-gray-100 text-gray-800'
                                )}>
                                    {statusLabels[student.status] || student.status || '不明'}
                                </Badge>
                                <Badge variant="outline" className="text-xs font-medium text-slate-600 bg-white border-slate-200 shadow-sm">
                                    {getMembershipName()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <Tabs defaultValue="chart" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 mb-4 h-auto">
                                <TabsTrigger value="chart" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                                        共通カルテ
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="history" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                        レッスン履歴
                                    </span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="chart" className="mt-0 space-y-4">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            カウンセリング情報
                                        </h3>
                                    </div>
                                    <div className="p-1">
                                        <StudentCounseling studentId={student.id} />
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            カルテ・備考録
                                        </h3>
                                    </div>
                                    <div className="p-1">
                                        <StudentChart student={student} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            過去のレッスン記録
                                        </h3>
                                    </div>
                                    {loading ? (
                                        <div className="flex justify-center items-center h-[200px]">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : (
                                        <div className="p-0">
                                            <StudentLessonHistory lessons={lessons} />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

