'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { 
  getTrioSlots, 
  getDetailedStudentEntries,
  confirmTrioSlot,
  getTrioPortalData
} from '@/actions/trio_matching';
import { getTrioOnboardingStatus, createTrioEnrollmentSession } from '@/actions/trio_onboarding';
import { createTrioTicketCheckoutSession } from '@/actions/stripe';
import { TrioSlot } from '@/types/trio';
import FeaturedSlots from '@/components/trio/FeaturedSlots';
import { TrioUnifiedHero } from '@/components/trio/TrioHeroPatterns';
import GrowthRoadmap from '@/components/trio/GrowthRoadmap';
import LessonRequestForm from '@/components/trio/LessonRequestForm';
import { Loader2, Crown, Ticket as TicketIcon, CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import TrioRegistrationModal from '@/components/trio/TrioRegistrationModal';
import { useSession, getCsrfToken } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UserType = 'PATTERN_A' | 'PATTERN_B' | 'PATTERN_C';

/**
 * TrioPortalPage
 * すべてのTrioステータスに柔軟に対応する統合ポータル
 */
function TrioPortalContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [slots, setSlots] = useState<TrioSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [trioStatus, setTrioStatus] = useState<{ activeCount: number; waitlistCount: number; isFull: boolean } | null>(null);
  
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [userEntrySlotIds, setUserEntrySlotIds] = useState<string[]>([]);
  const [userType, setUserType] = useState<UserType>('PATTERN_A');
  const [ticketBalance, setTicketBalance] = useState(0);
  const [nextSession, setNextSession] = useState<any>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [isPortalLoggedIn, setIsPortalLoggedIn] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [slotsRes, statusRes, portalData] = await Promise.all([
        getTrioSlots(),
        getTrioOnboardingStatus(),
        getTrioPortalData()
      ]);

      if (slotsRes.slots) {
        setSlots(slotsRes.slots as TrioSlot[]);
      }

      if (statusRes) {
        setTrioStatus({
          activeCount: statusRes.activeCount,
          waitlistCount: statusRes.waitlistCount,
          isFull: statusRes.isFull
        });
      }

      setIsPortalLoggedIn(portalData.isLoggedIn);

      if (portalData.isLoggedIn && portalData.student) {
          const { student, entries } = portalData;
          setStudentId(student.id);
          setStudentData(student);
          setTicketBalance(student.trio_ticket_balance || 0);

          const entryIds = entries.map((e: any) => e.slot?.id).filter(Boolean);
          setUserEntrySlotIds(entryIds);

          if (student.is_trio) {
            setUserType('PATTERN_C');
          } else if (entries.length > 0) {
            setUserType('PATTERN_B');
          } else {
            setUserType('PATTERN_A');
          }

          // エントリーがある場合は常に次回のセッションを表示
          if (entries.length > 0) {
            const firstEntry = entries[0];
            const slotData = Array.isArray(firstEntry.slot) ? firstEntry.slot[0] : firstEntry.slot;
            
            if (slotData) {
              const startDate = new Date(slotData.start_at);
              // 自分がエントリーしているので、表示上は最低でも1名は保証する
              const displayCount = Math.max(1, slotData.reserved_count || 0);
              
              setNextSession({
                id: slotData.id,
                date: startDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }),
                time: startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                location: 'ヤエスク',
                reservedCount: displayCount
              });
            }
          } else {
            setNextSession(null);
          }
      } else {
        setNextSession(null);
        setUserEntrySlotIds([]);
        setStudentData(null);
      }
    } catch (err: any) {
      console.error('Data fetching error:', err);
      toast.error('データの取得中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const hasShownSuccess = useRef(false);

  useEffect(() => {
    fetchData();
  }, [session]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success' && !hasShownSuccess.current) {
      hasShownSuccess.current = true;
      toast.success('エントリーが完了しました！', {
        description: 'ダッシュボードから詳細を確認できます。',
        duration: 5000,
      });
      router.replace('/trio', { scroll: false });
    } else if (paymentStatus === 'cancel') {
        toast.error('お支払いがキャンセルされました。');
        router.replace('/trio', { scroll: false });
    }
  }, [searchParams, router]);

  const handleBook = async (slotId: string) => {
    setSelectedSlotId(slotId);
    setIsRegisterModalOpen(true);
  };

  const handlePurchaseTicket = async (count: number) => {
    if (!studentId) {
        toast.error('ログインが必要です。');
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

  const handleLineLogin = async () => {
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) throw new Error('CSRFトークンの取得に失敗しました。');
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/auth/signin/line';
      const csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = 'csrfToken';
      csrfInput.value = csrfToken;
      const callbackInput = document.createElement('input');
      callbackInput.type = 'hidden';
      callbackInput.name = 'callbackUrl';
      callbackInput.value = window.location.pathname;
      form.appendChild(csrfInput);
      form.appendChild(callbackInput);
      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      toast.error(err.message || 'LINEログインの開始に失敗しました。');
    }
  };

  if (loading && !trioStatus) {
    return (
      <div className="min-h-[80vh] bg-white flex flex-col items-center justify-center gap-8 animate-fade-in">
        <div className="relative">
          {/* Decorative Glowing Rings (Light) */}
          <div className="absolute inset-0 bg-sky-100/50 rounded-full blur-3xl animate-pulse scale-150" />
          <div className="w-24 h-24 rounded-[2rem] bg-white border border-sky-100 shadow-[0_20px_50px_rgba(56,189,248,0.1)] flex items-center justify-center relative z-10">
            <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          </div>
        </div>
        <div className="space-y-2 text-center relative z-10">
          <p className="font-black text-[10px] uppercase tracking-[0.5em] text-sky-500 animate-pulse">Initializing</p>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter">THE TRIO</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Global Background (Light & Pure) */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-50 via-white to-white">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-sky-100/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-100/10 rounded-full blur-[120px]" />
      </div>

      <section className="relative py-20 md:py-40 px-6 z-10">
        <div className="max-w-4xl mx-auto">
          <TrioUnifiedHero 
            isLoggedIn={isPortalLoggedIn}
            isMember={userType === 'PATTERN_C'}
            ticketBalance={ticketBalance}
            nextSession={nextSession}
            onEnrollClick={() => document.getElementById('reservations')?.scrollIntoView({ behavior: 'smooth' })}
            onLineLogin={handleLineLogin}
            onAccessClick={() => toast.info('アクセス情報を表示します')}
            onCancelClick={(id) => handleBook(id)}
          />
        </div>
      </section>

      <div className="page-container space-y-40 relative z-10 pb-32">
        {/* Reservations Section */}
        <section className="space-y-14 scroll-mt-24 relative z-10" id="reservations">
          <div className="flex flex-col gap-5 px-1">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center border border-sky-100 shadow-[0_8px_30px_rgba(56,189,248,0.08)]">
                  <Crown className="w-8 h-8 text-sky-500" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter">募集中のセッション</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Available Sessions</p>
                </div>
              </div>
              <FeaturedSlots 
                  slots={slots} 
                  userEntryIds={userEntrySlotIds}
                  onBookClick={handleBook}
              />
          </div>
          
          {userType === 'PATTERN_C' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start pt-8">
              <LessonRequestForm studentId={studentId || ''} />
            </div>
          )}
        </section>

        {/* Ticket Management (PATTERN_C only) */}
        {userType === 'PATTERN_C' && (
          <section className="space-y-14 relative z-10" id="tickets">
            <div className="flex items-center gap-6 px-1">
              <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center border border-sky-100 shadow-[0_8px_30px_rgba(56,189,248,0.08)]">
                <TicketIcon className="w-8 h-8 text-sky-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter">チケット管理</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Manage Your Assets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white/80 backdrop-blur-3xl border border-sky-50 rounded-[3rem] p-14 flex items-center justify-between group shadow-[0_30px_80px_rgba(56,189,248,0.05)]">
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest leading-none mb-3">Available Balance</p>
                  <div className="flex items-baseline gap-4">
                    <span className="text-8xl font-black text-slate-900 tracking-tighter">{ticketBalance}</span>
                    <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Tickets</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Button 
                  onClick={() => handlePurchaseTicket(1)}
                  disabled={paymentLoading}
                  className="h-28 bg-white border border-sky-50 hover:border-sky-300 hover:bg-sky-50 rounded-[2rem] flex flex-col items-start px-12 justify-center group/btn transition-all shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-sky-500/10 text-slate-800"
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/btn:text-sky-500 transition-colors">Standard Ticket</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-slate-900 leading-none tracking-tight">¥5,500</span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">/ Session</span>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => handlePurchaseTicket(4)}
                  disabled={paymentLoading}
                  className="h-28 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 rounded-[2rem] flex flex-col items-start px-12 justify-center shadow-2xl transition-all text-white relative overflow-hidden group/pack"
                >
                  <span className="text-[11px] font-black text-white/70 uppercase tracking-widest mb-2 relative z-10">4-Session Pack</span>
                  <div className="flex items-baseline gap-3 relative z-10">
                    <span className="text-4xl font-black text-white leading-none tracking-tight">¥20,000</span>
                    <span className="text-xs font-black text-sky-100 uppercase tracking-widest">Save ¥2,000</span>
                  </div>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Growth Roadmap (PATTERN_C only) */}
        {userType === 'PATTERN_C' && (
          <section className="scroll-mt-24 pt-8" id="roadmap">
            <GrowthRoadmap currentStep={2} />
          </section>
        )}

        {/* Branding Footer */}
        <footer className="text-center py-32 border-t border-slate-100">
          <div className="inline-flex items-center gap-4 mb-8 bg-white border border-sky-100 px-8 py-3 rounded-full shadow-sm">
            <Crown className="w-6 h-6 text-sky-500" />
            <span className="text-xs font-black tracking-[0.5em] uppercase text-slate-400">THE TRIO</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 max-w-[300px] mx-auto leading-[2]">
            Reserved for the elite few.<br />Logically driven by Swim Partners.
          </p>
        </footer>
      </div>

      <TrioRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        slotId={selectedSlotId}
        onSuccess={() => fetchData()}
        isUserEntered={selectedSlotId ? userEntrySlotIds.includes(selectedSlotId) : false}
        isPortalLoggedIn={isPortalLoggedIn}
        existingProfileData={studentData}
      />
    </div>
  );
}

export default function TrioPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    }>
      <TrioPortalContent />
    </Suspense>
  );
}
