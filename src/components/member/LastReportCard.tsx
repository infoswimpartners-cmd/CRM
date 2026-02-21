import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FileText, ArrowRight, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LastReportCardProps {
    report: {
        id: string
        lesson_date: string
        coach_comment?: string | null
        menu_description?: string | null
        feedback_good?: string | null
        feedback_next?: string | null
        profiles?: { full_name: string | null } | null // joined coach profile
    } | null
}

export default function LastReportCard({ report }: LastReportCardProps) {
    if (!report) {
        return (
            <div className="glass-card p-6 bg-gradient-to-br from-indigo-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">前回のレポート</h3>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">まだレポートはありません。</p>
            </div>
        )
    }

    const date = new Date(report.lesson_date)
    const coachName = report.profiles?.full_name || '担当コーチ'

    return (
        <div className="glass-card relative overflow-hidden group border-white/40 bg-white/60">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText className="w-24 h-24 text-blue-600 transform rotate-12" />
            </div>

            <div className="relative p-6 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-100">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-800 tracking-tight">前回のレポート</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                {format(date, 'yyyy.MM.dd (E)', { locale: ja })} • {coachName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Coach Comment Section */}
                <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60 shadow-inner">
                    <div className="flex items-start gap-3">
                        <MessageCircle className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Coach Message</p>
                            <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                                {report.coach_comment || "コメントはありません。"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer / Link */}
                <div className="pt-2">
                    <Link
                        href="/member/reports"
                        className="flex items-center justify-between w-full p-4 bg-white/80 hover:bg-blue-600 hover:text-white transition-all rounded-2xl border border-white/60 shadow-sm group/link active:scale-95"
                    >
                        <span className="text-sm font-black text-gray-600 group-hover/link:text-white transition-colors">
                            すべての履歴を見る
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover/link:text-white transition-all transform group-hover/link:translate-x-1" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
