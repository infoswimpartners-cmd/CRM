'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from '@/lib/supabase/client'
import { StudentChart } from '@/components/customers/StudentChart'
import { StudentCounseling } from '@/components/customers/StudentCounseling'
import { StudentLessonHistory } from '@/components/customers/StudentLessonHistory'
import { Loader2, User } from 'lucide-react'

interface ScheduleDetailModalProps {
    studentId: string | null
    studentName: string
    isOpen: boolean
    onClose: () => void
}

export function ScheduleDetailModal({ studentId, studentName, isOpen, onClose }: ScheduleDetailModalProps) {
    const [loading, setLoading] = useState(false)
    const [student, setStudent] = useState<any>(null)
    const [lessons, setLessons] = useState<any[]>([])

    useEffect(() => {
        if (isOpen && studentId) {
            fetchData(studentId)
        } else {
            setStudent(null)
            setLessons([])
        }
    }, [isOpen, studentId])

    const fetchData = async (id: string) => {
        setLoading(true)
        const supabase = createClient()

        try {
            // Fetch Student Details (for Chart/Notes)
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('id', id)
                .single()

            if (studentError) throw studentError
            setStudent(studentData)

            // Fetch Lesson History
            const { data: lessonsData, error: lessonsError } = await supabase
                .rpc('get_student_lesson_history_public', {
                    p_student_id: id
                })

            if (lessonsError) throw lessonsError
            setLessons(lessonsData || [])

        } catch (error) {
            console.error('Error fetching details:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <User className="h-5 w-5 text-slate-500" />
                        {studentName} 様の詳細情報
                    </DialogTitle>
                    <DialogDescription>
                        レッスン履歴とカルテを確認・編集できます
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <Tabs defaultValue="history" className="w-full mt-2">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="history">レッスン履歴</TabsTrigger>
                            <TabsTrigger value="chart">カルテ・カウンセリング</TabsTrigger>
                        </TabsList>

                        <TabsContent value="history" className="space-y-4">
                            <StudentLessonHistory lessons={lessons} />
                        </TabsContent>

                        <TabsContent value="chart" className="space-y-6">
                            {student && (
                                <>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-700">
                                            <span className="w-1 h-4 bg-cyan-500 rounded-full"></span>
                                            カウンセリングシート
                                        </h3>
                                        <StudentCounseling studentId={student.id} />
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-700">
                                            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                            カルテ / 備考
                                        </h3>
                                        <StudentChart student={student} />
                                    </div>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    )
}
