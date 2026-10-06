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
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    isSubmitting: boolean;
    title: string;
    messageTemplate: string;
    targetCount: number;
    deliveryMode: 'instant' | 'scheduled';
    scheduledAt?: string | null;
    sampleStudent?: FilterPreviewStudent | null;
}

export const SafetyConfirmDialog: React.FC<SafetyConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
    title,
    messageTemplate,
    targetCount,
    deliveryMode,
    scheduledAt,
    sampleStudent,
}) => {
    // 誤送信防止チェックボックス状態
    const [isChecked, setIsChecked] = useState(false);

    // モーダルが閉じたときにチェック状態を初期化
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setIsChecked(false);
            onClose();
        }
    };

    const isInstant = deliveryMode === 'instant';
    const previewSampleText = renderClientPreviewMessage(messageTemplate, sampleStudent);

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="max-w-lg border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900">
                <AlertDialogHeader className="space-y-3">
                    <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-500">
                        <ShieldAlert className="w-6 h-6 shrink-0" />
                        <AlertDialogTitle className="text-lg font-bold">
                            一括配信の最終確認（誤送信防止）
                        </AlertDialogTitle>
                    </div>

                    <AlertDialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        以下の内容でLINE公式アカウントから一括配信を実行します。
                        {isInstant ? (
                            <span className="block mt-1 font-semibold text-rose-600 dark:text-rose-400">
                                ⚠️ 即時送信を実行すると直ちに全対象者へ送信が開始され、取り消しはできません。
                            </span>
                        ) : (
                            <span className="block mt-1 font-semibold text-blue-600 dark:text-blue-400">
                                ℹ️ 指定日時に予約登録され、Cronディスパッチャーにより自動実行されます。
                            </span>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* 配信サマリーカード */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                    {/* 送信モードと対象件数 */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">配信種別</span>
                        {isInstant ? (
                            <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-semibold">
                                <Send className="w-3 h-3 mr-1" /> 即時一括配信
                            </Badge>
                        ) : (
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                                <Calendar className="w-3 h-3 mr-1" /> 予約配信（{scheduledAt?.replace('T', ' ')}）
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">配信対象者数</span>
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                            {targetCount} <span className="text-xs font-normal text-slate-500">名</span>
                        </span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">キャンペーン名</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {title || '（タイトル未設定）'}
                        </p>
                    </div>

                    {/* 本文サンプル */}
                    <div className="space-y-1 pt-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                            本文サンプル（{sampleStudent?.fullName || 'テスト太郎'} 様宛）:
                        </span>
                        <div className="max-h-28 overflow-y-auto bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {previewSampleText}
                        </div>
                    </div>
                </div>

                {/* 誤送信防止チェックボックス */}
                <div className="pt-2">
                    <label
                        htmlFor="safety-checkbox"
                        className="flex items-start gap-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20 cursor-pointer select-none"
                    >
                        <Checkbox
                            id="safety-checkbox"
                            checked={isChecked}
                            onCheckedChange={checked => setIsChecked(!!checked)}
                            className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <span className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-snug">
                            配信対象件数（{targetCount}名）およびメッセージ内容に誤りがないことを確認しました。
                        </span>
                    </label>
                </div>

                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel
                        disabled={isSubmitting}
                        onClick={() => setIsChecked(false)}
                    >
                        キャンセル
                    </AlertDialogCancel>

                    <Button
                        disabled={!isChecked || isSubmitting || targetCount === 0}
                        onClick={onConfirm}
                        className={
                            isInstant
                                ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
                                : 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                        }
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isInstant ? '一括配信実行中...' : '予約登録中...'}
                            </>
                        ) : (
                            <>
                                {isInstant ? (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        今すぐ配信を実行する
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-4 h-4 mr-2" />
                                        日時指定で予約する
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
