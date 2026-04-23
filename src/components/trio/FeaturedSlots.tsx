'use client';

import React from 'react';
import { Calendar, Clock, ArrowRight, CheckCircle2, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { TrioSlot } from '@/types/trio';

interface FeaturedSlotsProps {
  slots: TrioSlot[];
  onBookClick?: (id: string) => void;
}

/**
 * FeaturedSlots
 * 究極の「明るさ」と「プレミアム感」を備えた募集セッション一覧
 */
export default function FeaturedSlots({ slots, onBookClick }: FeaturedSlotsProps) {
  if (!slots || slots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
      {slots.map((slot) => {
        const isConfirmed = slot.status === 'confirmed';
        const isMatching = slot.status === 'matching';
        const isFull = slot.reserved_count >= 3;
        
        const startDate = new Date(slot.start_at);
        const dateStr = format(startDate, 'M/d (E)', { locale: ja });
        const timeStr = format(startDate, 'HH:mm');

        return (
          <Card 
            key={slot.id} 
            className="group relative overflow-hidden bg-white border border-sky-100 p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(56,189,248,0.03)] hover:shadow-[0_40px_100px_rgba(56,189,248,0.1)] hover:-translate-y-1 transition-all duration-1000"
          >
            {/* Ambient Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/5 rounded-full border border-sky-100/10 blur-2xl -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-sky-200 rounded-full group-hover:bg-sky-50 transition-colors duration-500 shadow-sm">
                    <Calendar className="w-3 h-3 text-sky-400" />
                    <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-black tracking-tighter text-sky-950">{timeStr}</span>
                    <span className="text-sm font-black text-sky-300 mt-2">START</span>
                  </div>
                </div>
                
                <Badge variant="outline" className={cn(
                  "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm transition-all duration-500",
                  isConfirmed ? "bg-emerald-500 text-white border-none shadow-emerald-500/20" : 
                  isMatching ? "bg-sky-400 text-white border-none shadow-sky-400/20" :
                  "bg-white text-sky-400 border-sky-100"
                )}>
                  {isConfirmed ? '開催確定' : isMatching ? 'マッチ中' : '募集中'}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-50 group-hover:scale-110 transition-transform duration-500">
                      <Users className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-sky-300 uppercase tracking-widest leading-none mb-1">Participants</span>
                      <span className="text-sm font-black text-sky-950">{slot.reserved_count} <span className="text-sky-300">/ 3</span></span>
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
                            : "bg-sky-100/50"
                        )} 
                      />
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-sky-50 to-transparent" />
                <p className="text-[11px] text-sky-400/70 font-bold leading-relaxed px-1">
                  ヤエスク専用レーンにて実施。
                </p>
              </div>

              <Button 
                onClick={() => onBookClick?.(slot.id)}
                disabled={isFull}
                className={cn(
                  "w-full h-14 rounded-2xl font-black tracking-widest transition-all duration-700 group/btn border-none relative overflow-hidden",
                  isFull ? "bg-slate-100 text-slate-300" : 
                  isConfirmed ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/10" :
                  "bg-sky-400 text-white hover:bg-sky-500 shadow-xl shadow-sky-400/10"
                )}
              >
                <div className="absolute inset-0 ultra-bright-shimmer opacity-20 pointer-events-none" />
                <span className="flex items-center gap-2 relative z-10">
                  {isFull ? '満員御礼' : isConfirmed ? '今すぐ参加する' : 'マッチングにエントリー'}
                  {!isFull && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform" />}
                </span>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
