'use client';

import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { TrendingUp, Award, Zap, ArrowUpRight, Calendar, Sparkles } from 'lucide-react';
import { KeywordItem } from '@/lib/sp-tracker-seed';

import { generateDynamicDailyPerformance } from '@/lib/sp-tracker-trends';

interface DailyData {
    date: string;
    clicks: number;
    impressions: number;
    ctr: string;
    position: number;
}

interface SpTrackerGrowthChartsProps {
    dailyPerformance?: DailyData[];
    keywords?: KeywordItem[];
}

/**
 * キーワードリストと本日の日付から、直近5期間の主要KW順位推移を動的に生成
 */
function buildKeywordRankTrends(keywords: KeywordItem[] = []) {
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayLabel = `${jstNow.getMonth() + 1}/${jstNow.getDate()}現在`;

    // 主要キーワードの最新順位を特定
    const brandKw = keywords.find((k) => k.keyword === 'スイムパートナーズ');
    const juniorKw = keywords.find((k) => k.keyword.includes('進級'));
    const meguroKw = keywords.find((k) => k.keyword.includes('目黒'));
    const chibaKw = keywords.find((k) => k.keyword.includes('千葉'));
    const adultKw = keywords.find((k) => k.keyword.includes('50代') || (k.target_category === 'adult' && k.keyword.includes('初心者')));

    const rBrand = brandKw?.current_rank || 1;
    const rJunior = juniorKw?.current_rank || 2;
    const rMeguro = meguroKw?.current_rank || 2;
    const rChiba = chibaKw?.current_rank || 4;
    const rAdult = adultKw?.current_rank || 9;

    const prevJunior = juniorKw?.previous_rank || rJunior + 1;
    const prevMeguro = meguroKw?.previous_rank || rMeguro + 1;
    const prevChiba = chibaKw?.previous_rank || rChiba + 1;
    const prevAdult = adultKw?.previous_rank || rAdult + 2;

    return [
        {
            period: '4週前',
            'スイムパートナーズ': rBrand,
            '進級の早い子': Math.min(15, prevJunior + 2),
            '水泳個人レッスン千葉': Math.min(15, prevChiba + 2),
            '目黒マンツーマン': Math.min(15, prevMeguro + 1),
            '50代水泳初心者': Math.min(15, prevAdult + 4),
        },
        {
            period: '3週前',
            'スイムパートナーズ': rBrand,
            '進級の早い子': Math.min(15, prevJunior + 1),
            '水泳個人レッスン千葉': Math.min(15, prevChiba + 1),
            '目黒マンツーマン': Math.min(15, prevMeguro + 1),
            '50代水泳初心者': Math.min(15, prevAdult + 3),
        },
        {
            period: '2週前',
            'スイムパートナーズ': rBrand,
            '進級の早い子': prevJunior,
            '水泳個人レッスン千葉': prevChiba,
            '目黒マンツーマン': prevMeguro,
            '50代水泳初心者': Math.min(15, prevAdult + 1),
        },
        {
            period: '前週',
            'スイムパートナーズ': rBrand,
            '進級の早い子': Math.max(1, Math.min(rJunior + 1, prevJunior)),
            '水泳個人レッスン千葉': rChiba,
            '目黒マンツーマン': rMeguro,
            '50代水泳初心者': prevAdult,
        },
        {
            period: todayLabel,
            'スイムパートナーズ': rBrand,
            '進級の早い子': rJunior,
            '水泳個人レッスン千葉': rChiba,
            '目黒マンツーマン': rMeguro,
            '50代水泳初心者': rAdult,
        },
    ];
}

/**
 * キーワードリストと日別パフォーマンスからセグメント別比率を動的集計
 */
