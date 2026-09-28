'use client';

import React, { useState } from 'react';
import {
    Briefcase,
    Sparkles,
    CheckCircle2,
    TrendingUp,
    Target,
    ArrowRight,
    MessageSquare,
    DollarSign,
    Lightbulb,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { SeoRankWatchState } from '@/lib/seo-rank-watch';
import { SpreadsheetAnalyticsData } from '@/lib/spreadsheet-types';
import { generateJohnDailyBriefing, JohnBriefing } from '@/lib/ai-marketer-john';
import { JohnMarketingConsultDrawer } from './JohnMarketingConsultDrawer';

interface AiChiefMarketerJohnCardProps {
    rankWatchState?: SeoRankWatchState;
    spreadsheetData?: SpreadsheetAnalyticsData;
    onOpenConsult?: () => void;
}

export function AiChiefMarketerJohnCard({
    rankWatchState,
    spreadsheetData,
}: AiChiefMarketerJohnCardProps) {
    const [isConsultOpen, setIsConsultOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<string | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(true);

    const briefing: JohnBriefing = generateJohnDailyBriefing(rankWatchState, spreadsheetData);

    const handleQuickConsult = (question: string) => {
        setSelectedQuestion(question);
        setIsConsultOpen(true);
    };

    return (
        <>
            <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 p-4 sm:p-7 md:p-8 border border-amber-200/90 shadow-[0_8px_30px_rgba(245,158,11,0.06)] transition-all">
                {/* アンビエント発光（明るいアンバー & ライトブルー） */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-400/10 rounded-full blur-[90px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none" />

                <div className="relative z-10 space-y-6">
                    {/* ヘッダー: ジョンの身元・ステータス & アクションボタン */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
                        <div className="flex items-center gap-3 sm:gap-3.5">
                            <div className="relative flex-shrink-0">
                                <div className="w-11 sm:w-13 h-11 sm:h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 p-0.5 shadow-sm">
                                    <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                                        <Briefcase className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600" />
                                    </div>
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight">
                                        AIチーフマーケター ジョン (John)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                        専属CMO 常駐中
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500">
                                    事業のPL（損益）とLTVを最大化する戦略的Webマーケター ✕ データドリブン司令塔
                                </p>
                            </div>
                        </div>

                        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5">
                            <button
                                onClick={() => {
                                    setSelectedQuestion(undefined);
                                    setIsConsultOpen(true);
                                }}
                                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-4 h-4 text-zinc-950" />
                                ジョンに相談する（チャット）
                            </button>

                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 transition-colors flex-shrink-0"
                                title={isExpanded ? '折りたたむ' : '展開する'}
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ジョンの本日のエグゼクティブ・ブリーフィング */}
                    {isExpanded && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            {/* ブリーフィングタイトル */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-900">
                                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <span>【本日のエグゼクティブ・ブリーフィング】 {briefing.title}</span>
                                </div>
                                <span className="text-[11px] font-mono text-zinc-500">
                                    更新: {briefing.updatedAt}
                                </span>
                            </div>

                            {/* 4大フォーマット表示グリッド */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
                                {/* ① 結論・エグゼクティブサマリー */}
                                <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/90 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-amber-800 text-xs font-mono">
                                        <Target className="w-3.5 h-3.5 text-amber-600" />
                                        1. 結論・エグゼクティブサマリー (PL/LTV視点)
                                    </div>
                                    <p className="text-zinc-700 leading-relaxed font-sans">
                                        {briefing.executiveSummary}
                                    </p>
                                </div>

                                {/* ② 分析と根拠 */}
                                <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/90 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-indigo-800 text-xs font-mono">
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                                        2. 分析と根拠 (実測データ・ボトルネック)
                                    </div>
                                    <p className="text-zinc-700 leading-relaxed font-sans">
                                        {briefing.analysisAndEvidence}
                                    </p>
                                </div>

                                {/* ③ 具体的な実行プラン */}
                                <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/90 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-xs font-mono">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        3. 具体的な実行プラン (現場実行レベル)
                                    </div>
                                    <ul className="space-y-1.5 text-zinc-700">
                                        {briefing.executionPlan.map((step, idx) => (
                                            <li key={idx} className="leading-relaxed flex items-start gap-1.5">
                                                <span className="text-emerald-600 font-bold">•</span>
                                                <span>{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* ④ 次の検証ポイント・KPI */}
                                <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/90 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-sky-800 text-xs font-mono">
                                        <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                                        4. 次の検証ポイント・KPI (成否判断基準)
                                    </div>
                                    <p className="text-zinc-700 leading-relaxed font-sans">
                                        {briefing.nextKpi}
                                    </p>
                                </div>
                            </div>

                            {/* ジョンからの直言・インサイト */}
                            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/70 flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 border border-amber-300 flex-shrink-0 mt-0.5">
                                    <Lightbulb className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="font-bold text-slate-900 flex items-center gap-2">
                                        <span>CMO ジョンの直言アドバイス</span>
                                        <span className="text-[10px] text-zinc-500 font-normal">（事業成長のために率直に進言します）</span>
                                    </div>
                                    <p className="text-zinc-700 leading-relaxed">
                                        {briefing.cmoInsight}
                                    </p>
                                </div>
                            </div>

                            {/* ワンクリック相談チップ群 */}
                            <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 w-full sm:w-auto">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    ジョンへの即時相談テーマ:
                                </span>
                                {[
                                    { label: '🎯 体験レッスンの成約率・LTV最大化', q: '体験レッスンから即日入会（成約率）を高めてLTVを最大化する具体的な改善プランを教えてください。' },
                                    { label: '💰 広告費・CPAの削減方針', q: '現在の集客で無駄な広告費を削り、CPAを適正化するためのターゲット・除外KW設計を提案してください。' },
                                    { label: '📈 月額サブスクと都度払いのプライシング', q: '都度払いと月額サブスクの価格バランス、および粗利率・LTVを高めるプライシング案を提示してください。' },
                                    { label: '🔍 本日のSEO 1位獲得ボトルネック', q: '現在2位の「進級の早い子」で1位を奪うために、ファネル全体で今週注力すべき最優先事項は何ですか？' },
                                ].map((chip, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickConsult(chip.q)}
                                        className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] sm:text-xs font-medium border border-zinc-200 hover:border-amber-300 transition-all shadow-xs"
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* チャット相談ドロワー */}
            <JohnMarketingConsultDrawer
                isOpen={isConsultOpen}
                onClose={() => setIsConsultOpen(false)}
                initialQuestion={selectedQuestion}
            />
        </>
    );
}
