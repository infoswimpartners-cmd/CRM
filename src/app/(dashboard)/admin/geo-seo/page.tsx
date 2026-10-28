'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import { SpTrackerStatusMeters } from '@/components/admin/geo-seo/SpTrackerStatusMeters';
import { SpTrackerAreaSeoAuditCard } from '@/components/admin/geo-seo/SpTrackerAreaSeoAuditCard';
import { StudioDailySeoArticleCard } from '@/components/admin/geo-seo/StudioDailySeoArticleCard';
import {
    getSpTrackerDashboard,
    fetchLivePageAuditAction,
    SpTrackerDashboardData,
} from '@/actions/sp-tracker-actions';
import { syncMarketingAnalytics } from '@/actions/marketing';
import { RefreshCw } from 'lucide-react';

function SpTrackerContent() {
    const [, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
            {/* 1. ページヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-zinc-200/80 pb-5 gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            SP-TRACKER v1.0.0
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            商圏エリア別SEO診断・実測検証
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                        商圏エリア別SEO診断・実測検証ダッシュボード
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 pt-0.5">
                        主要商圏エリア（1都3県）のSEO対策状況と登録URLの最新HTMLをリアルタイムに診断・検証します。
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshing}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-indigo-600 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? '同期中...' : '最新データを同期'}
                    </button>
                </div>
            </div>

            {/* 2. ステータスメーター（4つの主要診断指標） */}
            <SpTrackerStatusMeters
                seoTopRate={data.statusMeters.seoTopRate}
                geoSovRate={data.statusMeters.geoSovRate}
                citationGapCount={data.statusMeters.citationGapCount}
                internalHealthScore={data.statusMeters.internalHealthScore}
            />

            {/* 3. STUDIO CMS 向け 毎日自動キーワード分析＆記事生成カード */}
            <StudioDailySeoArticleCard />

            {/* 4. メインビュー: 商圏エリア別SEO診断・実測検証カード */}
            <div className="pt-2">
                <SpTrackerAreaSeoAuditCard />
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
