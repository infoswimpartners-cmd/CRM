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
import { Loader2, User2, Cake } from 'lucide-react'
import { cn, calculateAge } from '@/lib/utils'

interface StudentDetailModalProps {
    student: any | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function StudentDetailModal({ student, isOpen, onOpenChange }: StudentDetailModalProps) {
    const [lessons, setLessons] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [statusLabels, setStatusLabels] = useState<Record<string, string>>({})
    const [statusColors, setStatusColors] = useState<Record<string, string>>({})

    useEffect(() => {
        const fetchStatuses = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('student_statuses').select('id, name, color_class').order('display_order', { ascending: true })
            if (data) {
                const labels: Record<string, string> = {}
                const colors: Record<string, string> = {}
                data.forEach(s => {
                    labels[s.id] = s.name
                    colors[s.id] = s.color_class
                })
                setStatusLabels(labels)
                setStatusColors(colors)
            }
        }
        fetchStatuses()
    }, [])

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
            <DialogContent className="w-[98vw] md:w-[96vw] md:max-w-4xl p-0 max-h-[96vh] flex flex-col overflow-hidden bg-slate-50">
                <DialogHeader className="p-2 md:p-3 pr-8 md:pr-10 bg-white border-b border-slate-100 flex-shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="w-full">
                                <div className="flex flex-col gap-1.5 md:gap-3">
                                    {/* 1人目の情報ブロック */}
                                    <div className="space-y-0.5">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <DialogTitle className="text-base md:text-xl font-bold text-slate-900 leading-tight">
                                                {student.full_name}
                                            </DialogTitle>
                                            <span className="text-[9px] md:text-xs text-slate-400 font-medium">
                                                {student.full_name_kana}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-medium p-0.5 px-1 bg-slate-50 rounded-md border border-slate-100 max-w-fit">
                                            <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 font-bold px-1 py-0 text-[8px] md:text-[9px] shadow-sm leading-none h-auto">1人目</Badge>
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                {student.gender && (
                                                    <span className="flex items-center gap-0.5">
                                                        <User2 className="h-2.5 w-2.5 md:h-3 md:w-3 text-slate-400" />
                                                        {student.gender}
                                                    </span>
                                                )}
                                                {student.birth_date && (
                                                    <span className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
                                                        <Cake className="h-2.5 w-2.5 md:h-3 md:w-3 text-slate-400" />
                                                        {new Date(student.birth_date).toLocaleDateString('ja-JP')}
                                                        <span className="text-slate-400 font-normal ml-0.5">({calculateAge(new Date(student.birth_date))}歳)</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* 2人目の情報ブロック (存在する場合のみ) */}
                                    {student.second_student_name && (
                                        <div className="space-y-0.5 pt-1.5 border-t border-slate-100">
                                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                                <h3 className="text-base md:text-xl font-bold text-slate-900 leading-tight">
                                                    {student.second_student_name}
                                                </h3>
                                                <span className="text-[9px] md:text-xs text-slate-400 font-medium">
                                                    {student.second_student_name_kana || '-'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] md:text-xs font-medium p-0.5 px-1 bg-blue-50/10 rounded-md border border-blue-50/30 max-w-fit">
                                                <Badge variant="outline" className="bg-white text-blue-600 border-blue-100 font-bold px-1 py-0 text-[8px] md:text-[9px] shadow-sm leading-none h-auto">2人目</Badge>
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <span className="flex items-center gap-0.5">
                                                        <User2 className="h-2.5 w-2.5 md:h-3 md:w-3 text-blue-300" />
                                                        {student.second_student_gender || '性別未設定'}
                                                    </span>
                                                    {student.second_student_birth_date && (
                                                        <span className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
                                                            <Cake className="h-2.5 w-2.5 md:h-3 md:w-3 text-blue-300" />
                                                            {new Date(student.second_student_birth_date).toLocaleDateString('ja-JP')}
                                                            <span className="text-slate-400 font-normal ml-0.5">({calculateAge(new Date(student.second_student_birth_date))}歳)</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 flex-wrap">
                                <Badge variant="secondary" className={cn(
                                    "border-0 px-1.5 py-0.5 text-[9px] md:text-[10px] font-semibold h-fit leading-none",
                                    statusColors[student.status] || 'bg-gray-100 text-gray-800'
                                )}>
                                    {statusLabels[student.status] || student.status || '不明'}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] md:text-[10px] font-medium text-slate-600 bg-white border-slate-200 shadow-sm h-fit leading-none py-0.5">
                                    {getMembershipName()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>
 
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2 md:p-3 space-y-2 md:space-y-3">
                        <Tabs defaultValue="chart" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-0.5 mb-2 md:mb-2.5 h-auto">
                                <TabsTrigger value="chart" className="py-1 md:py-1.5 text-[11px] md:text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <span className="flex items-center gap-1 md:gap-1.5">
                                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-cyan-500"></span>
                                        共通カルテ
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="history" className="py-1 md:py-1.5 text-[11px] md:text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <span className="flex items-center gap-1 md:gap-1.5">
                                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-500"></span>
                                        レッスン履歴
                                    </span>
                                </TabsTrigger>
                            </TabsList>
 
                            <TabsContent value="chart" className="mt-0 space-y-2 md:space-y-3">
                                <div className="bg-white rounded-lg md:rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                                    <div className="px-2.5 py-1 md:px-3 md:py-1.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-[10px] md:text-xs font-bold text-slate-700 flex items-center gap-1 md:gap-1.5">
                                            カウンセリング情報
                                        </h3>
                                    </div>
                                    <div className="p-0">
                                        <StudentCounseling studentId={student.id} />
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg md:rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                                    <div className="px-2.5 py-1 md:px-3 md:py-1.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-[10px] md:text-xs font-bold text-slate-700 flex items-center gap-1 md:gap-1.5">
                                            カルテ・備考録
                                        </h3>
                                    </div>
                                    <div className="p-0">
                                        <StudentChart student={student} />
                                    </div>
                                </div>
                            </TabsContent>
 
                            <TabsContent value="history" className="mt-0">
                                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[250px]">
                                    <div className="px-3 py-1.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            過去のレッスン記録
                                        </h3>
                                    </div>
                                    {loading ? (
                                        <div className="flex justify-center items-center h-[180px]">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
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

