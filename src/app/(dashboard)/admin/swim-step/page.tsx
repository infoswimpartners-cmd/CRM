'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { 
  getSwimStepBookings, 
  updateSwimStepBooking, 
  sendSwimStepLineMessage 
} from '@/actions/swim_step_admin';
import { SWIM_STEP_SLOTS_DEF } from '@/types/swim_step';
import type { 
  SwimStepAdminBooking, 
  SwimStepSummary 
} from '@/types/swim_step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Waves, 
  Users, 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  Search, 
  MessageCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Eye, 
  Send, 
  Copy, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSwimStepPage() {
  const [bookings, setBookings] = useState<SwimStepAdminBooking[]>([]);
  const [summary, setSummary] = useState<SwimStepSummary>({
    totalBookings: 0,
    paidBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    slotCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // モーダル管理
  const [selectedBooking, setSelectedBooking] = useState<SwimStepAdminBooking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [lineMessageText, setLineMessageText] = useState('');
  const [isSendingLine, setIsSendingLine] = useState(false);

  // 詳細モーダル内の編集ステート
  const [editPaymentStatus, setEditPaymentStatus] = useState<'pending' | 'paid' | 'canceled'>('pending');
  const [editStatus, setEditStatus] = useState<'confirmed' | 'attended' | 'cancelled'>('confirmed');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getSwimStepBookings();
      setBookings(res.bookings);
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
      toast.error('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 詳細モーダルオープン
  const handleOpenDetail = (booking: SwimStepAdminBooking) => {
    setSelectedBooking(booking);
    setEditPaymentStatus(booking.payment_status);
    setEditStatus(booking.status);
    setEditAdminNotes(booking.admin_notes || '');
    setIsDetailModalOpen(true);
  };

  // 詳細更新保存
  const handleSaveDetail = async () => {
    if (!selectedBooking) return;
    setIsUpdating(true);
    try {
      const res = await updateSwimStepBooking(selectedBooking.id, {
        payment_status: editPaymentStatus,
        status: editStatus,
        admin_notes: editAdminNotes,
      });

      if (res.success) {
        toast.success('申込情報を更新しました。');
        setIsDetailModalOpen(false);
        fetchData();
      } else {
        toast.error(res.error || '更新に失敗しました。');
      }
    } catch (e) {
      toast.error('エラーが発生しました。');
    } finally {
      setIsUpdating(false);
    }
  };

  // LINEメッセージモーダルオープン
  const handleOpenLineModal = (booking: SwimStepAdminBooking) => {
    setSelectedBooking(booking);
    setLineMessageText(
      `【スイムステップ事務局より】\n${booking.parent_name} 様\n\n城東小学校プールでのレッスンについてのご連絡です。\n\n`
    );
    setIsLineModalOpen(true);
  };

  // LINEメッセージ送信実行
  const handleSendLine = async () => {
    if (!selectedBooking) return;
    if (!lineMessageText.trim()) {
      toast.error('メッセージ内容を入力してください。');
      return;
    }

    setIsSendingLine(true);
    try {
      const res = await sendSwimStepLineMessage(selectedBooking.id, lineMessageText);
      if (res.success) {
        toast.success(`${selectedBooking.parent_name} 様のLINEへメッセージを送信しました。`);
        setIsLineModalOpen(false);
      } else {
        toast.error(res.error || 'LINE送信に失敗しました。');
      }
    } catch (e) {
      toast.error('通信エラーが発生しました。');
    } finally {
      setIsSendingLine(false);
    }
  };

  // CSVエクスポート
  const handleExportCsv = () => {
    if (bookings.length === 0) {
      toast.warning('出力対象のデータがありません。');
      return;
    }

    const headers = [
      '申込ID',
      '申込日時',
      '保護者氏名',
      '保護者フリガナ',
      '電話番号',
      'メールアドレス',
      'お子様氏名',
      'お子様フリガナ',
      '年齢・学年',
      '参加プラン',
      '金額',
      '決済状況',
      '受講ステータス',
      '選択スロット数',
      '選択日程・クラス詳細',
      '泳力・お悩み',
      '管理者メモ',
    ];

    const rows = bookings.map((b) => [
      b.id,
      new Date(b.created_at).toLocaleString('ja-JP'),
      b.parent_name,
      b.parent_kana,
      b.phone,
      b.email,
      b.child_name,
      b.child_kana,
      b.child_age || '',
      b.plan_type,
      b.amount,
      b.payment_status === 'paid' ? '決済完了' : b.payment_status === 'pending' ? '未決済' : 'キャンセル',
      b.status === 'confirmed' ? '予約確定' : b.status === 'attended' ? '出席済' : 'キャンセル',
      b.selected_slots?.length || 0,
      (b.selected_slots || []).map((s) => `${s.dateLabel} ${s.className}`).join('; '),
      `"${(b.swimming_experience || '').replace(/"/g, '""')}"`,
      `"${(b.admin_notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `swim_step_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSVファイルを出力しました。');
  };

  // フィルタリング
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.parent_kana.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.child_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment =
      filterPayment === 'all' || b.payment_status === filterPayment;

    return matchesSearch && matchesPayment;
  });

  const getPlanBadge = (type: string) => {
    switch (type) {
      case 'single':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700">1回チケット</Badge>;
      case 'double':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">2回チケット</Badge>;
      case 'full':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold">4回完走パック</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> 決済完了
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> 未決済
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 gap-1 text-[11px]">
            <XCircle className="w-3 h-3" /> キャンセル
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-blue-600 text-white text-xs">城東小学校プール</Badge>
            <span className="text-xs text-slate-500">10月限定・少人数クラス</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Waves className="w-7 h-7 text-blue-600" />
            スイムステップ 運営管理
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            LINE申し込みフォーム（LIFF）、Stripe決済ステータス、クラス別参加状況を一元管理します。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs text-slate-700"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            名簿CSV出力
          </Button>
          <Button
            size="sm"
            onClick={() => window.open('/swim-step', '_blank')}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            申込フォームを開く
          </Button>
        </div>
      </div>

      {/* KPIサマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">総申込数</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900 flex items-center justify-between">
              <span>{summary.totalBookings} <span className="text-sm font-normal text-slate-500">件</span></span>
              <Users className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            全チケットプランの合算件数
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">決済完了 / 売上総額</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600 flex items-center justify-between">
              <span>{summary.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-500">円</span></span>
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            決済完了：<strong className="text-emerald-700">{summary.paidBookings}件</strong>（未決済：{summary.pendingBookings}件）
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">全8クラス 総受講枠</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-blue-600 flex items-center justify-between">
              <span>
                {Object.values(summary.slotCounts).reduce((a, b) => a + b, 0)}
                <span className="text-sm font-normal text-slate-400"> / 24 枠</span>
              </span>
              <Calendar className="w-5 h-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            定員3名 × 2クラス × 全4回（充填率：
            {Math.round(((Object.values(summary.slotCounts).reduce((a, b) => a + b, 0)) / 24) * 100)}%）
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">開催場所</CardDescription>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
              <span>城東小学校プール</span>
              <MapPin className="w-5 h-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            毎週金曜夕方（10/2, 10/9, 10/16, 10/23）
          </CardContent>
        </Card>
      </div>

      {/* メインタブ */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-xl">
          <TabsTrigger value="list" className="rounded-lg text-xs sm:text-sm font-semibold">
            <Users className="w-4 h-4 mr-1.5" />
            参加申込・決済一覧 ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="slots" className="rounded-lg text-xs sm:text-sm font-semibold">
            <Calendar className="w-4 h-4 mr-1.5" />
            クラス別・日程別 集計 (全8枠)
          </TabsTrigger>
          <TabsTrigger value="guide" className="rounded-lg text-xs sm:text-sm font-semibold">
            <Sparkles className="w-4 h-4 mr-1.5" />
            LINE設定・プロモーション案内
          </TabsTrigger>
        </TabsList>

        {/* タブ1: 申込一覧 */}
        <TabsContent value="list" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">申し込みデータ一覧</CardTitle>
                <CardDescription className="text-xs">
                  保護者様・お子様情報、選択プラン、決済状況を確認・更新できます。
                </CardDescription>
              </div>

              {/* 検索・絞り込み */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                  <Input
                    placeholder="氏名・電話・メールで検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9 bg-white"
                  />
                </div>
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger className="w-32 text-xs h-9 bg-white">
                    <SelectValue placeholder="決済状況" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての決済</SelectItem>
                    <SelectItem value="paid">決済完了のみ</SelectItem>
                    <SelectItem value="pending">未決済のみ</SelectItem>
                    <SelectItem value="canceled">キャンセルのみ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 text-[11px] text-slate-500 font-bold">
                      <TableHead className="w-28">申込日時</TableHead>
                      <TableHead>保護者様</TableHead>
                      <TableHead>お子様</TableHead>
                      <TableHead>連絡先</TableHead>
                      <TableHead>プラン</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>決済状況</TableHead>
                      <TableHead>受講枠数</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right pr-4">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-slate-400 text-sm">
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...
                            </span>
                          ) : (
                            '該当する申し込みデータはありません。'
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBookings.map((b) => (
                        <TableRow key={b.id} className="text-xs hover:bg-slate-50/80 transition-colors">
                          <TableCell className="text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(b.created_at).toLocaleDateString('ja-JP', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            <div>{b.parent_name}</div>
                            <div className="text-[10px] text-slate-400">{b.parent_kana}</div>
                            {b.line_user_id && (
                              <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 mt-0.5 px-1 py-0">
                                LINE連携済
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-800">{b.child_name}</div>
                            <div className="text-[10px] text-slate-500">{b.child_age || '-'}</div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-[11px]">
                            <div>{b.phone}</div>
                            <div className="text-[10px] text-slate-400">{b.email}</div>
                          </TableCell>
                          <TableCell>{getPlanBadge(b.plan_type)}</TableCell>
                          <TableCell className="font-bold text-slate-800">
                            {b.amount.toLocaleString()}円
                          </TableCell>
                          <TableCell>{getPaymentBadge(b.payment_status)}</TableCell>
                          <TableCell>
                            <span className="font-bold text-blue-600">
                              {b.selected_slots?.length || 0} 枠
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {b.status === 'confirmed' ? '予約確定' : b.status === 'attended' ? '出席済' : 'キャンセル'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetail(b)}
                                className="h-7 px-2 text-[11px]"
                              >
                                <Eye className="w-3 h-3 mr-1" /> 詳細
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!b.line_user_id}
                                onClick={() => handleOpenLineModal(b)}
                                title={b.line_user_id ? 'LINEで個別連絡' : 'LINE未連携のため送信不可'}
                                className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50"
                              >
                                <MessageCircle className="w-3.5 h-3.5 mr-1" /> LINE
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* タブ2: クラス別・日程別集計 */}
        <TabsContent value="slots" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SWIM_STEP_SLOTS_DEF.map((sess) => (
              <Card key={sess.sessionNumber} className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 bg-slate-50/60 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-800">
                      {sess.dateLabel}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] bg-white">
                    定員各3名
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {sess.classes.map((cls) => {
                    const slotKey = `${sess.sessionNumber}_${cls.type}`;
                    const count = summary.slotCounts[slotKey] || 0;
                    const percent = Math.min(Math.round((count / cls.capacity) * 100), 100);

                    // 該当クラスに参加している申込者を抽出
                    const slotBookings = bookings.filter(
                      (b) =>
                        b.payment_status === 'paid' &&
                        b.selected_slots?.some(
                          (s) =>
                            s.sessionNumber === sess.sessionNumber && s.classType === cls.type
                        )
                    );

                    return (
                      <div key={cls.type} className="border border-slate-200/80 rounded-xl p-3 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-slate-800">
                              {cls.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${count >= cls.capacity ? 'text-rose-600' : 'text-blue-600'}`}>
                              {count} / {cls.capacity} 名
                            </span>
                            {count >= cls.capacity && (
                              <span className="text-[10px] text-rose-500 font-bold ml-1">（満員）</span>
                            )}
                          </div>
                        </div>

                        {/* プログレスバー */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              count >= cls.capacity ? 'bg-rose-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* 参加予定児童リスト */}
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-[11px] font-semibold text-slate-400 mb-1">
                            参加者一覧:
                          </div>
                          {slotBookings.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">まだ予約はありません</p>
                          ) : (
                            <ul className="space-y-1">
                              {slotBookings.map((sb) => (
                                <li
                                  key={sb.id}
                                  className="text-xs text-slate-700 flex items-center justify-between bg-slate-50 px-2 py-1 rounded"
                                >
                                  <span className="font-medium">
                                    {sb.child_name} <span className="text-[10px] text-slate-500">（{sb.child_age || '年齢未設定'}）</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    保護者: {sb.parent_name} 様 ({sb.phone})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* タブ3: LINE設定・プロモーション案内 */}
        <TabsContent value="guide" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                LINE公式アカウント設定＆導線情報
              </CardTitle>
              <CardDescription className="text-xs">
                LINE公式アカウントのリッチメニューやあいさつメッセージに設定するURLとテンプレートです。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* LIFF URL情報 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <Label className="text-xs font-bold text-slate-700">LIFF リンクURL（リッチメニュー・配信メッセージ用）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`https://liff.line.me/${process.env.NEXT_PUBLIC_SWIM_STEP_LIFF_ID || '2011594077-hBdk9Xr7'}`}
                    className="text-xs bg-white font-mono text-emerald-700 font-bold"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_SWIM_STEP_LIFF_ID || '2011594077-hBdk9Xr7'}`;
                      navigator.clipboard.writeText(liffUrl);
                      toast.success('LIFF URLをクリップボードにコピーしました。');
                    }}
                    className="shrink-0 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> LIFF URLをコピー
                  </Button>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>
                    ・<strong>リッチメニューや配信メッセージのリンク先</strong>には、上記 <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">https://liff.line.me/2011594077-hBdk9Xr7</code> をご指定ください。
                  </p>
                  <p>
                    ・LINE Developersの「エンドポイントURL」には <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">{typeof window !== 'undefined' ? window.location.origin : ''}/swim-step</code> を登録してください。
                  </p>
                </div>
              </div>

              {/* 友だち追加あいさつメッセージの文面 */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">友だち追加時 自動あいさつメッセージ（推奨テンプレート）</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_SWIM_STEP_LIFF_ID || '2011594077-hBdk9Xr7'}`;
                      const text = `スイムステップへようこそ！🏊‍♂️✨

城東小学校プールで開催される
【10月限定・小学生向け少人数水泳クラス】
のご案内です。

「水が怖くて顔がつけられない…」
「クロールの息継ぎで沈んでしまう…」
「小学校のプールや体育で自信をつけさせたい！」

そんなお子様のための、最大3名制の丁寧な特別レッスンです。

📅 開催日程（全4回）：
・第1回：10月2日（金）
・第2回：10月9日（金）
・第3回：10月16日（金）
・第4回：10月23日（金）
（17:00〜 水慣れクラス / 18:00〜 クロール息継ぎクラス）

▼ 下記ボタンより簡単にお申し込みいただけます（1回のみの参加もOK！）
👉 ${liffUrl}`;
                      navigator.clipboard.writeText(text);
                      toast.success('テンプレートをコピーしました。');
                    }}
                    className="text-xs h-7 text-blue-600"
                  >
                    <Copy className="w-3 h-3 mr-1" /> 文面をコピー
                  </Button>
                </div>
                <Textarea
                  readOnly
                  rows={8}
                  className="text-xs bg-slate-50 font-mono"
                  value={`スイムステップへようこそ！🏊‍♂️✨

城東小学校プールで開催される
【10月限定・小学生向け少人数水泳クラス】
のご案内です。

「水が怖くて顔がつけられない…」
「クロールの息継ぎで沈んでしまう…」
「小学校のプールや体育で自信をつけさせたい！」

そんなお子様のための、最大3名制の丁寧な特別レッスンです。

📅 開催日程（全4回）：
・第1回：10月2日（金）
・第2回：10月9日（金）
・第3回：10月16日（金）
・第4回：10月23日（金）
（17:00〜 水慣れクラス / 18:00〜 クロール息継ぎクラス）

▼ 下記ボタンより簡単にお申し込みいただけます（1回のみの参加もOK！）
👉 https://liff.line.me/${process.env.NEXT_PUBLIC_SWIM_STEP_LIFF_ID || '2011594077-hBdk9Xr7'}`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 詳細確認・ステータス編集モーダル */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              申込詳細情報
            </DialogTitle>
            <DialogDescription className="text-xs">
              申込内容の確認と、決済・参加ステータス、管理者メモの変更を行えます。
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 text-xs">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">保護者様</span>
                  <strong className="text-slate-800 text-sm">{selectedBooking.parent_name}</strong>
                  <span className="text-slate-500 block text-[11px]">({selectedBooking.parent_kana})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">お子様</span>
                  <strong className="text-slate-800 text-sm">{selectedBooking.child_name}</strong>
                  <span className="text-slate-500 block text-[11px]">
                    ({selectedBooking.child_kana}) / {selectedBooking.child_age}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">電話番号</span>
                  <span className="text-slate-800 font-medium">{selectedBooking.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">メールアドレス</span>
                  <span className="text-slate-800 font-medium">{selectedBooking.email}</span>
                </div>
              </div>

              {/* 選択日程・クラス */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">受講希望日程・クラス</Label>
                <div className="space-y-1.5">
                  {selectedBooking.selected_slots?.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center justify-between"
                    >
                      <span className="font-bold text-blue-900">{s.dateLabel}</span>
                      <Badge variant="outline" className="bg-white text-blue-800">
                        {s.className}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* 泳力・お悩み */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">お子様の現在の泳力・お悩み</Label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedBooking.swimming_experience || '（未入力）'}
                </div>
              </div>

              {/* ステータス変更 */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">決済ステータス</Label>
                  <Select
                    value={editPaymentStatus}
                    onValueChange={(v: any) => setEditPaymentStatus(v)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">決済完了 (paid)</SelectItem>
                      <SelectItem value="pending">未決済 (pending)</SelectItem>
                      <SelectItem value="canceled">キャンセル (canceled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">受講ステータス</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(v: any) => setEditStatus(v)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">予約確定 (confirmed)</SelectItem>
                      <SelectItem value="attended">出席済 (attended)</SelectItem>
                      <SelectItem value="cancelled">キャンセル (cancelled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 管理者メモ */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">管理者メモ</Label>
                <Textarea
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder="入金確認メモ、連絡履歴などを記入"
                  rows={3}
                  className="text-xs bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailModalOpen(false)}
            >
              閉じる
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDetail}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? '保存中...' : '変更を保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LINE個別送信モーダル */}
      <Dialog open={isLineModalOpen} onOpenChange={setIsLineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              LINE公式アカウントから個別連絡
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedBooking?.parent_name} 様のLINEチャットへ直接プッシュ通知を送信します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">送信メッセージ本文</Label>
              <Textarea
                rows={6}
                value={lineMessageText}
                onChange={(e) => setLineMessageText(e.target.value)}
                className="text-xs"
                placeholder="メッセージを入力してください"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              ※LINE Messaging APIを使用して即時にメッセージが配信されます。
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLineModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleSendLine}
              disabled={isSendingLine}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSendingLine ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 送信中...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Send className="w-3.5 h-3.5" /> LINE送信
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
