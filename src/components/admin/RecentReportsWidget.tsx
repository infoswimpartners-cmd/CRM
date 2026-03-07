import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Calendar, User, Info, Video } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

type RecentReport = {
    id: string
    coach_id: string
    lesson_date: string
    student_name: string
    menu_description: string | null
    profiles: {
        full_name: string | null
        avatar_url: string | null
    } | null
}

export function RecentReportsWidget({ reports: initialReports, coachId, hideCard = false }: { reports: RecentReport[], coachId?: string, hideCard?: boolean }) {
    const [reports, setReports] = useState<RecentReport[]>(initialReports)
    const [selectedReport, setSelectedReport] = useState<RecentReport | null>(null)
    const supabase = createClient()

    // Sync state with props when initialReports changes (e.g. after revalidatePath)
    useEffect(() => {
        if (initialReports) {
            setReports(initialReports)
        }
    }, [initialReports])

    useEffect(() => {
        const fetchReports = async () => {
            let query = supabase
                .from('lessons')
                .select(`*, profiles ( full_name, avatar_url )`)

            if (coachId) {
                // Also get assigned students for this coach
                const { data: assigned } = await supabase
                    .from('student_coaches')
                    .select('student_id')
                    .eq('coach_id', coachId)

                const assignedStudentIds = assigned?.map(a => a.student_id) || []

                if (assignedStudentIds.length > 0) {
                    query = query.or(`coach_id.eq.${coachId},student_id.in.(${assignedStudentIds.join(',')})`)
                } else {
                    query = query.eq('coach_id', coachId)
                }
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) {
                console.error('Error fetching reports:', error)
                return
            }

            if (data) {
                const formatted = data.map((r: any) => {
                    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
                    return {
                        ...r,
                        profiles: profile
                    }
                })
                setReports(formatted as RecentReport[])
            }
        }

        // Initial fetch
        fetchReports()

        // Realtime subscription
        const filter = coachId ? `coach_id=eq.${coachId}` : undefined
        const channel = supabase
            .channel('public:lessons')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lessons',
                    filter: filter
                },
                () => {
                    fetchReports()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, coachId])

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
        if (hideCard) return <div className="flex flex-col h-full">{children}</div>
        return (
            <Card className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 ring-1 ring-slate-200/50 flex flex-col overflow-hidden h-full">
                {children}
            </Card>
        )
    }

    return (
        <>
            <Wrapper>
                {!hideCard && (
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <FileText className="h-5 w-5 text-orange-500 shrink-0" />
                            最新の報告
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-orange-600 font-bold" asChild>
                            <Link href={coachId ? "/coach/history" : "/admin/reports"}>すべて見る</Link>
                        </Button>
                    </CardHeader>
                )}
                <CardContent className={`flex-1 ${hideCard ? 'p-0' : 'p-6'} overflow-y-auto`}>
                    <div className="space-y-4">
                        {reports.length > 0 ? (
                            reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="group flex gap-4 p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all duration-300 cursor-pointer"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                            <AvatarImage src={report.profiles?.avatar_url || undefined} />
                                            <AvatarFallback className="bg-slate-100 text-slate-400 text-xs font-bold">
                                                {report.profiles?.full_name?.slice(0, 1) || 'C'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-orange-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-sm font-extrabold text-slate-900 truncate">
                                                {report.profiles?.full_name || '不明なコーチ'}
                                            </p>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                                {format(new Date(report.lesson_date), 'M月d日')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] items-center gap-1 flex text-slate-400 font-bold uppercase tracking-widest leading-none">生徒:</span>
                                            <p className="text-xs font-bold text-slate-600 truncate leading-none">
                                                {report.student_name}
                                            </p>
                                        </div>
                                        {report.menu_description && (
                                            <div className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-lg mt-1 group-hover:bg-white transition-colors border border-transparent group-hover:border-orange-50">
                                                {report.menu_description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 py-12 gap-3">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-slate-200" />
                                </div>
                                <p className="font-medium">まだ報告はありません</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Wrapper>

            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent className="max-w-[90vw] md:max-w-md rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-black">
                            <Info className="h-5 w-5 text-orange-500" />
                            レッスン報告詳細
                        </DialogTitle>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> 実施日
                                    </span>
                                    <p className="text-sm font-bold text-slate-800">
                                        {format(new Date(selectedReport.lesson_date), 'yyyy年 M月 d日')}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                                        <User className="h-3 w-3" /> 担当コーチ
                                    </span>
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {selectedReport.profiles?.full_name || '不明'}
                                    </p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                                        <User className="h-3 w-3" /> 生徒
                                    </span>
                                    <p className="text-sm font-bold text-slate-800">
                                        {selectedReport.student_name}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">報告・メニュー内容</span>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                                    {selectedReport.menu_description || '内容は入力されていません。'}
                                </div>
                            </div>

                            {(!coachId || (coachId === selectedReport.coach_id)) && (
                                <div className="pt-2">
                                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-6 font-bold shadow-lg shadow-slate-900/10">
                                        <Link href={`/coach/lessons/${selectedReport.id}/media`}>
                                            <Video className="w-4 h-4 mr-2" />
                                            メディアを管理
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
