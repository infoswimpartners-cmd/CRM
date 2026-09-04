'use client';

import React, { useState } from 'react';
import { KeywordItem } from '@/lib/sp-tracker-seed';
import { Search, ArrowUp, ArrowDown, Minus, ExternalLink, Filter } from 'lucide-react';

interface SpTrackerSeoViewProps {
    keywords: KeywordItem[];
    searchConsoleData?: any;
}

export function SpTrackerSeoView({ keywords, searchConsoleData }: SpTrackerSeoViewProps) {
    const [areaFilter, setAreaFilter] = useState<string>('all');
    const [targetFilter, setTargetFilter] = useState<string>('all');

    const filteredKeywords = keywords.filter((k) => {
        if (areaFilter !== 'all' && k.area_category !== areaFilter) return false;
        if (targetFilter !== 'all' && k.target_category !== targetFilter) return false;
        return true;
    });

    const getAreaLabel = (area: string) => {
        switch (area) {
            case 'tokyo_23': return '東京23区';
            case 'kanagawa': return '神奈川・横浜';
            case 'chiba': return '千葉';
            default: return area;
        }
    };

    const getTargetLabel = (target: string) => {
        switch (target) {
            case 'adult': return '大人・泳ぎ直し';
            case 'junior': return '子供・ジュニア';
            case 'phobia': return '水恐怖症克服';
            case 'triathlon': return 'トライアスロン';
            default: return target;
        }
    };

    const renderRankDiff = (current?: number, prev?: number) => {
        if (!current || !prev) return <span className="text-zinc-400">-</span>;
        const diff = prev - current;
        if (diff > 0) {
            return (
                <span className="inline-flex items-center text-emerald-600 font-bold text-xs gap-0.5">
                    <ArrowUp className="w-3.5 h-3.5" /> +{diff}
                </span>
            );
        } else if (diff < 0) {
            return (
                <span className="inline-flex items-center text-rose-600 font-bold text-xs gap-0.5">
                    <ArrowDown className="w-3.5 h-3.5" /> {diff}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center text-zinc-400 font-medium text-xs gap-0.5">
                <Minus className="w-3.5 h-3.5" /> ±0
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Search Console 実データ連動パフォーマンス */}
            {searchConsoleData && (
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            SEARCH CONSOLE PERFORMANCE (過去28日間)
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                            API LIVE DATA
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                            <div className="text-xs text-zinc-500">合計クリック数</div>
                            <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.clicks?.toLocaleString()} 回</div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                            <div className="text-xs text-zinc-500">合計表示回数 (Imp)</div>
                            <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.impressions?.toLocaleString()} 回</div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                            <div className="text-xs text-zinc-500">平均クリック率 (CTR)</div>
                            <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.ctr}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                            <div className="text-xs text-zinc-500">平均掲載順位</div>
                            <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.averagePosition} 位</div>
                        </div>
                    </div>
                </div>
            )}

            {/* キーワード順位推移テーブル */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            SEO RANKING TRACKING
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            エリア別 ✕ セグメント別 検索順位推移
                        </h3>
                    </div>

                    {/* フィルタボタン */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <select
                            value={areaFilter}
                            onChange={(e) => setAreaFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 focus:outline-none"
                        >
                            <option value="all">全エリア</option>
                            <option value="tokyo_23">東京23区</option>
                            <option value="kanagawa">神奈川</option>
                            <option value="chiba">千葉</option>
                        </select>

                        <select
                            value={targetFilter}
                            onChange={(e) => setTargetFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 focus:outline-none"
                        >
                            <option value="all">全セグメント</option>
                            <option value="adult">大人</option>
                            <option value="junior">子供</option>
                            <option value="phobia">水恐怖症</option>
                            <option value="triathlon">トライアスロン</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-200 text-[11px] font-mono font-bold text-zinc-400 uppercase">
                                <th className="pb-3 px-3">キーワード</th>
                                <th className="pb-3 px-3">エリア軸</th>
                                <th className="pb-3 px-3">セグメント軸</th>
                                <th className="pb-3 px-3 text-center">現在順位</th>
                                <th className="pb-3 px-3 text-center">前週比</th>
                                <th className="pb-3 px-3">自社URL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                            {filteredKeywords.map((kw) => (
                                <tr key={kw.id} className="hover:bg-zinc-50/80 transition-colors">
                                    <td className="py-4 px-3 font-bold text-zinc-900">
                                        {kw.keyword}
                                    </td>
                                    <td className="py-4 px-3 text-xs font-mono text-zinc-500">
                                        <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                                            {getAreaLabel(kw.area_category)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-3 text-xs font-mono text-zinc-500">
                                        <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                                            {getTargetLabel(kw.target_category)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-3 text-center">
                                        <span className={`text-lg font-black font-mono ${
                                            (kw.current_rank || 100) <= 3
                                                ? 'text-emerald-600'
                                                : (kw.current_rank || 100) <= 10
                                                ? 'text-blue-600'
                                                : 'text-zinc-500'
                                        }`}>
                                            {kw.current_rank} 位
                                        </span>
                                    </td>
                                    <td className="py-4 px-3 text-center font-mono">
                                        {renderRankDiff(kw.current_rank, kw.previous_rank)}
                                    </td>
                                    <td className="py-4 px-3 text-xs text-zinc-500 max-w-xs truncate">
                                        <a
                                            href={kw.target_url || '#'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                                        >
                                            <span className="truncate">{kw.target_url}</span>
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
