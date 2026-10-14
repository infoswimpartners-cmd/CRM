'use client';

import React from 'react';
import type {
    GeoSeoNavGroup,
    GeoSeoNavTab,
} from '@/types/geo-seo-navigation';
import { GEO_SEO_NAV_GROUPS } from '@/lib/geo-seo-navigation';

export interface GeoSeoTwoTierNavProps {
    activeGroup: GeoSeoNavGroup;
    activeTab: GeoSeoNavTab;
    onGroupChange: (group: GeoSeoNavGroup) => void;
    onTabChange: (tab: GeoSeoNavTab) => void;
    badgeCounts?: {
        citationGapCount?: number;
    };
    className?: string;
}

/**
 * Apple HIGスタイルの2層ナビゲーションコンポーネント
 * 
 * - Tier 1: 4大目的別グループ（モバイル: 2x2グリッド、デスクトップ: 4列横並び）
 * - Tier 2: サブタブ（Segmented Control ピル切り替え、レスポンシブ短縮ラベル対応）
 */
export const GeoSeoTwoTierNav: React.FC<GeoSeoTwoTierNavProps> = ({
    activeGroup,
    activeTab,
    onGroupChange,
    onTabChange,
    badgeCounts,
    className = '',
}) => {
    // 現在選択されているグループ設定
    const currentGroupConfig =
        GEO_SEO_NAV_GROUPS.find((g) => g.id === activeGroup) || GEO_SEO_NAV_GROUPS[0];

    return (
        <div className={`space-y-3 w-full ${className}`}>
            {/* ======================================================== */}
            {/* Tier 1: 4大目的別グループ（モバイル2×2、PC横並び4分割）      */}
            {/* ======================================================== */}
            <div
                role="tablist"
                aria-label="主要機能グループ"
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full"
            >
                {GEO_SEO_NAV_GROUPS.map((group) => {
                    const isSelected = activeGroup === group.id;
                    const IconComponent = group.icon;

                    return (
                        <button
                            key={group.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            aria-controls={`panel-${group.id}`}
                            id={`group-tab-${group.id}`}
                            onClick={() => onGroupChange(group.id)}
                            className={`group relative text-left p-3 sm:p-3.5 md:p-4 rounded-xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 flex flex-col justify-between overflow-hidden cursor-pointer ${
                                isSelected
                                    ? 'bg-white border-indigo-600/30 shadow-[0_4px_16px_rgba(79,70,229,0.08),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-indigo-500/20'
                                    : 'bg-white/70 hover:bg-white border-zinc-200/80 hover:border-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm'
                            }`}
                        >
                            {/* アクティブ時の天面アクセントライン */}
                            {isSelected && (
                                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-indigo-600 rounded-t-xl" />
                            )}

                            <div className="flex items-center justify-between gap-1.5 w-full mb-1 sm:mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                            isSelected
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/60 group-hover:text-zinc-700'
                                        }`}
                                    >
                                        <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[12px] sm:text-sm font-bold tracking-tight text-slate-900 truncate">
                                                {group.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* サブタブ数バッジ */}
                                <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium ${
                                        isSelected
                                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                                            : 'bg-zinc-100 text-zinc-400 group-hover:text-zinc-600'
                                    }`}
                                >
                                    {group.tabs.length}
                                </span>
                            </div>

                            {/* 説明文: モバイルでは1行省略、デスクトップではスッキリ表示 */}
                            <p
                                className={`text-[11px] leading-relaxed line-clamp-1 sm:line-clamp-none ${
                                    isSelected
                                        ? 'text-zinc-500'
                                        : 'text-zinc-400 group-hover:text-zinc-500'
                                }`}
                            >
                                {group.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* ======================================================== */}
            {/* Tier 2: サブタブ（Apple HIG準拠 ピル・セグメントコントロール） */}
            {/* ======================================================== */}
            <div className="w-full">
                <div className="relative w-full">
                    <div
                        role="tablist"
                        aria-label={`${currentGroupConfig.label}のサブ機能`}
                        className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full"
                    >
                        {currentGroupConfig.tabs.map((tab) => {
                            const isTabSelected = activeTab === tab.id;
                            const TabIcon = tab.icon;

                            // 動的バッジ表示（例: 引用元ギャップ数）
                            const dynamicBadge =
                                tab.id === 'citation_gap' && badgeCounts?.citationGapCount !== undefined
                                    ? `${badgeCounts.citationGapCount}件`
                                    : tab.badge;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isTabSelected}
                                    aria-controls={`subpanel-${tab.id}`}
                                    id={`subtab-${tab.id}`}
                                    onClick={() => onTabChange(tab.id)}
                                    className={`group px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 whitespace-nowrap flex items-center gap-2 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer ${
                                        isTabSelected
                                            ? 'bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] font-bold'
                                            : 'text-zinc-600 hover:text-slate-900 hover:bg-zinc-100/60'
                                    }`}
                                >
                                    <TabIcon
                                        className={`w-3.5 h-3.5 transition-colors ${
                                            isTabSelected
                                                ? 'text-indigo-600'
                                                : 'text-zinc-400 group-hover:text-zinc-600'
                                        }`}
                                    />

                                    {/* レスポンシブラベル: モバイルではshortLabel、sm以上でフルラベル */}
                                    <span className="sm:hidden">{tab.shortLabel}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>

                                    {/* 特殊バッジ（LIVE、3社監視、GAP等） */}
                                    {dynamicBadge && (
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider flex items-center gap-1 ${
                                                tab.badgeType === 'pulse'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                    : tab.badgeType === 'indigo'
                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                                    : tab.badgeType === 'success'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                            }`}
                                        >
                                            {tab.badgeType === 'pulse' && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            )}
                                            {dynamicBadge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
