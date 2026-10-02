'use client';

import React, { useState } from 'react';
import {
    MapPin,
    ShieldCheck,
    AlertTriangle,
    Sparkles,
    CheckCircle2,
    Compass,
    Layers,
    Search,
    ExternalLink,
    TrendingUp,
    ChevronRight,
    Building2,
    Award,
    Flame,
    ArrowUpRight,
    HelpCircle,
} from 'lucide-react';
import {
    AREA_SEO_AUDIT_DATA,
    getAreaRegionGroups,
    AreaSeoAuditItem,
    AreaSeoStatus,
} from '@/lib/area-seo-audit';
import { ArticleType } from '@/lib/generated-articles-storage';

interface SpTrackerAreaSeoAuditCardProps {
    onOpenGenerator?: (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string
    ) => void;
}

export function SpTrackerAreaSeoAuditCard({
    onOpenGenerator,
}: SpTrackerAreaSeoAuditCardProps) {
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);

    const regionGroups = getAreaRegionGroups();

    // フィルタリング
    const filteredAreas = AREA_SEO_AUDIT_DATA.filter((item) => {
        if (selectedGroup === 'tokyo_23' && !(item.prefecture === 'tokyo' && item.areaKey !== 'hachioji_machida')) return false;
        if (selectedGroup === 'kanagawa' && item.prefecture !== 'kanagawa') return false;
        if (selectedGroup === 'chiba' && item.prefecture !== 'chiba') return false;
        if (selectedGroup === 'tokyo_tama' && item.areaKey !== 'hachioji_machida') return false;
        if (selectedGroup === 'saitama' && item.prefecture !== 'saitama') return false;

        if (statusFilter !== 'all' && item.status !== statusFilter) return false;

        return true;
    });

    // サマリー集計
    const totalAreas = AREA_SEO_AUDIT_DATA.length;
    const avgScore = Math.round(
        AREA_SEO_AUDIT_DATA.reduce((acc, c) => acc + c.seoScore, 0) / totalAreas
    );
    const completedCount = AREA_SEO_AUDIT_DATA.filter((a) => a.status === 'completed').length;
    const needsLpCount = AREA_SEO_AUDIT_DATA.filter((a) => a.status === 'needs_lp').length;
    const untappedCount = AREA_SEO_AUDIT_DATA.filter((a) => a.status === 'untapped_opportunity').length;

    const getStatusStyle = (status: AreaSeoStatus) => {
        switch (status) {
            case 'completed':
                return {
                    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                    badge: '対策完了（1〜2位）',
                    dot: 'bg-emerald-500',
                };
            case 'needs_lp':
                return {
                    bg: 'bg-rose-50 text-rose-800 border-rose-300',
                    badge: '要改善（専用LP不足・離脱大）',
                    dot: 'bg-rose-500',
                };
            case 'in_progress':
                return {
                    bg: 'bg-amber-50 text-amber-800 border-amber-300',
                    badge: '対策進行中（順位上昇中）',
                    dot: 'bg-amber-500',
                };
            case 'untapped_opportunity':
                return {
                    bg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
                    badge: '未開拓ブルーオーシャン',
                    dot: 'bg-indigo-500',
                };
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    };

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            {/* ヘッダーセクション */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-zinc-100 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
                            <Compass className="w-5 h-5" />
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                            商圏エリア別 SEO対策状況・診断ダッシュボード
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            東京23区・神奈川・多摩・千葉・埼玉
                        </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                        「各エリアでSEO対策がしっかりできているか」を専用LPの有無・順位・公営プール拠点・需要から診断
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-zinc-100 px-3 py-1.5 rounded-xl">
                        エリア平均SEOスコア: <span className="text-sm font-black text-indigo-600">{avgScore}点</span>
                    </span>
                </div>
            </div>

            {/* サマリー分析メーター（4大ステータス） */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        分析商圏数
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                        {totalAreas} <span className="text-xs font-normal text-zinc-500">エリア</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">1都3県の主要水泳需要圏</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        対策完了エリア
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                        {completedCount} <span className="text-xs font-normal text-emerald-600">エリア</span>
                    </div>
                    <span className="text-[10px] text-emerald-700">目黒・港区、千葉市（1〜2位）</span>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1">
                    <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        最優先改善（LP不足）
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
                        {needsLpCount} <span className="text-xs font-normal text-rose-600">エリア</span>
                    </div>
                    <span className="text-[10px] text-rose-700">横浜、世田谷、川崎（アクセス大）</span>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                    <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        未開拓ブルーオーシャン
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono">
                        {untappedCount} <span className="text-xs font-normal text-indigo-600">エリア</span>
                    </div>
                    <span className="text-[10px] text-indigo-700">浦安、八景、八王子、埼玉</span>
                </div>
            </div>

            {/* エリアグループ選択タブ */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                        <button
                            onClick={() => setSelectedGroup('all')}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                                selectedGroup === 'all'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                            全商圏 ({totalAreas})
                        </button>
                        <button
                            onClick={() => setSelectedGroup('tokyo_23')}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                                selectedGroup === 'tokyo_23'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                            東京都23区（目黒・世田谷など）
                        </button>
                        <button
                            onClick={() => setSelectedGroup('kanagawa')}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                                selectedGroup === 'kanagawa'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                            神奈川（横浜・八景・川崎）
                        </button>
                        <button
                            onClick={() => setSelectedGroup('chiba')}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                                selectedGroup === 'chiba'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                            千葉（浦安・市川・船橋・千葉市）
                        </button>
                        <button
                            onClick={() => setSelectedGroup('tokyo_tama')}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                                selectedGroup === 'tokyo_tama'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                            多摩・八王子
                        </button>
                        <button
                            onClick={() => setSelectedGroup('saitama')}
                            className={`px-3 py-1.5 rounded-lg border transition-all ${
                                selectedGroup === 'saitama'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                            }`}
                        >
                            提案エリア（埼玉）
                        </button>
                    </div>

                    {/* ステータスフィルター */}
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                        <span className="text-zinc-400">状態:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-slate-700 font-medium text-xs focus:outline-hidden"
                        >
                            <option value="all">すべて</option>
                            <option value="completed">対策完了のみ</option>
                            <option value="needs_lp">要改善（LP不足）のみ</option>
                            <option value="untapped_opportunity">未開拓のみ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* エリア別診断カード グリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAreas.map((area) => {
                    const statusInfo = getStatusStyle(area.status);
                    const isExpanded = expandedAreaId === area.id;

                    return (
                        <div
                            key={area.id}
                            className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                            <div className="space-y-3.5">
                                {/* エリア名・親地域・スコア */}
                                <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                                                {area.parentRegionLabel}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${statusInfo.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                                {statusInfo.badge}
                                            </span>
                                        </div>
                                        <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            {area.areaName}
                                        </h4>
                                    </div>

                                    {/* SEO対策スコア */}
                                    <div className={`p-2 rounded-xl border text-center min-w-[72px] ${getScoreColor(area.seoScore)}`}>
                                        <span className="text-[9px] font-bold block uppercase tracking-wider">SEOスコア</span>
                                        <span className="text-xl font-black font-mono leading-none">
                                            {area.seoScore}
                                        </span>
                                        <span className="text-[10px] font-normal"> /100</span>
                                    </div>
                                </div>

                                {/* 主要キーワード & 専用LPの状況 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-0.5">
                                        <span className="text-[10px] font-bold text-zinc-400 block">ターゲット主要KW</span>
                                        <div className="font-bold text-slate-900 truncate" title={area.primaryKeyword}>
                                            「{area.primaryKeyword}」
                                        </div>
                                        <div className="text-[11px] text-zinc-600 flex items-center gap-1">
                                            順位: {area.currentRank ? (
                                                <span className="font-bold font-mono text-indigo-600">
                                                    Google {area.currentRank}位
                                                </span>
                                            ) : (
                                                <span className="text-zinc-400 font-medium">圏外 / 未対策</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-0.5">
                                        <span className="text-[10px] font-bold text-zinc-400 block">専用受け皿LP</span>
                                        {area.hasDedicatedLp ? (
                                            <div className="font-bold text-emerald-700 flex items-center gap-1 truncate">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                                {area.dedicatedLpPath}
                                            </div>
                                        ) : (
                                            <div className="font-bold text-rose-700 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                                専用LPなし（汎用トップ）
                                            </div>
                                        )}
                                        <div className="text-[10px] text-zinc-400 font-mono">
                                            月間検索: {area.monthlySearchVolume}回 / GA4: {area.ga4RecentSessions}回
                                        </div>
                                    </div>
                                </div>

                                {/* 出張対応の主要公営プール一覧 */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5 text-slate-600" />
                                            出張対応の主要公営プール施設:
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-400">{area.majorFacilities.length}拠点</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {area.majorFacilities.map((fac, fIdx) => (
                                            <span
                                                key={fIdx}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200/60"
                                                title={`${fac.address} - ${fac.poolSpecs}`}
                                            >
                                                🏊 {fac.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* 診断インサイト & アクションアドバイス */}
                                <div className="space-y-1.5 text-xs bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                    <div className="font-bold text-indigo-950 flex items-center gap-1 text-[11px]">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                        診断サマリー:
                                    </div>
                                    <p className="text-zinc-700 text-[11px] leading-relaxed">
                                        {area.diagnosisSummary}
                                    </p>
                                    <p className="text-indigo-900 font-bold text-[11px] pt-1 border-t border-indigo-100/80">
                                        💡 {area.actionAdvice}
                                    </p>
                                </div>
                            </div>

                            {/* フッターアクションバー */}
                            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold text-zinc-400">
                                    CVR期待度: ★{area.cvrPotential.toFixed(1)} / 競合: {area.competitorDensity}
                                </span>

                                <button
                                    onClick={() => {
                                        if (onOpenGenerator) {
                                            const poolNames = area.majorFacilities.map((f) => f.name).join('、');
                                            onOpenGenerator(
                                                area.primaryKeyword,
                                                'seo',
                                                area.recommendedAction.suggestedSlug,
                                                `【エリア特化コンテンツ制作リクエスト】\n対象エリア: ${area.areaName}（${area.parentRegionLabel}）\n出張対応公営プール: ${poolNames}\n課題・改善アドバイス: ${area.actionAdvice}`
                                            );
                                        }
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.02] cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                    {area.recommendedAction.label}
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
