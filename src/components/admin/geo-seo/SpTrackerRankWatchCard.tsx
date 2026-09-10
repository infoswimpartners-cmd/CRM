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

            {/* STUDIOコピペ用 完成形改善キット モーダル */}
            {isKitModalOpen && activeKit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 md:p-8 text-zinc-100 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
                        {/* モーダルヘッダー */}
                        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                        activeKit.pageType === 'studio_cms'
                                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                            : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                                    }`}>
                                        {activeKit.pageTypeLabel}
                                    </span>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        現在 {activeKit.currentRank}位 ➔ 目標 1位
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-white">
                                    「{activeKit.keyword}」1位獲得スプリント
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    対象ページ: <span className="font-mono text-indigo-300">{activeKit.targetPath}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setIsKitModalOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 実測データ監査（Fact Audit）: なぜ現在2位なのか？ */}
                        <div className="p-4 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-xs space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-amber-300 text-[11px] font-mono uppercase tracking-wider">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                実測データ監査（現在2位の要因分析）:
                            </div>
                            <div className="text-zinc-300 space-y-1">
                                <div><span className="text-zinc-500">現状のタイトル:</span> <span className="text-zinc-200 font-medium">「{activeKit.factAudit.existingTitle}」</span></div>
                                <div><span className="text-zinc-500">既存コンテンツ:</span> <span className="text-zinc-300">{activeKit.factAudit.existingHeadingsSummary}</span></div>
                                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 leading-relaxed text-[11px] mt-1">
                                    <strong>【データに基づく改善点】</strong> {activeKit.factAudit.missingGapReason}
                                </div>
                            </div>
                        </div>

                        {/* STUDIO反映手順ガイド */}
                        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                                <Sparkles className="w-4 h-4" />
                                {activeKit.pageType === 'studio_cms' ? 'STUDIO CMSでの反映手順（約1分）' : 'STUDIOエディタでの反映手順（約1分）'}
                            </div>
                            <ol className="list-decimal list-inside space-y-0.5 text-zinc-300 pl-1">
                                {activeKit.studioSteps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                ))}
                            </ol>
                        </div>

                        {/* コンテンツタブ / カード一覧 */}
                        <div className="overflow-y-auto space-y-5 pr-2 flex-1 text-xs">
                            {/* ① タイトル改善案（CMS記事設定用） */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-purple-400" />
                                        ① {activeKit.pageType === 'studio_cms' ? 'CMS記事タイトル修正案（キーワード補正）' : '推奨ページタイトル'}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(activeKit.proposedTitle, 'title', 'タイトル')}
                                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        {copiedField === 'title' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" /> コピー完了
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> タイトルをコピー
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-950 text-purple-200 font-sans text-xs border border-zinc-800 leading-relaxed">
                                    {activeKit.proposedTitle}
                                </div>
                            </div>

                            {/* ② FAQテキストブロック（CMSリッチテキスト用） */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-amber-400" />
                                        ② {activeKit.pageType === 'studio_cms' ? 'CMSリッチテキスト追記用 よくある質問（FAQ）' : 'STUDIO本文追記用 よくある質問（FAQ）'}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(activeKit.bodyText, 'body', 'FAQ追記テキスト')}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        {copiedField === 'body' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" /> コピー完了
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> FAQテキストをコピー
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-sans text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-zinc-800">
                                    {activeKit.bodyText}
                                </pre>
                            </div>

                            {/* ③ 構造化データ（JSON-LD） */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            <Code2 className="w-4 h-4 text-emerald-400" />
                                            ③ STUDIOカスタムコード用 JSON-LD構造化データ
                                        </div>
                                        <div className="text-[11px] text-zinc-400">
                                            ※ デザインエディタの「ページ設定 ➔ カスタムコード (&lt;head&gt;)」に貼り付け
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(activeKit.jsonLdScript, 'jsonld', 'JSON-LD構造化データ')}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        {copiedField === 'jsonld' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" /> コピー完了
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> JSON-LDをコピー
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto border border-zinc-800">
                                    {activeKit.jsonLdScript}
                                </pre>
                                {activeKit.technicalNotes && activeKit.technicalNotes.length > 0 && (
                                    <div className="space-y-1 text-[11px] text-zinc-400 pt-1">
                                        {activeKit.technicalNotes.map((note, nIdx) => (
                                            <div key={nIdx}>{note}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* モーダルフッター */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                            <a
                                href="https://studio.design"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                                STUDIOを開く
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>

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

