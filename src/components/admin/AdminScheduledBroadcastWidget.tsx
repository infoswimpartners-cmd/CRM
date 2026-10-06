'use client';

/**
 * 管理者ダッシュボード用 LINE一括配信予約確認・クイックアクセスウィジェット
 * 
 * ダッシュボード上に直近の配信予約状況（予約日時、タイトル、対象人数、本文プレビュー）を表示し、
 * ワンクリックで詳細確認・編集モーダルを開く、または一括配信画面へ遷移できるUI/UXを提供します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Clock,
    Send,
    Edit3,
    ArrowUpRight,
    RefreshCw,
    MessageSquare,
    CheckCircle2,
    Loader2,
    ChevronRight,
} from 'lucide-react';
import { LineBroadcastCampaign } from '@/types/line-marketing';
import { getBroadcastCampaigns } from '@/actions/line-marketing';
import { ScheduledCampaignsModal } from '@/app/(dashboard)/admin/line-marketing/components/ScheduledCampaignsModal';

interface AdminScheduledBroadcastWidgetProps {
    initialCampaigns?: LineBroadcastCampaign[];
}

export function AdminScheduledBroadcastWidget({
    initialCampaigns,
}: AdminScheduledBroadcastWidgetProps) {
    const [campaigns, setCampaigns] = useState<LineBroadcastCampaign[]>(initialCampaigns || []);
    const [isLoading, setIsLoading] = useState<boolean>(!initialCampaigns);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const loadScheduledCampaigns = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getBroadcastCampaigns({
                status: 'scheduled',
                limit: 10,
            });
            if (res.success) {
                setCampaigns(res.campaigns);
            }
        } catch (e) {
            console.error('[AdminScheduledBroadcastWidget] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialCampaigns) {
            loadScheduledCampaigns();
        }
    }, [initialCampaigns, loadScheduledCampaigns]);

    const formatDate = (isoStr?: string | null) => {
        if (!isoStr) return '-';
        try {
            const dt = new Date(isoStr);
            return dt.toLocaleString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'short',
            });
        } catch {
            return isoStr;
        }
    };

    return (
        <>
            <Card className="bg-white rounded-3xl overflow-hidden border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 transition-all duration-300">
                <CardHeader className="p-6 md:p-8 pb-4 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-linear-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 text-white">
                            <Send className="w-6 h-6 -translate-y-0.5 translate-x-0.5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                                    LINE一括配信の予約状況
                                </CardTitle>
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 text-xs font-bold px-2 py-0.5">
                                    {campaigns.length}件 予約中
                                </Badge>
                            </div>
                            <CardDescription className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                                予定日時に自動一斉送信されるキャンペーンの事前確認・編集
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={loadScheduledCampaigns}
                            disabled={isLoading}
                            className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-xl"
                            title="最新に更新"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsModalOpen(true)}
                            className="h-9 px-3.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-xl shadow-xs flex items-center gap-1.5"
                        >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>予約を確認・編集</span>
                        </Button>
                        <Link href="/admin/line-marketing?tab=broadcast">
                            <Button
                                size="sm"
                                className="h-9 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1"
                            >
                                <span>一括配信画面へ</span>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8 pt-6">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                            <p className="text-xs font-medium">予約データを取得中...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-10 text-center flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-xs mb-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">現在、待機中の配信予約はありません</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                会員や体験受講者へのお知らせやキャンペーンをスケジュール配信したい場合は、一括配信画面から予約登録を行えます。
                            </p>
                            <Link href="/admin/line-marketing?tab=broadcast" className="mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
                                >
                                    新規に一括配信を予約する ➔
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {campaigns.map((camp) => (
                                <div
                                    key={camp.id}
                                    onClick={() => setIsModalOpen(true)}
                                    className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-4 md:p-5 border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge className="bg-blue-50 text-blue-700 border-blue-200/80 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-blue-600" />
                                                {formatDate(camp.scheduled_at)}
                                            </Badge>
                                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                                対象: {camp.target_count || 0}名
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                                {camp.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-2 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
                                                {camp.message_template || camp.message_text}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-slate-400">クリックして編集・キャンセル</span>
                                        <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                            詳細 ➔
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 予約確認・編集モーダル */}
            <ScheduledCampaignsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCampaignUpdated={loadScheduledCampaigns}
            />
        </>
    );
}
