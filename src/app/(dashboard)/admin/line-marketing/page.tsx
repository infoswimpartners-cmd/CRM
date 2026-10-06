'use client';

/**
 * LINEマーケティング メイン管理画面
 * 
 * 3大機能（セグメント一括配信、カード型ステップ配信、配信ログトラッキング）の
 * 統合タブインターフェースおよびKPIサマリー、体験完了生徒手動同期機能を提供します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Megaphone, Layers, History } from 'lucide-react';
import { toast } from 'sonner';
import { LineMarketingHeader } from './components/LineMarketingHeader';
import { MarketingKpiCards, MarketingKpiData } from './components/MarketingKpiCards';
import { SegmentBroadcastTab } from './components/SegmentBroadcastTab';
import { StepScenarioEditorTab } from './components/StepScenarioEditorTab';
import { DeliveryLogsTab } from './components/DeliveryLogsTab';
import { LiffTrackingTab } from './components/LiffTrackingTab';
import { getMarketingKpiSummaryAction, syncTrialDoneStudentsAction } from '@/actions/line-marketing';
import { Tag } from 'lucide-react';

export default function LineMarketingPage() {
    const [activeTab, setActiveTab] = useState<'broadcast' | 'steps' | 'tracking' | 'logs'>('broadcast');
    const [selectedTagForBroadcast, setSelectedTagForBroadcast] = useState<string | null>(null);
    const [kpi, setKpi] = useState<MarketingKpiData>({
        totalSent: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        successRate: 0,
        inProgressStudentsCount: 0,
    });
    const [isLoadingKpi, setIsLoadingKpi] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // KPIサマリーデータ取得
    const fetchKpi = useCallback(async () => {
        setIsLoadingKpi(true);
        try {
            const res = await getMarketingKpiSummaryAction();
            if (res.success && res.data) {
                setKpi(res.data);
            } else if (res.error) {
                console.error('[LineMarketingPage] fetchKpi error:', res.error);
            }
        } catch (e: any) {
            console.error('[LineMarketingPage] fetchKpi exception:', e);
        } finally {
            setIsLoadingKpi(false);
        }
    }, []);

    useEffect(() => {
        fetchKpi();
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            const tagParam = params.get('tag');
            if (tabParam && ['broadcast', 'steps', 'tracking', 'logs'].includes(tabParam)) {
                setActiveTab(tabParam as any);
            }
            if (tagParam) {
                setSelectedTagForBroadcast(tagParam);
            }
        }
    }, [fetchKpi]);

    // 体験受講完了生徒の手動同期アクション
    const handleSyncTrialDone = async () => {
        setIsSyncing(true);
        try {
            const res = await syncTrialDoneStudentsAction();
            if (res.success) {
                toast.success(`体験完了生徒の同期が完了しました (新規エンロール: ${res.newlyEnrolledCount}名 / 対象: ${res.totalEligibleCount}名)`);
                await fetchKpi();
            } else {
                toast.error('同期に失敗しました: ' + (res.error || '不明なエラー'));
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // タグから一括配信への遷移ハンドラ
    const handleSelectTagForBroadcast = (tagName: string) => {
        setSelectedTagForBroadcast(tagName);
        setActiveTab('broadcast');
        toast.info(`タグ「${tagName}」を選択して一括配信タブに切り替えました`);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* ヘッダーエリア */}
            <LineMarketingHeader
                onSyncTrialDone={handleSyncTrialDone}
                onRefresh={fetchKpi}
                isSyncing={isSyncing}
                isRefreshing={isLoadingKpi}
            />

            {/* KPIサマリーカード（総配信数、成功率、エラー件数、ステップ配信中生徒数） */}
            <MarketingKpiCards kpi={kpi} isLoading={isLoadingKpi} />

            {/* 4大タブ構成（セグメント一括配信 / カード型ステップ配信 / LIFFアクセス分析・タグ / 配信ログ） */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl grid grid-cols-2 sm:grid-cols-4 max-w-3xl h-auto border border-slate-200 dark:border-slate-700">
                    <TabsTrigger
                        value="broadcast"
                        className="py-2.5 px-3 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Megaphone className="h-4 w-4 mr-1.5" />
                        一括配信
                    </TabsTrigger>
                    <TabsTrigger
                        value="steps"
                        className="py-2.5 px-3 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Layers className="h-4 w-4 mr-1.5" />
                        ステップ配信
                    </TabsTrigger>
                    <TabsTrigger
                        value="tracking"
                        className="py-2.5 px-3 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Tag className="h-4 w-4 mr-1.5 text-indigo-500" />
                        アクセス分析・タグ
                    </TabsTrigger>
                    <TabsTrigger
                        value="logs"
                        className="py-2.5 px-3 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <History className="h-4 w-4 mr-1.5" />
                        配信ログ
                    </TabsTrigger>
                </TabsList>

                {/* タブ1: セグメント一括配信 */}
                <TabsContent value="broadcast" className="focus-visible:outline-none">
                    <SegmentBroadcastTab
                        initialTag={selectedTagForBroadcast}
                        onBroadcastSuccess={fetchKpi}
                        onDeliveryDone={fetchKpi}
                    />
                </TabsContent>

                {/* タブ2: カード型ステップ配信シナリオエディタ */}
                <TabsContent value="steps" className="focus-visible:outline-none">
                    <StepScenarioEditorTab onUpdate={fetchKpi} />
                </TabsContent>

                {/* タブ3: LIFFアクセス分析・タグ管理 */}
                <TabsContent value="tracking" className="focus-visible:outline-none">
                    <LiffTrackingTab onSelectTagForBroadcast={handleSelectTagForBroadcast} />
                </TabsContent>

                {/* タブ4: 配信ログ・トラッキング */}
                <TabsContent value="logs" className="focus-visible:outline-none">
                    <DeliveryLogsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
