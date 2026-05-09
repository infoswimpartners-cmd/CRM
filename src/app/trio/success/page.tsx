'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Crown, CheckCircle2, Users, Play, BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function TrioSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 実際の実装ではここで session_id から予約情報を取得して
    // マッチング状況（1人目か2人目か）を判定する
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        <p className="font-black text-[10px] uppercase tracking-[0.4em] text-cyan-500 animate-pulse">Confirming Your Reservation</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden pb-20">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60vh] bg-gradient-to-b from-cyan-900/20 to-transparent blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-20 space-y-16 relative z-10">
        
        {/* Success Header */}
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Reservation Complete.</h1>
          <p className="text-slate-400 font-medium max-w-lg mx-auto">
            THE TRIOへのエントリーを受け付けました。決済が完了し、あなたの枠が確保されました。
          </p>
        </div>

        {/* Matching Status Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 md:p-12 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8">
            <Users className="w-24 h-24 text-slate-800/50 -rotate-12" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Matching Status</p>
              <h2 className="text-3xl font-black">現在の状況：マッチング中</h2>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex -space-x-4">
                  <div className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center border-4 border-slate-900 z-30">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center z-20 animate-pulse">
                    <Users className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center z-10">
                    <Users className="w-6 h-6 text-slate-700" />
                  </div>
               </div>
               <p className="text-sm font-bold text-slate-300">
                  あなたが1人目のエントリーです。<br/>
                  <span className="text-slate-500 text-xs font-normal">あと1名の参加で開催が確定します。確定次第、メールで通知いたします。</span>
               </p>
            </div>
          </div>
        </div>

        {/* Preparation Content Section */}
        <div className="space-y-10">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">事前学習：THE TRIOの論理</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Preparation Materials</p>
            </div>
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 gap-2 font-black text-xs uppercase tracking-widest">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Video Card 1 */}
            <div className="group cursor-pointer space-y-4">
              <div className="aspect-video rounded-[2rem] bg-slate-900 border border-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Play className="w-8 h-8 fill-white text-white translate-x-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                   <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Introduction</p>
                   <p className="text-sm font-black text-white">THE TRIOが追求する「物理効率」とは</p>
                </div>
              </div>
            </div>

            {/* Video Card 2 */}
            <div className="group cursor-pointer space-y-4">
              <div className="aspect-video rounded-[2rem] bg-slate-900 border border-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Philosophy</p>
                   <p className="text-sm font-black text-white">感覚を言語化する：論理的スイミングの極意</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps / Timeline */}
        <div className="pt-10 border-t border-white/5 space-y-8">
           <h3 className="text-xl font-black text-center uppercase tracking-[0.2em] text-slate-500">Next Steps</h3>
           <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-400">01</div>
                <p className="text-xs font-bold text-slate-300">マッチング成立を待つ</p>
              </div>
              <div className="hidden md:block w-12 h-px bg-slate-800" />
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-400">02</div>
                <p className="text-xs font-bold text-slate-300">確定通知メールを確認</p>
              </div>
              <div className="hidden md:block w-12 h-px bg-slate-800" />
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-400">03</div>
                <p className="text-xs font-bold text-slate-300">当日、施設へ来場</p>
              </div>
           </div>
        </div>

        <div className="text-center pt-10">
          <Button 
            onClick={() => router.push('/trio')}
            variant="ghost"
            className="text-slate-500 hover:text-white transition-colors"
          >
            募集一覧に戻る
          </Button>
        </div>
      </div>
    </div>
  );
}
