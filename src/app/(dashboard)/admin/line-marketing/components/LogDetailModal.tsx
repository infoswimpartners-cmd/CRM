'use client';

/**
 * LINE配信ログ詳細確認モーダルコンポーネント
 * 
 * 送信日時、配信種別、宛先情報、LINE User ID、配信成否、エラー詳細、
 * および送信本文の全文確認とクリップボードコピー機能を提供します。
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LineDeliveryLog } from '@/types/line-marketing';
import { toast } from 'sonner';
import { Send, Copy, Check } from 'lucide-react';

interface LogDetailModalProps {
    log: LineDeliveryLog | null;
    open: boolean;
    onClose: () => void;
}

export function LogDetailModal({ log, open, onClose }: LogDetailModalProps) {
    const [isCopied, setIsCopied] = useState(false);

    if (!log) return null;

    // 日時フォーマッタ (JST表示)
    const formatDateTime = (isoString?: string | null) => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch {
            return isoString;
        }
    };

    // 本文コピー処理
    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success('メッセージ本文をコピーしました。');
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-600" />
                        LINE配信ログ詳細
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        ログID: {log.id}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    {/* 基本情報メタテーブル */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                        <div>
                            <span className="text-slate-500 block text-[11px]">送信日時</span>
                            <span className="font-semibold text-slate-800">
                                {formatDateTime(log.sent_at || log.created_at)}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">配信種別</span>
                            <span className="font-semibold text-slate-800">
                                {log.delivery_type === 'broadcast' && '一括配信'}
                                {log.delivery_type === 'step_message' && `ステップ配信 (${log.step_name || '名称未設定'})`}
                                {log.delivery_type === 'test_preview' && 'テストプレビュー送信'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">宛先生徒</span>
                            <span className="font-semibold text-slate-800">
                                {log.student_name || '名前未設定'} (No. {log.student_number || '-'})
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[11px]">LINE User ID</span>
                            <span className="font-semibold text-slate-800 truncate block" title={log.line_user_id}>
                                {log.line_user_id}
                            </span>
                        </div>
                        {log.error_message && (
                            <div className="col-span-2 bg-rose-50 p-2 rounded border border-rose-200 text-rose-700">
                                <span className="font-bold block text-[11px]">エラー詳細 / 理由:</span>
                                <p className="mt-0.5 whitespace-pre-wrap">{log.error_message}</p>
                            </div>
                        )}
                    </div>

                    {/* メッセージ本文表示エリア */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">送信メッセージ本文</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMessage(log.rendered_message || log.message_body)}
                                className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900"
                            >
                                {isCopied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                        コピー完了
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        本文をコピー
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-inner max-h-72 overflow-y-auto">
                            {log.rendered_message || log.message_body}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                    >
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
