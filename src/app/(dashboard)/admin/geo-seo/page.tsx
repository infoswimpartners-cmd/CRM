'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { SpTrackerHeroActions } from '@/components/admin/geo-seo/SpTrackerHeroActions';
import { SpTrackerStatusMeters } from '@/components/admin/geo-seo/SpTrackerStatusMeters';
import { SpTrackerSeoView } from '@/components/admin/geo-seo/SpTrackerSeoView';
import { SpTrackerGeoView } from '@/components/admin/geo-seo/SpTrackerGeoView';
import { SpTrackerCitationGapView } from '@/components/admin/geo-seo/SpTrackerCitationGapView';
import { SpTrackerSettingsView } from '@/components/admin/geo-seo/SpTrackerSettingsView';
import { AnalyticsSyncCard } from '@/components/admin/geo-seo/AnalyticsSyncCard';
import {
    getSpTrackerDashboard,
    toggleActionRecommendationResolved,
    SpTrackerDashboardData,
} from '@/actions/sp-tracker-actions';
import { syncMarketingAnalytics } from '@/actions/marketing';
import { RefreshCw } from 'lucide-react';

function SpTrackerContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState<'seo' | 'geo' | 'citation_gap' | 'analytics' | 'settings'>('seo');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (tabParam && ['seo', 'geo', 'citation_gap', 'analytics', 'settings'].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    const [data, setData] = useState<SpTrackerDashboardData>({
        statusMeters: {
            seoTopRate: 63,
            geoSovRate: 67,
            citationGapCount: 3,
            internalHealthScore: 92,
        },
        actionRecommendations: [],
        keywords: [],
        geoPrompts: [],
        citationGaps: [],
        config: {
            googleChatWebhookConfigured: false,
            ga4Configured: false,
            searchConsoleConfigured: false,
        },
    });

    const loadDashboard = async () => {
        try {
            const res = await getSpTrackerDashboard();
            if (res) {
                setData(res);
            }
        } catch (err) {
            console.error('Failed to load SP-Tracker data:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleResolveToggle = async (id: number, currentStatus: boolean) => {
        const nextStatus = !currentStatus;
        // 即座に画面上のステートを更新
        setData((prev) => ({
            ...prev,
            actionRecommendations: prev.actionRecommendations.map((a) =>
                a.id === id ? { ...a, is_resolved: nextStatus } : a
            ),
        }));

        if (nextStatus) {
            toast.success('アクション指示を完了済みに更新しました');
        }

        try {
            await toggleActionRecommendationResolved(id, currentStatus);
        } catch (err) {
            console.error('Failed to update recommendation status:', err);
        }
    };

    const handleRefreshAll = async () => {
        setIsRefreshing(true);
        try {
            await syncMarketingAnalytics();
            await loadDashboard();
            toast.success('最新のSEO/GEOデータを同期しました');
        } catch (err) {
            toast.error('同期に失敗しました');
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 p-6 md:p-12 space-y-10">
            {/* ページタイトル (SP-Tracker ヘッダー) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200/80 pb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            SP-TRACKER v1.0.0
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            SEO ✕ GEO INTEGRATED ENGINE
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900">
                        スイムパートナーズ専用 SEO・GEO統合管理
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        className="px-4 py-2.5 rounded-xl border border-zinc-900 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? '同期中...' : '最新データを取得'}
                    </button>
                </div>
            </div>

            {/* 1. 最上部: 今すぐやること（Today's / Weekly Action）カード */}
            <SpTrackerHeroActions
                actions={data.actionRecommendations}
                onResolveToggle={handleResolveToggle}
            />

            {/* 2. ステータスメーター（4つの主要診断指標） */}
            <SpTrackerStatusMeters
                seoTopRate={data.statusMeters.seoTopRate}
                geoSovRate={data.statusMeters.geoSovRate}
                citationGapCount={data.statusMeters.citationGapCount}
                internalHealthScore={data.statusMeters.internalHealthScore}
            />

            {/* 3. 詳細ビュー タブ切り替え */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl max-w-fit overflow-x-auto">
                {[
                    { id: 'seo', label: 'SEO推移（エリア・セグメント）' },
                    { id: 'geo', label: 'GEO分析（AI回答原文 & SOV）' },
                    { id: 'citation_gap', label: '引用元ギャップリスト' },
                    { id: 'analytics', label: 'GA4 / Search Console' },
                    { id: 'settings', label: '設定（KW・プロンプト・Webhook）' },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 whitespace-nowrap ${
                                isActive
                                    ? 'bg-white text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-bold'
                                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 4. タブコンテンツ表示 */}
            <div className="pt-2">
                {activeTab === 'seo' && (
                    <SpTrackerSeoView
                        keywords={data.keywords}
                        searchConsoleData={data.searchConsoleData}
                    />
                )}

                {activeTab === 'geo' && (
                    <SpTrackerGeoView prompts={data.geoPrompts} />
                )}

                {activeTab === 'citation_gap' && (
                    <SpTrackerCitationGapView citationGaps={data.citationGaps} />
                )}

                {activeTab === 'analytics' && (
                    <AnalyticsSyncCard
                        isConfigured={data.config.ga4Configured}
                        ga4Connected={data.config.ga4Configured}
                        searchConsoleConnected={data.config.searchConsoleConfigured}
                        lastSynced="接続稼働中"
                        ga4Data={data.ga4Data}
                        searchConsoleData={data.searchConsoleData}
                        onSync={handleRefreshAll}
                    />
                )}

                {activeTab === 'settings' && (
                    <SpTrackerSettingsView
                        webhookConfigured={data.config.googleChatWebhookConfigured}
                        onRefresh={loadDashboard}
                    />
                )}
            </div>
        </div>
    );
}

export default function SpTrackerPage() {
    return (
        <Suspense fallback={<div className="p-12 text-zinc-400 font-mono text-xs">読み込み中...</div>}>
            <SpTrackerContent />
        </Suspense>
    );
}
