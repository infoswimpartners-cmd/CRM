'use client';

import React from 'react';
import { ActionRecommendationItem } from '@/lib/sp-tracker-seed';
import { ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Compass } from 'lucide-react';
import Link from 'next/link';

interface SpTrackerHeroActionsProps {
    actions: ActionRecommendationItem[];
    onResolveToggle: (id: number, currentStatus: boolean) => void;
}

export function SpTrackerHeroActions({ actions, onResolveToggle }: SpTrackerHeroActionsProps) {
    const activeActions = actions.filter((a) => !a.is_resolved);
    const primaryAction = activeActions[0] || actions[0];

    const getPriorityBadge = (priority: ActionRecommendationItem['priority']) => {
        switch (priority) {
            case 'high':
                return {
                    label: '最優先（至急対応）',
                    color: 'bg-red-500/10 text-red-400 border-red-500/30',
                    dot: 'bg-red-500',
                };
            case 'medium':
                return {
                    label: '改善チャンス（推奨）',
                    color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                    dot: 'bg-amber-400',
                };
            default:
                return {
                    label: '維持・良好',
                    color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                    dot: 'bg-emerald-400',
                };
        }
    };

    if (!primaryAction) return null;

    const badge = getPriorityBadge(primaryAction.priority);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-white p-8 md:p-10 border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
            {/* 上品な発光グラデーション (Linear風アンビエント) */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* ステータスバッジ */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dot}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.dot}`}></span>
                        </span>
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            TODAY'S & WEEKLY PRIORITY ACTION — 今週・今日やるべき最優先アクション
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${badge.color}`}>
                            {badge.label}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {primaryAction.category.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* メインアクションコンテンツ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                            {primaryAction.title}
                        </h2>

                        <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                            {primaryAction.issue_description}
                        </p>

                        <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-200 font-sans space-y-1.5 backdrop-blur-sm">
                            <div className="text-zinc-400 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 具体的な作業指示（DIRECTIVE）:
                            </div>
                            <div className="text-zinc-100 font-medium leading-relaxed">
                                {primaryAction.action_directive}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center gap-3 h-full">
                        <button
                            onClick={() => onResolveToggle(primaryAction.id, primaryAction.is_resolved)}
                            className={`w-full py-4 px-6 rounded-xl font-sans font-bold text-sm tracking-wide transition-all duration-200 shadow-lg flex items-center justify-center gap-2.5 ${
                                primaryAction.is_resolved
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-[0.99]'
                            }`}
                        >
                            {primaryAction.is_resolved ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 対応完了（未完了に戻す）
                                </>
                            ) : (
                                <>
                                    この指示を完了済みにする <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                                </>
                            )}
                        </button>

                        {primaryAction.action_link && (
                            <Link
                                href={primaryAction.action_link}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold text-center text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 transition-all flex items-center justify-center gap-1.5"
                            >
                                対象の詳細ビューへジャンプ <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* 他のアクション一覧（未完了のもの） */}
                {actions.length > 1 && (
                    <div className="pt-4 border-t border-zinc-800/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {actions.slice(1, 3).map((act) => {
                            const b = getPriorityBadge(act.priority);
                            return (
                                <div
                                    key={act.id}
                                    onClick={() => onResolveToggle(act.id, act.is_resolved)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        act.is_resolved
                                            ? 'bg-zinc-900/40 border-zinc-800 opacity-50'
                                            : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <div className="space-y-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{act.category}</span>
                                            {act.is_resolved && <span className="text-[10px] text-emerald-400 font-bold">DONE</span>}
                                        </div>
                                        <div className={`text-xs font-bold truncate ${act.is_resolved ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                            {act.title}
                                        </div>
                                    </div>
                                    <span className="text-xs text-zinc-400 font-mono flex-shrink-0">
                                        {act.is_resolved ? '解除' : '完了'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
