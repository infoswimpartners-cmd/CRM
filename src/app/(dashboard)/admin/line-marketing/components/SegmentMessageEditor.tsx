'use client';

/**
 * セグメント一括配信 メッセージエディタ & リアルタイムスマホプレビュー
 * 
 * - 変数挿入チップ（タップ領域44px以上、アイコン、ホバー時置換例ツールチップ）
 * - メッセージ本文エディタ（タイトル、本文、文字数カウント 5,000文字上限）
 * - リアルタイムスマホプレビュー（デスクトップ: 2ペインスプリット / モバイル: タブ切り替え）
 * - 会員番号0035（テスト太郎 様）専用テスト送信UI（安全ガード・スピナー付き）
 * - 送信アクションバー（即時配信 / 日時指定予約、対象件数バッジ）
 */

import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Sparkles,
    Smartphone,
    ShieldCheck,
    Clock,
    Send,
    Loader2,
    User,
    Award,
    MapPin,
    Layers,
    Calendar as CalendarIcon,
    Hash,
    Link as LinkIcon,
    Wifi,
    Battery,
    ChevronLeft,
    Phone,
    MoreHorizontal,
    MessageSquare,
    Info,
    CheckCircle2,
} from 'lucide-react';
import { FilterPreviewStudent } from '@/types/line-marketing';
import { renderClientPreviewMessage } from './PhonePreviewModal';

// 挿入可能な変数定義（アイコン・置換例付き）
export const VARIABLE_CHIPS = [
    {
        label: '氏名',
        variable: '{{name}}',
        sample: 'テスト太郎 様',
        description: '生徒の登録氏名',
        icon: User,
    },
    {
        label: '担当コーチ',
        variable: '{{coach_name}}',
        sample: '新吉航大 コーチ',
        description: '担当コーチの氏名',
        icon: Award,
    },
    {
        label: 'エリア',
        variable: '{{area}}',
        sample: '東京都港区',
        description: '希望・受講エリア',
        icon: MapPin,
    },
    {
        label: '受講プラン',
        variable: '{{plan_name}}',
        sample: '月2回プラン（60分）',
        description: '登録受講プラン名',
        icon: Layers,
    },
    {
        label: '体験レッスン日',
        variable: '{{trial_date}}',
        sample: '2026年9月30日',
        description: '体験レッスン受講日',
        icon: CalendarIcon,
    },
    {
        label: '会員番号',
        variable: '{{student_number}}',
        sample: '0035',
        description: '生徒の会員管理番号',
        icon: Hash,
    },
    {
        label: '体験予約URL',
        variable: '{{trial_url}}',
        sample: 'https://manager.swim-partners.com/trial',
        description: '体験レッスン申込ページURL',
        icon: LinkIcon,
    },
];

export interface SegmentMessageEditorProps {
    campaignTitle: string;
    onChangeCampaignTitle: (title: string) => void;
    messageTemplate: string;
    onChangeMessageTemplate: (content: string) => void;
    deliveryMode: 'instant' | 'scheduled';
    onChangeDeliveryMode: (mode: 'instant' | 'scheduled') => void;
    scheduledDateTime: string;
    onChangeScheduledDateTime: (dateTime: string) => void;
    targetCount: number;
    targetStudents?: FilterPreviewStudent[];
    onOpenSafetyDialog: () => void;
    onSendTestMessage: () => Promise<void> | void;
    isSendingTest: boolean;
    onOpenScheduledCampaigns?: () => void;
}

