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
        <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 p-6 md:p-8 border border-indigo-100 shadow-[0_8px_30px_rgba(99,102,241,0.06)] transition-all duration-300">
            {/* 上品な発光グラデーション */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* ステータスバッジ */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-mono font-semibold tracking-widest text-zinc-500 uppercase">
                            RECOMMENDED PRIORITY ACTION — 今すぐ実行すべき最優先改善タスク
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {category}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {impact}
                        </span>
                    </div>
                </div>

                {/* メインアクションコンテンツ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                            {title}
                        </h2>

                        <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl font-normal">
                            {description}
                        </p>

                        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-zinc-700 font-sans space-y-1.5 shadow-xs">
                            <div className="text-indigo-900 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> WHY THIS MATTERS (期待されるインパクト):
                            </div>
                            <div className="text-slate-800 leading-relaxed">{reason}</div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center h-full">
                        <button
                            onClick={onExecute}
                            className={`w-full py-4 px-6 rounded-xl font-sans font-bold text-sm tracking-wide transition-all duration-200 shadow-sm flex items-center justify-center gap-2.5 ${isCompleted
                                    ? 'bg-zinc-100 hover:bg-zinc-200 text-emerald-700 border border-emerald-300'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99]'
                                }`}
                        >
                            {isCompleted ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 完了済み
                                </>
                            ) : (
                                <>
                                    今すぐこのタスクを実行・完了 <ArrowRight className="w-4 h-4 text-white" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
