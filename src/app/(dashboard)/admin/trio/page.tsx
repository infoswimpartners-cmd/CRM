'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertCircle,
  Phone,
  Settings
} from 'lucide-react';
import { 
  getAppConfig,
  updateAppConfig
} from '@/actions/app_configs';
import { 
  getTrioAdminSlots,
  cancelTrioEntry,
  sendTrioTestLineNotification,
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
  const [slots, setSlots] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slots');

  // スロット作成用のフォームステート
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('ヤエスク');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 設定管理用のステート
  const [selectedFacility, setSelectedFacility] = useState('ヤエスク');
  const [facilities, setFacilities] = useState<string[]>(['ヤエスク']);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [accessText, setAccessText] = useState('');
  const [mapEmbed, setMapEmbed] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // LINE通知設定用のステート
  const [lineNotifyEnabled, setLineNotifyEnabled] = useState(true);
  const [lineEntryTemplate, setLineEntryTemplate] = useState('');
  const [lineMatchingTemplate, setLineMatchingTemplate] = useState('');

  // ダイアログ用のステート
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<string | null>(null);
  const [confirmCancelEntry, setConfirmCancelEntry] = useState<{ entryId: string; slotId: string } | null>(null);
  const [confirmDeleteFacility, setConfirmDeleteFacility] = useState<string | null>(null);

  // テスト送信用のステート
  const [testLineDialog, setTestLineDialog] = useState<{ isOpen: boolean; template: string; type: string }>({ 
    isOpen: false, 
    template: '', 
    type: '' 
  });
  const [testLineUserId, setTestLineUserId] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slotsRes, waitlistRes] = await Promise.all([
        getTrioAdminSlots(),
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
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    const val = await getAppConfig('trio_facilities');
    if (val) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) setFacilities(parsed);
      } catch (e) {
        console.error('Failed to parse facilities:', e);
      }
    }
  };

  // 選択中の施設の情報を取得
  useEffect(() => {
    const fetchConfig = async () => {
      const val = await getAppConfig(`trio_access_${selectedFacility}`);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setAccessText(parsed.text || '');
          setMapEmbed(parsed.mapEmbed || '');
        } catch (e) {
          setAccessText(val);
          setMapEmbed('');
        }
      } else {
        setAccessText('');
        setMapEmbed('');
      }
    };
    fetchConfig();
  }, [selectedFacility]);

  // グローバル設定の取得
  useEffect(() => {
    const fetchGlobalConfig = async () => {
      const entryTmpl = await getAppConfig('trio_line_entry_template');
      const matchingTmpl = await getAppConfig('trio_line_matching_template');
      const enabled = await getAppConfig('trio_line_notify_enabled');

      if (entryTmpl) setLineEntryTemplate(entryTmpl);
      if (matchingTmpl) setLineMatchingTemplate(matchingTmpl);
      if (enabled !== null) setLineNotifyEnabled(enabled === 'true');
    };
    fetchGlobalConfig();
  }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;

    setIsSubmitting(true);
    const startAt = new Date(`${date}T${startTime}:00+09:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00+09:00`).toISOString();

    const res = await createTrioSlot(startAt, endAt, location);
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

  const handleCancelEntry = async (entryId: string, slotId: string) => {
    try {
      const res = await cancelTrioEntry(entryId, slotId);
      if (res.success) {
        toast.success('エントリーをキャンセルしました');
        await fetchData();
      } else {
        toast.error(res.error || 'キャンセルに失敗しました');
      }
    } catch (err) {
      toast.error('通信エラーが発生しました');
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    const configData = JSON.stringify({
      text: accessText,
      mapEmbed: mapEmbed
    });
    const res = await updateAppConfig(`trio_access_${selectedFacility}`, configData, `${selectedFacility}のアクセス確認情報`);
    if (res.success) {
      toast.success('設定を保存しました');
    } else {
      toast.error(res.error || '保存に失敗しました');
    }
    setIsSavingConfig(false);
  };

  const handleSaveGlobalConfig = async () => {
    setIsSavingConfig(true);
    try {
      await Promise.all([
        updateAppConfig('trio_line_entry_template', lineEntryTemplate, 'Trio予約受付時のLINE通知テンプレート'),
        updateAppConfig('trio_line_matching_template', lineMatchingTemplate, 'Trioマッチング成立時のLINE通知テンプレート'),
        updateAppConfig('trio_line_notify_enabled', lineNotifyEnabled ? 'true' : 'false', 'TrioのLINE通知有効フラグ')
      ]);
      toast.success('グローバル設定を保存しました');
    } catch (err) {
      toast.error('一部の設定の保存に失敗しました');
    }
    setIsSavingConfig(false);
  };

  const handleSendTestLine = async () => {
    if (!testLineUserId) {
      toast.error('LINE User IDを入力してください');
      return;
    }

    setIsSendingTest(true);
    
    // サンプルデータで置換
    const formattedDate = format(new Date(), 'MM月dd日(E) HH:mm', { locale: ja });
    const message = testLineDialog.template
      .replace(/{{name}}/g, 'テスト太郎')
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{location}}/g, 'ヤエスク (テスト用)');

    const res = await sendTrioTestLineNotification(testLineUserId, message);
    if (res.success) {
      toast.success('テストメッセージを送信しました');
      setTestLineDialog(prev => ({ ...prev, isOpen: false }));
    } else {
      toast.error(res.error || '送信に失敗しました');
    }
    setIsSendingTest(false);
  };

  const handleAddFacility = async () => {
    if (!newFacilityName || facilities.includes(newFacilityName)) return;
    const newFacilities = [...facilities, newFacilityName];
    const res = await updateAppConfig('trio_facilities', JSON.stringify(newFacilities), 'Trio施設リスト');
    if (res.success) {
      setFacilities(newFacilities);
      setNewFacilityName('');
      toast.success('施設を追加しました');
    } else {
      toast.error('追加に失敗しました');
    }
  };

  const handleDeleteFacility = async (name: string) => {
    if (name === 'ヤエスク') {
      toast.error('ヤエスクは削除できません');
      return;
    }
    
    const newFacilities = facilities.filter(f => f !== name);
    const res = await updateAppConfig('trio_facilities', JSON.stringify(newFacilities), 'Trio施設リスト');
    if (res.success) {
      setFacilities(newFacilities);
      if (selectedFacility === name) setSelectedFacility('ヤエスク');
      if (location === name) setLocation('ヤエスク');
      toast.success('削除しました');
    } else {
      toast.error('削除に失敗しました');
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
          <TabsTrigger value="settings" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
            <Settings className="w-4 h-4 mr-2" />
            設定
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
              <form onSubmit={handleCreateSlot} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">開催場所</label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="施設を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilities.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">{slot.location || 'ヤエスク'}</p>
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmDeleteSlot(slot.id);
                          }}
                          className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all ml-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Entries Display */}
                    {slot.entries && slot.entries.length > 0 && (
                      <div className="mt-6 border-t border-slate-100 pt-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Participants ({slot.entries.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {slot.entries.map((entry: any) => (
                            <div key={entry.id} className="relative bg-slate-50/80 rounded-2xl p-4 border border-slate-100/50 group/entry">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setConfirmCancelEntry({ entryId: entry.id, slotId: slot.id });
                                }}
                                className="absolute top-3 right-3 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/entry:opacity-100"
                                title="キャンセル（削除）"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-black text-slate-800">{entry.student.full_name}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                    {entry.student.is_trio ? 'Member' : 'Experience'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {entry.student.contact_email || '未登録'}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {entry.student.contact_phone || '未登録'}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  entry.payment_status === 'paid' ? "bg-emerald-400" : "bg-amber-400"
                                )} />
                                決済状況: {entry.payment_status === 'paid' ? '済 (Paid)' : '未 (Pending)'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

        <TabsContent value="settings" className="animate-in fade-in duration-500">
          <Card className="border-slate-200/60 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-500" />
                ポータル設定
              </CardTitle>
              <CardDescription>
                ユーザー向けの案内情報などを編集します。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              <div className="space-y-8">
                {/* Facility List Management */}
                <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-700 text-sm">施設リストの管理</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manage Facility List</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {facilities.map(f => (
                      <Badge key={f} variant="secondary" className="bg-white border-slate-200 px-3 py-1 text-xs font-bold flex items-center gap-2 rounded-full">
                        {f}
                        {f !== 'ヤエスク' && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmDeleteFacility(f);
                            }} 
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-sm">
                    <Input 
                      value={newFacilityName} 
                      onChange={(e) => setNewFacilityName(e.target.value)} 
                      placeholder="新しい施設名" 
                      className="rounded-xl border-slate-200 h-10"
                    />
                    <Button onClick={handleAddFacility} size="sm" className="rounded-xl bg-slate-800 hover:bg-slate-900">
                      追加
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">編集する施設名</label>
                    <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                      <SelectTrigger className="rounded-xl border-slate-200">
                        <SelectValue placeholder="施設を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilities.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-400 font-medium pb-2">※施設名ごとに設定（アクセス案内）が保存されます。</p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-700">案内テキスト</h4>
                    <p className="text-xs text-slate-400 font-medium">集合場所や入館方法の具体的な手順を入力してください。</p>
                  </div>
                  <textarea
                    value={accessText}
                    onChange={(e) => setAccessText(e.target.value)}
                    placeholder="例：ヤエスク地下1階、Cレーン付近に集合してください。水着・キャップをご持参ください。"
                    className="w-full min-h-[200px] p-6 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium leading-relaxed"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-700">Googleマップ埋め込みコード</h4>
                    <p className="text-xs text-slate-400 font-medium">Googleマップの「共有」→「地図を埋め込む」からコピーした &lt;iframe&gt; タグを貼り付けてください。</p>
                  </div>
                  <textarea
                    value={mapEmbed}
                    onChange={(e) => setMapEmbed(e.target.value)}
                    placeholder='<iframe src="..." ...></iframe>'
                    className="w-full min-h-[120px] p-6 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-mono leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSaveConfig} 
                    disabled={isSavingConfig}
                    className="rounded-xl bg-slate-800 hover:bg-slate-900 px-6 h-10 font-bold text-xs"
                  >
                    {isSavingConfig ? '保存中...' : '施設設定を保存'}
                  </Button>
                </div>

                <div className="h-px w-full bg-slate-100" />

                {/* LINE Notification Settings */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-700">LINE自動通知設定</h4>
                      <p className="text-xs text-slate-400 font-medium">予約受付時やマッチング成立時に自動で送信されるメッセージを編集します。</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-600">通知を有効にする</span>
                      <button 
                        onClick={() => setLineNotifyEnabled(!lineNotifyEnabled)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          lineNotifyEnabled ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          lineNotifyEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">予約受付完了テンプレート</label>
                        <button 
                          onClick={() => setTestLineDialog({ isOpen: true, template: lineEntryTemplate, type: '予約受付' })}
                          className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
                        >
                          テスト送信
                        </button>
                      </div>
                      <textarea
                        value={lineEntryTemplate}
                        onChange={(e) => setLineEntryTemplate(e.target.value)}
                        placeholder="予約完了時のメッセージを入力..."
                        className="w-full min-h-[180px] p-5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none transition-all text-sm font-medium leading-relaxed"
                      />
                      <div className="flex flex-wrap gap-2">
                        {['{{name}}', '{{date}}', '{{location}}'].map(tag => (
                          <span key={tag} className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">マッチング成立テンプレート</label>
                        <button 
                          onClick={() => setTestLineDialog({ isOpen: true, template: lineMatchingTemplate, type: 'マッチング成立' })}
                          className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
                        >
                          テスト送信
                        </button>
                      </div>
                      <textarea
                        value={lineMatchingTemplate}
                        onChange={(e) => setLineMatchingTemplate(e.target.value)}
                        placeholder="マッチング成立時のメッセージを入力..."
                        className="w-full min-h-[180px] p-5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none transition-all text-sm font-medium leading-relaxed"
                      />
                      <div className="flex flex-wrap gap-2">
                        {['{{name}}', '{{date}}', '{{location}}'].map(tag => (
                          <span key={tag} className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveGlobalConfig} 
                      disabled={isSavingConfig}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 h-12 font-black text-xs uppercase tracking-widest"
                    >
                      {isSavingConfig ? '保存中...' : '通知設定を保存する'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AlertDialogs */}
      <AlertDialog open={!!confirmDeleteSlot} onOpenChange={() => setConfirmDeleteSlot(null)}>
        <AlertDialogContent className="rounded-[2rem] border-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">スロットを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。スロットに紐づくエントリー情報も削除される可能性があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDeleteSlot && handleDeleteSlot(confirmDeleteSlot)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmCancelEntry} onOpenChange={() => setConfirmCancelEntry(null)}>
        <AlertDialogContent className="rounded-[2rem] border-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">エントリーをキャンセルしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この参加者のエントリーをリストから削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">戻る</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmCancelEntry && handleCancelEntry(confirmCancelEntry.entryId, confirmCancelEntry.slotId)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
            >
              キャンセルを確定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteFacility} onOpenChange={() => setConfirmDeleteFacility(null)}>
        <AlertDialogContent className="rounded-[2rem] border-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">施設を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteFacility} をリストから削除します。設定済みのアクセス情報も実質的に見えなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDeleteFacility && handleDeleteFacility(confirmDeleteFacility)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test LINE Notification Dialog */}
      <Dialog open={testLineDialog.isOpen} onOpenChange={(open) => setTestLineDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="rounded-[2rem] border-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">LINEテスト送信 ({testLineDialog.type})</DialogTitle>
            <DialogDescription>
              実際のLINEにテストメッセージを送信します。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">送信先 LINE User ID</label>
              <Input 
                value={testLineUserId}
                onChange={(e) => setTestLineUserId(e.target.value)}
                placeholder="U123456789..."
                className="rounded-xl border-slate-200"
              />
              <p className="text-[9px] text-slate-400 font-medium ml-1">※ご自身のLINE User IDを入力してください。</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">送信プレビュー (サンプルデータ使用)</label>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                {testLineDialog.template
                  .replace(/{{name}}/g, 'テスト太郎')
                  .replace(/{{date}}/g, format(new Date(), 'MM月dd日(E) HH:mm', { locale: ja }))
                  .replace(/{{location}}/g, 'ヤエスク (テスト用)') || 'テンプレートが空です'}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setTestLineDialog(prev => ({ ...prev, isOpen: false }))}
              className="rounded-xl border-slate-200"
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleSendTestLine}
              disabled={isSendingTest || !testLineUserId}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black"
            >
              {isSendingTest ? '送信中...' : 'テスト送信を実行'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
