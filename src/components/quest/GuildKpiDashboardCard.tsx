'use client'

import React, { useState } from 'react'
import { GuildKpiData } from '@/types/quest-erp'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts'
import {
    TrendingUp,
    Users,
    CalendarCheck,
    DollarSign,
    Clock,
    Target,
    Activity,
    Award,
    Sparkles,
    CheckCircle2,
    ArrowUpRight,
    Repeat,
    Layers,
    ChevronRight,
} from 'lucide-react'

interface GuildKpiDashboardCardProps {
    data: GuildKpiData
}

type ChartViewMode = 'all_summary' | 'funnel' | 'lessons' | 'unit_economics'

export function GuildKpiDashboardCard({ data }: GuildKpiDashboardCardProps) {
    const [viewMode, setViewMode] = useState<ChartViewMode>('all_summary')

    const {
        trialConversionRate,
        trialConversionTarget,
        avgLeadTimeDays,
        avgRetentionMonths,
        avgLessonCountPerStudent,
        avgLtvAmount,
        overallCpa,
        totalLineFriends,
        totalTrialInquiries,
        totalTrialLessons,
        totalLessons,
        monthlyTrends,
    } = data

    const isConversionTargetAchieved = trialConversionRate >= trialConversionTarget

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
            {/* ヘッダーエリア */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-sky-600" />
                            GUILD EXECUTIVE KPI HUD
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            全実データ連動
                        </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-sky-600" />
                        スイムパートナーズ ギルド経営KPIアナリティクス
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        集客ファネル（LINE追加・体験申込・実施）・レッスン稼働・CPA・LTV・成約率・リードタイムの全統括
                    </p>
                </div>

                {/* グラフ表示切り替えタブ */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode('all_summary')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            viewMode === 'all_summary'
                                ? 'bg-white text-sky-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        総合サマリー
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('funnel')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            viewMode === 'funnel'
                                ? 'bg-white text-sky-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        ファネル（LINE・体験）
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('lessons')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            viewMode === 'lessons'
                                ? 'bg-white text-sky-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        レッスン実施推移
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('unit_economics')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            viewMode === 'unit_economics'
                                ? 'bg-white text-sky-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        CPA & LTV
                    </button>
                </div>
            </div>

            {/* 重要KPIハイライトカード 6枚 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
                {/* 1. 体験からの成約率 */}
                <div className="bg-gradient-to-br from-white to-sky-50/50 border border-sky-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-sky-400 transition">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                        <span>体験からの成約率</span>
                        <Target className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <div className="my-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">{trialConversionRate}%</span>
                            <span className="text-[10px] text-slate-500">/ 目標{trialConversionTarget}%</span>
                        </div>
                        {/* プログレスゲージ */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isConversionTargetAchieved ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, (trialConversionRate / 100) * 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className={`font-bold ${isConversionTargetAchieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isConversionTargetAchieved ? '🎯 目標達成中' : '⚠️ 目標80%まであと少し'}
                        </span>
                    </div>
                </div>

                {/* 2. リードタイム */}
                <div className="bg-gradient-to-br from-white to-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-sky-300 transition">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                        <span>平均リードタイム</span>
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="my-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-indigo-700">{avgLeadTimeDays}</span>
                            <span className="text-xs font-bold text-slate-600">日</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                            初回接触〜入会・体験確定
                        </p>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 font-bold">
                        即応スピード SSSランク
                    </div>
                </div>

                {/* 3. 平均継続期間 */}
                <div className="bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                        <span>平均継続期間</span>
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="my-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-emerald-700">{avgRetentionMonths}</span>
                            <span className="text-xs font-bold text-slate-600">ヶ月</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                            高リテンション・ストック定着
                        </p>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 text-[10px] text-emerald-700 font-bold">
                        休会・解約防止強化中
                    </div>
                </div>

                {/* 4. 平均利用回数 */}
                <div className="bg-gradient-to-br from-white to-purple-50/40 border border-purple-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-purple-300 transition">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                        <span>平均利用回数</span>
                        <Repeat className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="my-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-purple-700">{avgLessonCountPerStudent}</span>
                            <span className="text-xs font-bold text-slate-600">回 / 人</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                            生徒1人当たり受講コマ数
                        </p>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 text-[10px] text-purple-700 font-bold">
                        累計 {totalLessons}コマ実施
                    </div>
                </div>

                {/* 5. LTV（総利用費用の平均） */}
                <div className="bg-gradient-to-br from-white to-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-amber-300 transition">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                        <span>LTV (平均総利用費用)</span>
                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="my-2">
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-xs font-black text-slate-600">¥</span>
                            <span className="text-xl md:text-2xl font-black text-amber-800">
                                {avgLtvAmount.toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                            利用回数 {avgLessonCountPerStudent}回 × 平均単価
                        </p>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 text-[10px] text-amber-800 font-bold">
                        顧客生涯価値 高収益モデル
                    </div>
                </div>

                {/* 6. CPA（顧客獲得単価） */}
                <div className="bg-gradient-to-br from-white to-rose-50/40 border border-rose-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-rose-300 transition">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                        <span>CPA (顧客獲得単価)</span>
                        <Award className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div className="my-2">
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-xs font-black text-slate-600">¥</span>
                            <span className="text-xl md:text-2xl font-black text-rose-700">
                                {overallCpa.toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                            目標 ¥5,000 以下達成
                        </p>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 text-[10px] text-rose-700 font-bold">
                        LTV/CAC倍率 {((avgLtvAmount * 0.4) / Math.max(1, overallCpa)).toFixed(1)}x
                    </div>
                </div>
            </div>

            {/* メイングラフ表示エリア */}
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                            {viewMode === 'all_summary' && '📊 全KPI月次推移サマリー（ライン追加・体験申込・体験実施・レッスン数・成約率）'}
                            {viewMode === 'funnel' && ' funnelファネル獲得推移（ライン追加 ➔ 体験申込 ➔ 体験実施）'}
                            {viewMode === 'lessons' && '🏊 レッスン稼働コマ数推移（総レッスン実施数 ＆ 体験実施数）'}
                            {viewMode === 'unit_economics' && '💰 ユニットエコノミクス推移（顧客獲得単価CPA ＆ 顧客生涯価値LTV）'}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            直近6ヶ月の実績と成長トレンド（2026年5月 〜 10月）
                        </p>
                    </div>

                    {/* 指標バッジ */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> LINE追加: {totalLineFriends}件
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> 体験申込: {totalTrialInquiries}件
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 体験実施: {totalTrialLessons}回
                        </span>
                    </div>
                </div>

                {/* チャート本体 */}
                <div className="w-full h-[320px] md:h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {viewMode === 'all_summary' ? (
                            <ComposedChart data={monthlyTrends} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#0284c7" fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[50, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                                    formatter={(value: any, name: any) => {
                                        if (name === '成約率') return [`${value}%`, name]
                                        if (name === 'CPA') return [`¥${Number(value).toLocaleString()}`, name]
                                        return [`${Number(value).toLocaleString()}件/回`, name]
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                <Bar yAxisId="left" dataKey="lineFriendsAdded" name="ライン追加" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                <Bar yAxisId="left" dataKey="trialInquiries" name="体験申し込み数" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                <Bar yAxisId="left" dataKey="trialLessonsDone" name="体験実施数" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                <Line yAxisId="left" type="monotone" dataKey="totalLessonsDone" name="総レッスン実施数" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="trialConversionRate" name="体験成約率(%)" stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
                            </ComposedChart>
                        ) : viewMode === 'funnel' ? (
                            <BarChart data={monthlyTrends} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: any, name: any) => [`${Number(value).toLocaleString()}件`, name]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                <Bar dataKey="lineFriendsAdded" name="① ライン友だち追加" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="trialInquiries" name="② 体験申し込み" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="trialLessonsDone" name="③ 体験レッスン実施" fill="#34d399" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : viewMode === 'lessons' ? (
                            <AreaChart data={monthlyTrends} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotalLessons" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="colorTrialLessons" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: any, name: any) => [`${Number(value).toLocaleString()}コマ`, name]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                <Area type="monotone" dataKey="totalLessonsDone" name="総レッスン実施コマ数" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorTotalLessons)" />
                                <Area type="monotone" dataKey="trialLessonsDone" name="体験レッスン実施コマ数" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrialLessons)" />
                            </AreaChart>
                        ) : (
                            <ComposedChart data={monthlyTrends} margin={{ top: 15, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis yAxisId="cpaAxis" stroke="#e11d48" fontSize={12} tickLine={false} axisLine={false} unit="円" domain={[2000, 8000]} />
                                <YAxis yAxisId="ltvAxis" orientation="right" stroke="#059669" fontSize={12} tickLine={false} axisLine={false} unit="円" domain={[50000, 100000]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: any, name: any) => [`¥${Number(value).toLocaleString()}`, name]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                                <Bar yAxisId="cpaAxis" dataKey="cpa" name="顧客獲得単価 (CPA)" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                <Line yAxisId="ltvAxis" type="monotone" dataKey="avgLtv" name="顧客生涯価値 (LTV平均)" stroke="#059669" strokeWidth={3.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                            </ComposedChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 月次データ一覧ミニテーブル */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                            <th className="py-2.5 px-3">対象月</th>
                            <th className="py-2.5 px-3 text-right">ライン追加</th>
                            <th className="py-2.5 px-3 text-right">体験申込数</th>
                            <th className="py-2.5 px-3 text-right">体験実施数</th>
                            <th className="py-2.5 px-3 text-right">レッスン実施数</th>
                            <th className="py-2.5 px-3 text-right">成約率</th>
                            <th className="py-2.5 px-3 text-right">CPA(獲得単価)</th>
                            <th className="py-2.5 px-3 text-right">LTV(平均費用)</th>
                            <th className="py-2.5 px-3 text-right">平均利用回数</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {monthlyTrends.map((row) => (
                            <tr key={row.yearMonth} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{row.monthLabel}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-sky-700">{row.lineFriendsAdded}人</td>
                                <td className="py-2.5 px-3 text-right font-medium text-indigo-700">{row.trialInquiries}件</td>
                                <td className="py-2.5 px-3 text-right font-medium text-emerald-700">{row.trialLessonsDone}回</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">{row.totalLessonsDone}コマ</td>
                                <td className="py-2.5 px-3 text-right font-bold">
                                    <span className={`px-2 py-0.5 rounded-md ${
                                        row.trialConversionRate >= 80 ? 'bg-emerald-50 text-emerald-700 font-black' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                        {row.trialConversionRate}%
                                    </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-rose-700">¥{row.cpa.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-800">¥{row.avgLtv.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{row.avgLessonCount}回</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
