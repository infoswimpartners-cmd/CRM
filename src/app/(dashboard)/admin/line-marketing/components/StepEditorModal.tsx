'use client';

/**
 * ステップ配信ルール作成・編集モーダルコンポーネント
 * 
 * タイトル、体験日からの経過日数、配信時刻、変数チップ付き本文、有効状態を設定します。
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepRuleItem } from '@/types/line-marketing';
import { createStepRule, updateStepRule } from '@/actions/line-marketing';
import { toast } from 'sonner';
import { Loader2, Sparkles, Clock, Calendar, Tag } from 'lucide-react';

interface StepEditorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ruleToEdit?: StepRuleItem | null;
    defaultTag?: string;
    onSaved: () => void;
}

// 挿入可能な変数定義
const AVAILABLE_VARIABLES = [
    { tag: '{{name}}', label: '生徒氏名' },
    { tag: '{{coach_name}}', label: '担当コーチ名' },
    { tag: '{{plan_name}}', label: '受講プラン名' },
    { tag: '{{area}}', label: '希望エリア' },
    { tag: '{{trial_date}}', label: '体験受講日' },
    { tag: '{{student_number}}', label: '会員番号' },
    { tag: '{{trial_url}}', label: '体験予約URL' },
];

export function StepEditorModal({
    open,
    onOpenChange,
    ruleToEdit,
    defaultTag = 'trial_done',
    onSaved,
}: StepEditorModalProps) {
    const [title, setTitle] = useState('');
    const [delayDays, setDelayDays] = useState(1);
    const [sendTime, setSendTime] = useState('19:00');
    const [messageText, setMessageText] = useState('');
    const [targetTag, setTargetTag] = useState(defaultTag);
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // モーダルが開いた時、または対象ルールが変わった時に初期値を反映
    useEffect(() => {
        if (ruleToEdit) {
            setTitle(ruleToEdit.title);
            setDelayDays(ruleToEdit.delayDays);
            setSendTime(ruleToEdit.sendTime);
            setMessageText(ruleToEdit.messageText);
            setTargetTag(ruleToEdit.targetTag || 'trial_done');
            setIsActive(ruleToEdit.isActive);
        } else {
            setTitle('');
            setDelayDays(1);
            setSendTime('19:00');
            setMessageText('');
            setTargetTag(defaultTag);
            setIsActive(true);
        }
    }, [ruleToEdit, defaultTag, open]);

    // 変数タグをテキストエリアのカーソル位置に挿入
    const handleInsertVariable = (tag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setMessageText(prev => prev + tag);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = textarea.value;

        const nextVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
        setMessageText(nextVal);

        // カーソルを変数タグの後ろに移動しフォーカス維持
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
    };

    // 保存実行
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error('タイトルを入力してください。');
            return;
        }
        if (delayDays < 0) {
            toast.error('経過日数は0以上の数値を指定してください。');
            return;
        }
        if (!sendTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) {
            toast.error('有効な配信時刻（HH:mm形式）を指定してください。');
            return;
        }
        if (!messageText.trim()) {
            toast.error('メッセージ本文を入力してください。');
            return;
        }
        if (messageText.length > 5000) {
            toast.error('メッセージは5,000文字以内で入力してください');
            return;
        }

        setIsSubmitting(true);
        try {
            if (ruleToEdit) {
                // 更新
                const res = await updateStepRule(ruleToEdit.id, {
                    title: title.trim(),
                    delayDays: Number(delayDays),
                    sendTime,
                    messageText,
                    isActive,
                    targetTag,
                });

                if (!res.success) {
                    throw new Error(res.error || 'ステップの更新に失敗しました。');
                }
                toast.success('ステップ配信ルールを更新しました。');
            } else {
                // 新規作成
                const res = await createStepRule({
                    title: title.trim(),
                    delayDays: Number(delayDays),
                    sendTime,
                    messageText,
                    isActive,
                    targetTag,
                });

                if (!res.success) {
                    throw new Error(res.error || 'ステップの作成に失敗しました。');
                }
                toast.success('新しいステップ配信ルールを作成しました。');
            }

            onSaved();
            onOpenChange(false);
        } catch (err: any) {
            console.error('[StepEditorModal] Save Error:', err);
            toast.error(err.message || '保存中にエラーが発生しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            {ruleToEdit ? 'ステップ配信ルールの編集' : '新しいステップ配信の追加'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            対象タグを持つユーザーに対し、起点日からの経過日数と配信時刻を指定してメッセージを自動送信します。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* 対象タグ・配信シナリオ */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                配信対象タグ・シナリオ種別 <span className="text-rose-500">*</span>
                            </Label>
                            <Select value={targetTag} onValueChange={setTargetTag}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="対象タグを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="trial_done">
                                        🏊‍♂️ 体験レッスン受講済フォロー (trial_done)
                                    </SelectItem>
                                    <SelectItem value="trial_form_viewed">
                                        ⚡ フォーム閲覧・未申込離脱フォロー (trial_form_viewed)
                                    </SelectItem>
                                    <SelectItem value="friend_only">
                                        💬 友だち追加リード初期案内 (friend_only)
                                    </SelectItem>
                                    <SelectItem value="referral_lead">
                                        🎁 お友達紹介キャンペーン案内 (referral_lead)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-500">
                                {targetTag === 'trial_done' && '体験受講完了日を起点として、フォローや本会員入会促進メッセージを配信します。'}
                                {targetTag === 'trial_form_viewed' && '体験予約フォーム（LIFF）を開いた日を起点として、未申込の離脱者に再案内を配信します。'}
                                {targetTag === 'friend_only' && '公式LINE友だち追加日時を起点として、出張プールやスクールの魅力を順次配信します。'}
                                {targetTag === 'referral_lead' && 'お友達紹介キャンペーン対象者へ、特別割引特典や締切案内を配信します。'}
                            </p>
                        </div>

                        {/* タイトル */}
                        <div className="space-y-1.5">
                            <Label htmlFor="step-title" className="text-xs font-semibold text-slate-700">
                                ステップタイトル <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="step-title"
                                placeholder="例: 体験レッスン翌日のお礼 & 次回ご案内"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-sm"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* 経過日数 & 配信時刻 (2列配置) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="delay-days" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    経過日数（日後） <span className="text-rose-500">*</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="delay-days"
                                        type="number"
                                        min={0}
                                        max={365}
                                        value={delayDays}
                                        onChange={(e) => setDelayDays(parseInt(e.target.value, 10) || 0)}
                                        className="text-sm"
                                        disabled={isSubmitting}
                                    />
                                    <span className="text-xs text-slate-500 whitespace-nowrap">日後</span>
                                </div>
                                <p className="text-[11px] text-slate-400">受講当日を0日目とし、何日後に送信するか</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="send-time" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    配信時刻（HH:mm） <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    id="send-time"
                                    type="time"
                                    value={sendTime}
                                    onChange={(e) => setSendTime(e.target.value)}
                                    className="text-sm"
                                    disabled={isSubmitting}
                                />
                                <p className="text-[11px] text-slate-400">指定時刻のCron実行時に自動判定・配信</p>
                            </div>
                        </div>

                        {/* 変数チップ挿入エリア */}
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-700">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>利用可能な変数（クリックでカーソル位置に挿入）</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_VARIABLES.map(v => (
                                    <button
                                        key={v.tag}
                                        type="button"
                                        onClick={() => handleInsertVariable(v.tag)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs text-slate-700 hover:text-blue-700 font-mono transition-colors shadow-2xs"
                                    >
                                        <span className="font-bold text-blue-600">{v.tag}</span>
                                        <span className="text-[11px] text-slate-500">({v.label})</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* メッセージ本文 */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="message-text" className="text-xs font-semibold text-slate-700">
                                    メッセージ本文 <span className="text-rose-500">*</span>
                                </Label>
                                <span className="text-[11px] text-slate-400 font-mono">
                                    {messageText.length} 文字
                                </span>
                            </div>
                            <Textarea
                                ref={textareaRef}
                                id="message-text"
                                rows={8}
                                placeholder="例: {{name}} 様、昨日は体験レッスンへのご参加誠にありがとうございました！担当の {{coach_name}} です。"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                className="text-sm font-sans"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* 有効状態スイッチ */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div>
                                <Label htmlFor="is-active" className="text-xs font-semibold text-slate-800 cursor-pointer">
                                    このステップを有効にする
                                </Label>
                                <p className="text-[11px] text-slate-500">
                                    オフにすると自動配信対象から一時的にスキップされます。
                                </p>
                            </div>
                            <Switch
                                id="is-active"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                '保存する'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