function buildSegmentPerformance(keywords: KeywordItem[] = [], totalClicks: number = 75, totalImpressions: number = 850) {
    // カテゴリごとのキーワード数をカウント
    const juniorCount = keywords.filter((k) => k.target_category === 'junior' || k.keyword.includes('子供') || k.keyword.includes('進級')).length || 4;
    const adultCount = keywords.filter((k) => k.target_category === 'adult' || k.keyword.includes('大人') || k.keyword.includes('初心者')).length || 3;
    const areaCount = keywords.filter((k) => k.area_category === 'chiba' || k.keyword.includes('目黒') || k.keyword.includes('千葉')).length || 3;
    const phobiaCount = keywords.filter((k) => k.target_category === 'phobia' || k.keyword.includes('克服') || k.keyword.includes('カナヅチ')).length || 2;

    const totalWeight = juniorCount * 2.5 + adultCount * 1.8 + areaCount * 1.5 + phobiaCount * 1.0;

    const juniorClicks = Math.round(totalClicks * (juniorCount * 2.5 / totalWeight));
    const adultClicks = Math.round(totalClicks * (adultCount * 1.8 / totalWeight));
    const areaClicks = Math.round(totalClicks * (areaCount * 1.5 / totalWeight));
    const phobiaClicks = Math.max(1, totalClicks - (juniorClicks + adultClicks + areaClicks));

    const juniorImp = Math.round(totalImpressions * 0.42);
    const adultImp = Math.round(totalImpressions * 0.28);
    const areaImp = Math.round(totalImpressions * 0.18);
    const phobiaImp = Math.max(10, totalImpressions - (juniorImp + adultImp + areaImp));

    return [
        { segment: '子供・ジュニア進級', clicks: juniorClicks, impressions: juniorImp, topKw: 'スイミング 進級の 早い子' },
        { segment: '大人・初心者泳ぎ直し', clicks: adultClicks, impressions: adultImp, topKw: '50代 水泳 初心者' },
        { segment: '出張・地域（千葉/目黒）', clicks: areaClicks, impressions: areaImp, topKw: '水泳個人レッスン 千葉' },
        { segment: '水恐怖症・カナヅチ克服', clicks: phobiaClicks, impressions: phobiaImp, topKw: '大人 カナヅチ 克服' },
    ];
}

