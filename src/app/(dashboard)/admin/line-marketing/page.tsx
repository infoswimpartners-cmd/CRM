'use client';

/**
 * LINEマーケティング メイン管理画面
 * 
 * 3大機能（セグメント一括配信、カード型ステップ配信、配信ログトラッキング）の
 * 統合タブインターフェースおよびKPIサマリー、体験完了生徒手動同期機能を提供します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Megaphone, Layers, History, Menu, Tag, MessageSquare, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { LineMarketingHeader } from './components/LineMarketingHeader';
import { MarketingKpiCards, MarketingKpiData } from './components/MarketingKpiCards';
import { SegmentBroadcastTab } from './components/SegmentBroadcastTab';
import { StepScenarioEditorTab } from './components/StepScenarioEditorTab';
import { DeliveryLogsTab } from './components/DeliveryLogsTab';
import { LiffTrackingTab, preloadLiffTrackingData } from './components/LiffTrackingTab';
import { RichMenuSettingsTab } from './components/RichMenuSettingsTab';
import { IndividualChatTab } from './components/IndividualChatTab';
import { UserActivityMonitoringTab } from './components/UserActivityMonitoringTab';
import { AutomationScenariosTab } from './components/AutomationScenariosTab';
import { getMarketingKpiSummaryAction, syncTrialDoneStudentsAction } from '@/actions/line-marketing';
import { formatErrorToastMessage, sanitizeErrorMessage } from '@/lib/error-formatter';
import { getStaleLocalCache, setLocalCache } from '@/lib/local-cache';

// ページ内インメモリKPIキャッシュ（Stale-While-Revalidate: 即時表示用）
let cachedMarketingKpi: MarketingKpiData | null = null;

const KPI_CACHE_KEY = 'line_marketing_kpi';

export default function LineMarketingPage() {
    const [activeTab, setActiveTab] = useState<'chat' | 'scenarios' | 'broadcast' | 'steps' | 'activity' | 'tracking' | 'logs' | 'richmenu'>('broadcast');
    // オンデマンド読み込み用: 訪問済みタブのみをマウント＆メモリ保持（不要な一斉fetchを完全防止）
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['broadcast']));
    const [selectedTagForBroadcast, setSelectedTagForBroadcast] = useState<string | null>(null);
    const [initialChatLineUserId, setInitialChatLineUserId] = useState<string | null>(null);
    const [chatBadgeCount, setChatBadgeCount] = useState(0);
    const [kpi, setKpi] = useState<MarketingKpiData>(() => {
        const localCached = getStaleLocalCache<MarketingKpiData>(KPI_CACHE_KEY);
        return localCached || cachedMarketingKpi || {
            totalSent: 0,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            successRate: 0,
            inProgressStudentsCount: 0,
        };
    });
    const [isLoadingKpi, setIsLoadingKpi] = useState(() => {
        const localCached = getStaleLocalCache<MarketingKpiData>(KPI_CACHE_KEY);
        return !localCached && !cachedMarketingKpi;
    });
    const [isSyncing, setIsSyncing] = useState(false);

    // タブ切り替えハンドラ（オンデマンド訪問タブ登録）
    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab as any);
        setVisitedTabs(prev => {
            if (prev.has(tab)) return prev;
            const next = new Set(prev);
            next.add(tab);
            return next;
        });

        // LIFF分析タブを開いた時のみ事前ロードを実行
        if (tab === 'tracking') {
            preloadLiffTrackingData();
        }
    }, []);

    // KPIサマリーデータ取得（非ブロッキング・バックグラウンド更新）
    const fetchKpi = useCallback(async () => {
        try {
            const res = await getMarketingKpiSummaryAction();
            if (res.success && res.data) {
                setKpi(res.data);
                cachedMarketingKpi = res.data;
                setLocalCache(KPI_CACHE_KEY, res.data);
            } else if (res.error) {
                console.warn('[LineMarketingPage] fetchKpi notice:', res.error);
            }
        } catch (e: any) {
            console.warn('[LineMarketingPage] fetchKpi background notice:', e);
        } finally {
            setIsLoadingKpi(false);
        }
    }, []);

    useEffect(() => {
        // 非同期バックグラウンドでKPI更新（画面描画は待たずに即時表示）
        fetchKpi();

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            const tagParam = params.get('tag');
            const lineUserParam = params.get('lineUserId');
            if (tabParam && ['chat', 'scenarios', 'broadcast', 'steps', 'activity', 'tracking', 'logs', 'richmenu'].includes(tabParam)) {
                handleTabChange(tabParam);
            }
            if (tagParam) {
                setSelectedTagForBroadcast(tagParam);
            }
            if (lineUserParam) {
                setInitialChatLineUserId(lineUserParam);
                handleTabChange('chat');
            }
        }
    }, [fetchKpi, handleTabChange]);

    // 体験受講完了生徒の手動同期アクション
    const handleSyncTrialDone = async () => {
        setIsSyncing(true);
        try {
            const res = await syncTrialDoneStudentsAction();
            if (res.success) {
                toast.success(`体験完了生徒の同期が完了しました (新規エンロール: ${res.newlyEnrolledCount}名 / 対象: ${res.totalEligibleCount}名)`);
                await fetchKpi();
            } else {
                toast.error('同期に失敗しました: ' + sanitizeErrorMessage(res.error, '不明なエラー'));
            }
        } catch (e: any) {
            toast.error(formatErrorToastMessage(e));
        } finally {
            setIsSyncing(false);
        }
    };

    // タグから一括配信への遷移ハンドラ
    const handleSelectTagForBroadcast = (tagName: string) => {
        setSelectedTagForBroadcast(tagName);
        handleTabChange('broadcast');
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

            {/* 8大タブ構成（個別トーク / 自動化シナリオ(Make風) / セグメント一括配信 / カード型ステップ配信 / 行動監視ログ / LIFFアクセス分析・タグ / 配信ログ / リッチメニュー設定） */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 max-w-7xl h-auto border border-slate-200 dark:border-slate-700 gap-1">
                    <TabsTrigger
                        value="chat"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#06C755] dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-[#06C755] data-[state=active]:shadow-sm transition-all"
                    >
                        <MessageSquare className="h-4 w-4 mr-1.5 text-[#06C755]" />
                        個別トーク
                        {chatBadgeCount > 0 && (
                            <span className="ml-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {chatBadgeCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="scenarios"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-violet-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-violet-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Zap className="h-4 w-4 mr-1.5 text-violet-600" />
                        自動化シナリオ
                    </TabsTrigger>
                    <TabsTrigger
                        value="broadcast"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Megaphone className="h-4 w-4 mr-1.5" />
                        一括配信
                    </TabsTrigger>
                    <TabsTrigger
                        value="steps"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Layers className="h-4 w-4 mr-1.5" />
                        ステップ配信
                    </TabsTrigger>
                    <TabsTrigger
                        value="activity"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Activity className="h-4 w-4 mr-1.5 text-emerald-500" />
                        行動監視ログ
                    </TabsTrigger>
                    <TabsTrigger
                        value="tracking"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Tag className="h-4 w-4 mr-1.5 text-indigo-500" />
                        アクセス分析・タグ
                    </TabsTrigger>
                    <TabsTrigger
                        value="logs"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <History className="h-4 w-4 mr-1.5" />
                        配信ログ
                    </TabsTrigger>
                    <TabsTrigger
                        value="richmenu"
                        className="py-2.5 px-2.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                    >
                        <Menu className="h-4 w-4 mr-1.5 text-amber-500" />
                        リッチメニュー設定
                    </TabsTrigger>
                </TabsList>

                {/* タブ0: Lステップ風 1対1 個別トーク・チャット管理（オンデマンド読み込み・キャッシュ保持） */}
                {visitedTabs.has('chat') && (
                    <TabsContent value="chat" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <IndividualChatTab
                            initialLineUserId={initialChatLineUserId}
                            onUnreadCountChange={(unread, needsReply) => setChatBadgeCount(unread || needsReply)}
                            onDeliverySuccess={fetchKpi}
                        />
                    </TabsContent>
                )}

                {/* タブ1: Make風 自動配信シナリオ統合管理ハブ（オンデマンド読み込み） */}
                {visitedTabs.has('scenarios') && (
                    <TabsContent value="scenarios" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <AutomationScenariosTab />
                    </TabsContent>
                )}

                {/* タブ2: セグメント一括配信（オンデマンド読み込み） */}
                {visitedTabs.has('broadcast') && (
                    <TabsContent value="broadcast" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <SegmentBroadcastTab
                            initialTag={selectedTagForBroadcast}
                            onBroadcastSuccess={fetchKpi}
                            onDeliveryDone={fetchKpi}
                        />
                    </TabsContent>
                )}

                {/* タブ3: カード型ステップ配信シナリオエディタ（オンデマンド読み込み） */}
                {visitedTabs.has('steps') && (
                    <TabsContent value="steps" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <StepScenarioEditorTab onUpdate={fetchKpi} />
                    </TabsContent>
                )}

                {/* タブ4: LINE友だち行動監視・リアルタイムアクティビティログ（オンデマンド読み込み） */}
                {visitedTabs.has('activity') && (
                    <TabsContent value="activity" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <UserActivityMonitoringTab
                            onNavigateToChat={(lineUserId) => {
                                setInitialChatLineUserId(lineUserId);
                                handleTabChange('chat');
                            }}
                        />
                    </TabsContent>
                )}

                {/* タブ5: LIFFアクセス分析・タグ管理（オンデマンド読み込み） */}
                {visitedTabs.has('tracking') && (
                    <TabsContent value="tracking" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <LiffTrackingTab onSelectTagForBroadcast={handleSelectTagForBroadcast} />
                    </TabsContent>
                )}

                {/* タブ6: 配信ログ・トラッキング（オンデマンド読み込み） */}
                {visitedTabs.has('logs') && (
                    <TabsContent value="logs" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <DeliveryLogsTab />
                    </TabsContent>
                )}

                {/* タブ7: リッチメニュー設定・切り替え（オンデマンド読み込み） */}
                {visitedTabs.has('richmenu') && (
                    <TabsContent value="richmenu" className="data-[state=inactive]:hidden focus-visible:outline-none">
                        <RichMenuSettingsTab />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
