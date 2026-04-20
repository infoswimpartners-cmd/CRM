'use client';

import React, { useEffect, useState } from 'react';
import { getTrioSlots, entryTrioSlot, confirmTrioSlot, getTestTaroId, getStudentEntries } from '@/actions/trio_matching';
import { createTrioTicketCheckoutSession } from '@/actions/stripe';
import { TrioSlot } from '@/types/trio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShoppingCart, Ticket, Crown, Users, CheckCircle2, Calendar, User as UserIcon, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TrioDashboard() {
  const [slots, setSlots] = useState<TrioSlot[]>([]);
  const [userEntries, setUserEntries] = useState<string[]>([]); // slot_ids user is in
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testTaroId, setTestTaroId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Fetch current user and student ID for purchases
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
    
    // MVPテスト制約：テスト太郎 (0035) を優先
    const taroId = await getTestTaroId();
    setTestTaroId(taroId);
    
    // もしテスト太郎がいれば、そちらのIDをベースに参加状況を確認する
    const targetUserId = taroId || currentStudentId;

    const [slotsRes, entriesRes] = await Promise.all([
        getTrioSlots(),
        targetUserId ? getStudentEntries(targetUserId) : Promise.resolve({ entries: [] })
    ]);

    if (slotsRes.error) {
      setError(slotsRes.error);
    } else {
      setSlots(slotsRes.slots || []);
    }

    if (entriesRes.entries) {
        setUserEntries(entriesRes.entries.map(e => e.slot_id));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEntry = async (slotId: string) => {
    if (!testTaroId) {
      toast.error('テスト用ユーザーが取得できませんでした');
      return;
    }
    if (!window.confirm('この枠に仮エントリーしますか？（まだ決済は発生しません）')) return;
    setLoading(true);
    const res = await entryTrioSlot(slotId, testTaroId);
    if (!res.success) {
      toast.error(res.error || 'エラーが発生しました');
    } else {
        toast.success('エントリーしました！');
    }
    await fetchData();
  };

  const handleConfirm = async (slotId: string) => {
    if (!testTaroId) {
      toast.error('テスト用ユーザーが取得できませんでした');
      return;
    }
    if (!window.confirm('この枠の開催を確定させますか？（チケットが1枚消化されます）')) return;
    setLoading(true);
    const res = await confirmTrioSlot(slotId, testTaroId);
    if (!res.success) {
      toast.error(res.error || 'エラーが発生しました');
    } else {
        toast.success('開催を確定しました！');
    }
    await fetchData();
  };

  const handlePurchaseTicket = async (count: number) => {
    if (!studentId) {
        toast.error('ユーザー情報の取得に失敗しました。再ログインをお試しください。');
        return;
    }
    setPaymentLoading(true);
    const loadingToast = toast.loading('決済ページへ移動しています...');

    try {
        const res = await createTrioTicketCheckoutSession(studentId, count);
        if (res.success && res.url) {
            toast.dismiss(loadingToast);
            window.location.href = res.url;
        } else {
            throw new Error(res.error || '決済ページの作成に失敗しました');
        }
    } catch (err: any) {
        toast.error(err.message);
        setPaymentLoading(false);
        toast.dismiss(loadingToast);
    }
  };

  const renderSlotCard = (slot: TrioSlot) => {
    const isUserEntered = userEntries.includes(slot.id);
    const isEntry = slot.status === 'entry' && slot.reserved_count === 0;
    const isMatching = slot.status === 'matching' && slot.reserved_count === 1;
    const isConfirmed = slot.status === 'confirmed' && slot.reserved_count === 2;
    const isFull = slot.reserved_count >= 3;

    let statusLabel = "終了";
    let statusClass = "bg-slate-100 text-slate-500 border-slate-200";
    
    if (isEntry) {
        statusLabel = "受付中";
        statusClass = "bg-blue-50 text-blue-600 border-blue-100";
    } else if (isMatching) {
        statusLabel = "マッチング中";
        statusClass = "bg-amber-50 text-amber-600 border-amber-100";
    } else if (isConfirmed) {
        statusLabel = "開催確定";
        statusClass = "bg-emerald-50 text-emerald-600 border-emerald-100 font-bold";
    }

    return (
      <Card key={slot.id} className={cn(
          "relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 border-slate-200/60 backdrop-blur-md bg-white/60 group",
          isUserEntered && "border-indigo-400 ring-2 ring-indigo-500/10 bg-indigo-50/10"
      )}>
        {/* Status Line */}
        <div className={cn(
            "absolute top-0 left-0 right-0 h-1.5",
            isEntry ? "bg-blue-400" : isMatching ? "bg-amber-400" : isConfirmed ? "bg-emerald-400" : "bg-slate-300",
            isUserEntered && "bg-gradient-to-r from-indigo-500 to-purple-500 h-2"
        )} />

        <CardHeader className="pb-3 pt-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{new Date(slot.start_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-800">
                {new Date(slot.start_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                <span className="text-sm font-medium mx-2 text-slate-400">〜</span>
                {new Date(slot.end_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </CardTitle>
            </div>
            
            <Badge variant="outline" className={cn("px-3 py-1 text-[11px] uppercase tracking-wider rounded-full shadow-sm", statusClass)}>
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-2">
          {/* Matching Visualization */}
          <div className="bg-slate-50/50 rounded-2xl p-4 mb-6 flex flex-col items-center border border-slate-100">
            <div className="flex justify-between w-full mb-3 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3" /> Participants
                </span>
                <span className="text-xs font-bold text-slate-600">{slot.reserved_count} / 3</span>
            </div>
            <div className="flex gap-4 w-full">
              {[...Array(3)].map((_, i) => {
                const isOccupied = i < slot.reserved_count;
                const isMe = isUserEntered && i === (slot.reserved_count - 1); 
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700",
                        isMe ? "bg-gradient-to-br from-indigo-600 to-purple-500 text-white shadow-lg ring-4 ring-indigo-100" :
                        isOccupied ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : 
                        "bg-white border-2 border-dashed border-slate-200 text-slate-300"
                    )}>
                      {isMe ? <UserIcon className="w-6 h-6" /> : isOccupied ? <CheckCircle2 className="w-6 h-6" /> : <HelpCircle className="w-6 h-6 opacity-30" />}
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase", isMe ? "text-indigo-600" : isOccupied ? "text-emerald-600" : "text-slate-300")}>
                        {isMe ? "YOU" : isOccupied ? "MATCHED" : "空き"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            {isUserEntered ? (
                <Button variant="outline" className="w-full border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 cursor-default" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> エントリー済み
                </Button>
            ) : (
                <>
                {isEntry && (
                    <Button 
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20 text-white font-bold"
                        onClick={() => handleEntry(slot.id)} disabled={loading}
                    >
                        マッチングを開始する
                    </Button>
                )}
                {isMatching && (
                    <Button 
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/20 text-white font-bold"
                        onClick={() => handleConfirm(slot.id)} disabled={loading}
                    >
                        参加して開催を確定させる
                    </Button>
                )}
                {isConfirmed && (
                    <Button 
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20 text-white font-bold"
                        onClick={() => handleConfirm(slot.id)} disabled={loading}
                    >
                        この枠を予約する
                    </Button>
                )}
                </>
            )}
            
            {(isFull || slot.status === 'closed') && !isUserEntered && (
              <Button variant="secondary" className="w-full h-12 opacity-50 cursor-not-allowed" disabled>
                満員・受付終了
              </Button>
            )}
          </div>
        </CardContent>
        
        {isUserEntered && (
            <div className="absolute top-4 right-4 animate-bounce">
                 <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 border-none">予約中</Badge>
            </div>
        )}
      </Card>
    );
  };

  return (
    <div className="w-full min-h-screen pb-20">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-6 py-6 border-b border-indigo-50/50">
          <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 text-[10px] uppercase tracking-[0.2em] font-black shadow-xl shadow-indigo-500/20 border-none transition-transform hover:scale-105 cursor-default">
            THE TRIO プレミアム会員
          </Badge>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-slate-800 drop-shadow-sm">
            THE TRIO <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">PORTAL</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            最優先でのマッチングとプレミアムなレッスン体験をご提供します。<br/>
            エントリーした枠は「参加中」タブからご確認いただけます。
          </p>
        </div>

        {/* Action Center - Horizontal Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-stretch">
            {/* Current Balance */}
            <div className="lg:col-span-4 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                <div className="space-y-4 relative z-10">
                    <h2 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Asset Balance
                    </h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-7xl font-black text-slate-800 tracking-tighter">12</span>
                        <span className="text-xl font-bold text-slate-400">枚</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100 uppercase">
                        Active & Ready
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100/50 relative z-10">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                        Expiration: Dec 31, 2026<br/>
                        Priority Status: Tier 1
                    </p>
                </div>
            </div>

            {/* Quick Buy */}
            <div className="lg:col-span-7 bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between group hover:shadow-2xl transition-all duration-500">
                <div className="space-y-6">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Ticket Store
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button 
                            onClick={() => handlePurchaseTicket(1)}
                            disabled={paymentLoading}
                            className="h-24 bg-white/50 border-2 border-slate-100 hover:border-indigo-400 hover:bg-white rounded-3xl transition-all duration-300 flex flex-col gap-1 items-start px-8"
                            variant="outline"
                        >
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest group/btn-1">Single Pass</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-800 tracking-tighter">¥5,500</span>
                                <span className="text-xs font-bold text-slate-400">/ 1枚</span>
                            </div>
                        </Button>
                        <Button 
                            onClick={() => handlePurchaseTicket(4)}
                            disabled={paymentLoading}
                            className="h-24 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none rounded-3xl transition-all duration-300 shadow-lg shadow-indigo-500/20 flex flex-col gap-1 items-start px-8 text-white relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black px-4 py-1 rounded-bl-xl shadow-sm tracking-tighter">
                                POPULAR
                            </div>
                            <span className="text-xs font-black text-white/60 uppercase tracking-widest">Premium Set</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-white tracking-tighter">¥20,000</span>
                                <span className="text-xs font-medium text-white/50">/ 4枚</span>
                            </div>
                        </Button>
                    </div>
                </div>
                <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] text-center sm:text-left">
                    * 購入後、保有チケット残高に即時反映されます。
                </p>
            </div>
        </div>

        {/* Schedule Grid with Tabs */}
        <div className="space-y-8 pt-6">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
               <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                 <Crown className="w-8 h-8 text-indigo-500" />
                 マッチングカレンダー
               </h2>
               <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 backdrop-blur-sm h-12">
                 <TabsTrigger value="all" className="rounded-xl px-6 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">すべての募集</TabsTrigger>
                 <TabsTrigger value="my" className="rounded-xl px-6 font-black text-xs uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white">参加中 ({userEntries.length})</TabsTrigger>
               </TabsList>
            </div>

            <TabsContent value="all" className="mt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {slots.length > 0 ? (
                  slots.map(renderSlotCard)
                ) : (
                  <div className="col-span-full py-24 text-center space-y-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem]">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest">現在、新しい募集はありません。</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="my" className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {slots.filter(s => userEntries.includes(s.id)).length > 0 ? (
                    slots.filter(s => userEntries.includes(s.id)).map(renderSlotCard)
                ) : (
                    <div className="col-span-full py-24 text-center space-y-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem]">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <Crown className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest">現在、参加中の募集はありません。</p>
                    </div>
                )}
                </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="font-black text-xs uppercase tracking-[0.3em] text-indigo-600 animate-pulse">Loading Premium Content</p>
              </div>
          </div>
      )}
    </div>
  );
}
