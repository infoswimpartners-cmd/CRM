'use client';

import React from 'react';
import { ActionRecommendationItem } from '@/lib/sp-tracker-seed';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
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
                    color: 'bg-rose-50 text-rose-700 border-rose-200',
                    dot: 'bg-rose-500',
                };
            case 'medium':
                return {
                    label: '改善チャンス（推奨）',
                    color: 'bg-amber-50 text-amber-800 border-amber-300',
                    dot: 'bg-amber-500',
                };
            default:
                return {
                    label: '維持・良好',
                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dot: 'bg-emerald-500',
                };
        }
    };

    if (!primaryAction) return null;

    const badge = getPriorityBadge(primaryAction.priority);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 p-4 sm:p-7 md:p-8 border border-indigo-100 shadow-[0_8px_30px_rgba(99,102,241,0.06)] transition-all duration-300">
            {/* 上品な発光アンビエント */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[90px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* ステータスバッジ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dot}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${badge.dot}`}></span>
                        </span>
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                            TODAY'S & WEEKLY PRIORITY ACTION
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${badge.color}`}>
                            {badge.label}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {primaryAction.category.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* メインアクションコンテンツ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                            {primaryAction.title}
                        </h2>

                        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                            {primaryAction.issue_description}
                        </p>

                        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-zinc-800 font-sans space-y-1.5 shadow-xs">
                            <div className="text-indigo-900 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 具体的な作業指示（DIRECTIVE）:
                            </div>
                            <div className="text-slate-900 font-medium leading-relaxed">
                                {primaryAction.action_directive}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-center gap-3 h-full">
                        <button
                            onClick={() => onResolveToggle(primaryAction.id, primaryAction.is_resolved)}
                            className={`w-full py-3.5 sm:py-4 px-6 rounded-xl font-sans font-bold text-xs sm:text-sm tracking-wide transition-all duration-200 shadow-sm flex items-center justify-center gap-2.5 ${
                                primaryAction.is_resolved
                                    ? 'bg-zinc-100 hover:bg-zinc-200 text-emerald-700 border border-emerald-300'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99]'
                            }`}
                        >
                            {primaryAction.is_resolved ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 対応完了（未完了に戻す）
                                </>
                            ) : (
                                <>
                                    この指示を完了済みにする <CheckCircle2 className="w-4 h-4 text-white" />
                                </>
                            )}
                        </button>

                        {primaryAction.action_link && (
                            <Link
                                href={primaryAction.action_link}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-semibold text-center text-zinc-600 hover:text-slate-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-all flex items-center justify-center gap-1.5"
                            >
                                対象の詳細ビューへジャンプ <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* 他のアクション一覧（未完了のもの） */}
                {actions.length > 1 && (
                    <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {actions.slice(1, 3).map((act) => {
                            const b = getPriorityBadge(act.priority);
                            return (
                                <div
                                    key={act.id}
                                    onClick={() => onResolveToggle(act.id, act.is_resolved)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        act.is_resolved
                                            ? 'bg-zinc-50/50 border-zinc-200 opacity-60'
                                            : 'bg-zinc-50/80 border-zinc-200 hover:border-zinc-300 hover:bg-white'
                                    }`}
                                >
                                    <div className="space-y-1 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{act.category}</span>
                                            {act.is_resolved && <span className="text-[10px] text-emerald-700 font-bold">DONE</span>}
                                        </div>
                                        <div className={`text-xs font-bold truncate ${act.is_resolved ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                                            {act.title}
                                        </div>
                                    </div>
                                    <span className="text-xs text-zinc-500 font-mono flex-shrink-0">
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
