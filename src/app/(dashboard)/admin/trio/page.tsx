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

          {/* Slots Table */}
          <Card className="border-slate-200/60 shadow-sm rounded-3xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-14">日時</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-14">ステータス</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-14">予約人数</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-14">施設予約</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400 pr-8 h-14">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map(slot => (
                    <TableRow key={slot.id} className="group hover:bg-slate-50/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            {format(new Date(slot.start_at), 'yyyy/MM/dd (E)', { locale: ja })}
                          </span>
                          <span className="text-xs text-slate-400 font-medium tracking-tight">
                            {format(new Date(slot.start_at), 'HH:mm')} ~ {format(new Date(slot.end_at), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                          slot.status === 'entry' ? "bg-blue-50 text-blue-600 border-blue-100" :
                          slot.status === 'matching' ? "bg-orange-50 text-orange-600 border-orange-100" :
                          slot.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          "bg-slate-50 text-slate-400 border-slate-100"
                        )}>
                          {slot.status === 'entry' ? '受付中' : 
                           slot.status === 'matching' ? 'マッチング中' : 
                           slot.status === 'confirmed' ? '開催確定' : '終了'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            slot.reserved_count === 3 ? "bg-emerald-500" : "bg-slate-300"
                          )} />
                          <span className="font-bold text-slate-700">{slot.reserved_count} <span className="text-xs text-slate-400 font-medium">/ 3</span></span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBooked(slot.id, slot.is_facility_booked)}
                          className={cn(
                            "rounded-full px-4 h-8 text-[10px] font-black uppercase tracking-widest transition-all",
                            slot.is_facility_booked 
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700" 
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {slot.is_facility_booked ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                          {slot.is_facility_booked ? '予約済' : '未予約'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {slots.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-slate-300 font-bold uppercase tracking-widest mt-12">
                        募集中のスロットはありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
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
