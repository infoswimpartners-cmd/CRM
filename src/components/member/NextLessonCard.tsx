'use client'

import { Calendar, MapPin, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface NextLessonCardProps {
    lesson: any;
}

export default function NextLessonCard({ lesson }: NextLessonCardProps) {
    if (!lesson) {
        return (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px] border-dashed border-2 border-gray-200 bg-white/50">
                <div className="bg-blue-50 p-3 rounded-full">
                    <Calendar className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-700">次回のレッスン</h3>
                    <p className="text-sm text-gray-500 mt-1">予定されているレッスンはありません</p>
                </div>
                <Link href="/member/reservation" className="btn-primary w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    レッスンを予約する
                </Link>
            </div>
        )
    }

    const lessonDate = new Date(lesson.lesson_date)

    return (
        <div className="relative overflow-hidden glass-card p-0 group border-white/40">
            {/* Background Gradient Line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500" />

            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                            Upcoming Lesson
                        </span>
                        <h3 className="text-xl font-black text-gray-800 tracking-tight">次回のレッスン</h3>
                    </div>
                    {/* Date Badge */}
                    <div className="text-center bg-white border border-blue-100 rounded-2xl p-3 shadow-md min-w-[80px] group-hover:scale-105 transition-transform">
                        <div className="text-[10px] text-blue-500 font-black uppercase">{format(lessonDate, 'M月', { locale: ja })}</div>
                        <div className="text-3xl font-black text-gray-800 leading-none my-0.5">{format(lessonDate, 'd')}</div>
                        <div className="text-xs text-gray-400 font-bold">{format(lessonDate, 'E', { locale: ja })}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/50">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Coach</p>
                            <p className="font-bold text-gray-800">
                                {lesson.profiles?.full_name || '担当なし'} コーチ
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/50">
                        <div className="w-10 h-10 rounded-full bg-cyan-400 text-white flex items-center justify-center shadow-lg shadow-cyan-100 shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time</p>
                            <p className="font-bold text-gray-800">
                                {format(lessonDate, 'HH:mm', { locale: ja })} ~ {format(new Date(lessonDate.getTime() + 60 * 60 * 1000), 'HH:mm')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/50">
                        <div className="w-10 h-10 rounded-full bg-blue-400 text-white flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Location</p>
                            <p className="font-bold text-gray-800 line-clamp-1">
                                {lesson.location || '場所未定'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            {/* 
            <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex justify-end">
                <Link href={`/member/lessons/${lesson.id}`} className="text-sm font-bold text-blue-600 flex items-center hover:underline">
                    詳細を確認 <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
            </div>
            */}
        </div>
    )
}
