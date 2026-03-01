'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { User, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'

interface LessonHistoryWidgetProps {
    lessons: any[]
}

export default function LessonHistoryWidget({ lessons }: LessonHistoryWidgetProps) {
    if (!lessons || lessons.length === 0) {
        return (
            <div className="glass-card relative overflow-hidden group border-white/40 bg-white/60 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-500 text-white rounded-2xl shadow-lg shadow-cyan-100">
                        <History className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 tracking-tight">レッスン履歴</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            直近3件のレッスン
                        </p>
                    </div>
                </div>
                <div className="py-8 text-center bg-white/40 rounded-2xl border border-white/60 shadow-inner mt-2">
                    <p className="text-sm font-bold text-gray-500">
                        まだレッスン履歴がありません
                    </p>
                </div>
                <div className="pt-2">
                    <Link href="/member/reports" className="w-full py-3 bg-white/50 border border-cyan-100 rounded-xl text-sm font-bold text-cyan-600 hover:bg-white hover:text-cyan-700 hover:border-cyan-300 transition-colors flex items-center justify-center shadow-sm">
                        すべての履歴を見る
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card relative overflow-hidden group border-white/40 bg-white/60 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500 text-white rounded-2xl shadow-lg shadow-cyan-100">
                    <History className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-black text-gray-800 tracking-tight">レッスン履歴</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        直近3件のレッスン
                    </p>
                </div>
            </div>

            <div className="space-y-3 mt-2">
                {lessons.map((lesson) => {
                    const date = new Date(lesson.lesson_date);
                    return (
                        <Link href={`/member/reports/${lesson.id}`} key={lesson.id} className="block group/item">
                            <div className="bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/60 hover:bg-white hover:border-cyan-300 transition-all shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center bg-cyan-50 rounded-xl w-12 h-12 shrink-0 text-cyan-600 shadow-sm">
                                            <span className="text-[10px] font-bold uppercase leading-none mt-1">{date.getMonth() + 1}月</span>
                                            <span className="text-lg font-black leading-none my-0.5">{date.getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">
                                                    {format(date, 'yyyy.MM.dd (E)', { locale: ja })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    {lesson.profiles?.full_name || '担当コーチ'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover/item:text-cyan-500 group-hover/item:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div className="pt-2">
                <Link href="/member/reports" className="w-full py-3 bg-white/50 border border-cyan-100 rounded-xl text-sm font-bold text-cyan-600 hover:bg-white hover:text-cyan-700 hover:border-cyan-300 transition-colors flex items-center justify-center shadow-sm">
                    すべての履歴を見る
                </Link>
            </div>
        </div>
    );
}
