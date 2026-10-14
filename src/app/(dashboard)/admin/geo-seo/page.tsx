'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import { SpTrackerStatusMeters } from '@/components/admin/geo-seo/SpTrackerStatusMeters';
import { SpTrackerSeoView } from '@/components/admin/geo-seo/SpTrackerSeoView';
import { SpTrackerGeoView } from '@/components/admin/geo-seo/SpTrackerGeoView';
import { SpTrackerCitationGapView } from '@/components/admin/geo-seo/SpTrackerCitationGapView';
import { SpTrackerSettingsView } from '@/components/admin/geo-seo/SpTrackerSettingsView';
import { AnalyticsSyncCard } from '@/components/admin/geo-seo/AnalyticsSyncCard';
import { SpTrackerConversionCustomerView } from '@/components/admin/geo-seo/SpTrackerConversionCustomerView';
import { DEFAULT_SPREADSHEET_ANALYTICS } from '@/lib/spreadsheet-types';
import {
    getSpTrackerDashboard,
    toggleActionRecommendationResolved,
    fetchLivePageAuditAction,
    SpTrackerDashboardData,
} from '@/actions/sp-tracker-actions';
import { syncMarketingAnalytics } from '@/actions/marketing';
import { RefreshCw, Briefcase } from 'lucide-react';
import { JohnMarketingConsultDrawer } from '@/components/admin/geo-seo/JohnMarketingConsultDrawer';
import { SeoArticleGeneratorModal } from '@/components/admin/geo-seo/SeoArticleGeneratorModal';
import { GeoPageTrafficAnalysisCard } from '@/components/admin/geo-seo/GeoPageTrafficAnalysisCard';
import { GoogleAdsPerformanceCard } from '@/components/admin/geo-seo/GoogleAdsPerformanceCard';
import { ArticleType } from '@/lib/generated-articles-storage';
import { BenchmarkCompetitorPanel } from '@/components/admin/geo-seo/BenchmarkCompetitorPanel';
import { KeywordCompetitorIntelligence } from '@/types/competitor-benchmark';

// 2層ナビゲーションコンポーネントおよびフック
import { GeoSeoTwoTierNav } from '@/components/admin/geo-seo/GeoSeoTwoTierNav';
import { useGeoSeoNav } from '@/hooks/useGeoSeoNav';
import { AiCockpitExecutiveBar } from '@/components/admin/geo-seo/AiCockpitExecutiveBar';
import { AiCockpitUnifiedHub } from '@/components/admin/geo-seo/AiCockpitUnifiedHub';

