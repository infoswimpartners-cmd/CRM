'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CalendarOff,
  Bell,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MailCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentLeaveSetting } from '@/types/leave';
import {
  saveStudentLeaveSetting,
  cancelStudentLeaveSetting,
  sendResumeReminderNotification,
  sendLeaveConfirmationNotification,
} from '@/actions/leave';

interface StudentLeaveCardProps {
  studentId: string;
  studentName: string;
  initialSetting: StudentLeaveSetting | null;
  currentStatus: string;
  hasStripeSubscription: boolean;
  isAdmin: boolean;
}

export function StudentLeaveCard({
  studentId,
  studentName,
  initialSetting,
  currentStatus,
  hasStripeSubscription,
  isAdmin,
}: StudentLeaveCardProps) {
  const [setting, setSetting] = useState<StudentLeaveSetting | null>(initialSetting);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // フォーム状態（デフォルトは翌月〜6ヶ月後）
  const now = new Date();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const defaultEndDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 5, 1);
  const defaultEnd = `${defaultEndDate.getFullYear()}-${String(defaultEndDate.getMonth() + 1).padStart(2, '0')}`;

  const isSettingValid = setting && (setting.status === 'active' || setting.status === 'scheduled');

  const [startYearMonth, setStartYearMonth] = useState(isSettingValid ? setting.start_year_month : defaultStart);
  const [endYearMonth, setEndYearMonth] = useState(isSettingValid ? setting.end_year_month : defaultEnd);
  const [reason, setReason] = useState(isSettingValid ? (setting.reason || '') : '');
  const [sendConfirmation, setSendConfirmation] = useState(true);

  // 設定変更時の入力フォーム同期
  useEffect(() => {
    if (setting && (setting.status === 'active' || setting.status === 'scheduled')) {
      setStartYearMonth(setting.start_year_month);
      setEndYearMonth(setting.end_year_month);
      setReason(setting.reason || '');
    } else {
      setStartYearMonth(defaultStart);
      setEndYearMonth(defaultEnd);
      setReason('');
    }
  }, [setting, defaultStart, defaultEnd]);

  // 選択月数の計算
  const calcMonths = (s: string, e: string) => {
    if (!/^\d{4}-\d{2}$/.test(s) || !/^\d{4}-\d{2}$/.test(e)) return 0;
    const [y1, m1] = s.split('-').map(Number);
    const [y2, m2] = e.split('-').map(Number);
    return (y2 - y1) * 12 + (m2 - m1) + 1;
  };

  const selectedMonths = calcMonths(startYearMonth, endYearMonth);
  const isOverOneYear = selectedMonths > 12;
  const isInvalidRange = selectedMonths <= 0;

  // 再開予定月の算出
  const calcResumeMonth = (e: string) => {
    if (!/^\d{4}-\d{2}$/.test(e)) return '';
    const [y, m] = e.split('-').map(Number);
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    return `${nextY}年${nextM}月`;
  };

  // 前月5日リマインド予定日の算出
  const calcReminderDate = (e: string) => {
    if (!/^\d{4}-\d{2}$/.test(e)) return '';
    const [y, m] = e.split('-').map(Number);
    return `${y}年${m}月5日`;
  };

  // 休会保存
  const handleSave = async () => {
    if (isOverOneYear) {
      toast.error('休会期間は最長1年（12ヶ月）まで設定可能です。');
      return;
    }
    if (isInvalidRange) {
      toast.error('有効な休会期間を指定してください。');
      return;
    }

    setLoading(true);
    try {
      const res = await saveStudentLeaveSetting(studentId, {
        startYearMonth,
        endYearMonth,
        reason,
        sendConfirmation,
      });

      if (!res.success) {
        toast.error(res.error || '保存に失敗しました。');
        return;
      }

      setSetting(res.setting || null);
      setIsOpen(false);
      if (res.confirmationSent) {
        toast.success('休会設定を保存し、休会受付案内を生徒へ送信しました。');
      } else {
        toast.success('休会設定を保存しました。');
      }
    } catch (err: any) {
      toast.error(err.message || '通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 休会キャンセル・解除
  const handleCancel = async () => {
    if (!confirm('休会設定を解除し、通常会員ステータス（課金有効）へ戻しますか？')) {
      return;
    }

    setLoading(true);
    try {
      const res = await cancelStudentLeaveSetting(studentId);
      if (!res.success) {
        toast.error(res.error || '休会解除に失敗しました。');
        return;
      }

      setSetting(null);
      toast.success('休会設定を解除しました。');
    } catch (err: any) {
      toast.error(err.message || '通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 休会受付案内の手動送信
  const handleSendConfirmation = async () => {
    if (!confirm(`${studentName}様へ休会受付のご案内メッセージ（LINE/メール）を送信しますか？`)) {
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await sendLeaveConfirmationNotification(studentId);
      if (!res.success) {
        toast.error(res.error || '休会受付案内の送信に失敗しました。');
        return;
      }

      toast.success(`休会受付案内を送信しました（送信先: ${res.channels?.join(', ')}）`);
      if (setting) {
        setSetting({
          ...setting,
          confirmation_sent_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      toast.error(err.message || '送信中にエラーが発生しました。');
    } finally {
      setConfirmLoading(false);
    }
  };

  // 再開案内テスト・手動送信
  const handleSendReminder = async () => {
    if (!confirm(`${studentName}様へ再開の案内メッセージ（LINE/メール）を送信しますか？`)) {
      return;
    }

    setReminderLoading(true);
    try {
      const res = await sendResumeReminderNotification(studentId, { forceSend: true });
      if (!res.success) {
        toast.error(res.error || '送信に失敗しました。');
        return;
      }

      toast.success(`再開案内を送信しました（送信先: ${res.channels?.join(', ')}）`);
      if (setting) {
        setSetting({
          ...setting,
          resume_reminder_sent_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      toast.error(err.message || '送信中にエラーが発生しました。');
    } finally {
      setReminderLoading(false);
    }
  };

  const isResting = currentStatus === 'resting' || setting?.status === 'active';
  const isScheduled = setting?.status === 'scheduled';

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-900">
            <CalendarOff className="h-4 w-4 text-amber-600" /> 休会・一時停止管理
          </CardTitle>
          {isResting && (
            <Badge className="bg-amber-600 text-white hover:bg-amber-700">休会中</Badge>
          )}
          {isScheduled && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-100/50">
              休会予定
            </Badge>
          )}
          {!isResting && !isScheduled && (
            <Badge variant="outline" className="border-slate-200 text-slate-500 bg-white">
              未設定
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {setting && (setting.status === 'active' || setting.status === 'scheduled') ? (
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-xs">休会期間</span>
                <span className="font-bold text-slate-800">
                  {setting.start_year_month} 〜 {setting.end_year_month}
                  <span className="ml-1 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    {setting.leave_months}ヶ月間
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-xs">定期課金</span>
                <span className="flex items-center gap-1 font-semibold text-xs text-rose-700">
                  <PauseCircle className="h-3.5 w-3.5" />
                  停止中（{setting.start_date} 〜 {setting.end_date}）
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-xs">レッスン再開</span>
                <span className="flex items-center gap-1 font-semibold text-xs text-emerald-700">
                  <PlayCircle className="h-3.5 w-3.5" />
                  {setting.resume_year_month}より自動再開
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-xs">休会受付案内</span>
                <div className="text-right">
                  {setting.confirmation_sent_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      送信済み ({new Date(setting.confirmation_sent_at).toLocaleDateString('ja-JP')})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                      未送信
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 text-xs">再開案内送信</span>
                <div className="text-right">
                  {setting.resume_reminder_sent_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      送信済み ({new Date(setting.resume_reminder_sent_at).toLocaleDateString('ja-JP')})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                      <Clock className="h-3 w-3" />
                      {calcReminderDate(setting.end_year_month)}に自動送信予定
                    </span>
                  )}
                </div>
              </div>

              {setting.reason && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 text-xs block mb-0.5">休会理由・メモ</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-1.5 rounded">{setting.reason}</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs bg-white">
                        期間変更
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[440px]">
                      <DialogHeader>
                        <DialogTitle>休会期間の変更</DialogTitle>
                        <DialogDescription>
                          休会期間は最長1年（12ヶ月）まで設定可能です。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">休会開始月</Label>
                            <Input
                              type="month"
                              value={startYearMonth}
                              onChange={(e) => setStartYearMonth(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">休会終了月</Label>
                            <Input
                              type="month"
                              value={endYearMonth}
                              onChange={(e) => setEndYearMonth(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border rounded text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">設定月数:</span>
                            <span className={`font-bold ${isOverOneYear ? 'text-rose-600' : 'text-slate-800'}`}>
                              {selectedMonths}ヶ月間 {isOverOneYear && '(※1年以内にして下さい)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">レッスン再開:</span>
                            <span className="font-bold text-emerald-700">{calcResumeMonth(endYearMonth)}〜</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">再開案内自動送信:</span>
                            <span className="font-bold text-indigo-700">{calcReminderDate(endYearMonth)}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">理由・メモ（任意）</Label>
                          <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="私用、怪我の療養など"
                          />
                        </div>

                        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                          <input
                            type="checkbox"
                            id="sendConfirmationEdit"
                            checked={sendConfirmation}
                            onChange={(e) => setSendConfirmation(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <Label htmlFor="sendConfirmationEdit" className="text-xs font-normal text-slate-700 cursor-pointer">
                            変更保存時に休会案内（LINE/メール）を生徒へ再送する
                          </Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                          キャンセル
                        </Button>
                        <Button
                          size="sm"
                          disabled={loading || isOverOneYear || isInvalidRange}
                          onClick={handleSave}
                        >
                          {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                          変更を保存
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 bg-white"
                    disabled={loading}
                    onClick={handleCancel}
                  >
                    休会を解除
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-amber-800 border-amber-300 hover:bg-amber-100/50 bg-white"
                    disabled={confirmLoading}
                    onClick={handleSendConfirmation}
                  >
                    {confirmLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <MailCheck className="h-3 w-3 mr-1 text-amber-600" />
                    )}
                    休会案内を送信
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white"
                    disabled={reminderLoading}
                    onClick={handleSendReminder}
                  >
                    {reminderLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Bell className="h-3 w-3 mr-1 text-indigo-600" />
                    )}
                    再開案内を今すぐ送信
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              休会期間（最大1年まで）を設定すると、該当期間の定期課金が一時停止され、期間終了後に自動再開されます。また再開前月5日に再開の案内が自動送信されます。
            </p>

            {isAdmin && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white">
                    <CalendarOff className="mr-1.5 h-3.5 w-3.5" />
                    休会を設定する
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[440px]">
                  <DialogHeader>
                    <DialogTitle>休会の設定</DialogTitle>
                    <DialogDescription>
                      休会期間は最長1年（12ヶ月）まで設定可能です。定期課金は休会期間中自動停止され、終了後に自動再開します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">休会開始月</Label>
                        <Input
                          type="month"
                          value={startYearMonth}
                          onChange={(e) => setStartYearMonth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">休会終了月</Label>
                        <Input
                          type="month"
                          value={endYearMonth}
                          onChange={(e) => setEndYearMonth(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">休会期間:</span>
                        <span className={`font-bold ${isOverOneYear ? 'text-rose-600' : 'text-slate-800'}`}>
                          {selectedMonths}ヶ月間 {isOverOneYear && '(※1年以内にして下さい)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">定期課金の一時停止:</span>
                        <span className="font-semibold text-rose-700">自動停止（全額）</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">レッスン再開:</span>
                        <span className="font-bold text-emerald-700">{calcResumeMonth(endYearMonth)}〜 (自動再開)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">再開案内自動送信:</span>
                        <span className="font-bold text-indigo-700">{calcReminderDate(endYearMonth)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">休会理由・メモ（任意）</Label>
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="例: 私用でお忙しいため、来年4月まで休会"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                      <input
                        type="checkbox"
                        id="sendConfirmationNew"
                        checked={sendConfirmation}
                        onChange={(e) => setSendConfirmation(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <Label htmlFor="sendConfirmationNew" className="text-xs font-normal text-slate-700 cursor-pointer">
                        設定保存時に「休会受付のご案内（LINE/メール）」を生徒へ即時送信する
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={loading || isOverOneYear || isInvalidRange}
                      onClick={handleSave}
                    >
                      {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                      休会を設定する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
