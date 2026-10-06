'use client';

/**
 * スマホ実機風 LINEトーク画面プレビューモーダル
 * 
 * 実際のLINEアプリのトーク画面を忠実に再現し、変数置換結果を視覚的に確認できます。
 */

import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FilterPreviewStudent } from '@/types/line-marketing';
import { Smartphone, Wifi, Battery, ChevronLeft, MoreHorizontal, Phone, MessageSquare } from 'lucide-react';

interface PhonePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: string;
    students: FilterPreviewStudent[];
    initialStudent?: FilterPreviewStudent | null;
}

/**
 * クライアント側での高速変数置換エンジン
 */
export function renderClientPreviewMessage(
    template: string,
    student?: FilterPreviewStudent | null
): string {
    if (!template) return '（メッセージが入力されていません）';

    const sampleData: Record<string, string> = {
        name: student?.fullName || 'テスト太郎',
        coach_name: student?.coachName || '新吉航大 コーチ',
        plan_name: student?.planName || '月2回プラン（60分）',
        area: student?.area || '東京都港区',
        student_number: student?.studentNumber || '0035',
        trial_date: student?.trialDate || '2026年9月30日',
        trial_url: 'https://manager.swim-partners.com/trial',
    };

    return template.replace(/[{｛]{1,2}\s*([a-zA-Z0-9_-]+)\s*[}｝]{1,2}/gi, (_, rawKey) => {
        const key = rawKey.toLowerCase();
        return sampleData[key] !== undefined ? sampleData[key] : '';
    });
}

export const PhonePreviewModal: React.FC<PhonePreviewModalProps> = ({
    isOpen,
    onClose,
    template,
    students,
    initialStudent,
}) => {
    // プレビュー表示対象の生徒
    const [selectedStudentId, setSelectedStudentId] = useState<string>(
        initialStudent?.id || (students.length > 0 ? students[0].id : '')
    );

    const currentStudent = students.find(s => s.id === selectedStudentId) || initialStudent || null;
    const renderedBody = renderClientPreviewMessage(template, currentStudent);

    // 現在時刻
    const nowTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-slate-900 border-slate-700 shadow-2xl rounded-3xl">
                {/* ヘッダー・プレビュー対象切り替えバー */}
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-200">実機トーク画面プレビュー</span>
                    </div>

                    {students.length > 0 ? (
                        <div className="w-[180px]">
                            <Select
                                value={selectedStudentId}
                                onValueChange={setSelectedStudentId}
                            >
                                <SelectTrigger className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200">
                                    <SelectValue placeholder="生徒を選択" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[240px]">
                                    {students.slice(0, 30).map(s => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.fullName} ({s.studentNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                            サンプル（テスト太郎）
                        </Badge>
                    )}
                </div>

                {/* スマートフォン筐体風ラッパー */}
                <div className="p-3 bg-slate-900">
                    <div className="w-full bg-[#849ebf] rounded-[28px] overflow-hidden border-[6px] border-slate-950 shadow-inner flex flex-col h-[560px]">
                        {/* 1. スマホステータスバー */}
                        <div className="px-5 pt-3 pb-1 flex justify-between items-center text-[11px] font-semibold text-slate-800 select-none">
                            <span>9:41</span>
                            <div className="flex items-center gap-1.5 text-slate-800">
                                <Wifi className="w-3.5 h-3.5" />
                                <Battery className="w-3.5 h-3.5" />
                            </div>
                        </div>

                        {/* 2. LINEトーク画面ヘッダー */}
                        <div className="bg-[#849ebf] px-3 py-2 flex items-center justify-between border-b border-black/5 select-none">
                            <div className="flex items-center gap-2">
                                <ChevronLeft className="w-5 h-5 text-slate-800 cursor-pointer" onClick={onClose} />
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm text-slate-900">スイムパートナーズ</span>
                                    <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">公式</Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-800">
                                <Phone className="w-4 h-4 opacity-70" />
                                <MoreHorizontal className="w-4 h-4 opacity-70" />
                            </div>
                        </div>

                        {/* 3. トークメッセージ領域 */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-3">
                            {/* 日付ヘッダーバッジ */}
                            <div className="flex justify-center">
                                <span className="bg-black/20 text-white text-[10px] px-3 py-0.5 rounded-full select-none">
                                    今日
                                </span>
                            </div>

                            {/* LINE吹き出し（公式アカウント発信） */}
                            <div className="flex items-start gap-2 max-w-[92%]">
                                {/* アカウントアバター */}
                                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                                    SP
                                </div>

                                <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[10px] text-slate-700 font-medium pl-0.5">
                                        スイムパートナーズ
                                    </span>

                                    <div className="flex items-end gap-1.5">
                                        {/* 白のトーク吹き出し */}
                                        <div className="bg-white text-slate-800 text-[13px] leading-relaxed p-3 rounded-2xl rounded-tl-xs shadow-sm whitespace-pre-wrap break-words">
                                            {renderedBody}
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
                        <div className="bg-white px-3 py-2 border-t border-slate-200 flex items-center gap-2 select-none">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                                ＋
                            </div>
                            <div className="flex-1 bg-slate-100 rounded-full h-7 px-3 flex items-center text-xs text-slate-400">
                                メッセージを入力
                            </div>
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                <MessageSquare className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
