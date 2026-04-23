'use client';

import React from 'react';
import { Sparkles, ArrowRight, MapPin, Play, Ticket, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HeroPatternProps = {
  onEnrollClick?: () => void;
  onBookClick?: () => void;
  onAccessClick?: () => void;
  ticketBalance?: number;
  nextSession?: {
    date: string;
    time: string;
    location: string;
  };
};

/**
 * パターンA：【体験をまだ受けていない人】
 * 究極の「明るさ」と「透明感」
 */
export const HeroPatternA = ({ onEnrollClick }: { onEnrollClick?: () => void }) => {
  return (
    <div className="space-y-12 animate-fade-in-up">
      <div className="space-y-8 text-center pt-4">
        <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white border border-sky-100 shadow-[0_4px_20px_rgba(56,189,248,0.03)] transition-all">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] font-black text-sky-800 uppercase tracking-[0.3em]">Premium Logic Swim</span>
        </div>
        
        <div className="space-y-4 px-4">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-sky-950 leading-[1.05]">
            Welcome to<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 animate-gradient-x text-glow-sky">THE TRIO.</span>
          </h1>
          <div className="flex flex-col items-center gap-3">
             <p className="text-rose-500 font-black text-[11px] md:text-sm py-1.5 px-6 bg-rose-50/50 rounded-full border border-rose-100 inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                本会員枠残り3名。満員で随時終了。
             </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">
        <Button 
          onClick={onEnrollClick}
          className="w-full h-24 md:h-32 text-xl md:text-3xl font-black rounded-[2.5rem] bg-gradient-to-r from-sky-400 to-cyan-300 hover:scale-[1.03] active:scale-[0.97] transition-all duration-700 shadow-[0_20px_60px_rgba(56,189,248,0.15)] border-2 border-sky-200/50 group text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 ultra-bright-shimmer opacity-30" />
          <span className="flex items-center gap-4 relative z-10 text-glow-sky">
            初回体験を予約する
            <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform duration-700" />
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-12">
        <div className="glass-card p-8 space-y-6 flex flex-col justify-center">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-sky-950 tracking-tight">THE TRIOの核となる論理</h3>
              <p className="text-sky-600/60 text-[10px] font-black uppercase tracking-widest">Philosophy of Logic Swim</p>
            </div>
            <div className="space-y-6 pt-2">
              {[
                { title: '解剖学的分析', desc: '個々の骨格と筋肉の動きに基づき、最適なフォームを構築します。' },
                { title: '物理効率の最大化', desc: '水の抵抗を最小限に抑え、最小の力で最大の推進量を生む設計。' },
                { title: '再現性の追求', desc: '「感覚」ではなく「言語」で理解することで、一生疲れない泳ぎを。' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-sky-900 tracking-tight">{item.title}</h4>
                    <p className="text-xs text-sky-700/60 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6 flex flex-col justify-center">
          <h3 className="text-lg font-black text-sky-950 flex items-center gap-3">
            <div className="w-10 h-10 rounded-[1.25rem] bg-sky-50 flex items-center justify-center border border-sky-100">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            Guide
          </h3>
          <div className="space-y-4">
            <div className="p-6 rounded-[1.5rem] bg-white border border-sky-100 shadow-[0_10px_40px_rgba(56,189,248,0.03)]">
              <p className="text-[10px] text-sky-300 font-black uppercase tracking-widest mb-2">Necessary Items</p>
              <p className="text-base text-sky-950 font-black tracking-tight">水着・ゴーグル・キャップ</p>
            </div>
            <p className="text-xs text-sky-600/70 leading-relaxed font-bold px-1">
              ※レンタル完備。手ぶらでの参加も歓迎します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * パターンB：【体験予約が完了した人】
 * 究極の「明るさ」と「透明感」
 */
export const HeroPatternB = ({ nextSession, onAccessClick }: { nextSession?: any, onAccessClick?: () => void }) => {
  return (
    <div className="space-y-12 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-[3.5rem] bg-white border border-sky-100 p-10 md:p-16 text-center space-y-8 shadow-[0_20px_100px_rgba(56,189,248,0.05)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-100/20 rounded-full blur-[100px] -mr-40 -mt-40 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-100/20 rounded-full blur-[100px] -ml-40 -mb-40 animate-pulse" />
        
        <div className="space-y-4 relative z-10">
          <p className="text-[11px] text-sky-400 font-black uppercase tracking-[0.4em] leading-none">Your Next Logic Session</p>
          <h2 className="text-4xl md:text-6xl font-black text-sky-950 tracking-tighter leading-[1.1]">
            Next Session<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-sky-300">{nextSession?.date || '5月23日（土）'} {nextSession?.time || '10:00'}</span>
          </h2>
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-white border border-sky-100 rounded-full text-sky-600 font-bold text-sm shadow-sm">
            <MapPin className="w-4 h-4" />
            {nextSession?.location || 'ヤエスク'}
          </div>
        </div>

        <div className="max-w-xs mx-auto relative z-10 pt-4">
          <Button 
            onClick={onAccessClick}
            className="w-full h-16 rounded-2xl bg-sky-400 text-white hover:bg-sky-500 font-black text-base gap-3 transition-all shadow-lg shadow-sky-400/20 border border-white/20"
          >
            アクセス・入館方法を確認
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col gap-1 px-2 text-center">
          <h3 className="text-2xl font-black text-sky-950 tracking-tight">事前学習動画</h3>
          <p className="text-[11px] text-sky-400 font-black tracking-[0.2em] uppercase">Logic Pre-Study</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: '息継ぎの論理', duration: '05:20', label: 'Basics' },
            { title: '推進力のキック', duration: '04:45', label: 'Kick' },
            { title: '究極フォーム', duration: '06:10', label: 'Stroke' },
          ].map((video, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-video rounded-[2.5rem] bg-white border border-sky-100 overflow-hidden relative mb-5 shadow-[0_10px_40px_rgba(56,189,248,0.04)] group-hover:shadow-[0_25px_80px_rgba(56,189,248,0.1)] transition-all duration-1000">
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-lg">
                    <Play className="w-6 h-6 text-sky-400 fill-sky-400" />
                  </div>
                </div>
                <div className="absolute bottom-3 right-4 px-2.5 py-1 rounded-lg bg-sky-400/90 text-[10px] font-black text-white">
                  {video.duration}
                </div>
                <div className="w-full h-full bg-gradient-to-br from-sky-50 to-white" />
              </div>
              <div className="px-4 space-y-1">
                <p className="text-[10px] text-sky-300 font-black uppercase tracking-widest">{video.label}</p>
                <h4 className="text-[15px] font-black text-sky-900 group-hover:text-sky-500 transition-colors tracking-tight">{video.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * パターンC：【本会員】
 * 究極の「明るさ」と「透明感」
 */
export const HeroPatternC = ({ ticketBalance = 0, onBookClick }: { ticketBalance?: number, onBookClick?: () => void }) => {
  return (
    <div className="space-y-12 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="glass-card p-10 flex flex-col justify-between group overflow-hidden relative border-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-sky-400/5 rounded-full blur-[80px] -mr-28 -mt-28" />
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2.5 text-sky-500 mb-6 bg-white shadow-[0_4px_15px_rgba(56,189,248,0.05)] border border-sky-100 rounded-full px-5 py-2 w-fit">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Active Member</span>
            </div>
            <h2 className="text-5xl font-black text-sky-950 tracking-tighter leading-none">Member Space</h2>
            <p className="text-sky-700/50 text-sm font-bold">加速する論理の進化を、共に見守る。</p>
          </div>

          <div className="mt-12 flex items-center justify-between bg-sky-50/10 rounded-[2rem] p-8 relative z-10 shadow-inner border border-sky-50">
            <div className="space-y-1">
              <p className="text-[10px] text-sky-300 font-black uppercase tracking-widest mb-1">Ticket Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-sky-900 tracking-tighter">{ticketBalance}</span>
                <span className="text-xs font-black text-sky-400 uppercase">Sessions</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/5 border border-sky-50">
              <Ticket className="w-7 h-7 text-sky-400" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Button 
            onClick={onBookClick}
            className="flex-1 rounded-[2.5rem] bg-gradient-to-br from-sky-400 to-sky-300 hover:from-sky-500 hover:to-sky-400 border border-sky-200/50 shadow-xl shadow-sky-400/20 px-10 flex flex-col items-start justify-center group transition-all duration-700 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 ultra-bright-shimmer opacity-20" />
            <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.3em] mb-2 group-hover:translate-x-1.5 transition-transform relative z-10">Next Session</p>
            <div className="flex items-center gap-4 relative z-10">
              <span className="text-2xl md:text-3xl font-black tracking-tight text-left leading-tight">レッスンを予約する</span>
              <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </div>
          </Button>

          <div className="glass-card p-8 flex items-center gap-6 hover:shadow-2xl hover:shadow-sky-500/10 cursor-pointer group border border-sky-100">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shrink-0 group-hover:bg-sky-50 transition-colors border border-sky-100 shadow-sm">
              <ArrowRight className="w-6 h-6 text-sky-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[15px] font-black text-sky-950 tracking-tight uppercase">Buy Tickets</h4>
              <p className="text-xs text-sky-500 font-bold">チケットの追加購入・変更</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
