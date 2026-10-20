'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  UserMinus,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Send,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentWithdrawalSetting } from '@/types/withdrawal';
import {
  saveStudentWithdrawalSetting,
  cancelStudentWithdrawalSetting,
  sendWithdrawalResumeReminderNotification,
} from '@/actions/withdrawal';

interface StudentWithdrawalCardProps {
  studentId: string;
  studentName: string;
  initialSetting: StudentWithdrawalSetting | null;
  currentStatus: string;
  hasStripeSubscription: boolean;
  isAdmin: boolean;
}

// 相対的な年月（YYYY-MM）を計算するヘルパー
function getRelativeYearMonth(baseDate: Date, addMonths: number): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + addMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 次の特定の月（例: 3月, 7月）の YYYY-MM を計算
function getNextSpecificMonth(targetMonthIndex: number): string {
  const now = new Date();
  const currentMonthIndex = now.getMonth(); // 0-indexed
  const year = currentMonthIndex >= targetMonthIndex ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-${String(targetMonthIndex + 1).padStart(2, '0')}`;
}

// YYYY-MM を「〇〇年〇月」にフォーマット
function formatYearMonth(ym?: string | null): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return '';
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

export function StudentWithdrawalCard({
  studentId,
  studentName,
  initialSetting,
  currentStatus,
  hasStripeSubscription,
  isAdmin,
}: StudentWithdrawalCardProps) {
  const [setting, setSetting] = useState<StudentWithdrawalSetting | null>(initialSetting);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // 当月末日の算出 (YYYY-MM-DD)
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const defaultWithdrawalDate = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;

  // デフォルト再開時期（半年後）
  const defaultResumeTargetMonth = getRelativeYearMonth(now, 6);

  const isWithdrawn = currentStatus === 'withdrawn' || (setting && setting.status === 'active');

  // フォーム状態
  const [withdrawalDate, setWithdrawalDate] = useState(setting?.withdrawal_date || defaultWithdrawalDate);
  const [reason, setReason] = useState(setting?.reason || '');
  const [enableResumeReminder, setEnableResumeReminder] = useState(!!setting?.resume_target_month);
  const [resumeTargetMonth, setResumeTargetMonth] = useState(setting?.resume_target_month || defaultResumeTargetMonth);

  useEffect(() => {
    if (setting && setting.status === 'active') {
      setWithdrawalDate(setting.withdrawal_date);
      setReason(setting.reason || '');
      setEnableResumeReminder(!!setting.resume_target_month);
      setResumeTargetMonth(setting.resume_target_month || defaultResumeTargetMonth);
    } else {
      setWithdrawalDate(defaultWithdrawalDate);
      setReason('');
      setEnableResumeReminder(false);
      setResumeTargetMonth(defaultResumeTargetMonth);
    }
  }, [setting, defaultWithdrawalDate, defaultResumeTargetMonth]);

  // 退会設定保存
  const handleSave = async () => {
    if (!withdrawalDate) {
      toast.error('退会日を指定してください。');
      return;
    }

    setLoading(true);
    try {
      const res = await saveStudentWithdrawalSetting(studentId, {
        withdrawalDate,
        reason: reason.trim() || undefined,
        resumeTargetMonth: enableResumeReminder ? resumeTargetMonth : undefined,
        cancelStripe: true,
      });

      if (res.success && res.setting) {
        setSetting(res.setting);
        setIsOpen(false);
        toast.success(`${studentName}様の退会設定を完了しました。`);
      } else {
        toast.error(res.error || '退会設定の保存に失敗しました。');
      }
    } catch (err: any) {
      toast.error(err.message || '退会設定の保存中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // 退会取り消し・復帰
  const handleCancelWithdrawal = async () => {
    if (!confirm(`${studentName}様の退会設定を取り消し、有効（active）に復帰しますか？`)) {
      return;
    }

    setCancelLoading(true);
    try {
      const res = await cancelStudentWithdrawalSetting(studentId);
      if (res.success) {
        setSetting(null);
        toast.success('退会を取り消し、ステータスを復帰しました。');
      } else {
        toast.error(res.error || '退会取り消しに失敗しました。');
      }
    } catch (err: any) {
      toast.error(err.message || '退会取り消し中にエラーが発生しました。');
    } finally {
      setCancelLoading(false);
    }
  };

  // 再開案内リマインド送信
  const handleSendReminder = async () => {
    const formattedMonth = formatYearMonth(setting?.resume_target_month) || '今後';

    if (!confirm(`${studentName}様へ「${formattedMonth}からのレッスン再開のご案内」を送信しますか？（LINE連携済みならLINE、メール登録済みならメールへ送信されます）`)) {
      return;
    }

    setReminderLoading(true);
    try {
      const res = await sendWithdrawalResumeReminderNotification(studentId);
      if (res.success) {
        toast.success(`再開案内を送信しました（送信先: ${res.channels?.join(', ')}）`);
        if (setting) {
          setSetting({
            ...setting,
            resume_reminder_sent_at: new Date().toISOString(),
          });
        }
      } else {
        toast.error(res.error || '再開案内の送信に失敗しました。');
      }
    } catch (err: any) {
      toast.error(err.message || '再開案内送信中にエラーが発生しました。');
    } finally {
      setReminderLoading(false);
    }
  };

  // プリセット理由の設定
  const applyPresetReason = (text: string, defaultMonth?: string) => {
    setReason(text);
    if (defaultMonth) {
      setEnableResumeReminder(true);
      setResumeTargetMonth(defaultMonth);
    }
  };

  // クイック時期ボタンのクリック処理
  const setQuickResumeMonth = (ym: string) => {
    setEnableResumeReminder(true);
    setResumeTargetMonth(ym);
  };

  return (
    <Card className={isWithdrawn ? 'border-rose-200 bg-rose-50/20 shadow-sm' : 'border-slate-200 shadow-sm'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <UserMinus className={`h-4 w-4 ${isWithdrawn ? 'text-rose-600' : 'text-slate-500'}`} />
            退会管理
          </CardTitle>
          {isWithdrawn ? (
            <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 font-bold">
              退会済み
            </Badge>
          ) : (
            <Badge variant="outline" className="border-slate-200 text-slate-500 bg-white">
              未設定
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isWithdrawn ? (
          <>
            {/* 退会日情報 */}
            <div className="bg-white rounded-lg p-3 border border-rose-100 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-400 font-medium">退会適用日</span>
                <span className="font-bold text-slate-800">
                  {setting?.withdrawal_date || '退会済み'}
                </span>
              </div>
              {setting?.reason && (
                <div className="text-slate-600 pt-1 border-t border-slate-50">
                  <span className="text-slate-400 font-medium block mb-0.5">退会理由</span>
                  <span className="text-slate-700 whitespace-pre-wrap">{setting.reason}</span>
                </div>
              )}
            </div>

            {/* 再開案内リマインド設定 */}
            {setting?.resume_target_month ? (
              <div className="bg-amber-50/80 rounded-lg p-3 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Bell className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    再開案内予定時期
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[11px]">
                    {formatYearMonth(setting.resume_target_month)}頃
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-700 leading-snug">
                  指定時期（{formatYearMonth(setting.resume_target_month)}頃）に合わせてレッスン再開をお声がけする予定です。
                </p>

                {/* 送信ステータス & アクションボタン */}
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    {setting.resume_reminder_sent_at ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        送信済 ({new Date(setting.resume_reminder_sent_at).toLocaleDateString('ja-JP')})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        未送信
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reminderLoading}
                      onClick={handleSendReminder}
                      className="h-7 text-xs bg-white hover:bg-amber-50 border-amber-300 text-amber-900 font-bold"
                    >
                      {reminderLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Send className="h-3 w-3 mr-1 text-amber-600" />
                      )}
                      {setting.resume_reminder_sent_at ? '再案内を送信' : '再開案内を送信'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                <span>再開案内時期: 未設定</span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="h-6 text-[11px] text-indigo-600 hover:text-indigo-700 p-0"
                  >
                    設定する
                  </Button>
                )}
              </div>
            )}

            {/* 管理者操作エリア */}
            {isAdmin && (
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(true)}
                  className="flex-1 text-xs h-8"
                >
                  設定を変更
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancelLoading}
                  onClick={handleCancelWithdrawal}
                  className="text-xs h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  {cancelLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="h-3 w-3 mr-1" />
                  )}
                  復帰・取消
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              退会の申請があった場合、退会日の設定やStripe課金停止、再開時期に応じた案内リマインドの登録を行えます。
            </p>
            {isAdmin && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-9 border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
                  >
                    <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                    退会手続きを設定
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <UserMinus className="h-5 w-5 text-rose-600" />
                      退会手続きの設定
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      {studentName} 様の退会日および再開時期の設定を行います。
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2 text-sm">
                    {/* 退会日 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="withdrawal-date" className="text-xs font-bold text-slate-700">
                        退会適用日 <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="withdrawal-date"
                        type="date"
                        value={withdrawalDate}
                        onChange={(e) => setWithdrawalDate(e.target.value)}
                        className="text-xs h-9"
                      />
                      <p className="text-[11px] text-slate-400">
                        通常は当月末日を指定します。
                      </p>
                    </div>

                    {/* 退会理由 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="withdrawal-reason" className="text-xs font-bold text-slate-700">
                          退会理由・メモ
                        </Label>
                        <span className="text-[10px] text-slate-400">任意</span>
                      </div>
                      <Textarea
                        id="withdrawal-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="例: 寒くなってきたため一時退会。暖かくなったら再開希望。"
                        rows={2}
                        className="text-xs resize-none"
                      />
                      {/* クイック選択プリセット */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => applyPresetReason('寒くなってきたため（暖かくなったら再開希望）', getNextSpecificMonth(2))}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full transition-colors"
                        >
                          🌸 暖かくなったら再開希望 (春頃)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetReason('夏頃に再開希望', getNextSpecificMonth(6))}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full transition-colors"
                        >
                          🏖️ 夏頃に再開希望
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetReason('スケジュール・多忙のため')}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full transition-colors"
                        >
                          📅 多忙・日程都合
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetReason('目標達成・卒業')}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full transition-colors"
                        >
                          🎯 目標達成
                        </button>
                      </div>
                    </div>

                    {/* 再開案内リマインド設定 */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enable-reminder" className="text-xs font-bold text-amber-950 flex items-center gap-1.5 cursor-pointer">
                            <Bell className="h-3.5 w-3.5 text-amber-600" />
                            再開時期のリマインドを設定
                          </Label>
                          <p className="text-[11px] text-amber-700">
                            希望時期に合わせたレッスン再開のお声がけ案内を送信できるようにします。
                          </p>
                        </div>
                        <Switch
                          id="enable-reminder"
                          checked={enableResumeReminder}
                          onCheckedChange={setEnableResumeReminder}
                        />
                      </div>

                      {enableResumeReminder && (
                        <div className="pt-2 border-t border-amber-200/60 space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="resume-month" className="text-xs font-bold text-amber-900">
                              再開案内希望時期 (年月)
                            </Label>
                            {resumeTargetMonth && (
                              <span className="text-[11px] font-bold text-amber-800">
                                {formatYearMonth(resumeTargetMonth)}頃
                              </span>
                            )}
                          </div>
                          
                          <Input
                            id="resume-month"
                            type="month"
                            value={resumeTargetMonth}
                            onChange={(e) => setResumeTargetMonth(e.target.value)}
                            className="text-xs h-9 bg-white"
                          />

                          {/* 柔軟なクイック選択ボタン群 */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-amber-800/80 font-medium mr-1">クイック指定:</span>
                            <button
                              type="button"
                              onClick={() => setQuickResumeMonth(getRelativeYearMonth(now, 3))}
                              className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                            >
                              3ヶ月後 ({formatYearMonth(getRelativeYearMonth(now, 3))})
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickResumeMonth(getRelativeYearMonth(now, 6))}
                              className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                            >
                              半年後 ({formatYearMonth(getRelativeYearMonth(now, 6))})
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickResumeMonth(getNextSpecificMonth(2))}
                              className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                            >
                              来春 (3月)
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickResumeMonth(getNextSpecificMonth(6))}
                              className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                            >
                              来夏 (7月)
                            </button>
                          </div>

                          <p className="text-[10px] text-amber-700">
                            ※ 指定の年月になったら、このカードまたは退会者一覧から案内メッセージ（LINE/メール）をワンクリックで送信できます。
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 注意事項 */}
                    {hasStripeSubscription && (
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-[11px] text-rose-700 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>退会設定を確定すると、Stripeの定期課金サブスクリプションも自動解約されます。</span>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="text-xs h-9"
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="button"
                      disabled={loading}
                      onClick={handleSave}
                      className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : '退会を確定する'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </CardContent>

      {/* 退会済み状態での「設定変更」ダイアログ */}
      {isWithdrawn && isAdmin && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-rose-600" />
                退会設定の編集
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {studentName} 様の退会日および再開時期の内容を編集します。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="edit-withdrawal-date" className="text-xs font-bold text-slate-700">
                  退会適用日
                </Label>
                <Input
                  id="edit-withdrawal-date"
                  type="date"
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-withdrawal-reason" className="text-xs font-bold text-slate-700">
                  退会理由・メモ
                </Label>
                <Textarea
                  id="edit-withdrawal-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-enable-reminder" className="text-xs font-bold text-amber-950 flex items-center gap-1.5 cursor-pointer">
                      <Bell className="h-3.5 w-3.5 text-amber-600" />
                      再開時期のリマインドを設定
                    </Label>
                  </div>
                  <Switch
                    id="edit-enable-reminder"
                    checked={enableResumeReminder}
                    onCheckedChange={setEnableResumeReminder}
                  />
                </div>

                {enableResumeReminder && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="edit-resume-month" className="text-xs font-bold text-amber-900">
                        再開案内希望時期 (年月)
                      </Label>
                      {resumeTargetMonth && (
                        <span className="text-[11px] font-bold text-amber-800">
                          {formatYearMonth(resumeTargetMonth)}頃
                        </span>
                      )}
                    </div>
                    <Input
                      id="edit-resume-month"
                      type="month"
                      value={resumeTargetMonth}
                      onChange={(e) => setResumeTargetMonth(e.target.value)}
                      className="text-xs h-9 bg-white"
                    />

                    {/* クイック選択 */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setQuickResumeMonth(getRelativeYearMonth(now, 3))}
                        className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        3ヶ月後
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickResumeMonth(getRelativeYearMonth(now, 6))}
                        className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        半年後
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickResumeMonth(getNextSpecificMonth(2))}
                        className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        来春 (3月)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickResumeMonth(getNextSpecificMonth(6))}
                        className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        来夏 (7月)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="text-xs h-9"
              >
                キャンセル
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : '変更を保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
