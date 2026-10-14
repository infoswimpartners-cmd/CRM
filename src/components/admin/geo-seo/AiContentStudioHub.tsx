'use client';

import React, { useState } from 'react';
import {
    PenTool,
    Sparkles,
    FileText,
    Layers,
    Plus,
} from 'lucide-react';
import { WeeklyArticleSuggestionsWidget } from './WeeklyArticleSuggestionsWidget';
import { GeneratedArticlesListView } from './GeneratedArticlesListView';
import { ArticleType } from '@/lib/generated-articles-storage';
import { KeywordCompetitorIntelligence } from '@/types/competitor-benchmark';

export interface AiContentStudioHubProps {
    onOpenGenerator?: (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string,
        competitorIntelligence?: KeywordCompetitorIntelligence
    ) => void;
}

/**
 * コンテンツ内製化スタジオ統合ハブ (AiContentStudioHub)
 * 企画提案（WeeklyArticleSuggestionsWidget）と生成記事一覧（GeneratedArticlesListView）を
 * 1画面に統合し、企画選定からAI執筆、STUDIO HTML貼り付けまでのワークフローを一体化する。
 */
export function AiContentStudioHub({ onOpenGenerator }: AiContentStudioHubProps) {
    const [studioTab, setStudioTab] = useState<'both' | 'suggestions' | 'articles'>('both');

    return (
        <div className="space-y-6">
            {/* スタジオ共通ヘッダー */}
            <div className="bg-white rounded-2xl border border-indigo-200/90 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs">
                            <PenTool className="w-5 h-5" />
                        </span>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                AIコンテンツ内製化スタジオ
                            </h2>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                競合分析に基づく新規企画提案 ✕ Gemini 3.8 Flash自動執筆 ✕ STUDIO公開管理
                            </p>
                        </div>
                    </div>
                </div>

                {/* ビュー切り替えセグメントコントロール */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold">
                        <button
                            onClick={() => setStudioTab('both')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                studioTab === 'both'
                                    ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>全体表示</span>
                        </button>
                        <button
                            onClick={() => setStudioTab('suggestions')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                studioTab === 'suggestions'
                                    ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>企画提案</span>
                        </button>
                        <button
                            onClick={() => setStudioTab('articles')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                studioTab === 'articles'
                                    ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>生成記事ライブラリ</span>
                        </button>
                    </div>

                    {onOpenGenerator && (
                        <button
                            onClick={() => onOpenGenerator('水泳 個人レッスン 東京', 'seo')}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                            title="新規記事作成モーダルを開く"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>記事を新規生成</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 1. 企画提案セクション */}
            {(studioTab === 'both' || studioTab === 'suggestions') && (
                <div className="space-y-3">
                    {studioTab === 'both' && (
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-900 px-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>STEP 1: 未開拓キーワード・競合ギャップ企画選定</span>
                        </div>
                    )}
                    <WeeklyArticleSuggestionsWidget
                        onOpenGenerator={(keyword, type, targetPath, initialPrompt) => {
                            if (onOpenGenerator) {
                                onOpenGenerator(keyword, type, targetPath, initialPrompt);
                            }
                        }}
                    />
                </div>
            )}

            {/* 2. 生成記事・草稿ライブラリセクション */}
            {(studioTab === 'both' || studioTab === 'articles') && (
                <div className="space-y-3">
                    {studioTab === 'both' && (
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-900 px-1 pt-3">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>STEP 2: 生成済み記事一覧・STUDIO貼り付け管理</span>
                        </div>
                    )}
                    <GeneratedArticlesListView />
                </div>
            )}
        </div>
    );
}
