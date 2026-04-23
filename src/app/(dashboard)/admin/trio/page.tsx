'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Timer, 
  Mail, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { getTrioSlots } from '@/actions/trio_matching';
import { 
  createTrioSlot, 
  deleteTrioSlot, 
  toggleFacilityBooked, 
  getTrioWaitlist 
} from '@/actions/trio_admin';
import { TrioSlot } from '@/types/trio';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminTrioManagementPage() {
  const [slots, setSlots] = useState<TrioSlot[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slots');

  // スロット作成用のフォームステート
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slotsRes, waitlistRes] = await Promise.all([
        getTrioSlots(),
        getTrioWaitlist()
      ]);
      
      if (slotsRes.slots) setSlots(slotsRes.slots);
      if (waitlistRes.waitlist) setWaitlist(waitlistRes.waitlist);
    } catch (err) {
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;

    setIsSubmitting(true);
    const startAt = new Date(`${date}T${startTime}:00+09:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00+09:00`).toISOString();

    const res = await createTrioSlot(startAt, endAt);
    if (res.success) {
      toast.success('スロットを作成しました');
      setDate('');
      setStartTime('');
      setEndTime('');
      await fetchData();
    } else {
      toast.error(res.error || '作成に失敗しました');
    }
    setIsSubmitting(false);
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('本当にこのスロットを削除しますか？')) return;
    const res = await deleteTrioSlot(id);
    if (res.success) {
      toast.success('削除しました');
      await fetchData();
    } else {
      toast.error(res.error || '削除に失敗しました');
    }
  };

  const handleToggleBooked = async (id: string, current: boolean) => {
    const res = await toggleFacilityBooked(id, !current);
    if (res.success) {
      await fetchData();
    } else {
      toast.error(res.error || '更新に失敗しました');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            THE TRIO 運営管理
          </h1>
          <p className="text-slate-400 text-sm font-medium">スロットの作成、施設予約状況、キャンセル待ちを一括管理します。</p>
        </div>
      </div>

      <Tabs defaultValue="slots" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl border-none">
          <TabsTrigger value="slots" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
            <CalendarIcon className="w-4 h-4 mr-2" />
            スロット管理
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            キャンセル待ち ({waitlist.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="space-y-8 animate-in fade-in duration-500">
          {/* Create Slot Form */}
          <Card className="border-slate-200/60 shadow-sm rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                新規スロット作成
              </CardTitle>
              <CardDescription>募集する日時のスロットを追加してください。</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSlot} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">日付</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">開始時間</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">終了時間</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="rounded-xl border-slate-200" />
                </div>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  {isSubmitting ? '作成中...' : 'スロット追加'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Slots Box List */}
          <div className="grid grid-cols-1 gap-4">
            {slots.length > 0 ? (
              slots.map(slot => (
                <div 
                  key={slot.id} 
                  className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Date & Time Box */}
                      <div className="bg-sky-50 rounded-2xl p-4 min-w-[140px] text-center border border-sky-100/50">
                        <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Schedule</p>
                        <p className="font-black text-sky-950">
                          {format(new Date(slot.start_at), 'MM/dd (E)', { locale: ja })}
                        </p>
                        <p className="text-xs font-bold text-sky-600 mt-1">
                          {format(new Date(slot.start_at), 'HH:mm')} - {format(new Date(slot.end_at), 'HH:mm')}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                            slot.status === 'entry' ? "bg-blue-500 text-white border-none shadow-sm shadow-blue-500/20" :
                            slot.status === 'matching' ? "bg-orange-500 text-white border-none shadow-sm shadow-orange-500/20" :
                            slot.status === 'confirmed' ? "bg-emerald-500 text-white border-none shadow-sm shadow-emerald-500/20" :
                            "bg-slate-400 text-white border-none"
                          )}>
                            {slot.status === 'entry' ? '受付中' : 
                             slot.status === 'matching' ? 'マッチング中' : 
                             slot.status === 'confirmed' ? '開催確定' : '終了'}
                          </Badge>
                          
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                             <Users className="w-3 h-3 text-slate-400" />
                             <span className="text-[11px] font-black text-slate-600">
                               {slot.reserved_count} <span className="text-slate-300">/ 3</span>
                             </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className={cn(
                                "w-2 h-2 rounded-full",
                                i < slot.reserved_count ? "bg-sky-500" : "bg-slate-100"
                              )} />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry Progress</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                      <div className="flex flex-col gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Facility Status</p>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBooked(slot.id, slot.is_facility_booked)}
                          className={cn(
                            "rounded-xl px-5 h-10 text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border",
                            slot.is_facility_booked 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                              : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                          )}
                        >
                          {slot.is_facility_booked ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-2 animate-in zoom-in duration-300" />
                              施設予約済
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 mr-2 animate-pulse" />
                              施設未予約
                            </>
                          )}
                        </Button>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all ml-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center">
                <CalendarIcon className="w-12 h-12 text-slate-200 mb-4" />
                <p className="font-black text-slate-300 uppercase tracking-widest text-sm">募集中のスロットはありません</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="waitlist" className="animate-in fade-in duration-500">
          <Card className="border-slate-200/60 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-8">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                登録順（先着順）リスト
              </CardTitle>
              <CardDescription>
                枠が空き次第、上から順番にお声がけください。登録者合計: {waitlist.length} 名
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[80px] text-center font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">No.</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">登録日</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">お名前</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">メールアドレス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.length > 0 ? (
                    waitlist.map((item, index) => (
                      <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                        <TableCell className="text-center font-bold text-slate-400 text-xs py-4">
                          {String(index + 1).padStart(2, '0')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4 text-slate-300" />
                            {format(new Date(item.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                              {item.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <Mail className="w-4 h-4 text-slate-300" />
                            {item.email}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center text-slate-300 font-bold uppercase tracking-widest">
                        キャンセル待ちリストは空です
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
