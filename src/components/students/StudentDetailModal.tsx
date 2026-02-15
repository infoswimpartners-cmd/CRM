'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentChart } from '@/components/customers/StudentChart'
import { StudentCounseling } from '@/components/customers/StudentCounseling'
import { StudentLessonHistory } from '@/components/customers/StudentLessonHistory'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

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

    if (!student) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[96vw] md:max-w-4xl p-0 md:p-6 max-h-[92vh] flex flex-col overflow-hidden bg-slate-50/50">
                <DialogHeader className="p-4 pb-2 md:p-0 bg-white md:bg-transparent border-b md:border-0">
                    <div className="flex items-center gap-3 mb-2 md:mb-4">

                        <div>
                            <DialogTitle className="text-xl md:text-2xl font-bold">{student.full_name}</DialogTitle>
                            <p className="text-[10px] md:text-sm text-slate-500 uppercase tracking-tighter md:tracking-normal">
                                {student.full_name_kana || '-'}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-0">
                    <Tabs defaultValue="chart" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 bg-slate-100/80 p-1">
                            <TabsTrigger value="chart" className="text-xs md:text-sm py-2">共通カルテ</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs md:text-sm py-2">レッスン履歴</TabsTrigger>
                        </TabsList>

                        <TabsContent value="chart" className="space-y-4 md:space-y-6 mt-0">
                            <div className="flex flex-col gap-4 md:gap-6">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                                        <h3 className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                            <span className="w-1 h-3 bg-cyan-500 rounded-full"></span>
                                            カウンセリング情報
                                        </h3>
                                    </div>
                                    <div className="p-1">
                                        <StudentCounseling studentId={student.id} />
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                                        <h3 className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                            <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                                            カルテ・備考録
                                        </h3>
                                    </div>
                                    <div className="p-1">
                                        <StudentChart student={student} />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="mt-0">
                            {loading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                                        <h3 className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                            <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                                            過去のレッスン記録
                                        </h3>
                                    </div>
                                    <div className="p-1 overflow-x-auto">
                                        <StudentLessonHistory lessons={lessons} />
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
