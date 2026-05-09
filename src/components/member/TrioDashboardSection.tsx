'use client';

import React from 'react';
import { Crown, ArrowRight, CheckCircle2, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TrioDashboardSectionProps {
    entries: any[];
}

/**
 * TrioDashboardSection
 * ホーム（ダッシュボード）用のTrioセクション。
 * 予約がある場合は詳細を表示し、ない場合はエントリーを促す。
 */
export default function TrioDashboardSection({ entries }: TrioDashboardSectionProps) {
    // 進行中のエントリーを1つピックアップ
    const activeEntry = entries && entries.length > 0 ? entries[0] : null;
    const hasActiveEntry = activeEntry && activeEntry.slot;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-6 px-2">
                <div className="w-14 h-14 rounded-2xl bg-white border border-sky-100 shadow-[0_8px_30px_rgba(56,189,248,0.06)] flex items-center justify-center">
                    <Crown className="w-6 h-6 text-sky-500" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">The Trio</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Premium Group Matching</p>
                </div>
            </div>

            <Card className="group relative overflow-hidden bg-white border border-sky-100 rounded-[3rem] p-10 md:p-14 transition-all duration-1000 shadow-[0_30px_100px_rgba(56,189,248,0.12)] hover:shadow-[0_50px_140px_rgba(56,189,248,0.18)] hover:border-sky-200">
                {/* 装飾用背景 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-60 group-hover:scale-125 transition-transform duration-1000" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    {hasActiveEntry ? (
                        <>
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-sky-50 border border-sky-100 rounded-full text-sky-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Session Entry Active</span>
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">
                                        {new Date(activeEntry.slot.start_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} {new Date(activeEntry.slot.start_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                    </h2>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Next Scheduled Session</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full md:w-auto">
                                <Button 
                                    asChild
                                    className="h-20 px-12 rounded-[2rem] bg-sky-600 hover:bg-sky-500 text-white font-black text-base tracking-widest transition-all shadow-xl shadow-sky-100 border-none"
                                >
                                    <Link href="/trio">
                                        予約内容を確認
                                        <ArrowRight className="ml-3 w-5 h-5" />
                                    </Link>
                                </Button>
                                <Button 
                                    asChild
                                    variant="ghost"
                                    className="h-14 px-8 rounded-2xl text-slate-400 hover:text-sky-500 hover:bg-sky-50 font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    <Link href="/trio#reservations">
                                        別のセッションにエントリー
                                    </Link>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-8 text-center md:text-left">
                                <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-slate-50 border border-slate-100 rounded-full text-slate-400">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">No Active Entries</span>
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter leading-tight">
                                        論理の進化を、<br/>
                                        仲間と共に。
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm">
                                        THE TRIOでは、共通の課題を持つ仲間と高め合うグループレッスンを提供しています。
                                    </p>
                                </div>
                            </div>

                            <div className="w-full md:w-auto">
                                <Button 
                                    asChild
                                    className="w-full h-24 md:h-28 md:px-14 rounded-[2.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg tracking-widest transition-all shadow-2xl shadow-slate-200 group/btn"
                                >
                                    <Link href="/trio#reservations">
                                        セッションにエントリー
                                        <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform text-sky-400" />
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}
