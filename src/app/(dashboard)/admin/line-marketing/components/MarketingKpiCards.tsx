'use client';

/**
 * LINEマーケティング KPIサマリーカード群
 * 
 * 累計配信数、成功率、エラー件数、ステップ配信中生徒数を4枚のカードで視覚化します。
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Send, CheckCircle2, AlertTriangle, Users, Loader2 } from 'lucide-react';
import { LineMarketingKpiSummary } from '@/types/line-marketing';

export interface MarketingKpiData extends LineMarketingKpiSummary {}

interface MarketingKpiCardsProps {
    kpi: MarketingKpiData;
    isLoading?: boolean;
}

export const MarketingKpiCards: React.FC<MarketingKpiCardsProps> = ({
    kpi,
    isLoading = false,
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 総配信数 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-200 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            総配信数
                        </p>
                        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {kpi.totalSent.toLocaleString()}
                                    <span className="text-xs font-normal text-slate-500 ml-1">件</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            累計配信メッセージ数
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <Send className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            {/* 2. 配信成功率 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-200 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            配信成功率
                        </p>
                        <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {kpi.successRate}%
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            正常到達率（{kpi.successCount.toLocaleString()}件 成功）
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            {/* 3. エラー件数 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-200 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            エラー失敗件数
                        </p>
                        <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {kpi.failedCount.toLocaleString()}
                                    <span className="text-xs font-normal text-slate-500 ml-1">件</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            LINE APIエラー / 送信失敗
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            {/* 4. ステップ配信中生徒数 */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-200 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            ステップ進行中
                        </p>
                        <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400 my-1" />
                            ) : (
                                <>
                                    {kpi.inProgressStudentsCount.toLocaleString()}
                                    <span className="text-xs font-normal text-slate-500 ml-1">名</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            体験受講後シナリオ進行中
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                        <Users className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
