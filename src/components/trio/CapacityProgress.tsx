'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface CapacityProgressProps {
    current: number;
    max: number;
}

export default function CapacityProgress({ current, max }: CapacityProgressProps) {
    const percentage = Math.min((current / max) * 100, 100);
    const remaining = max - current;
    
    // 警告色の判定
    const isWarning = remaining <= 3 && remaining > 0;
    const isFull = remaining <= 0;

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">現在の入会状況</p>
                    <div className="flex items-baseline gap-2">
                        <span className={cn(
                            "text-4xl font-black tracking-tighter",
                            isFull ? "text-red-500" : isWarning ? "text-orange-500" : "text-indigo-600"
                        )}>
                            {current}
                        </span>
                        <span className="text-xl font-bold text-slate-300">/ {max}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className={cn(
                        "text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm transition-all duration-500",
                        isFull 
                            ? "bg-red-50 text-red-500 border-red-100" 
                            : isWarning 
                                ? "bg-orange-50 text-orange-500 border-orange-100 animate-pulse" 
                                : "bg-indigo-50 text-indigo-600 border-indigo-100"
                    )}>
                        {isFull ? "満員御礼" : isWarning ? `残り ${remaining} 枠` : "会員募集中"}
                    </p>
                </div>
            </div>

            <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-1 border border-slate-200/50">
                <div 
                    className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out shadow-lg",
                        isFull ? "bg-red-500" : isWarning ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-gradient-to-r from-indigo-500 to-blue-500"
                    )}
                    style={{ width: `${percentage}%` }}
                />
                
                {/* 装飾的なライトエフェクト */}
                {!isFull && (
                    <div 
                        className="absolute top-1 bottom-1 bg-white/30 w-8 blur-sm animate-[shimmer_2s_infinite]"
                        style={{ left: `${percentage - 5}%` }}
                    />
                )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400/70 uppercase tracking-widest pt-2 justify-center">
                <Users className="w-3 h-3" />
                プレミアムメンバーシップ：限定12名
            </div>
        </div>
    );
}
