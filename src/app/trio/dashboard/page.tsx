'use client';

import React, { useEffect, useState } from 'react';
import { 
  getTrioSlots, 
  confirmTrioSlot, 
  getStudentEntries, 
  getDetailedStudentEntries 
} from '@/actions/trio_matching';
import { getTrioOnboardingStatus, createTrioEnrollmentSession } from '@/actions/trio_onboarding';
import { createTrioTicketCheckoutSession } from '@/actions/stripe';
import { TrioSlot } from '@/types/trio';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import FeaturedSlots from '@/components/trio/FeaturedSlots';
import GrowthRoadmap from '@/components/trio/GrowthRoadmap';
import LessonRequestForm from '@/components/trio/LessonRequestForm';
import WaitlistForm from '@/components/trio/WaitlistForm';
import { HeroPatternA, HeroPatternB, HeroPatternC } from '@/components/trio/TrioHeroPatterns';
import { Loader2, Ticket, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type UserType = 'PATTERN_A' | 'PATTERN_B' | 'PATTERN_C';

export default function TrioDashboard() {
  const router = useRouter();
  const [slots, setSlots] = useState<TrioSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [trioStatus, setTrioStatus] = useState<{ activeCount: number; waitlistCount: number; isFull: boolean } | null>(null);
  const [userType, setUserType] = useState<UserType>('PATTERN_A');
  const [ticketBalance, setTicketBalance] = useState(0);
  const [nextSession, setNextSession] = useState<any>(null);
  const [userEntryIds, setUserEntryIds] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      let currentStudentId = null;
      let userData: any = null;

      if (user) {
          const { data: student } = await supabase
              .from('students')
              .select('id, is_trio, trio_ticket_balance')
              .eq('auth_user_id', user.id)
              .single();
          if (student) {
              currentStudentId = student.id;
              setStudentId(student.id);
              userData = student;
              setTicketBalance(student.trio_ticket_balance || 0);
          }
      } else {
          // テスト仕様: 未ログイン時は自動的にテスト太郎（0035）として操作できるようにする
          const { data: taro } = await supabase
              .from('students')
              .select('id, is_trio, trio_ticket_balance')
              .or('student_number.eq.0035,full_name.ilike.%テスト太郎%')
              .limit(1)
              .single();
              
          if (taro) {
              currentStudentId = taro.id;
              setStudentId(taro.id);
              userData = taro;
              setTicketBalance(taro.trio_ticket_balance || 0);
              toast.info('テストモード：テスト太郎として操作しています', { duration: 5000 });
          }
      }
      
      const targetUserId = currentStudentId;
      if (!targetUserId) {
        setLoading(false);
        return;
      }


      const [slotsRes, detailEntriesRes, statusRes] = await Promise.all([
          getTrioSlots(),
          getDetailedStudentEntries(targetUserId),
          getTrioOnboardingStatus()
      ]);

      if (slotsRes.error) toast.error(slotsRes.error);
      if (detailEntriesRes.error) console.error(detailEntriesRes.error);
      
      setSlots(slotsRes.slots || []);
      setTrioStatus(statusRes);

      // ユーザー状態の判定
      const isReserved = detailEntriesRes.entries && detailEntriesRes.entries.length > 0;
      
      if (detailEntriesRes.entries) {
        setUserEntryIds(detailEntriesRes.entries.map((e: any) => e.slot?.id).filter(Boolean));
      }

      if (userData?.is_trio) {
        setUserType('PATTERN_C');
      } else if (detailEntriesRes.entries && detailEntriesRes.entries.length > 0) {
        setUserType('PATTERN_B');
        // 直近の予約をセット
        const firstEntry = detailEntriesRes.entries[0];
        if (firstEntry.slot) {
          const startDate = new Date(firstEntry.slot.start_at);
          setNextSession({
            date: startDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }),
            time: startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            location: 'ヤエスク' // 仮の場所（本来はスロット情報から取得）
          });
        }
      } else {
        setUserType('PATTERN_A');
      }

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
    const targetId = studentId;
    if (!targetId) {
      toast.error('ログイン情報が取得できません。');
      return;
    }
    
    setLoading(true);
    try {
      const res = await confirmTrioSlot(slotId, targetId);
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

  const scrollToReservations = () => {
    const element = document.getElementById('reservations');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading && !trioStatus) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-sky-400/10 rounded-3xl blur-2xl animate-pulse absolute inset-0" />
          <Loader2 className="w-12 h-12 text-sky-400 animate-spin relative" />
        </div>
        <p className="font-black text-[10px] uppercase tracking-[0.4em] text-sky-300 animate-pulse">Loading TRIO Portal</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white overflow-hidden animate-fade-in-up">
      {/* Global Background Orbs (シームレスな背景装飾) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70rem] h-[70rem] bg-sky-400/5 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute top-[20%] left-[-10%] w-[60rem] h-[60rem] bg-cyan-400/5 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[50rem] h-[50rem] bg-sky-50 rounded-full blur-[120px] opacity-50" />
      </div>

      {/* 1. Hero Section (上部) */}
      <section className="relative py-20 md:py-40 px-6 z-10">
        <div className="relative z-10 max-w-4xl mx-auto">
          {userType === 'PATTERN_A' && (
            <HeroPatternA onEnrollClick={scrollToReservations} />
          )}
          {userType === 'PATTERN_B' && (
            <HeroPatternB 
              nextSession={nextSession} 
              onAccessClick={() => router.push('#access')} 
            />
          )}
          {userType === 'PATTERN_C' && (
            <HeroPatternC 
              ticketBalance={ticketBalance} 
              onBookClick={() => router.push('#reservations')} 
            />
          )}
        </div>
      </section>

      <div className="page-container space-y-40 relative z-10 pb-32">
        
        {/* 2. Reservations/Matching Section */}
        {(userType === 'PATTERN_A' || userType === 'PATTERN_C') && (
          <section className="space-y-14 scroll-mt-24 relative z-10" id="reservations">
            <div className="flex flex-col gap-5 px-1">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center border border-sky-100 shadow-[0_8px_30px_rgba(56,189,248,0.04)] relative group overflow-hidden">
                    <div className="absolute inset-0 bg-sky-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <Crown className="w-8 h-8 text-sky-400 relative z-10" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-black text-sky-950 tracking-tighter">募集中のセッション</h2>
                    <p className="text-[10px] text-sky-300 font-black uppercase tracking-[0.4em]">Available Logic Slots</p>
                  </div>
                </div>
                <FeaturedSlots 
                    slots={slots} 
                    userEntryIds={userEntryIds}
                    onBookClick={handleBook}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start pt-8">
              <div className="glass-card p-12 border-white/50 bg-white/30 backdrop-blur-3xl shadow-[0_20px_80px_rgba(56,189,248,0.02)]">
                <LessonRequestForm studentId={studentId || ''} />
              </div>
              {trioStatus?.isFull && (
                <div id="waitlist" className="glass-card p-12 scroll-mt-24 bg-white border-sky-100/50 shadow-2xl shadow-sky-500/5 transition-all hover:shadow-sky-500/10">
                  <WaitlistForm 
                    waitlistCount={trioStatus.waitlistCount} 
                    onSuccess={() => fetchData()} 
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. Ticket Management (本会員のみ) */}
        {userType === 'PATTERN_C' && (
          <section className="space-y-14 relative z-10">
            <div className="flex items-center gap-6 px-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center border border-sky-100 shadow-[0_8px_30px_rgba(56,189,248,0.04)]">
                <Ticket className="w-8 h-8 text-sky-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl md:text-4xl font-black text-sky-950 tracking-tighter">チケット管理</h2>
                <p className="text-[10px] text-sky-300 font-black uppercase tracking-[0.4em]">Manage Your Assets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="glass-card p-14 flex items-center justify-between group border-white">
                <div className="space-y-2">
                  <p className="text-[11px] text-sky-300 font-black uppercase tracking-widest leading-none mb-3">Available Balance</p>
                  <div className="flex items-baseline gap-4">
                    <span className="text-8xl font-black text-sky-900 tracking-tighter">{ticketBalance}</span>
                    <span className="text-sm font-black text-sky-300 uppercase letter-spacing-[0.2em]">Tickets</span>
                  </div>
                </div>
                <div className="w-28 h-28 bg-sky-50/10 rounded-[2.5rem] flex items-center justify-center border border-sky-100 shadow-inner group-hover:scale-105 transition-transform duration-700">
                  <Ticket className="w-14 h-14 text-sky-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Button 
                  onClick={() => handlePurchaseTicket(1)}
                  disabled={paymentLoading}
                  className="h-28 bg-white border border-sky-100 hover:border-sky-300 hover:bg-sky-50/50 rounded-[2rem] flex flex-col items-start px-12 justify-center group/btn transition-all shadow-[0_10px_40px_rgba(56,189,248,0.03)] hover:shadow-[0_20px_60px_rgba(56,189,248,0.08)]"
                >
                  <span className="text-[10px] font-black text-sky-300 uppercase tracking-widest mb-2">Standard Ticket</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-sky-900 leading-none tracking-tight">¥5,500</span>
                    <span className="text-xs font-black text-sky-400 uppercase tracking-widest">/ Session</span>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => handlePurchaseTicket(4)}
                  disabled={paymentLoading}
                  className="h-28 bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-500 hover:to-sky-400 rounded-[2rem] flex flex-col items-start px-12 justify-center shadow-2xl shadow-sky-400/20 group/btn transition-all border-none text-white relative overflow-hidden"
                >
                   <div className="absolute inset-0 ultra-bright-shimmer opacity-20" />
                  <span className="text-[11px] font-black text-white/70 uppercase tracking-widest mb-2 relative z-10">4-Session Pack</span>
                  <div className="flex items-baseline gap-3 relative z-10">
                    <span className="text-4xl font-black leading-none tracking-tight">¥20,000</span>
                    <span className="text-xs font-black text-white/60 uppercase tracking-widest tracking-wide">Save ¥2,000</span>
                  </div>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 4. Growth Roadmap (本会員のみ) */}
        {userType === 'PATTERN_C' && (
          <section className="scroll-mt-24 pt-8" id="roadmap">
            <GrowthRoadmap currentStep={2} />
          </section>
        )}

        {/* Footer Branding */}
        <footer className="text-center py-40">
          <div className="inline-flex items-center gap-4 mb-8 bg-white px-8 py-3 rounded-full border border-sky-100 shadow-[0_4px_20px_rgba(56,189,248,0.03)] group cursor-pointer hover:bg-sky-50 transition-colors duration-700">
            <Crown className="w-6 h-6 text-sky-400 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-black tracking-[0.5em] uppercase text-sky-950">THE TRIO</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-300 max-w-[300px] mx-auto leading-[2] font-sans opacity-80">
            Reserved for the elite few.<br />Logically driven by Swim Partners.
          </p>
        </footer>
      </div>

      {/* --- DEBUG: パターン切り替えボタン (究極の明るさ) --- */}
      <div className="fixed bottom-8 right-8 z-[999] flex flex-col gap-4 bg-white border border-sky-100 p-6 rounded-[2.5rem] shadow-[0_40px_120px_rgba(56,189,248,0.12)] backdrop-blur-3xl scale-90 md:scale-100 origin-bottom-right">
        <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest mb-1 text-center">Preview Patterns</p>
        <div className="flex gap-3">
          {['PATTERN_A', 'PATTERN_B', 'PATTERN_C'].map((p) => (
            <Button 
              key={p}
              variant="outline" 
              size="sm" 
              className={cn(
                "w-12 h-12 rounded-2xl p-0 text-[11px] font-black transition-all shadow-sm border border-sky-50", 
                userType === p ? "bg-sky-400 text-white border-transparent shadow-xl shadow-sky-400/30 -translate-y-1" : "bg-white text-sky-300 hover:bg-sky-50 hover:text-sky-500"
              )}
              onClick={() => setUserType(p as UserType)}
            >
              {p.slice(-1)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
