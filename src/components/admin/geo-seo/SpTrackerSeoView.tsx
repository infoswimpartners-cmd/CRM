'use client';

import React, { useState } from 'react';
import { KeywordItem } from '@/lib/sp-tracker-seed';
import { SeoRankWatchState } from '@/lib/seo-rank-watch';
import { Search, ArrowUp, ArrowDown, Minus, ExternalLink, Filter, Trophy, Hourglass, Target, RefreshCw } from 'lucide-react';
import { syncGscRanksAction } from '@/actions/sp-tracker-actions';
import { toast } from 'sonner';
import { SpTrackerGrowthCharts } from './SpTrackerGrowthCharts';

interface SpTrackerSeoViewProps {
    keywords: KeywordItem[];
    searchConsoleData?: any;
    rankWatchState?: SeoRankWatchState;
    onRefresh?: () => Promise<void>;
}

export function SpTrackerSeoView({ keywords, searchConsoleData, rankWatchState, onRefresh }: SpTrackerSeoViewProps) {
    const [areaFilter, setAreaFilter] = useState<string>('all');
    const [targetFilter, setTargetFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isSyncing, setIsSyncing] = useState(false);

    // watchwordsのマッピング (statusを取得)
    const watchwordMap = new Map((rankWatchState?.watchwords || []).map((w) => [w.keyword, w]));

    const filteredKeywords = keywords.filter((k) => {
        if (areaFilter !== 'all' && k.area_category !== areaFilter) return false;
        if (targetFilter !== 'all' && k.target_category !== targetFilter) return false;

        if (statusFilter !== 'all') {
            const w = watchwordMap.get(k.keyword);
            const status = w?.status || (k.current_rank === 1 ? 'achieved' : 'active');
            if (status !== statusFilter) return false;
        }

        return true;
    });

    const handleSyncRanks = async () => {
        setIsSyncing(true);
        try {
            const res = await syncGscRanksAction();
            if (res.success) {
                toast.success(res.message);
                if (onRefresh) await onRefresh();
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || '同期エラーが発生しました');
        } finally {
            setIsSyncing(false);
        }
    };

    const getStatusBadge = (keyword: string, rank?: number) => {
        const w = watchwordMap.get(keyword);
        const status = w?.status || (rank === 1 ? 'achieved' : 'active');

        if (status === 'achieved') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    <Trophy className="w-3 h-3 text-amber-600" /> 1位達成
                </span>
            );
        } else if (status === 'observing') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-300">
                    <Hourglass className="w-3 h-3 text-indigo-600 animate-spin" /> 7日観察中
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                <Target className="w-3 h-3 text-zinc-500" /> 改善候補
            </span>
        );
    };

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

    // GSCのクエリ別実績マップ
    const gscPerformanceMap = new Map((searchConsoleData?.keywordPages || []).map((p: any) => [p.keyword, p]));

    return (
        <div className="space-y-6">
            {/* 1. SEO成長トレンド ✕ 順位推移グラフ */}
            <SpTrackerGrowthCharts
                dailyPerformance={searchConsoleData?.dailyPerformance}
                keywords={keywords}
            />

            {/* 2. Search Console 実データ連動パフォーマンスサマリー */}
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

            {/* 3. キーワード順位推移テーブル */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            SEO RANKING TRACKING
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            エリア別 ✕ セグメント別 検索順位推移
                        </h3>
                    </div>

                    {/* フィルタ & GSC同期ボタン */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-900 font-bold focus:outline-none"
                        >
                            <option value="all">全ステータス</option>
                            <option value="achieved">👑 1位達成</option>
                            <option value="observing">⏳ 7日間観察中</option>
                            <option value="active">🎯 改善候補</option>
                        </select>

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

                        <button
                            onClick={handleSyncRanks}
                            disabled={isSyncing}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                            title="Google Search Consoleの最新順位を取得して履歴に追記"
                        >
                            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? '同期中...' : 'GSC順位計測'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-200 text-[11px] font-mono font-bold text-zinc-400 uppercase">
                                <th className="pb-3 px-3">キーワード</th>
                                <th className="pb-3 px-3 text-center">Rank Watch</th>
                                <th className="pb-3 px-3">エリア軸</th>
                                <th className="pb-3 px-3">セグメント軸</th>
                                <th className="pb-3 px-3 text-center">現在順位</th>
                                <th className="pb-3 px-3 text-center">前週比</th>
                                <th className="pb-3 px-3 text-center">Clicks / Imp</th>
                                <th className="pb-3 px-3">自社URL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                            {filteredKeywords.map((kw) => {
                                const gscPerf: any = gscPerformanceMap.get(kw.keyword);
                                return (
                                    <tr key={kw.id} className="hover:bg-zinc-50/80 transition-colors">
                                        <td className="py-4 px-3 font-bold text-zinc-900">
                                            {kw.keyword}
                                        </td>
                                        <td className="py-4 px-3 text-center">
                                            {getStatusBadge(kw.keyword, kw.current_rank)}
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
                                                (kw.current_rank || 100) === 1
                                                    ? 'text-amber-600 font-extrabold'
                                                    : (kw.current_rank || 100) <= 3
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
                                        <td className="py-4 px-3 text-center font-mono text-xs text-zinc-600">
                                            {gscPerf ? (
                                                <span className="inline-flex items-center gap-1 font-bold">
                                                    <span className="text-indigo-600">{gscPerf.clicks}</span>
                                                    <span className="text-zinc-300">/</span>
                                                    <span className="text-zinc-500">{gscPerf.impressions}</span>
                                                </span>
                                            ) : (
                                                <span className="text-zinc-300">-</span>
                                            )}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
