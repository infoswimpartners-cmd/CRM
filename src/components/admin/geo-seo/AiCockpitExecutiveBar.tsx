'use client';

import React, { useState } from 'react';
import {
    Briefcase,
    CheckCircle2,
    MessageSquare,
    Zap,
    PenTool,
    ChevronDown,
    ChevronUp,
    Target,
    TrendingUp,
    DollarSign,
    Lightbulb,
    ExternalLink,
} from 'lucide-react';
import { SeoRankWatchState } from '@/lib/seo-rank-watch';
import { SpreadsheetAnalyticsData } from '@/lib/spreadsheet-types';
import { generateJohnDailyBriefing, JohnBriefing } from '@/lib/ai-marketer-john';

export interface AiCockpitExecutiveBarProps {
    rankWatchState?: SeoRankWatchState;
    spreadsheetData?: SpreadsheetAnalyticsData;
    onOpenConsult: (question?: string) => void;
    onOpenActionKit?: (keyword: string, targetPath: string, currentRank: number) => void;
    onSwitchToContentStudio?: () => void;
    onSwitchToRankSniper?: () => void;
    onSwitchToAiHub?: () => void;
}

// 日本時間（JST）の日付キー（YYYY-MM-DD）
const getTodayJstKey = () => {
    const now = new Date();
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jstDate.toISOString().split('T')[0];
};

// LocalStorage から本日実行済みキーワードのセットを取得
const getExecutedKeywordsFromStorage = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const key = `sp_tracker_executed_${getTodayJstKey()}`;
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : [];
    } catch {
        return [];
    }
};

const emptySubscribe = () => () => {};

/**
 * AIコックピット 常駐エグゼクティブHUDバー
 * 画面最上部に常駐し、ジョンの本日注力方針、スプリント進捗ミニインジケーター、
 * ワンクリック相談・改善実行トリガーをコンパクトに集約提供する。
 */
