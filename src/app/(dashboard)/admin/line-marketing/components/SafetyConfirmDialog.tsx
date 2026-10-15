'use client';

/**
 * 誤送信防止2段階確認ダイアログ
 * 
 * 大量配信前の誤送信や設定ミスを防止するため、対象件数・本文サマリーの提示と
 * 必須チェックボックスによる2段階の確認を強制します。
 */

import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FilterPreviewStudent } from '@/types/line-marketing';
import { Send, Calendar, Loader2, ShieldAlert } from 'lucide-react';
import { renderClientPreviewMessage } from './PhonePreviewModal';

interface SafetyConfirmDialogProps {
    open?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    onConfirm: () => Promise<void> | void;
    isSending?: boolean;
    isSubmitting?: boolean;
    title?: string;
    campaignTitle?: string;
    messageContent?: string;
    messageTemplate?: string;
    targetCount: number;
    mode?: 'instant' | 'scheduled';
    deliveryMode?: 'instant' | 'scheduled';
    scheduledAt?: string | null;
    sampleStudent?: FilterPreviewStudent | null;
    filterSummary?: {
        tagLabel?: string;
        statusLabel?: string;
        areaLabel?: string;
        coachLabel?: string;
        planLabel?: string;
        searchQuery?: string;
        viewedNotAppliedOnly?: boolean;
        lineLinkedOnly?: boolean;
        excludedCount?: number;
    };
}

