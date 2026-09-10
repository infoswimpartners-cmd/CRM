'use client';

import React, { useState } from 'react';
import {
    Trophy,
    Hourglass,
    Target,
    Sparkles,
    CheckCircle2,
    Calendar,
    ArrowRight,
    History,
    ShieldAlert,
    Clock,
    X,
    ExternalLink,
    Copy,
    Check,
    FileText,
    Code2,
    Layers,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { SeoRankWatchState, ImprovementLogEntry } from '@/lib/seo-rank-watch';
import { generateSeoImprovementKit, SeoImprovementKit } from '@/lib/seo-improvement-generator';
import { startObservingAction, markAsAchievedAction, completeObservingAction } from '@/actions/sp-tracker-actions';

interface SpTrackerRankWatchCardProps {
    state?: SeoRankWatchState;
    onRefresh: () => Promise<void>;
}

export function SpTrackerRankWatchCard({ state, onRefresh }: SpTrackerRankWatchCardProps) {
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isKitModalOpen, setIsKitModalOpen] = useState(false);
    const [activeKit, setActiveKit] = useState<SeoImprovementKit | null>(null);
    const [kitActiveTab, setKitActiveTab] = useState<'content' | 'title' | 'jsonld' | 'audit'>('content');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!state) return null;


    const { topContender, observingItem, stats, improvementLogs } = state;

    // クリップボードコピー処理
    const handleCopy = async (text: string, fieldKey: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldKey);
            toast.success(`「${label}」をクリップボードにコピーしました`);
            setTimeout(() => {
                setCopiedField((prev) => (prev === fieldKey ? null : prev));
            }, 2000);
        } catch (err) {
            toast.error('コピーに失敗しました');
        }
    };

    // STUDIO改善キットを開く
    const handleOpenKit = (keyword: string, targetPath: string, currentRank: number) => {
        const kit = generateSeoImprovementKit(keyword, targetPath, currentRank);
        setActiveKit(kit);
        setKitActiveTab('content');
        setIsKitModalOpen(true);
    };


    // 改善アクション実施 -> observingへ
    const handleStartObservingWithKit = async (kit?: SeoImprovementKit | null) => {
        const target = kit || (topContender ? generateSeoImprovementKit(topContender.keyword, topContender.target_path, topContender.current_rank) : null);
        if (!target) return;
        setIsSubmitting(true);
        try {
            const res = await startObservingAction(
                target.keyword,
                target.actionTitle,
                target.actionDetail,
                target.targetPath
            );
            if (res.success) {
                toast.success(res.message);
                setIsKitModalOpen(false);
                await onRefresh();
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };


    // 1位達成マーク
    const handleMarkAchieved = async (keyword: string) => {
        setIsSubmitting(true);
        try {
            const res = await markAsAchievedAction(keyword);
            if (res.success) {
                toast.success(res.message);
                await onRefresh();
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 7日間観察完了
    const handleCompleteObserving = async (keyword: string) => {
        setIsSubmitting(true);
        try {
            const res = await completeObservingAction(
                keyword,
                '7日間の効果測定を完了。順位の変動を確認しました。',
                'active'
            );
            if (res.success) {
                toast.success(res.message);
                await onRefresh();
            } else {
                toast.error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-white p-8 md:p-10 border border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all">
            {/* アンビエント発光 */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 space-y-8">
                {/* ヘッダー: ツール名 & サイクルサマリー */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                                <Target className="w-3 h-3" /> SEO RANK WATCH ENGINE
                            </span>
                            <span className="text-[11px] font-mono font-bold text-zinc-400 tracking-wider uppercase">
                                1位狙撃 ✕ 7日間検証サイクル
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                            検索順位1位 獲得自律スプリント
                        </h2>
                    </div>

                    {/* 3つのステータス統計バッジ & 履歴ボタン */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-xs font-mono">
                            <span className="text-amber-400 flex items-center gap-1 font-bold">
                                <Trophy className="w-3.5 h-3.5" /> 1位達成: {stats.achievedCount}件
                            </span>
                            <span className="text-zinc-500">|</span>
                            <span className="text-indigo-300 flex items-center gap-1 font-bold">
                                <Hourglass className="w-3.5 h-3.5" /> 観察中: {stats.observingCount}件
                            </span>
                            <span className="text-zinc-500">|</span>
                            <span className="text-zinc-400 font-medium">
                                候補: {stats.activeCount}件
                            </span>
                        </div>

                        <button
                            onClick={() => setIsLogModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            <History className="w-3.5 h-3.5 text-zinc-400" />
                            改善施策ログ ({improvementLogs.length})
                        </button>
                    </div>
                </div>

                {/* 3つの改善アクション リストセクション */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                        <div className="space-y-0.5">
                            <div className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                本日の優先改善アクション（TOP 3 ACTIONS）
                            </div>
                            <p className="text-xs text-zinc-400">
                                検索順位1位を獲得するために、本日実施すべき3つの具体的タスクです。実行済みにすると翌日には新たなアクションが自動追加されます。
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                                サイクル: 毎日自動補充
                            </span>
                        </div>
                    </div>

                    {/* アクションリスト (3件) */}
                    <div className="grid grid-cols-1 gap-4">
                        {(state.topActions && state.topActions.length > 0 ? state.topActions : (
                            topContender ? [{
                                id: 'fallback_1',
                                keyword: topContender.keyword,
                                targetPath: topContender.target_path,
                                currentRank: topContender.current_rank,
                                priority: topContender.priority,
                                pageType: topContender.target_path.includes('/zUHb45xV/') ? 'studio_cms' as const : 'studio_static' as const,
                                pageTypeLabel: topContender.target_path.includes('/zUHb45xV/') ? 'STUDIO CMS記事' : 'STUDIO 通常ページ',
                                actionTitle: `「${topContender.keyword}」のタイトル最適化とFAQセクション追記`,
                                actionDetail: '検索ユーザーの具体的疑問（進級基準・脱力・料金）を満たすQ&Aを追加し、Titleを最適化。',
                                status: 'ready' as const,
                            }] : []
                        )).map((action, idx) => {
                            const isExecutedToday = action.status === 'executed_today';
                            const isObserving = action.status === 'observing';

                            return (
                                <div
                                    key={action.id || idx}
                                    className={`relative p-5 rounded-xl border transition-all ${
                                        isExecutedToday
                                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                            : isObserving
                                            ? 'bg-indigo-950/20 border-indigo-500/40'
                                            : 'bg-zinc-800/50 border-zinc-700/70 hover:border-zinc-600 hover:bg-zinc-800/80'
                                    }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            {/* ヘッダータグ */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                                                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
                                                    ACTION 0{idx + 1}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-md font-bold border ${
                                                    action.pageType === 'studio_cms'
                                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                                }`}>
                                                    {action.pageTypeLabel}
                                                </span>
                                                <span className="text-zinc-400 font-medium">
                                                    現在: <strong className="text-white">{action.currentRank}位</strong> ➔ 目標: 1位
                                                </span>
                                                {isExecutedToday && (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                        本日反映済み（検証中）
                                                    </span>
                                                )}
                                                {isObserving && (
                                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1">
                                                        <Hourglass className="w-3 h-3 text-indigo-400" />
                                                        7日間検証中
                                                    </span>
                                                )}
                                            </div>

                                            {/* キーワード & タイトル */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black text-white tracking-tight">
                                                        「{action.keyword}」
                                                    </h3>
                                                    <span className="text-xs text-zinc-400 font-mono">
                                                        {action.targetPath}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-amber-200/90">
                                                    {action.actionTitle}
                                                </div>
                                                <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-2">
                                                    {action.actionDetail}
                                                </p>
                                            </div>

                                            {/* 翌日追加の案内 */}
                                            {isExecutedToday && (
                                                <div className="text-[11px] text-emerald-300/90 font-mono flex items-center gap-1.5 pt-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    反映完了: {action.executedAt} ➔ 明日（{action.nextAvailableDate}）に次の改善アクションが自動補充されます
                                                </div>
                                            )}
                                        </div>

                                        {/* 右側アクションボタン群 */}
                                        <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2.5 flex-shrink-0">
                                            <button
                                                onClick={() => handleOpenKit(action.keyword, action.targetPath, action.currentRank)}
                                                className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                                            >
                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                STUDIO改善キットを開く
                                            </button>

                                            {!isExecutedToday && !isObserving && (
                                                <button
                                                    onClick={() => handleStartObservingWithKit(generateSeoImprovementKit(action.keyword, action.targetPath, action.currentRank))}
                                                    disabled={isSubmitting}
                                                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                                                    実行済みにする (7日間検証開始)
                                                </button>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <a
                                                    href="https://studio.design"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition-colors border border-zinc-800"
                                                >
                                                    STUDIO
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                                <a
                                                    href={`https://swim-partners.com${action.targetPath}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 transition-colors border border-zinc-800"
                                                >
                                                    ページ確認
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 7日間効果測定中ガードレール（観察中アイテムが存在する場合の案内） */}
                {observingItem && (
                    <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                                    <Clock className="w-4 h-4 animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase">
                                        OBSERVING IN PROGRESS — 7日間効果測定中
                                    </span>
                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>「{observingItem.keyword}」</span>
                                        <span className="text-xs font-mono font-normal text-zinc-400">
                                            (現在 {observingItem.current_rank}位 / 狙い: 1位)
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono text-amber-300 flex items-center gap-1.5 justify-end">
                                    <Calendar className="w-3.5 h-3.5" />
                                    次回レビュー: {observingItem.log?.review_date} (残り {observingItem.remainingDays} 日)
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-500/20 text-xs">
                            <span className="text-zinc-400 text-[11px]">
                                ※ 検索クローラーの評価定着を検証するため、観察期間中は該当ページの再編集を控えて順位推移を監視します。
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleMarkAchieved(observingItem.keyword)}
                                    disabled={isSubmitting}
                                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Trophy className="w-3.5 h-3.5" />
                                    1位達成を認定
                                </button>
                                <button
                                    onClick={() => handleCompleteObserving(observingItem.keyword)}
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 disabled:opacity-50"
                                >
                                    観察完了・次へ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* STUDIOコピペ用 完成形改善キット モーダル（UI/UX刷新版: タブ切り替え & スムーズスクロール） */}
            {isKitModalOpen && activeKit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full text-zinc-100 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* モーダルヘッダー（固定） */}
                        <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md flex-shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                                            activeKit.pageType === 'studio_cms'
                                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                                : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                                        }`}>
                                            {activeKit.pageTypeLabel}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-mono">
                                            現在 <strong className="text-white">{activeKit.currentRank}位</strong> ➔ 目標 <strong className="text-amber-300">1位</strong>
                                        </span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                        「{activeKit.keyword}」1位獲得改善キット
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        対象ページ: <a href={`https://swim-partners.com${activeKit.targetPath}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-300 hover:underline inline-flex items-center gap-1">{activeKit.targetPath} <ExternalLink className="w-3 h-3" /></a>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsKitModalOpen(false)}
                                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                    title="閉じる"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* タブナビゲーションバー（入れ子スクロールを排除し、目的のコンテンツに1発アクセス） */}
                            <div className="flex items-center gap-2 mt-5 border-b border-zinc-800/80 overflow-x-auto pb-px">
                                <button
                                    onClick={() => setKitActiveTab('content')}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'content'
                                            ? 'text-amber-300 border-amber-400 bg-zinc-800/60'
                                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/30'
                                    }`}
                                >
                                    <FileText className="w-4 h-4 text-amber-400" />
                                    ① 本文・FAQ追記テキスト
                                </button>

                                <button
                                    onClick={() => setKitActiveTab('title')}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'title'
                                            ? 'text-purple-300 border-purple-400 bg-zinc-800/60'
                                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/30'
                                    }`}
                                >
                                    <Layers className="w-4 h-4 text-purple-400" />
                                    ② タイトル・メタ設定
                                </button>

                                <button
                                    onClick={() => setKitActiveTab('jsonld')}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'jsonld'
                                            ? 'text-emerald-300 border-emerald-400 bg-zinc-800/60'
                                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/30'
                                    }`}
                                >
                                    <Code2 className="w-4 h-4 text-emerald-400" />
                                    ③ JSON-LD 構造化データ
                                </button>

                                <button
                                    onClick={() => setKitActiveTab('audit')}
                                    className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'audit'
                                            ? 'text-indigo-300 border-indigo-400 bg-zinc-800/60'
                                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/30'
                                    }`}
                                >
                                    <ShieldAlert className="w-4 h-4 text-indigo-400" />
                                    ④ 現状データ監査 & 手順
                                </button>
                            </div>
                        </div>

                        {/* モーダルコンテンツ本体（ここだけが滑らかにスクロール。内部に小さなスクロール枠は一切作らない） */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
                            {/* ================= タブ1: 本文・FAQテキスト ================= */}
                            {kitActiveTab === 'content' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                        <div>
                                            <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-amber-400" />
                                                {activeKit.pageType === 'studio_cms' ? 'STUDIO CMS記事リッチテキスト用 追記テキスト' : 'STUDIOエディタ用 本文・FAQ追記テキスト'}
                                            </div>
                                            <div className="text-xs text-zinc-300 mt-1">
                                                既存の記事末尾（チェックシート後）にそのまま貼り付けるだけで、検索意図を満たすFAQセクションが完成します。
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(activeKit.bodyText, 'body', '本文・FAQテキスト')}
                                            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] flex-shrink-0"
                                        >
                                            {copiedField === 'body' ? (
                                                <>
                                                    <Check className="w-4 h-4 text-zinc-950" /> コピー完了！
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 text-zinc-950" /> 本文・FAQをコピー
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* フル展開テキストエリア（入れ子スクロールなし、見やすく全文表示） */}
                                    <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-sans leading-relaxed text-zinc-200">
                                        <div className="whitespace-pre-wrap text-sm select-text">
                                            {activeKit.bodyText}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ================= タブ2: タイトル・メタ設定 ================= */}
                            {kitActiveTab === 'title' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                                        <div>
                                            <div className="font-bold text-purple-300 text-sm flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-purple-400" />
                                                タイトルタグのキーワード補正（現在2位 ➔ 1位狙撃）
                                            </div>
                                            <div className="text-xs text-zinc-300 mt-1">
                                                現在欠落している「進級の早い子」を含め、既存の「上達する子」の評価を落とさずに両取りする最適化案です。
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(activeKit.proposedTitle, 'title', 'タイトル')}
                                            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm flex-shrink-0"
                                        >
                                            {copiedField === 'title' ? (
                                                <>
                                                    <Check className="w-4 h-4" /> コピー完了！
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4" /> タイトルをコピー
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* 比較テーブル */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
                                            <div className="text-xs font-mono font-bold text-zinc-400">【現状の実測タイトル】（2位）</div>
                                            <div className="text-sm text-zinc-400 line-through">
                                                {activeKit.factAudit.existingTitle}
                                            </div>
                                            <div className="text-[11px] text-red-400/90 pt-1">
                                                ※ 「進級の 早い子」の重要単語がタイトルに含まれていません
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                                            <div className="text-xs font-mono font-bold text-purple-300">【推奨タイトル（1位獲得案）】</div>
                                            <div className="text-sm font-bold text-white">
                                                {activeKit.proposedTitle}
                                            </div>
                                            <div className="text-[11px] text-emerald-400 pt-1">
                                                ✓ 「進級の早い子」「上達する子」の両方で完全一致評価
                                            </div>
                                        </div>
                                    </div>

                                    {/* ディスクリプション設定 */}
                                    <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold text-zinc-300 font-mono">
                                                推奨メタディスクリプション (Meta Description)
                                            </div>
                                            <button
                                                onClick={() => handleCopy(activeKit.proposedDescription, 'desc', 'ディスクリプション')}
                                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
                                            >
                                                {copiedField === 'desc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                ディスクリプションをコピー
                                            </button>
                                        </div>
                                        <p className="text-xs text-zinc-300 leading-relaxed">
                                            {activeKit.proposedDescription}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ================= タブ3: JSON-LD 構造化データ ================= */}
                            {kitActiveTab === 'jsonld' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                        <div>
                                            <div className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                                                <Code2 className="w-4 h-4 text-emerald-400" />
                                                STUDIOカスタムコード用 FAQPage構造化データ（JSON-LD）
                                            </div>
                                            <div className="text-xs text-zinc-300 mt-1">
                                                Google検索結果でアコーディオン状のFAQスニペットを表示させ、クリック率と順位を押し上げます。
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(activeKit.jsonLdScript, 'jsonld', 'JSON-LD構造化データ')}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex-shrink-0"
                                        >
                                            {copiedField === 'jsonld' ? (
                                                <>
                                                    <Check className="w-4 h-4 text-zinc-950" /> コピー完了！
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 text-zinc-950" /> JSON-LDをコピー
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* 技術的な設置方法の正確なガイダンス */}
                                    <div className="p-4 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-xs space-y-1.5 leading-relaxed text-zinc-300">
                                        <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> STUDIOでの埋め込み先:
                                        </div>
                                        <div>
                                            STUDIOのデザインエディタ ➔ 対象ページ設定 ➔「カスタムコード」の <code className="text-emerald-300 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">&lt;head&gt;内</code> または <code className="text-emerald-300 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">&lt;body&gt;末尾</code> に貼り付けてください。
                                        </div>
                                        <div className="text-[11px] text-zinc-400">
                                            ※ STUDIO CMS記事本文（リッチテキストエディタ内）に直接貼り付けてもエスケープされるため、必ずページ設定のカスタムコードをご利用ください。
                                        </div>
                                    </div>

                                    {/* コード表示エリア（入れ子スクロールなし、見やすく全文表示） */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono text-xs leading-relaxed text-emerald-300 overflow-x-auto select-text">
                                        <pre>{activeKit.jsonLdScript}</pre>
                                    </div>
                                </div>
                            )}

                            {/* ================= タブ4: 現状データ監査 & 手順 ================= */}
                            {kitActiveTab === 'audit' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* 実測データ監査 */}
                                    <div className="p-5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 space-y-3">
                                        <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                                            実測データ監査（現在2位の要因分析レポート）
                                        </div>
                                        <div className="space-y-2 text-xs text-zinc-300">
                                            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                                                <div><span className="text-zinc-500">現状のタイトル:</span> <span className="text-zinc-200 font-medium">「{activeKit.factAudit.existingTitle}」</span></div>
                                                <div><span className="text-zinc-500">既存コンテンツ:</span> <span className="text-zinc-300">{activeKit.factAudit.existingHeadingsSummary}</span></div>
                                            </div>
                                            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 leading-relaxed">
                                                <strong>【データに基づく改善点】</strong> {activeKit.factAudit.missingGapReason}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 反映手順ガイド */}
                                    <div className="p-5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3 text-xs">
                                        <div className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            {activeKit.pageType === 'studio_cms' ? 'STUDIO CMSでの反映ステップ（所要時間: 約1分）' : 'STUDIOエディタでの反映ステップ（所要時間: 約1分）'}
                                        </div>
                                        <ol className="list-decimal list-inside space-y-2 text-zinc-200 pl-1">
                                            {activeKit.studioSteps.map((step, idx) => (
                                                <li key={idx} className="leading-relaxed">{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* モーダルフッター（固定） */}
                        <div className="p-4 sm:p-6 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <a
                                    href="https://studio.design"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    STUDIOを開く
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={() => handleCopy(`${activeKit.proposedTitle}\n\n${activeKit.bodyText}`, 'all', 'タイトルと本文一括')}
                                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    タイトル＋本文を一括コピー
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setIsKitModalOpen(false)}
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-medium transition-colors"
                                >
                                    閉じる
                                </button>
                                <button
                                    onClick={() => handleStartObservingWithKit(activeKit)}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                                    STUDIOへ反映完了・7日間検証を開始
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* 改善履歴ログ（Improvement Log）モーダル */}
            {isLogModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 text-zinc-100 space-y-6 shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                    <History className="w-5 h-5 text-indigo-400" />
                                    SEO改善履歴ログ (data/seo/improvement-log.json)
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    過去に実施した「1つの本質的改善」と7日間の検証記録
                                </p>
                            </div>
                            <button
                                onClick={() => setIsLogModalOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                            {improvementLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-2 hover:border-zinc-700 transition-all text-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            <span>「{log.keyword}」</span>
                                            <span className="text-[10px] font-mono text-zinc-400 font-normal">
                                                {log.target_path}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                            log.status === 'achieved'
                                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                                : log.status === 'observing'
                                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                                : 'bg-zinc-700 text-zinc-300'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </div>

                                    <div className="font-semibold text-zinc-200">{log.action_title}</div>
                                    <div className="text-zinc-400 leading-relaxed">{log.action_detail}</div>

                                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                                        <span>実施: {log.implemented_at} ➔ レビュー: {log.review_date}</span>
                                        <span className="font-bold text-zinc-300">
                                            順位推移: {log.rank_before}位 ➔ {log.current_rank}位
                                        </span>
                                    </div>
                                    {log.notes && (
                                        <div className="text-[11px] text-amber-200/80 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                            メモ: {log.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

