'use client'

import React from 'react'
import { ArrowRight, Bot, Sparkles } from 'lucide-react'

export function GeoAuditPanel() {
    const aiEngines = [
        { name: 'Perplexity AI', score: 88, status: '良好 (引用率高)', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { name: 'ChatGPT / SearchGPT', score: 82, status: '概ね引用中', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        { name: 'Google Gemini', score: 76, status: '部分引用', style: 'bg-blue-50 text-blue-700 border-blue-200' },
        { name: 'Claude (Anthropic)', score: 70, status: '要改善 (ファクト不足)', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    ]

    const recommendations = [
        {
            title: 'FAQページのJSON-LD構造化データ追加',
            impact: 'GEO効果: 大 (+15pt)',
            category: '構造化データ',
            description: 'ChatGPTやPerplexityはFAQのSchema.org構造化データを優先参照します。「料金」「体験レッスンの流れ」をFAQ構造化します。',
            actionText: 'JSON-LDコードを生成',
        },
        {
            title: 'LLM向けブランドファクトシート (Fact Sheet) の公開',
            impact: 'GEO効果: 中 (+10pt)',
            category: 'ファクト密度',
            description: '「創業年」「対応地域」「コーチ資格保有数」などの実績数値をテキストで提示することで生成AIの引用精度が上昇します。',
            actionText: 'ファクトシート作成',
        },
        {
            title: '最新のレッスン実績数値のマークアップ更新',
            impact: 'GEO効果: 中 (+8pt)',
            category: '新鮮さ',
            description: 'AI検索エンジンは新しい数値を優先参照します。「累計指導実績1,500名以上」などのデータを最新に更新します。',
            actionText: '実績データを更新',
        },
    ]

    return (
        <div className="space-y-6">
            {/* AIエンジン別 引用適応率 */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        GEO ENGINE DIAGNOSTICS
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        生成AIエンジン別 引用適応スコア
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiEngines.map((engine, idx) => (
                        <div key={idx} className="p-5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 hover:border-zinc-300 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-900 text-sm">{engine.name}</span>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${engine.style}`}>
                                        {engine.status}
                                    </span>
                                </div>
                                <div className="mt-4 flex items-baseline justify-between">
                                    <span className="text-3xl font-black text-zinc-900">{engine.score}</span>
                                    <span className="text-xs text-zinc-400 font-mono">/ 100点</span>
                                </div>
                            </div>
                            <div className="w-full bg-zinc-200/80 rounded-full h-1.5 mt-3 overflow-hidden">
                                <div className="bg-zinc-900 h-full rounded-full" style={{ width: `${engine.score}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* GEO推奨改善プラン */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        RECOMMENDED GEO ACTIONS
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        生成AI検索（GEO）最適化プラン
                    </h3>
                </div>

                <div className="space-y-4">
                    {recommendations.map((rec, idx) => (
                        <div
                            key={idx}
                            className="p-6 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-mono">
                                    <span className="bg-zinc-900 text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                                        {rec.category}
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        {rec.impact}
                                    </span>
                                </div>
                                <h4 className="font-bold text-zinc-900 text-lg tracking-tight">{rec.title}</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">{rec.description}</p>
                            </div>

                            <button className="flex-shrink-0 px-4 py-2.5 rounded-xl border border-zinc-900 text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all duration-150 flex items-center gap-2">
                                {rec.actionText} <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
