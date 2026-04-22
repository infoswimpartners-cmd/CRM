'use client';

import { Calendar, Clock, ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SlotData {
  id: string;
  name: string;
  date: string;
  time: string;
  count: number;
  max: number;
  status: 'entry' | 'matching' | 'confirmed' | 'full';
}

interface FeaturedSlotsProps {
  slots: SlotData[];
  onBookClick?: (id: string) => void;
}

export default function FeaturedSlots({ slots, onBookClick }: FeaturedSlotsProps) {
  return (
    <div className="space-y-6" id="reservations">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">募集中のセッション</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slots.map((slot) => {
          const isConfirmed = slot.status === 'confirmed';
          const isFull = slot.status === 'full';
          
          return (
            <Card 
              key={slot.id} 
              className="relative bg-[#0A192F]/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden hover:border-white/20 transition-all duration-500 group"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                      {slot.name}
                    </Badge>
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg font-black tracking-tight">{slot.date}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    isConfirmed ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                  )}>
                    {isConfirmed ? '開催確定' : 'マッチング中'}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 text-white">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-2xl font-black tracking-tighter">{slot.time}〜</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-500" />
                    <div className="flex gap-1.5">
                      {[...Array(slot.max)].map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-2 h-2 rounded-full transition-all duration-500",
                            i < slot.count ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-white/10"
                          )} 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{slot.count}/{slot.max}</span>
                  </div>
                </div>

                <Button 
                  disabled={isFull}
                  className={cn(
                    "w-full h-12 rounded-xl font-bold tracking-widest transition-all duration-500 border-none group/btn",
                    isConfirmed 
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  )}
                  onClick={() => onBookClick?.(slot.id)}
                >
                  {isConfirmed ? '今すぐ予約する' : 'マッチングに参加する'}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
