'use client';

import React from 'react';
import { Calendar, ArrowRight, CheckCircle2, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { TrioSlot } from '@/types/trio';

interface FeaturedSlotsProps {
  slots: TrioSlot[];
  userPaidIds?: string[];
  userPendingIds?: string[];
  onBookClick?: (id: string) => void;
  isMyEntrySection?: boolean;
}

/**
 * FeaturedSlots
 * 明るく、清潔感があり、かつプレミアムな募集セッション一覧
 */
export default function FeaturedSlots({ slots, userPaidIds = [], userPendingIds = [], onBookClick, isMyEntrySection }: FeaturedSlotsProps) {
  if (!slots || slots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
      {slots.map((slot) => {
        const isConfirmed = slot.status === 'confirmed';
        const isMatching = slot.status === 'matching';
        const isFull = slot.reserved_count >= 3;
        const isUserPaid = userPaidIds.includes(slot.id);
        const isUserPending = userPendingIds.includes(slot.id);
        
        const startDate = new Date(slot.start_at);
        const dateStr = format(startDate, 'M/d (E)', { locale: ja });
        const timeStr = format(startDate, 'HH:mm');

        return (
          <Card 
            key={slot.id} 
            className={cn(
              "group relative overflow-hidden bg-white border p-8 rounded-[2.5rem] transition-all duration-1000",
              isMyEntrySection 
                ? "border-sky-200 shadow-[0_30px_70px_rgba(56,189,248,0.15)] scale-[1.02]" 
                : "border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_rgba(56,189,248,0.08)] hover:border-sky-100 hover:-translate-y-1"
            )}
          >
            {/* Ambient Decoration (Bright Sky) */}
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000",
              isMyEntrySection ? "bg-sky-100/50" : "bg-sky-50/30"
            )} />
            
            {isMyEntrySection && (
              <div className="absolute top-8 right-8 pointer-events-none opacity-10">
                <Crown className="w-16 h-16 text-sky-500 -rotate-12" />
              </div>
            )}
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-white border border-sky-100 rounded-full group-hover:bg-sky-50 transition-colors duration-500 shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-black tracking-tighter text-slate-800">{timeStr}</span>
                    <span className="text-sm font-black text-slate-400 mt-2">START</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className={cn(
                    "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border transition-all duration-500",
                    isConfirmed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                    isMatching ? "bg-sky-50 text-sky-600 border-sky-100" :
                    "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {isConfirmed ? '開催確定' : isMatching ? 'マッチ中' : '募集中'}
                  </Badge>
                  {isUserPaid && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full animate-in fade-in zoom-in duration-500">
                      予約済み
                    </Badge>
                  )}
                  {isUserPending && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full animate-in fade-in zoom-in duration-500">
                      決済待ち
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-50 group-hover:scale-110 transition-transform duration-500 border border-sky-100">
                      <Users className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Participants</span>
                      <span className="text-sm font-black text-slate-700">{slot.reserved_count} <span className="text-slate-300">/ 3</span></span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 pt-4">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-1000",
                          i < slot.reserved_count 
                            ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)] scale-110" 
                            : "bg-slate-100"
                        )} 
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-slate-100 to-transparent" />
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed px-1">
                    {slot.location || 'ヤエスク'}専用レーンにて実施。
                  </p>
                  {!isConfirmed && !isFull && !isUserPaid && !isUserPending && (
                    <p className="text-[10px] text-sky-500 font-black italic px-1 animate-pulse">
                      あと {2 - Math.min(1, slot.reserved_count)} 人でマッチング成立！
                    </p>
                  )}
                  {isUserPaid && !isConfirmed && (
                    <p className="text-[10px] text-blue-500 font-black italic px-1">
                      他の参加者を待っています...
                    </p>
                  )}
                  {isUserPending && (
                    <p className="text-[10px] text-amber-500 font-black italic px-1">
                      まもなく予約が取り消されます。お急ぎください！
                    </p>
                  )}
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (isUserPaid) return;
                  onBookClick?.(slot.id);
                }}
                disabled={isFull}
                className={cn(
                  "w-full h-14 rounded-2xl font-black tracking-widest transition-all duration-700 group/btn border-none relative overflow-hidden",
                  isFull ? "bg-slate-100 text-slate-400 cursor-not-allowed" : 
                  isUserPaid ? "bg-blue-50 text-blue-400 border border-blue-100 cursor-default" :
                  isUserPending ? "bg-amber-500 text-white hover:bg-amber-400 shadow-xl shadow-amber-100" :
                  isConfirmed ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-100" :
                  "bg-sky-600 text-white hover:bg-sky-500 shadow-xl shadow-sky-100"
                )}
              >
                <span className="flex items-center gap-2 relative z-10">
                  {isFull ? '満員御礼' : 
                   isUserPaid ? '予約済み' : 
                   isUserPending ? '決済を完了する' : 
                   isConfirmed ? '今すぐ参加する' : 'マッチングにエントリー'}
                  {!isFull && !isUserPaid && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />}
                  {isUserPaid && <CheckCircle2 className="w-4 h-4" />}
                </span>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
