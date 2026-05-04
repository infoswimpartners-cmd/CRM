'use client';

import React from 'react';
import { Calendar, Clock, MapPin, ArrowRight, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface NextLessonCardProps {
    lesson: any;
    isMember: boolean;
}

/**
 * NextLessonCard
 * 明るく、クールで、清潔感のある次回のレッスン表示
 */
export default function NextLessonCard({ lesson, isMember }: NextLessonCardProps) {
    if (!lesson) {
        return (
            <Card className="bg-white border-sky-100 rounded-[3rem] p-10 md:p-14 flex flex-col items-center text-center gap-10 shadow-[0_20px_60px_rgba(56,189,248,0.05)] border transition-all duration-700">
                <div className="space-y-4">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-sky-50 flex items-center justify-center border border-sky-100 shadow-sm mx-auto">
                        <Sparkles className="w-8 h-8 text-sky-400 opacity-50" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">次回の予約はありません</h3>
                        <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-sm mx-auto">
                            {isMember 
                                ? '新しくレッスンを予約しましょう。担当コーチに直接ご連絡いただくか、公式LINEよりお問い合わせください。' 
                                : 'まずは体験レッスンから、あなたの泳ぎを進化させませんか？論理的泳法の第一歩をここから。'}
                        </p>
                    </div>
                </div>

                <Button 
                    asChild 
                    className="w-full h-24 md:h-28 md:px-14 rounded-[2.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg tracking-widest transition-all shadow-2xl shadow-slate-200 group/btn border-none"
                >
                    <a href={isMember ? "https://line.me/R/ti/p/@swim_partners" : "/member/reservation"}>
                        {isMember ? '担当コーチにお問い合わせ' : '体験レッスンを予約'}
                        <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform text-sky-400" />
                    </a>
                </Button>
            </Card>
        );
    }

    const lessonDate = new Date(lesson.lesson_date);
    const dateStr = format(lessonDate, 'M/d (E)', { locale: ja });
    const timeStr = `${lesson.start_time} - ${lesson.end_time}`;

    return (
        <Card className="group relative overflow-hidden bg-white border border-sky-100 rounded-[3rem] p-10 md:p-14 transition-all duration-1000 shadow-[0_30px_100px_rgba(56,189,248,0.1)] hover:shadow-[0_50px_140px_rgba(56,189,248,0.15)] hover:border-sky-200">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-60 group-hover:scale-125 transition-transform duration-1000" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                    <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-sky-50 border border-sky-100 rounded-full text-sky-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">{dateStr}</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-slate-400">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm font-black tracking-widest uppercase">Time Schedule</span>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                            {timeStr}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6 pt-4">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-sky-500" />
                            <span className="text-base font-black text-slate-700 tracking-tight">{lesson.location || '指定場所'}</span>
                        </div>
                        <div className="h-4 w-px bg-slate-100" />
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-sky-500" />
                            <span className="text-base font-black text-slate-700 tracking-tight">{lesson.profiles?.full_name} コーチ</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-sky-50/50 rounded-[2.5rem] p-8 border border-sky-100 flex items-center justify-between group/status">
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Status</p>
                            <span className="text-lg font-black text-sky-600 uppercase tracking-tighter">Booking Confirmed</span>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-sky-100 group-hover/status:rotate-12 transition-transform">
                            <Sparkles className="w-6 h-6 text-sky-400" />
                        </div>
                    </div>

                    <Button 
                        asChild
                        className="h-20 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-base tracking-widest transition-all shadow-xl shadow-slate-200"
                    >
                        <a href="https://line.me/R/ti/p/@swim_partners">
                            コーチにメッセージを送信
                            <ArrowRight className="ml-3 w-5 h-5" />
                        </a>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
