'use client';

import React from 'react';
import { MessageSquare, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface LastReportCardProps {
    report: any;
}

/**
 * LastReportCard
 * 明るくクールなフィードバック表示
 */
export default function LastReportCard({ report }: LastReportCardProps) {
    if (!report) {
        return (
            <Card className="bg-white border-slate-100 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.03)] border">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                    <MessageSquare className="w-8 h-8 text-slate-300 opacity-50" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">レポートはまだありません</h3>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                        レッスン終了後、コーチからのフィードバックがここに表示されます。
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="group relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-10 transition-all duration-1000 shadow-[0_30px_80px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.08)]">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-[60px] -mr-16 -mt-16 opacity-60" />
            
            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600">
                        <Star className="w-3.5 h-3.5 fill-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Latest Feedback</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-base font-black text-slate-800 leading-relaxed line-clamp-3 tracking-tight">
                        {report.feedback_text || 'フィードバックの準備中です。'}
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Coach</span>
                        </div>
                        <span className="text-sm font-bold text-slate-500">{report.profiles?.full_name} コーチ</span>
                    </div>
                </div>

                <Button 
                    asChild 
                    variant="outline"
                    className="w-full h-14 rounded-2xl border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 text-slate-600 font-black text-xs uppercase tracking-widest transition-all group/btn"
                >
                    <Link href={`/member/reports`}>
                        レポート詳細を見る
                        <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform text-indigo-500" />
                    </Link>
                </Button>
            </div>
        </Card>
    );
}
