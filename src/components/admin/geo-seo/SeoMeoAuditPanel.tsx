'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'

export function SeoMeoAuditPanel() {
    const seoMetrics = [
        { name: 'Core Web Vitals (速度)', score: '94点 (Fast)', status: 'PASS', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { name: 'モバイル適正', score: '98点', status: 'PASS', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { name: 'Google AI Overviews 表示率', score: '68%', status: 'ACTIVE', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        { name: 'メタ構造化データ', score: '85点', status: 'GOOD', style: 'bg-blue-50 text-blue-700 border-blue-200' },
    ]

    const meoMetrics = [
        { name: 'Googleマップ検索順位', score: 'エリア1位〜3位 (上位獲得)' },
        { name: 'クチコミ平均評価', score: '4.8 ★★★★★ (42件)' },
        { name: 'プロフィール写真数', score: '35枚掲載中' },
    ]

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        SEARCH ENGINE & AI OVERVIEWS
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        SEO ✕ AIO (検索エンジン) 診断
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {seoMetrics.map((item, idx) => (
                        <div key={idx} className="p-5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 hover:border-zinc-300 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-zinc-500">{item.name}</span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${item.style}`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="mt-3 text-2xl font-black text-zinc-900 tracking-tight">{item.score}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            MAP ENGINE OPTIMIZATION
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            MEO (Googleマップ) 診断指標
                        </h3>
                    </div>
                    <a
                        href="https://business.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                        Googleビジネスプロフィール <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {meoMetrics.map((metric, idx) => (
                        <div key={idx} className="p-5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 hover:border-zinc-300 transition-all">
                            <div className="text-xs font-semibold text-zinc-500">{metric.name}</div>
                            <div className="mt-2 text-xl font-bold tracking-tight text-zinc-900">{metric.score}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
