'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    ArrowRight,
    PenTool,
    BookOpen,
    Bot,
    Search,
    TrendingUp,
    ShieldAlert,
    Target,
    Zap,
    Users,
    CheckCircle2,
    DollarSign,
    Flame,
    BarChart2,
    Lightbulb,
} from 'lucide-react';
import {
    ArticleSuggestion,
    getWeeklyArticleSuggestionsAction,
} from '@/actions/seo-content-actions';
import { ArticleType } from '@/lib/generated-articles-storage';

interface WeeklyArticleSuggestionsWidgetProps {
    onOpenGenerator: (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string
    ) => void;
}

export function WeeklyArticleSuggestionsWidget({
    onOpenGenerator,
}: WeeklyArticleSuggestionsWidgetProps) {
    const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await getWeeklyArticleSuggestionsAction();
                setSuggestions(res);
            } catch (e) {
                console.error('Failed to load article suggestions:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    const filteredSuggestions = selectedCategory === 'all'
        ? suggestions
        : suggestions.filter((s) => s.category === selectedCategory);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 animate-pulse space-y-4">
                <div className="h-6 bg-zinc-200 rounded w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-44 bg-zinc-100 rounded-xl" />
                    <div className="h-44 bg-zinc-100 rounded-xl" />
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50/40 via-white to-amber-50/30 rounded-2xl border border-indigo-200/80 p-5 sm:p-7 shadow-sm space-y-5">
            {/* ヘッダーエリア */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/80 pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs">
                            <PenTool className="w-4 h-4" />
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                            新規SEO獲得 ✕ CVR最大化 コンテンツ企画スタジオ
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            未開拓KW ✕ 他社分析
                        </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                        既存記事の重複ではなく、<span className="font-bold text-slate-800">これから検索流入と体験予約（CVR）を獲得するための完全新規コンテンツ企画</span>です。競合上位サイトの弱点・ギャップを突いて執筆します。
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-mono text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        CMOジョン企画・競合リサーチ済
                    </span>
                </div>
            </div>

            {/* カテゴリ切り替えフィルター */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                        selectedCategory === 'all'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                    すべて ({suggestions.length})
                </button>
                <button
                    onClick={() => setSelectedCategory('adult')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                        selectedCategory === 'adult'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                    大人・泳ぎ直し
                </button>
                <button
                    onClick={() => setSelectedCategory('junior')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                        selectedCategory === 'junior'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                    ジュニア進級対策
                </button>
                <button
                    onClick={() => setSelectedCategory('phobia')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                        selectedCategory === 'phobia'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                    水恐怖症克服 (ブルーオーシャン)
                </button>
                <button
                    onClick={() => setSelectedCategory('pricing')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                        selectedCategory === 'pricing'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                    費用比較 (高購買意向)
                </button>
                <button
                    onClick={() => setSelectedCategory('form')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${
                        selectedCategory === 'form'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                    25m完泳・フォーム改善
                </button>
            </div>

            {/* 戦略記事カードリスト */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSuggestions.map((sug) => {
                    const isSeo = sug.recommendedType === 'seo';
                    const isExpanded = expandedCardId === sug.id;

                    return (
                        <div
                            key={sug.id}
                            className="bg-white rounded-2xl border border-zinc-200/90 p-5 space-y-4 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                            <div className="space-y-3">
                                {/* バッジとメタ指標 */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                                isSeo
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                            }`}
                                        >
                                            {isSeo ? <BookOpen className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                            {sug.recommendedTypeLabel}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            未作成・新規開拓
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        CVR期待度 ★{sug.keywordIntel.conversionPotential.toFixed(1)}
                                    </span>
                                </div>

                                {/* タイトル & キーワード */}
                                <div>
                                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors leading-snug">
                                        {sug.actionTitle}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded">
                                            狙うKW: 「{sug.keyword}」
                                        </span>
                                        <span className="text-zinc-400 font-mono text-[11px]">
                                            推奨URL: {sug.suggestedSlug}
                                        </span>
                                    </div>
                                </div>

                                {/* キーワード分析サマリーカード */}
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-center">
                                    <div>
                                        <span className="text-[10px] text-zinc-400 block font-bold">月間検索数</span>
                                        <span className="text-xs font-black font-mono text-slate-900">
                                            {sug.keywordIntel.monthlySearchVolume.toLocaleString()} 回
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-400 block font-bold">競合難易度</span>
                                        <span className={`text-xs font-bold ${
                                            sug.keywordIntel.seoDifficulty === 'Low' ? 'text-emerald-600' : 'text-amber-600'
                                        }`}>
                                            {sug.keywordIntel.seoDifficulty}（狙い目）
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-400 block font-bold">ターゲット</span>
                                        <span className="text-xs font-bold text-slate-700 truncate block">
                                            {sug.categoryLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* 検索意図 */}
                                <div className="text-xs text-zinc-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                                    <span className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                                        <Target className="w-3.5 h-3.5 text-indigo-600" />
                                        検索意図（ペルソナの深い悩み）:
                                    </span>
                                    <p className="line-clamp-2">
                                        {sug.keywordIntel.searchIntent}
                                    </p>
                                </div>

                                {/* 他社競合分析セクション（アコーディオン/詳細） */}
                                <div className="space-y-2 pt-1">
                                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-2 text-xs">
                                        <div className="font-bold text-amber-950 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                                他社分析・競合上位記事の弱点（盲点）:
                                            </span>
                                            <span className="text-[10px] font-mono text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                                                他社: {sug.competitorAnalysis.topCompetitorSites[0]}等
                                            </span>
                                        </div>
                                        <p className="text-amber-900 leading-relaxed text-[11px]">
                                            {sug.competitorAnalysis.competitorWeakness}
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/70 space-y-1.5 text-xs">
                                        <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                                            <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                                            当教室の必勝差別化アプローチ（勝てる独自性）:
                                        </div>
                                        <p className="text-indigo-900 leading-relaxed text-[11px]">
                                            {sug.competitorAnalysis.differentiationStrategy}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* フッターアクションバー */}
                            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-zinc-500 font-mono">
                                    {sug.estimatedImpact.split('、')[0]}
                                </span>

                                <button
                                    onClick={() =>
                                        onOpenGenerator(
                                            sug.keyword,
                                            sug.recommendedType,
                                            sug.suggestedSlug,
                                            `【他社分析反映リクエスト】\n他社弱点: ${sug.competitorAnalysis.competitorWeakness}\n差別化方針: ${sug.competitorAnalysis.differentiationStrategy}\n検索意図: ${sug.keywordIntel.searchIntent}`
                                        )
                                    }
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm group-hover:scale-[1.02] cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                    この分析で新規記事を執筆
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