export const SafetyConfirmDialog: React.FC<SafetyConfirmDialogProps> = ({
    open,
    isOpen,
    onOpenChange,
    onClose,
    onConfirm,
    isSending,
    isSubmitting,
    title,
    campaignTitle,
    messageContent,
    messageTemplate,
    targetCount,
    mode,
    deliveryMode,
    scheduledAt,
    sampleStudent,
    filterSummary,
}) => {
    // 誤送信防止チェックボックス状態
    const [isChecked, setIsChecked] = useState(false);

    // プロパティ互換性の吸収
    const dialogOpen = open ?? isOpen ?? false;
    const finalMode = mode ?? deliveryMode ?? 'instant';
    const isInstant = finalMode === 'instant';
    const finalTitle = campaignTitle ?? title ?? '';
    const finalMessage = messageContent ?? messageTemplate ?? '';
    const isBusy = isSending ?? isSubmitting ?? false;

    // モーダルが閉じたときにチェック状態を初期化
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setIsChecked(false);
            if (onOpenChange) onOpenChange(false);
            if (onClose) onClose();
        } else {
            if (onOpenChange) onOpenChange(true);
        }
    };

    const previewSampleText = renderClientPreviewMessage(finalMessage, sampleStudent);
    // 冒頭抜粋（100文字）
    const excerptText = previewSampleText.length > 100
        ? previewSampleText.substring(0, 100) + '...'
        : previewSampleText;

    // 有効なフィルター条件のリストアップ
    const activeFilters: Array<{ label: string; value: string; color?: string }> = [];
    if (filterSummary) {
        if (filterSummary.tagLabel && filterSummary.tagLabel !== 'すべて' && filterSummary.tagLabel !== 'all') {
            activeFilters.push({ label: 'タグ', value: filterSummary.tagLabel, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' });
        }
        if (filterSummary.statusLabel && filterSummary.statusLabel !== 'すべて' && filterSummary.statusLabel !== 'all') {
            activeFilters.push({ label: 'ステータス', value: filterSummary.statusLabel, color: 'bg-blue-50 text-blue-700 border-blue-200' });
        }
        if (filterSummary.areaLabel && filterSummary.areaLabel !== 'すべて' && filterSummary.areaLabel !== 'all') {
            activeFilters.push({ label: 'エリア', value: filterSummary.areaLabel, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
        }
        if (filterSummary.coachLabel && filterSummary.coachLabel !== 'すべて' && filterSummary.coachLabel !== 'all') {
            activeFilters.push({ label: '担当コーチ', value: filterSummary.coachLabel, color: 'bg-purple-50 text-purple-700 border-purple-200' });
        }
        if (filterSummary.planLabel && filterSummary.planLabel !== 'すべて' && filterSummary.planLabel !== 'all') {
            activeFilters.push({ label: '受講プラン', value: filterSummary.planLabel, color: 'bg-amber-50 text-amber-700 border-amber-200' });
        }
        if (filterSummary.searchQuery) {
            activeFilters.push({ label: '検索ワード', value: `"${filterSummary.searchQuery}"`, color: 'bg-slate-100 text-slate-700 border-slate-200' });
        }
        if (filterSummary.viewedNotAppliedOnly) {
            activeFilters.push({ label: '特定絞込', value: 'フォーム閲覧・未申込のみ', color: 'bg-rose-50 text-rose-700 border-rose-200' });
        }
        if (filterSummary.lineLinkedOnly) {
            activeFilters.push({ label: '配信保証', value: 'LINE連携済のみ', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
        }
    }

    return (
        <AlertDialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
                <AlertDialogHeader className="space-y-2">
                    <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-500">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 shrink-0">
                            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-base sm:text-lg font-bold">
                                一括配信の最終確認（誤送信防止ガード）
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                                以下の条件・対象者・本文でLINE公式アカウントから一括配信を実行します。
                            </AlertDialogDescription>
                        </div>
                    </div>

                    <div className="text-xs rounded-lg p-2.5 font-medium leading-relaxed bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50">
                        {isInstant ? (
                            <span className="block font-semibold text-rose-600 dark:text-rose-400">
                                ⚠️ 即時送信を実行すると直ちに全対象者（{targetCount}名）へ順次送信が開始されます。送信後の取り消しや巻き戻しはできません。
                            </span>
                        ) : (
                            <span className="block font-semibold text-blue-600 dark:text-blue-400">
                                ℹ️ 指定日時に予約登録され、Cronディスパッチャーにより自動実行されます。日時到来までは予約管理画面から編集・キャンセルが可能です。
                            </span>
                        )}
                    </div>
                </AlertDialogHeader>

                {/* 配信確認サマリーバナー */}
                <div className="space-y-3 pt-2 text-xs">
                    {/* 1. 送信モード & 対象人数ハイライト */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                配信種別 / 実行タイミング
                            </span>
                            {isInstant ? (
                                <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-2.5 py-1">
                                    <Send className="w-3 h-3 mr-1" /> 即時一括配信
                                </Badge>
                            ) : (
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1">
                                    <Calendar className="w-3 h-3 mr-1" /> 予約: {scheduledAt?.replace('T', ' ') || '指定なし'}
                                </Badge>
                            )}
                        </div>

                        <div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                最終送信対象者数
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                                    {targetCount.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-500">名に送信</span>
                                {filterSummary?.excludedCount ? (
                                    <span className="text-[11px] text-slate-400">（除外: {filterSummary.excludedCount}名）</span>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* 2. 抽出条件サマリー（タグ、エリア、ステータス、コーチ等） */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>絞り込み抽出条件サマリー:</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                                {activeFilters.length > 0 ? `${activeFilters.length}件の条件を適用中` : '全生徒対象（条件なし）'}
                            </span>
                        </span>

                        {activeFilters.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {activeFilters.map((af, i) => (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-medium border ${af.color || 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <span className="opacity-70">{af.label}:</span>
                                        <span className="font-bold">{af.value}</span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-xs italic">
                                条件指定なし（LINE連携済みの全生徒が対象）
                            </p>
                        )}
                    </div>

                    {/* 3. キャンペーン名 */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            キャンペーン管理タイトル
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs sm:text-sm">
                            {finalTitle || '（タイトル未設定）'}
                        </p>
                    </div>

                    {/* 4. メッセージ冒頭抜粋プレビュー & 全文確認 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                メッセージ冒頭抜粋プレビュー（{sampleStudent?.fullName || 'テスト太郎'} 様宛）:
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                                全長: {finalMessage.length}文字
                            </span>
                        </div>

                        {/* 冒頭ハイライトバナー */}
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 block mb-1">
                                📩 受信通知・チャット一覧に表示される冒頭テキスト:
                            </span>
                            <p className="text-xs font-medium text-emerald-950 dark:text-emerald-200 leading-relaxed">
                                {excerptText}
                            </p>
                        </div>

                        {/* 本文プレビュー全文 */}
                        <div className="max-h-28 overflow-y-auto bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                            {previewSampleText}
                        </div>
                    </div>
                </div>

                {/* 誤送信防止チェックボックス（2段階確認） */}
                <div className="pt-2">
                    <label
                        htmlFor="safety-checkbox"
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 cursor-pointer select-none hover:bg-amber-100/50 transition-colors"
                    >
                        <Checkbox
                            id="safety-checkbox"
                            checked={isChecked}
                            onCheckedChange={checked => setIsChecked(!!checked)}
                            className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <span className="text-xs font-bold text-amber-950 dark:text-amber-200 leading-snug">
                            配信対象件数（{targetCount}名）、絞り込み条件、およびメッセージ冒頭・本文の内容に誤りがないことを確認しました。
                        </span>
                    </label>
                </div>

                <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <AlertDialogCancel
                        disabled={isBusy}
                        onClick={() => setIsChecked(false)}
                        className="text-xs h-10 px-4"
                    >
                        キャンセル
                    </AlertDialogCancel>

                    <Button
                        disabled={!isChecked || isBusy || targetCount === 0}
                        onClick={onConfirm}
                        className={`text-xs sm:text-sm font-bold h-10 px-5 shadow-sm transition-all ${
                            isInstant
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isBusy ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isInstant ? '一括配信を実行中...' : '予約登録中...'}
                            </>
                        ) : (
                            <>
                                {isInstant ? (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        今すぐ配信を実行する（{targetCount}名）
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        日時指定で予約する（{targetCount}名）
                                    </>
                                )}
                            </>
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