export function AiCockpitExecutiveBar({
    rankWatchState,
    spreadsheetData,
    onOpenConsult,
    onOpenActionKit,
    onSwitchToContentStudio,
    onSwitchToRankSniper,
    onSwitchToAiHub,
}: AiCockpitExecutiveBarProps) {
    const [isBriefingExpanded, setIsBriefingExpanded] = useState(false);
    const isClient = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

    const briefing: JohnBriefing = generateJohnDailyBriefing(rankWatchState, spreadsheetData);

    // 最優先キーワード・パス・順位の算出
    const topAction = rankWatchState?.topActions?.[0];
    const topContender = rankWatchState?.topContender;
    const primaryKeyword = topAction?.keyword || topContender?.keyword || 'スイミング 進級の 早い子';
    const primaryTargetPath = topAction?.targetPath || topContender?.target_path || '/zUHb45xV/swimming_tips_up';
    const primaryRank = topAction?.currentRank || topContender?.current_rank || 2;

    // スプリント進捗計算（LocalStorage + state）
    const totalSprintCount = rankWatchState?.topActions?.length || 3;
    const executedKw = isClient ? getExecutedKeywordsFromStorage() : [];
    const actions = rankWatchState?.topActions || [];
    const executedCount = actions.filter(
        (a) => a.status === 'executed_today' || a.status === 'observing' || executedKw.includes(a.keyword)
    ).length;

    const sprintPercent = Math.min(100, Math.round((executedCount / (totalSprintCount || 1)) * 100));

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 border border-amber-200/90 shadow-[0_4px_24px_rgba(245,158,11,0.07)] transition-all">
            {/* 上品な発光アンビエント */}
            <div className="absolute top-0 right-1/4 w-96 h-28 bg-gradient-to-r from-amber-400/10 via-indigo-500/5 to-transparent rounded-full blur-[60px] pointer-events-none" />

            <div className="relative z-10 p-4 sm:p-5 space-y-3.5">
                {/* 1. メインHUDバー: 3分割レスポンシブ配置 */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* 左側: ジョンのアバター ＋ 注力方針 ＋ サマリー */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                            <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 p-0.5 shadow-sm">
                                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                                    AIチーフマーケター ジョン (John)
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                    専属CMO 常駐中
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 border border-indigo-200 truncate max-w-full sm:max-w-md">
                                    {briefing.targetFocus}
                                </span>
                            </div>

                            <p className="text-xs text-zinc-600 truncate max-w-2xl font-sans">
                                {briefing.executiveSummary}
                            </p>
                        </div>
                    </div>

                    {/* 中央: スプリント進捗ミニインジケーター */}
                    <div
                        onClick={onSwitchToRankSniper}
                        className={`flex items-center gap-3 bg-zinc-50/90 border border-zinc-200/80 px-3.5 py-2 rounded-xl flex-shrink-0 transition-all ${
                            onSwitchToRankSniper ? 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40' : ''
                        }`}
                        title={onSwitchToRankSniper ? '1位狙撃スプリント画面を開く' : undefined}
                    >
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>スプリント:</span>
                            <span className="text-emerald-700 font-extrabold">{executedCount}</span>/{totalSprintCount}完了
                        </div>
                        <div className="w-24 sm:w-28 bg-zinc-200 h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${sprintPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-600">{sprintPercent}%</span>
                    </div>

                    {/* 右側: ワンクリックトリガーボタン群 */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0 justify-end">
                        <button
                            onClick={() => onOpenConsult()}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            title="ジョンとのチャット相談を開く"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-950" />
                            <span>ジョンに相談</span>
                        </button>

                        <button
                            onClick={() => {
                                if (onOpenActionKit) {
                                    onOpenActionKit(primaryKeyword, primaryTargetPath, primaryRank);
                                } else if (onSwitchToAiHub) {
                                    onSwitchToAiHub();
                                }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            title="最優先キーワードのSTUDIO改善キットを開く"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                            <span>本日の改善を実行</span>
                        </button>

                        {onSwitchToContentStudio && (
                            <button
                                onClick={onSwitchToContentStudio}
                                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                                title="コンテンツ内製化スタジオへジャンプ"
                            >
                                <PenTool className="w-3.5 h-3.5 text-purple-700" />
                                <span className="hidden sm:inline">記事作成</span>スタジオ
                            </button>
                        )}

                        <button
                            onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
                            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 transition-colors"
                            title={isBriefingExpanded ? '詳細方針を閉じる' : '詳細方針を展開する'}
                        >
                            {isBriefingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* 2. アコーディオン展開時: ジョンの4大エグゼクティブ・ブリーフィング */}
                {isBriefingExpanded && (
                    <div className="pt-3 border-t border-zinc-100 space-y-4 animate-in fade-in duration-200">
                        {/* 4大フォーマットグリッド */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            {/* ① 結論 */}
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px] font-mono">
                                    <Target className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                    1. 結論・方針 (PL/LTV)
                                </div>
                                <p className="text-zinc-700 leading-relaxed font-sans text-[11px]">
                                    {briefing.executiveSummary}
                                </p>
                            </div>

                            {/* ② 根拠 */}
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-indigo-800 text-[11px] font-mono">
                                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                    2. 分析と根拠
                                </div>
                                <p className="text-zinc-700 leading-relaxed font-sans text-[11px]">
                                    {briefing.analysisAndEvidence}
                                </p>
                            </div>

                            {/* ③ 実行プラン */}
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px] font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    3. 実行プラン
                                </div>
                                <ul className="space-y-1 text-zinc-700 text-[11px]">
                                    {briefing.executionPlan.map((step, idx) => (
                                        <li key={idx} className="leading-snug flex items-start gap-1">
                                            <span className="text-emerald-600 font-bold">•</span>
                                            <span className="line-clamp-2">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* ④ KPI */}
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-sky-800 text-[11px] font-mono">
                                    <DollarSign className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                                    4. 次の検証KPI
                                </div>
                                <p className="text-zinc-700 leading-relaxed font-sans text-[11px]">
                                    {briefing.nextKpi}
                                </p>
                            </div>
                        </div>

                        {/* CMO 直言 */}
                        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-start justify-between gap-3 text-xs">
                            <div className="flex items-start gap-2.5">
                                <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="font-bold text-amber-950 text-xs">CMO ジョンの直言:</span>
                                    <p className="text-zinc-700 text-[11px] leading-relaxed">
                                        {briefing.cmoInsight}
                                    </p>
                                </div>
                            </div>
                            {onSwitchToAiHub && (
                                <button
                                    onClick={onSwitchToAiHub}
                                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1 flex-shrink-0"
                                >
                                    AI司令ハブで詳細を見る
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
