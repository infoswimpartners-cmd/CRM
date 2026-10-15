'use client';

/**
 * セグメント抽出リアルタイムKPIサマリーカード
 * 
 * 抽出総数、LINE連携済、除外件数、最終送信対象の4分割モダンKPIカードを表示します。
 * Apple HIGデザインスタイルに準拠し、視認性とステータス認知を高めます。
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, UserMinus, Send, Loader2 } from 'lucide-react';

export interface SegmentKpiCardsProps {
    totalCount: number;
    lineEligibleCount: number;
    excludedCount: number;
    targetCount: number;
    isLoading?: boolean;
}

export const SegmentKpiCards: React.FC<SegmentKpiCardsProps> = ({
    totalCount,
    lineEligibleCount,
    excludedCount,
    targetCount,
    isLoading = false,
}) => {
    // LINE連携率の算出（ゼロ除算防止）
    const lineLinkRate = totalCount > 0 ? Math.round((lineEligibleCount / totalCount) * 100) : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. 抽出総数 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
                <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            抽出総数
                        </span>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {totalCount.toLocaleString()}
                                    <span className="text-xs font-normal text-slate-500 ml-1">名</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            絞り込み条件合致
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. LINE連携済 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-200 transition-all">
                <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                LINE連携済
                            </span>
                            {!isLoading && totalCount > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-semibold">
                                    {lineLinkRate}%
                                </Badge>
                            )}
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {lineEligibleCount.toLocaleString()}
                                    <span className="text-xs font-normal text-slate-500 ml-1">名</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            メッセージ受信可能
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 3. 除外件数 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-200 transition-all">
                <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            除外件数
                        </span>
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                            <UserMinus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {excludedCount.toLocaleString()}
                                    <span className="text-xs font-normal text-slate-500 ml-1">名</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            個別チェック解除
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 4. 最終送信対象 */}
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs hover:border-emerald-300 transition-all">
                <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            最終送信対象
                        </span>
                        <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                            <Send className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600 my-1" />
                            ) : (
                                <>
                                    {targetCount.toLocaleString()}
                                    <span className="text-xs font-normal text-emerald-800/80 ml-1">名</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 truncate font-medium">
                            今回の配信実行件数
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
