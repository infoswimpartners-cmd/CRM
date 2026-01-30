import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

export function RecentReportsWidget({ reports }: { reports: RecentReport[] }) {
    return (
        <Card className="bg-white border-slate-200 shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <FileText className="h-5 w-5 text-orange-500" />
                    最新のレッスン報告
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-orange-600" asChild>
                    <Link href="/admin/reports">すべて見る</Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {reports.length > 0 ? (
                        reports.map((report) => (
                            <div key={report.id} className="flex gap-4 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                <Avatar className="h-9 w-9 border border-white shadow-sm flex-shrink-0">
                                    <AvatarImage src={report.profiles?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-orange-100 text-orange-700">
                                        {report.profiles?.full_name?.slice(0, 1) || 'C'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {report.profiles?.full_name || '不明なコーチ'}
                                        </p>
                                        <span className="text-xs text-slate-400 flex-shrink-0">
                                            {new Date(report.lesson_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        生徒: {report.student_name}
                                    </p>
                                    {report.menu_description && (
                                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md mt-1 truncate">
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
        </Card>
    )
}
