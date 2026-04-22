'use client';

import React, { useEffect, useState } from 'react';
import { getTrioSlots, entryTrioSlot, confirmTrioSlot, getTestTaroId, getStudentEntries } from '@/actions/trio_matching';
import { getTrioOnboardingStatus, createTrioEnrollmentSession } from '@/actions/trio_onboarding';
import { createTrioTicketCheckoutSession } from '@/actions/stripe';
import { TrioSlot } from '@/types/trio';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import MembershipStatusCard from '@/components/trio/MembershipStatusCard';
import FeaturedSlots from '@/components/trio/FeaturedSlots';
import GrowthRoadmap from '@/components/trio/GrowthRoadmap';
import LessonRequestForm from '@/components/trio/LessonRequestForm';
import WaitlistForm from '@/components/trio/WaitlistForm';
import { Loader2, ShoppingCart, Ticket, Crown, Activity, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function TrioDashboard() {
  const router = useRouter();
  const [slots, setSlots] = useState<TrioSlot[]>([]);
  const [userEntries, setUserEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testTaroId, setTestTaroId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [trioStatus, setTrioStatus] = useState<{ activeCount: number; waitlistCount: number; isFull: boolean } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      let currentStudentId = null;

      if (user) {
          const { data: student } = await supabase
              .from('students')
              .select('id')
              .eq('auth_user_id', user.id)
              .single();
          if (student) {
              currentStudentId = student.id;
              setStudentId(student.id);
          }
      }
      
      const taroId = await getTestTaroId();
      setTestTaroId(taroId);
      
      const targetUserId = taroId || currentStudentId;

      const [slotsRes, entriesRes, statusRes] = await Promise.all([
          getTrioSlots(),
          targetUserId ? getStudentEntries(targetUserId) : Promise.resolve({ entries: [] }),
          getTrioOnboardingStatus()
      ]);

      if (slotsRes.error) toast.error(slotsRes.error);
      if (entriesRes.error) toast.error(entriesRes.error);
      
      setSlots(slotsRes.slots || []);
      setUserEntries(entriesRes.entries?.map((e: any) => e.slot_id) || []);
      setTrioStatus(statusRes);
    } catch (err: any) {
      console.error('Data fetching error:', err);
      setError('データの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBook = async (slotId: string) => {
    if (!testTaroId) {
      toast.error('ログイン情報が取得できません。');
      return;
    }
    
    setLoading(true);
    try {
      const res = await confirmTrioSlot(slotId, testTaroId);
      if (res.success) {
        toast.success('予約が完了しました！');
        await fetchData();
      } else {
        toast.error(res.error || '予約に失敗しました。');
      }
    } catch (err) {
      toast.error('通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!studentId) {
      toast.error('ユーザー情報の取得に失敗しました。');
      return;
    }
    setPaymentLoading(true);
    const loadingToast = toast.loading('決済ページへ移動しています...');

    try {
      const res = await createTrioEnrollmentSession(studentId);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        throw new Error(res.error || 'エラーが発生しました');
      }
    } catch (err: any) {
      toast.error(err.message);
      setPaymentLoading(false);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handlePurchaseTicket = async (count: number) => {
    if (!studentId) {
        toast.error('ユーザー情報の取得に失敗しました。');
        return;
    }
    setPaymentLoading(true);
    const loadingToast = toast.loading('決済ページへ移動しています...');

    try {
        const res = await createTrioTicketCheckoutSession(studentId, count);
        if (res.success && res.url) {
            window.location.href = res.url;
        } else {
            throw new Error(res.error || '決済に失敗しました');
        }
    } catch (err: any) {
        toast.error(err.message);
        setPaymentLoading(false);
    } finally {
        toast.dismiss(loadingToast);
    }
  };

  // 指定された特定枠 (5/23, 5/27) のデータを抽出・模倣
  const featuredSlotsData = [
    {
      id: 'featured-1',
      name: 'WEEKEND UPGRADE',
      date: '5月23日（土）',
      time: '10:00',
      count: 2,
      max: 3,
      status: 'confirmed' as const
    },
    {
      id: 'featured-2',
      name: 'MID-WEEK RESET',
      date: '5月27日（水）',
      time: '20:00',
      count: 1,
      max: 3,
      status: 'matching' as const
    }
  ];

  if (loading && !trioStatus) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl blur-2xl animate-pulse absolute inset-0" />
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative" />
        </div>
        <p className="font-black text-xs uppercase tracking-[0.4em] text-indigo-400 animate-pulse">Loading TRIO Portal</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-10 animate-fade-in-up">
      {/* 1. Hero Section */}
      <section className="relative py-12 md:py-24 overflow-hidden -mx-4 px-4 bg-gradient-to-b from-[#0A192F] to-[#0D1F3D]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -ml-48 -mb-48" />
        
        <div className="relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">The Premium Logic Swim</span>
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white leading-tight">
            根性ではなく、論理で泳ぐ。<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-400 animate-gradient-x">あなたの25mが変わる。</span>
          </h1>
          
          <p className="text-slate-500 font-medium max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            THE TRIOは、「泳げない」を論理的に分解し、最高の結果を約束します。<br/>
            少人数制、完全マッチング。あなたの進化を、今この場所から。
          </p>

          <div className="pt-8 max-w-md mx-auto">
            <MembershipStatusCard 
              currentCount={trioStatus?.activeCount || 0}
              waitlistCount={trioStatus?.waitlistCount || 0}
              isFull={trioStatus?.isFull || false}
              onEnrollClick={handleEnroll}
            />
          </div>
        </div>
      </section>

      {/* 2. Featured Reservations (5/23, 5/27) */}
      <section className="space-y-8 scroll-mt-24" id="reservations">
        <div className="flex flex-col gap-2 px-2">
            <FeaturedSlots 
                slots={featuredSlotsData} 
                onBookClick={handleBook}
            />
            <p className="mt-4 text-[10px] text-slate-500 font-bold text-center uppercase tracking-widest leading-relaxed">
                ※マッチング枠に関しては、皆様からのリクエストに基づき随時追加しております。
            </p>
        </div>
        
        {/* Waitlist/Request Section */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <LessonRequestForm studentId={studentId || ''} />
          {trioStatus?.isFull && (
            <div id="waitlist" className="bg-[#0A192F]/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 scroll-mt-24">
              <WaitlistForm 
                waitlistCount={trioStatus.waitlistCount} 
                onSuccess={() => fetchData()} 
              />
            </div>
          )}
        </div>
      </section>

      {/* 3. Ticket Management */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">チケット管理</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0A192F]/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex items-center justify-between group hover:border-white/20 transition-all duration-500">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">現在の残高</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white tracking-tighter">12</span>
                <span className="text-sm font-bold text-slate-500 uppercase">Tickets</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center">
              <Ticket className="w-8 h-8 text-white/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button 
              onClick={() => handlePurchaseTicket(1)}
              disabled={paymentLoading}
              className="h-20 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl flex flex-col items-start px-8 justify-center group/btn transition-all duration-500 border-none"
            >
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">単発チケット</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white leading-none">¥5,500</span>
                <span className="text-[10px] font-bold text-slate-500">/ Session</span>
              </div>
            </Button>
            
            <Button 
              onClick={() => handlePurchaseTicket(4)}
              disabled={paymentLoading}
              className="h-20 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 rounded-2xl flex flex-col items-start px-8 justify-center shadow-xl shadow-indigo-500/20 group/btn transition-all duration-500 border-none"
            >
              <span className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">回数券セット</span>
              <div className="flex items-baseline gap-2 text-white">
                <span className="text-2xl font-black leading-none">¥20,000</span>
                <span className="text-[10px] font-medium text-white/50">/ 4 Sessions</span>
              </div>
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Growth Roadmap */}
      <section className="scroll-mt-24" id="roadmap">
        <GrowthRoadmap currentStep={2} />
      </section>

      {/* Footer Branding */}
      <footer className="text-center py-20 opacity-30">
        <div className="inline-flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5" />
          <span className="text-xs font-black tracking-[0.5em] uppercase">THE TRIO</span>
        </div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Reserved for the elite few. Logically driven by Swim Partners.
        </p>
      </footer>
    </div>
  );
}
