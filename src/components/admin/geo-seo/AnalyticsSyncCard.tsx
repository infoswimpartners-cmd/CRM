'use client'

import React, { useState } from 'react'
import { RefreshCw, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function AnalyticsSyncCard() {
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSynced, setLastSynced] = useState('本日 16:30')

    const handleSync = () => {
        setIsSyncing(true)
        setTimeout(() => {
            setIsSyncing(false)
            setLastSynced('只今同期完了')
            toast.success('GA4 & Search Console データを最新に同期しました')
        }, 1200)
    }

    const trafficSources = [
        { name: 'AI引用 (Perplexity/ChatGPT)', share: '32%', count: '1,420 回' },
        { name: 'Google自然検索 (SEO)', share: '45%', count: '1,980 回' },
        { name: 'Googleマップ (MEO)', share: '15%', count: '660 回' },
        { name: 'SNS・その他 (Instagram/LINE)', share: '8%', count: '350 回' },
    ]

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-100 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-zinc-900 text-xl tracking-tight">
                            GA4 & Search Console データ連携
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SYNCED
                        </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono">最終同期: {lastSynced}</p>
                </div>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="px-4 py-2.5 rounded-xl border border-zinc-900 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? '同期中...' : '最新データに更新'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {trafficSources.map((source, idx) => (
                    <div
                        key={idx}
                        className="p-5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 hover:border-zinc-300 transition-all duration-200 flex flex-col justify-between"
                    >
                        <div className="text-xs font-semibold text-zinc-500">{source.name}</div>

                        <div className="mt-4">
                            <div className="text-2xl font-extrabold tracking-tight text-zinc-900 flex items-center justify-between">
                                {source.count}
                                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400 mt-1">
                                構成比: <strong className="text-zinc-800">{source.share}</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