export const SegmentMessageEditor: React.FC<SegmentMessageEditorProps> = ({
    campaignTitle,
    onChangeCampaignTitle,
    messageTemplate,
    onChangeMessageTemplate,
    deliveryMode,
    onChangeDeliveryMode,
    scheduledDateTime,
    onChangeScheduledDateTime,
    targetCount,
    targetStudents = [],
    onOpenSafetyDialog,
    onSendTestMessage,
    isSendingTest,
    onOpenScheduledCampaigns,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // モバイル用表示切り替えタブ ('editor' | 'preview')
    const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

    // プレビュー対象の生徒
    const [previewStudentId, setPreviewStudentId] = useState<string>(
        targetStudents.length > 0 ? targetStudents[0].id : ''
    );

    // 選択中の生徒オブジェクト
    const currentPreviewStudent =
        targetStudents.find(s => s.id === previewStudentId) ||
        (targetStudents.length > 0 ? targetStudents[0] : null);

    // カーソル位置への変数挿入処理
    const handleInsertVariable = (variableText: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            onChangeMessageTemplate(messageTemplate + variableText);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = textarea.value;
        const updatedVal = currentVal.substring(0, start) + variableText + currentVal.substring(end);

        onChangeMessageTemplate(updatedVal);

        // カーソルを挿入した変数の直後に戻す
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variableText.length, start + variableText.length);
        }, 10);
    };

    // 置換後本文
    const renderedBody = renderClientPreviewMessage(messageTemplate, currentPreviewStudent);
    const nowTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    // 文字数カウント
    const charCount = messageTemplate.length;
    const isOverLimit = charCount > 5000;

    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            {/* カードヘッダー */}
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                メッセージ作成 & リアルタイムスマホプレビュー
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                属性変数を差し込み、右側のLINEトーク画面で仕上がりを即時確認しながら作成できます。
                            </CardDescription>
                        </div>
                    </div>

                    {/* 文字数カウンター */}
                    <div className="flex items-center gap-3">
                        <div className="text-xs font-mono bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            文字数:{' '}
                            <span className={isOverLimit ? 'text-rose-600 font-bold text-sm' : 'text-slate-800 dark:text-slate-200 font-bold text-sm'}>
                                {charCount.toLocaleString()}
                            </span>{' '}
                            / 5,000文字
                            {isOverLimit && (
                                <span className="ml-1 text-[11px] text-rose-500 font-semibold">（上限超過）</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* モバイル表示時のタブ切り替えスイッチ（画面幅1024px未満で表示） */}
                <div className="pt-2 lg:hidden">
                    <Tabs value={mobileTab} onValueChange={v => setMobileTab(v as 'editor' | 'preview')} className="w-full">
                        <TabsList className="grid grid-cols-2 w-full h-10 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <TabsTrigger value="editor" className="text-xs font-semibold py-1.5">
                                ✏️ メッセージ作成
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="text-xs font-semibold py-1.5 flex items-center justify-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                📱 リアルタイムプレビュー
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
                {/* 2カラム・スプリットビュー（デスクトップ: >=1024px / モバイル: タブ制御） */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ======================================================== */}
                    {/* 左ペイン: メッセージエディタ & 設定 (lg:col-span-7)       */}
                    {/* ======================================================== */}
                    <div className={`space-y-5 lg:col-span-7 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
                        {/* 1. キャンペーンタイトル */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="campaign-title" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    キャンペーン管理タイトル <span className="text-rose-500">*</span>
                                </Label>
                                <span className="text-[11px] text-slate-400 font-medium">※受講者には表示されません（管理用）</span>
                            </div>
                            <Input
                                id="campaign-title"
                                placeholder="例: 【重要案内】10月度ステップアップ受講キャンペーン"
                                value={campaignTitle}
                                onChange={e => onChangeCampaignTitle(e.target.value)}
                                className="h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 rounded-lg"
                            />
                        </div>

                        {/* 2. 変数挿入チップ（タップ領域44px以上・ツールチップ置換例付き） */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    挿入可能な属性変数チップ（クリックでカーソル位置に挿入）
                                </Label>
                                <span className="text-[11px] text-slate-400 hidden sm:inline">ホバーで置換例を表示</span>
                            </div>

                            <TooltipProvider delayDuration={150}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {VARIABLE_CHIPS.map(chip => {
                                        const ChipIcon = chip.icon;
                                        return (
                                            <Tooltip key={chip.variable}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => handleInsertVariable(chip.variable)}
                                                        className="min-h-[44px] h-auto py-2 px-2.5 flex items-center justify-start gap-2 bg-slate-50/80 hover:bg-emerald-50/80 hover:border-emerald-400 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:hover:border-emerald-600 text-left transition-all border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs group"
                                                    >
                                                        <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 group-hover:border-emerald-400 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 transition-colors">
                                                            <ChipIcon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[11px] leading-tight truncate">
                                                                {chip.variable}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                                                                {chip.label}
                                                            </span>
                                                        </div>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-slate-900 text-slate-100 p-2 text-xs rounded-lg shadow-xl max-w-xs space-y-1">
                                                    <p className="font-semibold text-emerald-400 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        置換例: 「{chip.sample}」
                                                    </p>
                                                    <p className="text-[11px] text-slate-300">{chip.description}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </TooltipProvider>
                        </div>

                        {/* 3. 本文入力テキストエリア */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="message-body" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    メッセージ配信本文 <span className="text-rose-500">*</span>
                                </Label>
                                <span className="text-[11px] text-slate-400">改行・絵文字・URLリンク対応</span>
                            </div>
                            <Textarea
                                id="message-body"
                                ref={textareaRef}
                                value={messageTemplate}
                                onChange={e => onChangeMessageTemplate(e.target.value)}
                                placeholder="LINEメッセージ本文を入力..."
                                rows={10}
                                className="text-xs sm:text-sm font-sans leading-relaxed resize-y border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 rounded-lg p-3"
                            />
                        </div>

                        {/* 4. 送信タイミングセレクター（即時 vs 日時指定予約） */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">送信タイミングの選択:</span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="deliveryModeSelector"
                                            checked={deliveryMode === 'instant'}
                                            onChange={() => onChangeDeliveryMode('instant')}
                                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className={deliveryMode === 'instant' ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                                            🚀 今すぐ送信（即時一括配信）
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="deliveryModeSelector"
                                            checked={deliveryMode === 'scheduled'}
                                            onChange={() => onChangeDeliveryMode('scheduled')}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={deliveryMode === 'scheduled' ? 'font-bold text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}>
                                            📅 日時指定予約
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {deliveryMode === 'scheduled' && (
                                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                            配信予定日時:
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            value={scheduledDateTime}
                                            onChange={e => onChangeScheduledDateTime(e.target.value)}
                                            className="h-9 text-xs w-56 bg-white dark:bg-slate-900 border-slate-300"
                                        />
                                    </div>

                                    {onOpenScheduledCampaigns && (
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            onClick={onOpenScheduledCampaigns}
                                            className="text-xs text-blue-600 dark:text-blue-400 p-0 hover:underline h-auto self-start sm:self-auto"
                                        >
                                            登録済みの予約一覧・編集はこちら →
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 5. 会員番号0035（テスト太郎 様）専用テスト送信UI */}
                        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0.5 font-bold">
                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                        会員番号0035 専用テスト送信
                                    </Badge>
                                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                        テスト太郎 様宛てプレビュー配信
                                    </span>
                                </div>
                                <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400 leading-tight">
                                    一般の生徒様には一切配信されません。実機LINEでの改行崩れや文面を安全に確認できます。
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={onSendTestMessage}
                                disabled={isSendingTest}
                                className="min-h-[44px] px-4 text-xs font-bold bg-white dark:bg-slate-900 hover:bg-emerald-100/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shrink-0 shadow-2xs"
                                title="会員番号0035（テスト太郎 様）宛てにテスト送信します"
                            >
                                {isSendingTest ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-600" />
                                        テスト送信中...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                        テスト太郎（0035）にテスト送信
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* 6. 送信アクションバー */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    配信対象: <span className="font-bold text-slate-900 dark:text-white mx-1">{targetCount}</span> 名
                                </Badge>
                                {targetCount === 0 && (
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                        <Info className="w-3.5 h-3.5" />
                                        対象者が0名です
                                    </span>
                                )}
                            </div>

                            <Button
                                type="button"
                                onClick={onOpenSafetyDialog}
                                disabled={targetCount === 0 || isOverLimit}
                                className={`min-h-[44px] px-6 font-bold text-xs sm:text-sm shadow-md transition-all ${
                                    deliveryMode === 'instant'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {deliveryMode === 'instant'
                                    ? `配信内容を確認する（対象: ${targetCount}名）`
                                    : `予約内容を確認する（対象: ${targetCount}名）`}
                            </Button>
                        </div>
                    </div>

                    {/* ======================================================== */}
                    {/* 右ペイン: リアルタイムスマホプレビュー (lg:col-span-5)      */}
                    {/* ======================================================== */}
                    <div className={`lg:col-span-5 ${mobileTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
                        <div className="bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-xl border border-slate-800 sticky top-4">
                            {/* プレビュー上部ヘッダー（生徒セレクター） */}
                            <div className="bg-slate-800/90 rounded-t-2xl p-2.5 px-3 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-slate-200">リアルタイムLINEプレビュー</span>
                                </div>

                                {targetStudents.length > 0 ? (
                                    <div className="w-[160px]">
                                        <Select
                                            value={previewStudentId || (targetStudents[0]?.id ?? '')}
                                            onValueChange={setPreviewStudentId}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-200">
                                                <SelectValue placeholder="生徒を選択" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[220px]">
                                                {targetStudents.slice(0, 30).map(s => (
                                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                                        {s.fullName} ({s.studentNumber || '未登録'})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                                        サンプル: テスト太郎 (0035)
                                    </Badge>
                                )}
                            </div>

                            {/* スマートフォン筐体風ラッパー */}
                            <div className="w-full bg-[#849ebf] rounded-b-2xl overflow-hidden border-4 border-slate-950 shadow-inner flex flex-col h-[520px]">
                                {/* 1. スマホステータスバー */}
                                <div className="px-4 pt-2.5 pb-1 flex justify-between items-center text-[10px] font-semibold text-slate-800 select-none">
                                    <span>9:41</span>
                                    <div className="flex items-center gap-1.5 text-slate-800">
                                        <Wifi className="w-3 h-3" />
                                        <Battery className="w-3 h-3" />
                                    </div>
                                </div>

                                {/* 2. LINEトーク画面ヘッダー */}
                                <div className="bg-[#849ebf] px-3 py-1.5 flex items-center justify-between border-b border-black/5 select-none">
                                    <div className="flex items-center gap-1.5">
                                        <ChevronLeft className="w-4 h-4 text-slate-800 opacity-70" />
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-xs text-slate-900">スイムパートナーズ</span>
                                            <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0 h-3.5">公式</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-800 opacity-70">
                                        <Phone className="w-3.5 h-3.5" />
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 3. トークメッセージ領域 */}
                                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                                    {/* 日付ヘッダーバッジ */}
                                    <div className="flex justify-center">
                                        <span className="bg-black/20 text-white text-[9px] px-2.5 py-0.5 rounded-full select-none">
                                            今日
                                        </span>
                                    </div>

                                    {/* LINE吹き出し（公式アカウント発信） */}
                                    <div className="flex items-start gap-2 max-w-[92%] animate-in fade-in duration-150">
                                        {/* アカウントアバター */}
                                        <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs">
                                            SP
                                        </div>

                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="text-[10px] text-slate-700 font-medium pl-0.5">
                                                スイムパートナーズ
                                            </span>

                                            <div className="flex items-end gap-1.5">
                                                {/* 白のトーク吹き出し */}
                                                <div className="bg-white text-slate-800 text-xs leading-relaxed p-2.5 rounded-2xl rounded-tl-xs shadow-xs whitespace-pre-wrap break-words">
                                                    {renderedBody || '（本文を入力するとここに即時反映されます）'}
                                                </div>

                                                {/* 送信時刻 */}
                                                <span className="text-[9px] text-slate-700 font-medium shrink-0 pb-0.5">
                                                    {nowTime}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. LINEトーク入力バー（装飾フッター） */}
                                <div className="bg-white px-3 py-1.5 border-t border-slate-200 flex items-center gap-2 select-none">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                                        ＋
                                    </div>
                                    <div className="flex-1 bg-slate-100 rounded-full h-6 px-2.5 flex items-center text-[10px] text-slate-400">
                                        メッセージを入力
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                        <MessageSquare className="w-2.5 h-2.5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
