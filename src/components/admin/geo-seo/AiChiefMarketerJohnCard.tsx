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
    FileText,
    ShieldAlert,
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-7 md:p-9 border border-amber-500/30 shadow-[0_15px_40px_rgba(245,158,11,0.08)] transition-all">
                {/* アンビエント発光 */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 space-y-6">
                    {/* ヘッダー: ジョンの身元・ステータス & アクションボタン */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                                    <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                                        <Briefcase className="w-6 h-6 text-amber-400" />
                                    </div>
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg md:text-xl font-black text-white tracking-tight">
                                        AIチーフマーケター ジョン (John)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                        専属CMO 常駐中
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-400">
                                    事業のPL（損益）とLTVを最大化する戦略的Webマーケター ✕ データドリブン司令塔
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => {
                                    setSelectedQuestion(undefined);
                                    setIsConsultOpen(true);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center gap-2 flex-shrink-0"
                            >
                                <MessageSquare className="w-4 h-4 text-zinc-950" />
                                ジョンに相談する（チャット）
                            </button>

                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
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
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
                                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <span>【本日のエグゼクティブ・ブリーフィング】 {briefing.title}</span>
                                </div>
                                <span className="text-[11px] font-mono text-zinc-400">
                                    更新: {briefing.updatedAt}
                                </span>
                            </div>

                            {/* 4大フォーマット表示グリッド */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {/* ① 結論・エグゼクティブサマリー */}
                                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs font-mono">
                                        <Target className="w-3.5 h-3.5 text-amber-400" />
                                        1. 結論・エグゼクティブサマリー (PL/LTV視点)
                                    </div>
                                    <p className="text-zinc-300 leading-relaxed font-sans">
                                        {briefing.executiveSummary}
                                    </p>
                                </div>

                                {/* ② 分析と根拠 */}
                                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs font-mono">
                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                                        2. 分析と根拠 (実測データ・ボトルネック)
                                    </div>
                                    <p className="text-zinc-300 leading-relaxed font-sans">
                                        {briefing.analysisAndEvidence}
                                    </p>
                                </div>

                                {/* ③ 具体的な実行プラン */}
                                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs font-mono">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        3. 具体的な実行プラン (現場実行レベル)
                                    </div>
                                    <ul className="space-y-1.5 text-zinc-300">
                                        {briefing.executionPlan.map((step, idx) => (
                                            <li key={idx} className="leading-relaxed flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-bold">•</span>
                                                <span>{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* ④ 次の検証ポイント・KPI */}
                                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-sky-300 text-xs font-mono">
                                        <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                                        4. 次の検証ポイント・KPI (成否判断基準)
                                    </div>
                                    <p className="text-zinc-300 leading-relaxed font-sans">
                                        {briefing.nextKpi}
                                    </p>
                                </div>
                            </div>

                            {/* ジョンからの直言・インサイト */}
                            <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/80 flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 flex-shrink-0 mt-0.5">
                                    <Lightbulb className="w-4 h-4" />
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="font-bold text-white flex items-center gap-2">
                                        <span>CMO ジョンの直言アドバイス</span>
                                        <span className="text-[10px] text-zinc-400 font-normal">（イエスマンにならず事業主様へ率直に進言します）</span>
                                    </div>
                                    <p className="text-zinc-300 italic leading-relaxed">
                                        {briefing.cmoInsight}
                                    </p>
                                </div>
                            </div>

                            {/* ワンクリック相談チップ群 */}
                            <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
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
                                        className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/80 hover:border-amber-500/50 transition-all shadow-sm"
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
