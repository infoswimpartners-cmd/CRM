'use client';

import React from 'react';
import { Sparkles, Crosshair, PenTool } from 'lucide-react';
import { SeoRankWatchState } from '@/lib/seo-rank-watch';
import { SpreadsheetAnalyticsData } from '@/lib/spreadsheet-types';
import { ActionRecommendationItem } from '@/lib/sp-tracker-seed';
import { ArticleType } from '@/lib/generated-articles-storage';
import { KeywordCompetitorIntelligence } from '@/types/competitor-benchmark';

import { AiChiefMarketerJohnCard } from './AiChiefMarketerJohnCard';
import { UnifiedPriorityActionHub } from './UnifiedPriorityActionHub';
import { SpTrackerRankWatchCard } from './SpTrackerRankWatchCard';
import { AiContentStudioHub } from './AiContentStudioHub';

export interface AiCockpitUnifiedHubProps {
    activeTab?: 'ai_hub' | 'rank_sniper' | 'content_studio';
    onTabChange?: (tab: 'ai_hub' | 'rank_sniper' | 'content_studio') => void;
    rankWatchState?: SeoRankWatchState;
    spreadsheetData?: SpreadsheetAnalyticsData;
    actionRecommendations?: ActionRecommendationItem[];
    onResolveToggle?: (id: number, currentStatus: boolean) => void;
    onOpenGenerator?: (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string,
        competitorIntelligence?: KeywordCompetitorIntelligence
    ) => void;
    onOpenConsult: (question?: string) => void;
    onRefresh: () => Promise<void>;
}

/**
 * AI施策コックピット統合ハブ (AiCockpitUnifiedHub)
 * 「🤖 AI施策コックピット」グループの統合本体コンポーネント。
 * サブタブ:
 * 1. 💡 CMOジョン＆最優先施策 (`ai_hub`)
 * 2. 🎯 SEO 1位狙撃スプリント (`rank_sniper`)
 * 3. 📝 コンテンツ内製化スタジオ (`content_studio`)
 */
export function AiCockpitUnifiedHub({
    activeTab = 'ai_hub',
    onTabChange,
    rankWatchState,
    spreadsheetData,
    actionRecommendations = [],
    onResolveToggle,
    onOpenGenerator,
    onOpenConsult,
    onRefresh,
}: AiCockpitUnifiedHubProps) {
    return (
        <div className="space-y-6">
            {/* サブナビゲーションピル */}
            {onTabChange && (
                <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold w-fit">
                    <button
                        onClick={() => onTabChange('ai_hub')}
                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                            activeTab === 'ai_hub'
                                ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>CMOジョン＆最優先施策</span>
                    </button>
                    <button
                        onClick={() => onTabChange('rank_sniper')}
                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                            activeTab === 'rank_sniper'
                                ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                    >
                        <Crosshair className="w-3.5 h-3.5 text-indigo-600" />
                        <span>SEO 1位狙撃スプリント</span>
                    </button>
                    <button
                        onClick={() => onTabChange('content_studio')}
                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                            activeTab === 'content_studio'
                                ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                    >
                        <PenTool className="w-3.5 h-3.5 text-purple-600" />
                        <span>コンテンツ内製化スタジオ</span>
                    </button>
                </div>
            )}
            {/* サブタブ 1: 💡 CMOジョン＆最優先施策 */}
            {activeTab === 'ai_hub' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <AiChiefMarketerJohnCard
                        rankWatchState={rankWatchState}
                        spreadsheetData={spreadsheetData}
                        onOpenConsult={onOpenConsult}
                    />

                    <UnifiedPriorityActionHub
                        rankWatchState={rankWatchState}
                        actionRecommendations={actionRecommendations}
                        onResolveToggle={onResolveToggle}
                        onOpenGenerator={onOpenGenerator}
                        onRefresh={onRefresh}
                    />
                </div>
            )}

            {/* サブタブ 2: 🎯 SEO 1位狙撃スプリント */}
            {activeTab === 'rank_sniper' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <SpTrackerRankWatchCard
                        state={rankWatchState}
                        onRefresh={onRefresh}
                        onOpenGenerator={onOpenGenerator}
                    />
                </div>
            )}

            {/* サブタブ 3: 📝 コンテンツ内製化スタジオ */}
            {activeTab === 'content_studio' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <AiContentStudioHub
                        onOpenGenerator={onOpenGenerator}
                    />
                </div>
            )}
        </div>
    );
}
