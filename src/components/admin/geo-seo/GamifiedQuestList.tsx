'use client'

import React from 'react'
import { CheckCircle2, Circle, ArrowUpRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Quest {
    id: string
    title: string
    category: 'GEO' | 'SEO' | 'MEO' | 'SNS' | 'CRO'
    difficulty: 'Easy' | 'Medium' | 'Hard'
    xpReward: number
    scoreReward: number
    isCompleted: boolean
    description: string
}

interface GamifiedQuestListProps {
    quests: Quest[]
    onToggleQuest: (id: string) => void
}

export function GamifiedQuestList({ quests, onToggleQuest }: GamifiedQuestListProps) {
    const completedCount = quests.filter((q) => q.isCompleted).length

    const getCategoryStyle = (category: Quest['category']) => {
        switch (category) {
            case 'GEO': return 'bg-purple-50 text-purple-700 border-purple-200'
            case 'SEO': return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'MEO': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'SNS': return 'bg-rose-50 text-rose-700 border-rose-200'
            case 'CRO': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-zinc-100 gap-4">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        ACTIONABLE ROADMAP & QUESTS
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        マーケティング改善タスク一覧
                    </h3>
                </div>

                <div className="text-xs font-mono text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/80">
                    STATUS: <strong className="text-zinc-900">{completedCount} / {quests.length} COMPLETED</strong>
                </div>
            </div>

            <div className="space-y-3">
                <AnimatePresence>
                    {quests.map((quest) => (
                        <motion.div
                            key={quest.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => onToggleQuest(quest.id)}
                            className={`group p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5 ${quest.isCompleted
                                    ? 'bg-zinc-50/60 border-zinc-200/60 opacity-60'
                                    : 'bg-white border-zinc-200/80 hover:border-zinc-300 hover:shadow-[0_4px_20px_rgb(0,0,0,0.03)]'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <button
                                    type="button"
                                    className="mt-0.5 text-zinc-300 group-hover:text-zinc-900 transition-colors focus:outline-none flex-shrink-0"
                                >
                                    {quest.isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500" />
                                    )}
                                </button>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs font-mono">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryStyle(quest.category)}`}>
                                            {quest.category}
                                        </span>
                                        <span className="text-[10px] font-semibold text-zinc-400 border border-zinc-200 px-2 py-0.5 rounded-md">
                                            {quest.difficulty}
                                        </span>
                                    </div>

                                    <h4 className={`text-base font-bold tracking-tight ${quest.isCompleted ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                                        {quest.title}
                                    </h4>

                                    <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">
                                        {quest.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100">
                                <div className="text-right font-mono text-xs">
                                    <div className="font-bold text-zinc-900">+{quest.xpReward} XP</div>
                                    <div className="text-[10px] text-zinc-400">Score +{quest.scoreReward}pt</div>
                                </div>

                                <button
                                    type="button"
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${quest.isCompleted
                                            ? 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                                            : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm'
                                        }`}
                                >
                                    {quest.isCompleted ? '完了済み' : '完了にする'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
