'use client';

import React, { useState } from 'react';
import { GeoPromptItem } from '@/lib/sp-tracker-seed';
import { Bot, CheckCircle2, XCircle, ExternalLink, ThumbsUp, HelpCircle } from 'lucide-react';

interface SpTrackerGeoViewProps {
    prompts: GeoPromptItem[];
}

export function SpTrackerGeoView({ prompts }: SpTrackerGeoViewProps) {
    const [selectedPromptId, setSelectedPromptId] = useState<number>(prompts[0]?.id || 1);
    const activePrompt = prompts.find((p) => p.id === selectedPromptId) || prompts[0];

    const getModelBadge = (model: string) => {
        switch (model) {
            case 'chatgpt_search':
                return { name: 'ChatGPT Search', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            case 'perplexity':
                return { name: 'Perplexity AI', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
            case 'gemini':
                return { name: 'Google Gemini', color: 'bg-blue-50 text-blue-700 border-blue-200' };
            default:
                return { name: model, color: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        GEO AI MONITORING & SOV
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        生成AI想定質問 定点観測 ＆ 回答原文分析
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                        見込み顧客がChatGPTやPerplexityに入力する質問に対し、スイムパートナーズがどのように推奨・引用されているかを記録しています。
                    </p>
                </div>

                {/* プロンプト選択タブ */}
                <div className="flex flex-wrap gap-2 pt-2 border-b border-zinc-100 pb-4">
                    {prompts.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPromptId(p.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                                selectedPromptId === p.id
                                    ? 'bg-zinc-900 text-white shadow-sm'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                        >
                            Q{p.id}. {p.prompt_text}
                        </button>
                    ))}
                </div>

                {/* 選択中の質問の詳細回答 */}
                {activePrompt && (
                    <div className="space-y-6 pt-2">
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                                    MONITORED PROMPT (想定質問)
                                </span>
                                <h4 className="text-base font-bold text-zinc-900">
                                    「{activePrompt.prompt_text}」
                                </h4>
                            </div>
                            <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-zinc-200 text-zinc-700 uppercase">
                                {activePrompt.intent_category}
                            </span>
                        </div>

                        {/* 各モデルの回答カード一覧 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {activePrompt.results.map((res, idx) => {
                                const m = getModelBadge(res.ai_model);
                                return (
                                    <div
                                        key={idx}
                                        className="p-6 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col justify-between space-y-4"
                                    >
                                        <div className="space-y-3">
                                            {/* ヘッダー: モデル名 ＆ 言及バッジ */}
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${m.color}`}>
                                                    {m.name}
                                                </span>
                                                {res.is_mentioned ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                                        <CheckCircle2 className="w-4 h-4" /> 推奨言及中 (第{res.mention_rank || 1}位)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400">
                                                        <XCircle className="w-4 h-4" /> 言及なし (脱落)
                                                    </span>
                                                )}
                                            </div>

                                            {/* 回答原文 */}
                                            <div className="space-y-1">
                                                <div className="text-[11px] font-mono text-zinc-400 font-bold uppercase">AIの回答原文:</div>
                                                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs text-zinc-800 leading-relaxed font-sans max-h-56 overflow-y-auto whitespace-pre-wrap">
                                                    {res.full_response}
                                                </div>
                                            </div>

                                            {/* 引用元Webサイト一覧 */}
                                            <div className="space-y-1.5 pt-2">
                                                <div className="text-[11px] font-mono text-zinc-400 font-bold uppercase">参照・引用されたメディア:</div>
                                                <div className="space-y-1">
                                                    {res.cited_sources.map((src, sIdx) => {
                                                        const isSelf = src.domain.includes('swim-partners.com');
                                                        return (
                                                            <a
                                                                key={sIdx}
                                                                href={src.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={`block p-2 rounded-lg text-xs border transition-colors ${
                                                                    isSelf
                                                                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 font-bold'
                                                                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="truncate">{src.title || src.domain}</span>
                                                                    <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1 opacity-70" />
                                                                </div>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* センチメント */}
                                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-mono text-zinc-400">
                                            <span>推奨センチメント:</span>
                                            <span className="font-bold text-zinc-800 uppercase">{res.sentiment}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
