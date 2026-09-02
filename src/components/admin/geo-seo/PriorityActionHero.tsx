'use client'

import React from 'react'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

interface PriorityActionProps {
    title: string
    category: string
    impact: string
    effort: string
    description: string
    reason: string
    onExecute: () => void
    isCompleted?: boolean
}

export function PriorityActionHero({
    title,
    category,
    impact,
    effort,
    description,
    reason,
    onExecute,
    isCompleted = false,
}: PriorityActionProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-white p-8 md:p-10 border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
            {/* 上品な発光グラデーション (Linear風アンビエントライト) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* ステータスバッジ */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-mono font-semibold tracking-widest text-zinc-400 uppercase">
                            RECOMMENDED PRIORITY ACTION — 今すぐ実行すべき最優先改善タスク
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {category}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {impact}
                        </span>
                    </div>
                </div>

                {/* メインアクションコンテンツ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                            {title}
                        </h2>

                        <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl font-normal">
                            {description}
                        </p>

                        <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/40 text-xs text-zinc-300 font-sans space-y-1.5 backdrop-blur-sm">
                            <div className="text-zinc-400 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> WHY THIS MATTERS (期待されるインパクト):
                            </div>
                            <div className="text-zinc-300 leading-relaxed">{reason}</div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center h-full">
                        <button
                            onClick={onExecute}
                            className={`w-full py-4 px-6 rounded-xl font-sans font-bold text-sm tracking-wide transition-all duration-200 shadow-lg flex items-center justify-center gap-2.5 ${isCompleted
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-[0.99]'
                                }`}
                        >
                            {isCompleted ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 完了済み
                                </>
                            ) : (
                                <>
                                    今すぐこのタスクを実行・完了 <ArrowRight className="w-4 h-4 text-zinc-950" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