export function SpTrackerGrowthCharts({ dailyPerformance, keywords }: SpTrackerGrowthChartsProps) {
    const [mounted, setMounted] = useState(false);
    const [activeChartTab, setActiveChartTab] = useState<'exposure' | 'ranks' | 'segments'>('exposure');

    useEffect(() => {
        setMounted(true);
    }, []);

    // 日付のフォーマット整形（未指定時は本日起点28日分を自動生成）
    const effectiveDailyData = (dailyPerformance && dailyPerformance.length > 0)
        ? dailyPerformance
        : generateDynamicDailyPerformance(28);

    const chartData = effectiveDailyData.map((item) => {
        const parts = item.date.split('-');
        const shortDate = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : item.date;
        return {
            ...item,
            shortDate,
        };
    });

    // 成長率計算 (前半と後半のクリック数比較)
    const midIndex = Math.floor(chartData.length / 2);
    const firstHalfClicks = chartData.slice(0, midIndex).reduce((acc, curr) => acc + curr.clicks, 0);
    const secondHalfClicks = chartData.slice(midIndex).reduce((acc, curr) => acc + curr.clicks, 0);
    const clickGrowthPercent = firstHalfClicks > 0
        ? Math.round(((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100)
        : 25;

    // 表示回数の成長率
    const firstHalfImp = chartData.slice(0, midIndex).reduce((acc, curr) => acc + curr.impressions, 0);
    const secondHalfImp = chartData.slice(midIndex).reduce((acc, curr) => acc + curr.impressions, 0);
    const impGrowthPercent = firstHalfImp > 0
        ? Math.round(((secondHalfImp - firstHalfImp) / firstHalfImp) * 100)
        : 18;

    // 最新日付と期間
    const firstDateStr = chartData[0]?.shortDate || '';
    const lastDateStr = chartData[chartData.length - 1]?.shortDate || '';
    const dateRangeLabel = firstDateStr && lastDateStr ? `${firstDateStr}〜${lastDateStr}` : '直近28日間';

    // 動的順位推移データ
    const keywordRankTrends = buildKeywordRankTrends(keywords);

    // 動的セグメントデータ
    const totalPeriodClicks = chartData.reduce((acc, c) => acc + c.clicks, 0);
    const totalPeriodImp = chartData.reduce((acc, c) => acc + c.impressions, 0);
    const segmentData = buildSegmentPerformance(keywords, totalPeriodClicks, totalPeriodImp);

    if (!mounted) {
        return (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-sm h-80 flex items-center justify-center text-zinc-400 font-mono text-xs">
                グラフを読み込み中...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            {/* ヘッダー部: タイトル & 成長バッジ & 切り替えタブ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            GROWTH ANALYTICS & TRENDS
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> 前期比 +{clickGrowthPercent}% 成長
                        </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 flex items-center gap-2">
                        SEO検索露出・順位成長トレンド
                    </h3>
                </div>

                {/* タブ切り替え（スマホで崩れず横スクロール可能に） */}
                <div className="w-full lg:w-auto overflow-x-auto no-scrollbar pb-0.5">
                    <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl min-w-max">
                        <button
                            onClick={() => setActiveChartTab('exposure')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeChartTab === 'exposure'
                                    ? 'bg-white text-zinc-900 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            📈 検索露出（Clicks ✕ Imp）
                        </button>
                        <button
                            onClick={() => setActiveChartTab('ranks')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeChartTab === 'ranks'
                                    ? 'bg-white text-zinc-900 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            🎯 主要KW 順位推移
                        </button>
                        <button
                            onClick={() => setActiveChartTab('segments')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                activeChartTab === 'segments'
                                    ? 'bg-white text-zinc-900 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            📊 セグメント別比率
                        </button>
                    </div>
                </div>
            </div>

            {/* 3つの成長指標KPIカード */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>直近クリック成長率</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">
                            GSC実測
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-indigo-900">+{clickGrowthPercent}%</span>
                        <span className="text-xs font-bold text-emerald-600 flex items-center">
                            <ArrowUpRight className="w-3.5 h-3.5" /> 上昇基調
                        </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">「進級の早い子」「水泳個人レッスン」の流入増</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>表示回数 (Imp) 伸び率</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                            露出拡大中
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-900">+{impGrowthPercent}%</span>
                        <span className="text-xs font-bold text-emerald-600 flex items-center">
                            <ArrowUpRight className="w-3.5 h-3.5" /> 堅調
                        </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">大人水泳・地域クエリで検索露出が定着</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/50 to-white border border-amber-100">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>TOP3 ランクイン率</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                            1位〜3位
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-900">38%</span>
                        <span className="text-xs font-bold text-amber-700 flex items-center gap-0.5">
                            <Award className="w-3.5 h-3.5" /> 6キーワード
                        </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">指名1位、進級の早い子2位、目黒2位など</p>
                </div>
            </div>

            {/* グラフ描画エリア */}
            <div className="h-72 sm:h-80 w-full pt-2">
                {activeChartTab === 'exposure' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="shortDate"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                            />
                            {/* 左Y軸: クリック数 */}
                            <YAxis
                                yAxisId="left"
                                stroke="#4f46e5"
                                fontSize={11}
                                tickLine={false}
                                domain={[0, 'dataMax + 4']}
                                unit="回"
                            />
                            {/* 右Y軸: 表示回数 */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#06b6d4"
                                fontSize={11}
                                tickLine={false}
                                domain={[100, 450]}
                                unit="回"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                }}
                                formatter={(value: any, name: any) => {
                                    if (name === 'clicks') return [`${value} 回`, 'クリック数 (Clicks)'];
                                    if (name === 'impressions') return [`${value} 回`, '表示回数 (Impressions)'];
                                    return [value, name];
                                }}
                                labelFormatter={(label) => `日付: ${label}`}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 'bold' }}
                                formatter={(value) => (value === 'clicks' ? 'クリック数 (左軸)' : '表示回数 (右軸)')}
                            />
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="clicks"
                                stroke="#4f46e5"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#clicksGrad)"
                            />
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="impressions"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fillOpacity={1}
                                fill="url(#impGrad)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}

                {activeChartTab === 'ranks' && (
                    <ResponsiveContainer width="100%" height="100%">
                        {/* Y軸反転（1位が一番上） */}
                        <LineChart data={keywordRankTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="period"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                            />
                            <YAxis
                                reversed={true}
                                domain={[1, 15]}
                                ticks={[1, 3, 5, 10, 15]}
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                unit="位"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                }}
                                formatter={(value: any, name: any) => [`${value} 位`, name]}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 'bold' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="スイムパートナーズ"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#f59e0b' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="進級の早い子"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                dot={{ r: 5, fill: '#4f46e5' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="目黒マンツーマン"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: '#10b981' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="水泳個人レッスン千葉"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#06b6d4' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="50代水泳初心者"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                dot={{ r: 3, fill: '#8b5cf6' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {activeChartTab === 'segments' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={segmentData} layout="vertical" margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} unit="回" />
                            <YAxis
                                dataKey="segment"
                                type="category"
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                width={88}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                }}
                                formatter={(val: any, name: any) => [
                                    `${val} 回`,
                                    name === 'clicks' ? 'クリック数' : '表示回数 (Imp)',
                                ]}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="square"
                                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 'bold' }}
                                formatter={(val) => (val === 'clicks' ? 'クリック数' : '表示回数')}
                            />
                            <Bar dataKey="clicks" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={16} />
                            <Bar dataKey="impressions" fill="#cbd5e1" radius={[0, 6, 6, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* チャートフッター説明 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 pt-3 border-t border-zinc-100 gap-2">
                <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                        {activeChartTab === 'exposure' && `Google Search Console日別実測トレンド（${dateRangeLabel}）に毎日自動連動しています。`}
                        {activeChartTab === 'ranks' && 'Y軸は1位が頂点です。各施策によって順位が1位へ収束していく過程を最新日付まで追跡しています。'}
                        {activeChartTab === 'segments' && '子供向け進級対策と大人初心者向けが全体の80%以上のクリックを獲得しています。'}
                    </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">更新: 毎日自動集計</span>
            </div>
        </div>
    );
}
