import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Calendar, User, Info } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

type RecentReport = {
    id: string
    lesson_date: string
    student_name: string
    menu_description: string | null
    profiles: {
        full_name: string | null
        avatar_url: string | null
    } | null
}

export function RecentReportsWidget({ reports: initialReports }: { reports: RecentReport[] }) {
    const [reports, setReports] = useState<RecentReport[]>(initialReports)
    const [selectedReport, setSelectedReport] = useState<RecentReport | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchReports = async () => {
            const { data, error } = await supabase
                .from('lessons')
                .select(`*, profiles ( full_name, avatar_url )`)
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
        const channel = supabase
            .channel('public:lessons')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lessons' },
                () => {
                    fetchReports()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    return (
        <Card className="bg-white border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4 px-4 md:px-6">
                <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-800 whitespace-nowrap min-w-0">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-orange-500 shrink-0" />
                    <span className="truncate">最新のレッスン報告</span>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-[10px] md:text-xs text-slate-500 hover:text-orange-600 shrink-0" asChild>
                    <Link href="/admin/reports">すべて見る</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-3 md:p-4 overflow-y-auto">
                <div className="space-y-3 md:space-y-4">
                    {reports.length > 0 ? (
                        reports.map((report) => (
                            <div
                                key={report.id}
                                className="flex gap-3 md:gap-4 border-b border-slate-50 pb-3 md:pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded-md"
                                onClick={() => setSelectedReport(report)}
                            >
                                <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-white shadow-sm flex-shrink-0">
                                    <AvatarImage src={report.profiles?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-orange-100 text-orange-700 text-[10px] md:text-xs">
                                        {report.profiles?.full_name?.slice(0, 1) || 'C'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <p className="text-xs md:text-sm font-medium text-slate-900 truncate">
                                            {report.profiles?.full_name || '不明なコーチ'}
                                        </p>
                                        <span className="text-[9px] md:text-xs text-slate-400 flex-shrink-0">
                                            {new Date(report.lesson_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-[10px] md:text-xs text-slate-500 truncate">
                                        生徒: {report.student_name}
                                    </p>
                                    {report.menu_description && (
                                        <div className="text-[10px] md:text-xs text-slate-600 bg-slate-50 p-1.5 md:p-2 rounded-md mt-1 truncate">
                                            {report.menu_description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            まだ報告はありません
                        </div>
                    )}
                </div>
            </CardContent>

            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent className="max-w-[90vw] md:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Info className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                            レッスン報告詳細
                        </DialogTitle>
                        <DialogDescription className="text-xs md:text-sm">
                            コーチによって記入された報告内容です
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="space-y-4 md:space-y-6 pt-2 md:pt-4">
                            <div className="grid grid-cols-2 gap-3 md:gap-4 text-[11px] md:text-sm">
                                <div className="space-y-1">
                                    <span className="text-slate-500 flex items-center gap-1 text-[10px] md:text-xs">
                                        <Calendar className="h-3 w-3" /> 実施日
                                    </span>
                                    <p className="font-medium">
                                        {new Date(selectedReport.lesson_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-slate-500 flex items-center gap-1 text-[10px] md:text-xs">
                                        <User className="h-3 w-3" /> 担当コーチ
                                    </span>
                                    <p className="font-medium truncate">
                                        {selectedReport.profiles?.full_name || '不明'}
                                    </p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <span className="text-slate-500 flex items-center gap-1 text-[10px] md:text-xs">
                                        <User className="h-3 w-3" /> 生徒
                                    </span>
                                    <p className="font-medium">
                                        {selectedReport.student_name}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 md:space-y-2">
                                <span className="text-[10px] md:text-xs text-slate-500 block font-semibold">報告・メニュー内容</span>
                                <div className="bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-100 text-xs md:text-sm leading-relaxed whitespace-pre-wrap min-h-[80px] md:min-h-[100px]">
                                    {selectedReport.menu_description || '内容は入力されていません。'}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
