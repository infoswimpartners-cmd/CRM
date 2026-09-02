'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, ShieldCheck, Zap } from 'lucide-react'

interface CategoryScore {
    name: string
    score: number
    fullMark: number
    color: string
}

interface ScoreOverviewCardProps {
    totalScore: number
    level: number
    levelTitle: string
    currentXp: number
    nextLevelXp: number
    categoryScores: CategoryScore[]
}

export function ScoreOverviewCard({
    totalScore,
    level,
    levelTitle,
    currentXp,
    nextLevelXp,
    categoryScores,
}: ScoreOverviewCardProps) {
    const xpPercentage = Math.min(100, Math.round((currentXp / nextLevelXp) * 100))

    const getScoreBadge = (score: number) => {
        if (score >= 90) return { label: 'S RANK', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        if (score >= 75) return { label: 'A RANK', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
        if (score >= 60) return { label: 'B RANK', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
        return { label: 'C RANK', bg: 'bg-zinc-100 text-zinc-700 border-zinc-200' }
    }

    const badge = getScoreBadge(totalScore)

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
            {/* 上部ヘッダー */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-100 pb-8 gap-6">
                <div>
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            MARKETING HEALTH SCORE
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badge.bg}`}>
                            {badge.label}
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
                        マーケティング健康度 ＆ 分析指標
                    </h2>
                </div>

                {/* メイン数値 */}
                <div className="flex items-baseline gap-3">
                    <div className="text-6xl md:text-7xl font-black tracking-tighter text-zinc-900 leading-none">
                        {totalScore}
                    </div>
                    <div className="text-sm font-semibold text-zinc-400 font-mono">
                        / 100 <span className="block text-[10px] uppercase text-zinc-400 font-bold">OVERALL RATING</span>
                    </div>
                </div>
            </div>

            {/* カテゴリグリッド (Linearカード風) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-8">
                {categoryScores.map((cat, idx) => (
                    <div
                        key={idx}
                        className="p-5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex flex-col justify-between hover:border-zinc-300 transition-all group"
                    >
                        <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                            {cat.name}
                        </span>

                        <div className="mt-4">
                            <div className="text-2xl font-extrabold tracking-tight text-zinc-900">
                                {cat.score}<span className="text-xs font-normal text-zinc-400">/100</span>
                            </div>
                            <div className="w-full bg-zinc-200/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                <div
                                    className="bg-zinc-900 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${cat.score}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* レベル・進捗バー */}
            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 text-zinc-800">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-zinc-400 text-[10px] uppercase font-bold block">LEVEL STATUS</span>
                        <span className="font-bold text-zinc-900 text-sm">
                            Lv.{level} <span className="text-zinc-500 font-normal text-xs">({levelTitle})</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-zinc-400 text-[10px] uppercase font-bold block">NEXT LEVEL XP</span>
                        <span className="font-bold text-zinc-800">{currentXp} / {nextLevelXp} XP</span>
                    </div>
                    <div className="w-36 bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
                        <motion.div
                            className="bg-indigo-600 h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${xpPercentage}%` }}
                            transition={{ duration: 0.8 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
