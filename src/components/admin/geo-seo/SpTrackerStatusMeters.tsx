'use client';

import React from 'react';
import { Search, Bot, Layers, Activity } from 'lucide-react';

interface SpTrackerStatusMetersProps {
    seoTopRate: number;        // SEO主要KW上位率 (%)
    geoSovRate: number;        // AI言及率 (GEO SOV %)
    citationGapCount: number;  // 未掲載の引用メディア件数
    internalHealthScore: number;// 内部SEOヘルススコア (点)
}

export function SpTrackerStatusMeters({
    seoTopRate,
    geoSovRate,
    citationGapCount,
    internalHealthScore,
}: SpTrackerStatusMetersProps) {
    const meters = [
        {
            label: 'SEO主要KW上位率',
            sublabel: 'TOP3以内 獲得シェア',
            value: `${seoTopRate}%`,
            progress: seoTopRate,
            icon: Search,
            color: 'bg-blue-600',
            badge: seoTopRate >= 60 ? '良好' : '要改善',
            badgeStyle: seoTopRate >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
            label: 'AI言及率 (GEO SOV)',
            sublabel: 'ChatGPT / Perplexity 推奨率',
            value: `${geoSovRate}%`,
            progress: geoSovRate,
            icon: Bot,
            color: 'bg-purple-600',
            badge: geoSovRate >= 65 ? '高言及' : '普通',
            badgeStyle: geoSovRate >= 65 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200',
        },
        {
            label: '未掲載の引用メディア',
            sublabel: '競合掲載・自社未掲載ギャップ',
            value: `${citationGapCount} 件`,
            progress: Math.min(100, citationGapCount * 25),
            icon: Layers,
            color: 'bg-rose-500',
            badge: citationGapCount > 0 ? '要アプローチ' : '網羅完了',
            badgeStyle: citationGapCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
            label: '内部SEOヘルススコア',
            sublabel: '表示速度 / 構造化 / モバイル',
            value: `${internalHealthScore} 点`,
            progress: internalHealthScore,
            icon: Activity,
            color: 'bg-emerald-600',
            badge: 'Sランク',
            badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {meters.map((meter, idx) => {
                const Icon = meter.icon;
                return (
                    <div
                        key={idx}
                        className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-zinc-300 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between">
                                <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-800">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${meter.badgeStyle}`}>
                                    {meter.badge}
                                </span>
                            </div>

                            <div className="mt-4">
                                <div className="text-xs font-semibold text-zinc-500">{meter.label}</div>
                                <div className="text-3xl font-black tracking-tight text-zinc-900 mt-0.5">
                                    {meter.value}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                                    {meter.sublabel}
                                </div>
                            </div>
                        </div>

                        <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${meter.color}`}
                                style={{ width: `${meter.progress}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
