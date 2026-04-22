'use client';

import { Crown, Users, ArrowRight, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CapacityProgress from './CapacityProgress';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MembershipStatusCardProps {
  currentCount: number;
  maxCount?: number;
  waitlistCount: number;
  isFull: boolean;
  onEnrollClick?: () => void;
}

export default function MembershipStatusCard({
  currentCount,
  maxCount = 12,
  waitlistCount,
  isFull,
  onEnrollClick
}: MembershipStatusCardProps) {
  return (
    <div className="relative group perspective-1000">
      {/* 背景のグロー効果 */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-[#0A192F]/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden ring-1 ring-white/5">
        {/* 背景の装飾的な要素 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl -mr-8 -mt-8" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-widest uppercase mb-0.5">THE TRIO</h3>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Member Status</p>
              </div>
            </div>
            <Badge className={cn(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none",
              isFull ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
            )}>
              {isFull ? "Waitlist Only" : "Accepting Members"}
            </Badge>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{currentCount}</span>
                <span className="text-slate-500 font-bold text-sm">/ {maxCount}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Status</p>
                <p className="text-xs font-black text-white uppercase">{isFull ? 'Limit Reached' : 'Open Slots'}</p>
              </div>
            </div>

            <CapacityProgress current={currentCount} max={maxCount} hideLabels />
            
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              {isFull 
                ? `現在定員12名に達しているため、キャンセル待ちのみ受け付けています。現在 ${waitlistCount} 名が待機中です。`
                : `定員12名までの極少枠です。残り ${maxCount - currentCount} 枠の先行受付が終了次第、キャンセル待ちへ移行します。`
              }
            </p>
          </div>

          <div className="pt-2">
            {isFull ? (
              <Button 
                asChild
                className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl transition-all duration-500 group/btn"
              >
                <Link href="#waitlist">
                  <Timer className="w-4 h-4 mr-2 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                  キャンセル待ちに登録する
                  <ArrowRight className="w-4 h-4 ml-2 opacity-30 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </Button>
            ) : (
              <Button 
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white rounded-2xl shadow-xl shadow-indigo-500/20 font-black tracking-widest text-sm group/btn border-none"
                onClick={onEnrollClick}
              >
                今すぐメンバーシップに入会する
                <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
