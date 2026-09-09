'use client';

import React, { useState } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import {
    SpreadsheetAnalyticsData,
} from '@/lib/spreadsheet-types';
import {
    saveSpreadsheetConfigAction,
    removeSpreadsheetConfigAction,
} from '@/actions/spreadsheet-analytics-actions';
import { toast } from 'sonner';
import {
    TableProperties,
    Copy,
    Check,
    ExternalLink,
    RefreshCw,
    TrendingUp,
    Users,
    DollarSign,
    Target,
    HelpCircle,
    FileSpreadsheet,
    Calendar,
    Award,
    MapPin,
} from 'lucide-react';

interface SpTrackerConversionCustomerViewProps {
    analyticsData: SpreadsheetAnalyticsData;
    onRefresh: () => Promise<void>;
}

export function SpTrackerConversionCustomerView({
    analyticsData,
    onRefresh,
}: SpTrackerConversionCustomerViewProps) {
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [inputUrl, setInputUrl] = useState(analyticsData.spreadsheetUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(analyticsData.serviceAccountEmail);
        setCopiedEmail(true);
        toast.success('サービスアカウントのメールアドレスをコピーしました');
        setTimeout(() => setCopiedEmail(false), 2500);
    };

    const handleSaveUrl = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputUrl.trim()) {
            toast.error('URLまたはシートIDを入力してください');
            return;
        }
        setIsSaving(true);
        try {
            const res = await saveSpreadsheetConfigAction(inputUrl);
            if (res.success) {
                toast.success(res.message);
                setIsEditingUrl(false);
                await onRefresh();
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || '保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveConfig = async () => {
        if (!confirm('スプレッドシート連携設定を解除しますか？')) return;
        try {
            await removeSpreadsheetConfigAction();
            toast.success('連携設定を解除しました');
            await onRefresh();
        } catch (err: any) {
            toast.error('解除に失敗しました');
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await onRefresh();
            toast.success('最新のスプレッドシートデータを同期しました');
        } catch (err) {
            toast.error('同期に失敗しました');
        } finally {
            setIsSyncing(false);
        }
    };

    const { totalConversions, channelPerformances, monthlyTrends, segmentAnalyses, demographics } = analyticsData;

    return (
        <div className="space-y-8">
            {/* 1. スプレッドシート連携ステータスカード */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-zinc-900">Googleスプレッドシート連携</h3>
                                {analyticsData.configured ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        同期稼働中
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        未連携（標準テンプレート表示中）
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                スプレッドシートと双方向連携し、流入経路別コンバージョンと顧客データを集計します。
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditingUrl(!isEditingUrl)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-all"
                        >
                            {isEditingUrl ? '閉じる' : analyticsData.configured ? 'URL変更' : 'シートを連携する'}
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? '同期中...' : '再同期'}
                        </button>
                    </div>
                </div>

                {/* URL設定入力フォーム（トグル表示） */}
                {isEditingUrl && (
                    <form onSubmit={handleSaveUrl} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3">
                        <div className="text-xs font-bold text-zinc-800">
                            連携するGoogleスプレッドシートのURLまたはIDを入力
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/XXXXXXXXX/edit..."
                                className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 whitespace-nowrap"
                                >
                                    {isSaving ? '保存中...' : '連携を保存'}
                                </button>
                                {analyticsData.configured && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveConfig}
                                        className="px-3 py-2 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-all whitespace-nowrap"
                                    >
                                        解除
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                )}

                {/* サービスアカウント共有案内 */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                        <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                            スプレッドシートの共有設定（重要）
                        </div>
                        <p className="text-indigo-800/80 text-[11px]">
                            対象シートの「共有」設定で、下記アドレスを**閲覧者**として追加してください。
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                        <code className="text-[11px] font-mono text-zinc-700 select-all max-w-[240px] sm:max-w-none truncate">
                            {analyticsData.serviceAccountEmail}
                        </code>
                        <button
                            onClick={handleCopyEmail}
                            className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 transition-all"
                            title="メールアドレスをコピー"
                        >
                            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. 主要コンバージョン KPI カード */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>Web問い合わせCV</span>
                        <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                            <Target className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div className="text-3xl font-black text-zinc-900 mt-1">{totalConversions.inquiries} 件</div>
                    <p className="text-[11px] text-zinc-400 mt-1">SEO/GEO・広告・SNS合算</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>体験レッスン受講CV</span>
                        <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                            <TrendingUp className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 mt-1">{totalConversions.trials} 件</div>
                    <p className="text-[11px] text-emerald-700/80 font-bold mt-1">
                        体験移行率 {Math.round((totalConversions.trials / totalConversions.inquiries) * 100)}%
                    </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>本入会CV</span>
                        <span className="p-1 rounded-md bg-amber-50 text-amber-600">
                            <Award className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div className="text-3xl font-black text-amber-600 mt-1">{totalConversions.enrollments} 件</div>
                    <p className="text-[11px] text-amber-700/80 font-bold mt-1">
                        全体成約率 {totalConversions.overallCvr}
                    </p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span>獲得顧客 推定LTV</span>
                        <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                            <DollarSign className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <div className="text-3xl font-black text-blue-600 mt-1">
                        ¥{(totalConversions.enrollments * 150000).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">平均単価×継続期間ベース</p>
                </div>
            </div>

            {/* 3. 流入経路別コンバージョンパフォーマンス テーブル */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            CHANNEL ATTRIBUTION & CONVERSION
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            流入経路別 コンバージョン獲得実績
                        </h3>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">集計期間: 直近（累計）</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-200 text-[11px] font-mono font-bold text-zinc-400 uppercase">
                                <th className="pb-3 px-3">流入経路（チャネル）</th>
                                <th className="pb-3 px-3 text-right">セッション</th>
                                <th className="pb-3 px-3 text-right">問い合わせ</th>
                                <th className="pb-3 px-3 text-right">体験受講</th>
                                <th className="pb-3 px-3 text-right">本入会</th>
                                <th className="pb-3 px-3 text-right">問い合わせCVR</th>
                                <th className="pb-3 px-3 text-right">成約CVR</th>
                                <th className="pb-3 px-3 text-right">獲得単価(CPA)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                            {channelPerformances.map((c) => (
                                <tr key={c.channel} className="hover:bg-zinc-50/80 transition-colors">
                                    <td className="py-4 px-3 font-bold text-zinc-900 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                        {c.label}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono text-zinc-600">
                                        {c.sessions.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono font-bold text-zinc-900">
                                        {c.inquiries}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono font-bold text-emerald-600">
                                        {c.trials}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono font-black text-amber-600">
                                        {c.enrollments}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono text-zinc-500">
                                        {c.inquiryCvr}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono font-bold text-indigo-600">
                                        {c.enrollmentCvr}
                                    </td>
                                    <td className="py-4 px-3 text-right font-mono text-xs text-zinc-600">
                                        {c.cpa && c.cpa > 0 ? `¥${c.cpa.toLocaleString()}` : <span className="text-zinc-400">¥0 (オーガニック)</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. 月次コンバージョン推移グラフ */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            MONTHLY CONVERSION TREND
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            月別コンバージョン獲得推移
                        </h3>
                    </div>
                </div>

                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyTrends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="inqGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="enrGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="件" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderRadius: '12px',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '12px',
                                }}
                            />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                            <Area type="monotone" dataKey="inquiries" name="問い合わせ件数" stroke="#4f46e5" strokeWidth={2.5} fill="url(#inqGrad)" />
                            <Area type="monotone" dataKey="trials" name="体験レッスン受講" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                            <Area type="monotone" dataKey="enrollments" name="本入会成約" stroke="#f59e0b" strokeWidth={3} fill="url(#enrGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 5. 顧客分析（セグメント・年代・地域） */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* セグメント別構成 & LTV */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            CUSTOMER SEGMENTS & LTV
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            受講者セグメント別分析
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {segmentAnalyses.map((s) => (
                            <div key={s.segment} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-900 text-sm">{s.label}</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        シェア {s.sharePercent}%
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-zinc-200/50">
                                    <div>
                                        <div className="text-[10px] text-zinc-500">受講者数</div>
                                        <div className="text-base font-black text-zinc-900 mt-0.5">{s.customerCount} 名</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500">平均継続</div>
                                        <div className="text-base font-black text-emerald-600 mt-0.5">{s.avgDurationMonths} ヶ月</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-zinc-500">平均LTV</div>
                                        <div className="text-base font-black text-indigo-600 mt-0.5">¥{(s.avgLtv / 10000).toFixed(1)}万</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* エリア別分布 */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            GEOGRAPHIC DISTRIBUTION
                        </div>
                        <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-rose-500" /> エリア別顧客分布
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {demographics.areas.map((a) => (
                            <div key={a.area} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold text-zinc-700">
                                    <span>{a.area}</span>
                                    <span>{a.count}名 ({a.share}%)</span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 rounded-full"
                                        style={{ width: `${a.share}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 年代別構成 */}
                    <div className="pt-4 border-t border-zinc-100 space-y-3">
                        <div className="text-xs font-bold text-zinc-800">年代別構成</div>
                        <div className="space-y-2">
                            {demographics.ageGroups.map((g) => (
                                <div key={g.group} className="flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-600">{g.group}</span>
                                    <span className="font-mono font-bold text-zinc-900">{g.count}名 ({g.share}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
