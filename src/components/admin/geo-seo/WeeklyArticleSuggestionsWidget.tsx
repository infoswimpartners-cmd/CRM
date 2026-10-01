'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, PenTool, BookOpen, Bot, CheckCircle2, TrendingUp } from 'lucide-react';
import { ArticleSuggestion, getWeeklyArticleSuggestionsAction } from '@/actions/seo-content-actions';
import { ArticleType } from '@/lib/generated-articles-storage';

interface WeeklyArticleSuggestionsWidgetProps {
    onOpenGenerator: (keyword: string, type: ArticleType, targetPath?: string) => void;
}

export function WeeklyArticleSuggestionsWidget({ onOpenGenerator }: WeeklyArticleSuggestionsWidgetProps) {
    const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 animate-pulse space-y-4">
                <div className="h-5 bg-zinc-200 rounded w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-32 bg-zinc-100 rounded-xl" />
                    <div className="h-32 bg-zinc-100 rounded-xl" />
                    <div className="h-32 bg-zinc-100 rounded-xl" />
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-amber-50/30 rounded-2xl border border-indigo-200/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs">
                            <PenTool className="w-4 h-4" />
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            今週の内製化コンテンツ計画
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                順位1位奪取＆AI検索引用
                            </span>
                        </h3>
                    </div>
                    <p className="text-xs text-zinc-600">
                        検索順位2〜5位のレバレッジが大きいキーワードを分析。ジョンが自動提案する今週執筆すべき優先記事です。
                    </p>
                </div>
                <span className="text-[11px] font-mono text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg font-bold self-start sm:self-auto">
                    AI自律マーケティング
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {suggestions.map((sug, idx) => {
                    const isSeo = sug.recommendedType === 'seo';
                    return (
                        <div
                            key={sug.id}
                            className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-1">
                                    <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                            isSeo
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                        }`}
                                    >
                                        {isSeo ? <BookOpen className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                        {sug.recommendedTypeLabel}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                        現在 {sug.currentRank}位
                                    </span>
                                </div>

                                <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                                    「{sug.keyword}」
                                </div>

                                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                                    {sug.reason}
                                </p>
                            </div>

                            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-zinc-500 font-mono">
                                    {sug.estimatedImpact.split('、')[0]}
                                </span>
                                <button
                                    onClick={() => onOpenGenerator(sug.keyword, sug.recommendedType, sug.targetPath)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs group-hover:scale-[1.02]"
                                >
                                    <Sparkles className="w-3 h-3 text-amber-300" />
                                    今すぐ生成
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