function SpTrackerContent() {
    // 2層ナビゲーションの双方向URL同期フック
    const {
        activeGroup,
        activeTab,
        setActiveGroup,
        setActiveTab,
    } = useGeoSeoNav();

    const [, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isConsultOpen, setIsConsultOpen] = useState(false);
    const [consultInitialQuestion, setConsultInitialQuestion] = useState<string | undefined>(undefined);

    const handleOpenConsult = (question?: string) => {
        setConsultInitialQuestion(question);
        setIsConsultOpen(true);
    };

    // 競合分析パネル選択キーワード
    const [selectedCompetitorKeyword, setSelectedCompetitorKeyword] = useState<string>('水泳 息継ぎ コツ 大人');

    // 記事生成モーダル管理
    const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
    const [modalKeyword, setModalKeyword] = useState('');
    const [modalArticleType, setModalArticleType] = useState<ArticleType>('seo');
    const [modalTargetPath, setModalTargetPath] = useState('');
    const [modalInitialPrompt, setModalInitialPrompt] = useState('');
    const [modalCompetitorIntelligence, setModalCompetitorIntelligence] = useState<KeywordCompetitorIntelligence | undefined>(undefined);

    const handleOpenGenerator = (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string,
        competitorIntelligence?: KeywordCompetitorIntelligence
    ) => {
        setModalKeyword(keyword);
        setModalArticleType(type);
        setModalTargetPath(targetPath || '');
        setModalInitialPrompt(initialPrompt || '');
        setModalCompetitorIntelligence(competitorIntelligence);
        setIsArticleModalOpen(true);
    };

    // 競合キーワード選択時は自動的にdiagnosticsグループのcompetitorsタブへ遷移
    const handleSelectCompetitorKeyword = (keyword: string) => {
        setSelectedCompetitorKeyword(keyword);
        setActiveTab('competitors');
    };

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
            // 主要ページの最新HTMLを強制再取得（キャッシュバイパス）して最新化
            await Promise.allSettled([
                fetchLivePageAuditAction('/zUHb45xV/swimming_tips_up', 'スイミング 進級の 早い子', true),
                fetchLivePageAuditAction('/personal_swim/chiba', '水泳個人レッスン 千葉', true),
                fetchLivePageAuditAction('/personal_swim/meguro', 'スイミング マンツーマン 目黒', true),
                fetchLivePageAuditAction('/', '水泳 個人レッスン 東京', true),
            ]);
            await loadDashboard();
            toast.success('最新のSEO/GEOデータおよびWebページ情報を再取得・同期しました');
        } catch {
            toast.error('同期に失敗しました');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900 p-3.5 sm:p-6 md:p-10 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
            {/* 1. ページヘッダー (SP-Tracker ヘッダー) */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-zinc-200/80 pb-5 gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            SP-TRACKER v1.0.0
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            SEO ✕ GEO INTEGRATED ENGINE
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                        スイムパートナーズ専用 SEO・GEO統合管理
                    </h1>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-indigo-600 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? '同期中...' : '最新データを取得'}
                    </button>
                </div>
            </div>

            {/* 2. 常駐エグゼクティブHUDバー (AI司令塔) */}
            <AiCockpitExecutiveBar
                rankWatchState={data.rankWatchState}
                spreadsheetData={data.spreadsheetAnalytics}
                onOpenConsult={handleOpenConsult}
                onOpenActionKit={() => {
                    setActiveGroup('ai_cockpit');
                    setActiveTab('ai_hub');
                }}
                onSwitchToContentStudio={() => {
                    setActiveGroup('ai_cockpit');
                    setActiveTab('content_studio');
                }}
                onSwitchToRankSniper={() => {
                    setActiveGroup('ai_cockpit');
                    setActiveTab('rank_sniper');
                }}
                onSwitchToAiHub={() => {
                    setActiveGroup('ai_cockpit');
                    setActiveTab('ai_hub');
                }}
            />

            {/* 3. ステータスメーター（4つの主要診断指標: 常駐スリムHUD） */}
            <SpTrackerStatusMeters
                seoTopRate={data.statusMeters.seoTopRate}
                geoSovRate={data.statusMeters.geoSovRate}
                citationGapCount={data.statusMeters.citationGapCount}
                internalHealthScore={data.statusMeters.internalHealthScore}
            />

            {/* 3. 2層ナビゲーションバー（Apple HIGスタイル） */}
            <GeoSeoTwoTierNav
                activeGroup={activeGroup}
                activeTab={activeTab}
                onGroupChange={setActiveGroup}
                onTabChange={setActiveTab}
                badgeCounts={{
                    citationGapCount: data.statusMeters.citationGapCount,
                }}
            />

            {/* 4. タブコンテンツ表示 */}
            <div className="pt-2 min-h-[400px]">
                {/* ===== グループ 1: 流入・広告分析 (traffic) ===== */}
                {activeGroup === 'traffic' && activeTab === 'google_ads' && (
                    <div className="space-y-6">
                        <GoogleAdsPerformanceCard
                            googleAdsData={data.googleAdsData || data.ga4Data?.googleAdsAnalytics}
                            isConfigured={data.config.ga4Configured}
                            onRefresh={loadDashboard}
                        />
                    </div>
                )}

                {activeGroup === 'traffic' && activeTab === 'ga4_gsc' && (
                    <div className="space-y-6">
                        <GeoPageTrafficAnalysisCard
                            geoPageAnalytics={data.ga4Data?.geoPageAnalytics}
                            searchConsoleData={data.searchConsoleData}
                        />
                        <AnalyticsSyncCard
                            isConfigured={data.config.ga4Configured}
                            ga4Connected={data.config.ga4Configured}
                            searchConsoleConnected={data.config.searchConsoleConfigured}
                            lastSynced="接続稼働中"
                            ga4Data={data.ga4Data}
                            searchConsoleData={data.searchConsoleData}
                            onSync={handleRefreshAll}
                        />
                    </div>
                )}

                {activeGroup === 'traffic' && activeTab === 'conversion' && (
                    <SpTrackerConversionCustomerView
                        analyticsData={data.spreadsheetAnalytics || DEFAULT_SPREADSHEET_ANALYTICS}
                        onRefresh={loadDashboard}
                    />
                )}

                {/* ===== グループ 2: 競合・SEO診断 (diagnostics) ===== */}
                {activeGroup === 'diagnostics' && activeTab === 'seo_rank' && (
                    <SpTrackerSeoView
                        keywords={data.keywords}
                        searchConsoleData={data.searchConsoleData}
                        rankWatchState={data.rankWatchState}
                        onRefresh={loadDashboard}
                        onOpenGenerator={handleOpenGenerator}
                        onSelectCompetitorKeyword={handleSelectCompetitorKeyword}
                    />
                )}

                {activeGroup === 'diagnostics' && activeTab === 'competitors' && (
                    <BenchmarkCompetitorPanel
                        initialKeyword={selectedCompetitorKeyword}
                        onOpenGenerator={handleOpenGenerator}
                    />
                )}

                {activeGroup === 'diagnostics' && activeTab === 'geo_ai' && (
                    <SpTrackerGeoView prompts={data.geoPrompts} />
                )}

                {activeGroup === 'diagnostics' && activeTab === 'citation_gap' && (
                    <SpTrackerCitationGapView citationGaps={data.citationGaps} />
                )}

                {/* ===== グループ 3: AI施策コックピット (ai_cockpit) ===== */}
                {activeGroup === 'ai_cockpit' && (
                    <AiCockpitUnifiedHub
                        activeTab={activeTab as 'ai_hub' | 'rank_sniper' | 'content_studio'}
                        onTabChange={(tab) => setActiveTab(tab)}
                        rankWatchState={data.rankWatchState}
                        spreadsheetData={data.spreadsheetAnalytics}
                        actionRecommendations={data.actionRecommendations}
                        onResolveToggle={handleResolveToggle}
                        onOpenGenerator={handleOpenGenerator}
                        onOpenConsult={handleOpenConsult}
                        onRefresh={loadDashboard}
                    />
                )}

                {/* ===== グループ 4: 設定・連携 (settings) ===== */}
                {activeGroup === 'settings' && activeTab === 'settings_master' && (
                    <SpTrackerSettingsView
                        webhookConfigured={data.config.googleChatWebhookConfigured}
                        currentWebhookUrl={data.config.googleChatWebhookUrl}
                        keywords={data.keywords}
                        onRefresh={loadDashboard}
                    />
                )}

                {activeGroup === 'settings' && activeTab === 'api_status' && (
                    <div className="space-y-6">
                        <AnalyticsSyncCard
                            isConfigured={data.config.ga4Configured}
                            ga4Connected={data.config.ga4Configured}
                            searchConsoleConnected={data.config.searchConsoleConfigured}
                            lastSynced="接続稼働中"
                            ga4Data={data.ga4Data}
                            searchConsoleData={data.searchConsoleData}
                            onSync={handleRefreshAll}
                        />
                    </div>
                )}
            </div>

            {/* 5. 記事自動生成モーダル (画面共通) */}
            <SeoArticleGeneratorModal
                isOpen={isArticleModalOpen}
                onClose={() => {
                    setIsArticleModalOpen(false);
                    setModalCompetitorIntelligence(undefined);
                }}
                initialKeyword={modalKeyword}
                initialType={modalArticleType}
                initialTargetPath={modalTargetPath}
                initialPrompt={modalInitialPrompt}
                competitorIntelligence={modalCompetitorIntelligence}
            />

            {/* 6. 画面右下フローティング: ジョンに相談するFABボタン */}
            <button
                onClick={() => handleOpenConsult()}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 px-3.5 sm:px-4 py-2.5 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-black text-xs shadow-[0_10px_30px_rgba(245,158,11,0.4)] flex items-center gap-2 sm:gap-2.5 hover:scale-105 active:scale-95 transition-all border border-amber-300"
            >
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-950 animate-ping" />
                <Briefcase className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-zinc-950" />
                <span>CMOジョンに相談</span>
            </button>

            {/* 7. ジョンとのチャット相談ドロワー */}
            <JohnMarketingConsultDrawer
                isOpen={isConsultOpen}
                onClose={() => setIsConsultOpen(false)}
                initialQuestion={consultInitialQuestion}
            />
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
