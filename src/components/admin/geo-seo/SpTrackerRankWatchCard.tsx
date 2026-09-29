'use client';

import React, { useState, useEffect } from 'react';
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
    PartyPopper,
    RefreshCw,
    Globe,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { SeoRankWatchState, ImprovementLogEntry, SeoActionTask } from '@/lib/seo-rank-watch';
import { generateSeoImprovementKit, SeoImprovementKit } from '@/lib/seo-improvement-generator';
import {
    startObservingAction,
    markAsAchievedAction,
    completeObservingAction,
    fetchSeoImprovementKitAction,
} from '@/actions/sp-tracker-actions';

interface SpTrackerRankWatchCardProps {
    state?: SeoRankWatchState;
    onRefresh: () => Promise<void>;
}

// 日本時間（JST）の日付キー（YYYY-MM-DD）
const getTodayJstKey = () => {
    const now = new Date();
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jstDate.toISOString().split('T')[0];
};

// LocalStorage から本日実行済みキーワードのセットを取得
const getExecutedKeywordsFromStorage = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const key = `sp_tracker_executed_${getTodayJstKey()}`;
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : [];
    } catch {
        return [];
    }
};

// LocalStorage に本日実行済みキーワードを保存
const saveExecutedKeywordToStorage = (keyword: string) => {
    if (typeof window === 'undefined') return;
    try {
        const key = `sp_tracker_executed_${getTodayJstKey()}`;
        const current = getExecutedKeywordsFromStorage();
        if (!current.includes(keyword)) {
            current.push(keyword);
            localStorage.setItem(key, JSON.stringify(current));
        }
    } catch (e) {
        console.error('LocalStorage save error:', e);
    }
};

export function SpTrackerRankWatchCard({ state, onRefresh }: SpTrackerRankWatchCardProps) {
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isKitModalOpen, setIsKitModalOpen] = useState(false);
    const [activeKit, setActiveKit] = useState<SeoImprovementKit | null>(null);
    const [kitActiveTab, setKitActiveTab] = useState<'content' | 'title' | 'jsonld' | 'audit'>('content');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzingLivePage, setIsAnalyzingLivePage] = useState(false);

    // 楽観的UI更新用のローカルアクション状態（初期値にもLocalStorageの実行済み情報を即座に反映）
    const [localActions, setLocalActions] = useState<SeoActionTask[]>(() => {
        if (!state?.topActions) return [];
        const executedKwList = getExecutedKeywordsFromStorage();
        return state.topActions.map((action) => {
            if (executedKwList.includes(action.keyword)) {
                return {
                    ...action,
                    status: 'executed_today' as const,
                    executedAt: action.executedAt || getTodayJstKey(),
                };
            }
            return action;
        });
    });

    // 7日間検証スプリント開始 完了モーダル用ステート
    const [startedSprintInfo, setStartedSprintInfo] = useState<{
        keyword: string;
        targetPath: string;
        currentRank: number;
        reviewDate: string;
        actionTitle: string;
        nextDay: string;
    } | null>(null);

    // state.topActions が親から更新されたら同期（ただしLocalStorageで本日実行済みのものはexecuted_todayを死守）
    useEffect(() => {
        if (state?.topActions && state.topActions.length > 0) {
            const executedKwList = getExecutedKeywordsFromStorage();
            const merged = state.topActions.map((action) => {
                if (executedKwList.includes(action.keyword) || action.status === 'executed_today') {
                    return {
                        ...action,
                        status: 'executed_today' as const,
                        executedAt: action.executedAt || getTodayJstKey(),
                    };
                }
                return action;
            });
            setLocalActions(merged);
        }
    }, [state?.topActions]);

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

    // STUDIO改善キットを開く（最新のライブページ情報をリアルタイム取得）
    const handleOpenKit = async (keyword: string, targetPath: string, currentRank: number, forceRefresh = false) => {
        // まず同期的にベースキットをセットして即座にモーダルを表示（待ち時間ゼロの快適UI）
        const baseKit = generateSeoImprovementKit(keyword, targetPath, currentRank);
        setActiveKit(baseKit);
        setKitActiveTab('content');
        setIsKitModalOpen(true);
        setIsAnalyzingLivePage(true);

        // サーバーアクションで最新の公開ページ実測データをフェッチ
        try {
            const res = await fetchSeoImprovementKitAction(keyword, targetPath, currentRank, forceRefresh);
            if (res.success && res.data) {
                setActiveKit(res.data);
                if (forceRefresh) {
                    toast.success('最新のWebページ情報を再取得・分析しました');
                }
            }
        } catch (e) {
            console.warn('Live audit fetch error:', e);
        } finally {
            setIsAnalyzingLivePage(false);
        }
    };

    // 改善アクション実施 -> observingへ (Optimistic UI + LocalStorage + 即座に完了モーダル表示)
    const handleStartObservingWithKit = async (kit?: SeoImprovementKit | null) => {
        const target = kit || (topContender ? generateSeoImprovementKit(topContender.keyword, topContender.target_path, topContender.current_rank) : null);
        if (!target) return;

        // 本日の日付、次回レビュー日(7日後)、明日(次回アクション追加日)を算出
        const todayStr = getTodayJstKey();
        const today = new Date();
        const reviewDateObj = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const tomorrowObj = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const reviewDateStr = `${reviewDateObj.getFullYear()}-${String(reviewDateObj.getMonth() + 1).padStart(2, '0')}-${String(reviewDateObj.getDate()).padStart(2, '0')}`;
        const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

        // ① LocalStorage に永続保存（ブラウザをリロードしても再取得しても元に戻らない）
        saveExecutedKeywordToStorage(target.keyword);

        // ② 楽観的UI更新: 該当のアクションカードを即座に「本日反映済み（検証中）」へビジュアル変化させる
        setLocalActions((prev) =>
            prev.map((a) => {
                if (a.keyword === target.keyword) {
                    return {
                        ...a,
                        status: 'executed_today',
                        executedAt: todayStr,
                        nextAvailableDate: tomorrowStr,
                    };
                }
                return a;
            })
        );

        // ③ STUDIO改善キットモーダルを閉じ、即座に「🎉 7日間検証スプリント開始 完了モーダル」をポップアップ！
        setIsKitModalOpen(false);
        setStartedSprintInfo({
            keyword: target.keyword,
            targetPath: target.targetPath,
            currentRank: target.currentRank,
            reviewDate: reviewDateStr,
            actionTitle: target.actionTitle,
            nextDay: tomorrowStr,
        });

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
                await onRefresh();
            } else {
                toast.error(res.message);
                await onRefresh();
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
            await onRefresh();
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
        <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 p-4 sm:p-7 md:p-8 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            {/* 上品なアンビエントグラデーション（明るいデザイン基調） */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-amber-400/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none" />

            <div className="relative z-10 space-y-6 sm:space-y-7">
                {/* ヘッダー: ツール名 & サイクルサマリー */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-amber-600" /> SEO RANK WATCH ENGINE
                            </span>
                            <span className="text-[11px] font-mono font-bold text-zinc-500 tracking-wider uppercase">
                                1位狙撃 ✕ 7日間検証サイクル
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                            検索順位1位 獲得自律スプリント
                        </h2>
                    </div>

                    {/* 3つのステータス統計バッジ & 履歴ボタン */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono">
                            <span className="text-amber-700 flex items-center gap-1 font-bold">
                                <Trophy className="w-3.5 h-3.5 text-amber-600" /> 1位: {stats.achievedCount}
                            </span>
                            <span className="text-zinc-300">|</span>
                            <span className="text-indigo-700 flex items-center gap-1 font-bold">
                                <Hourglass className="w-3.5 h-3.5 text-indigo-600" /> 観察: {stats.observingCount}
                            </span>
                            <span className="text-zinc-300">|</span>
                            <span className="text-zinc-600 font-medium">
                                候補: {stats.activeCount}
                            </span>
                        </div>

                        <button
                            onClick={() => setIsLogModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 border border-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            <History className="w-3.5 h-3.5 text-zinc-500" />
                            改善ログ ({improvementLogs.length})
                        </button>
                    </div>
                </div>

                {/* 3つの改善アクション リストセクション */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                        <div className="space-y-0.5">
                            <div className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                本日の優先改善アクション（TOP 3 ACTIONS）
                            </div>
                            <p className="text-xs text-zinc-500">
                                検索順位1位を獲得するために、本日実施すべき3つの具体的タスクです。公開ページの最新情報を自動検知します。
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200">
                                サイクル: 毎日自動補充
                            </span>
                        </div>
                    </div>

                    {/* 本日のスプリント進捗インジケーター */}
                    {(() => {
                        const actionsList = localActions.length > 0 ? localActions : (state.topActions || []);
                        const completedActionsCount = actionsList.filter((a) => a.status === 'executed_today' || a.status === 'observing').length;
                        const totalCount = actionsList.length || 3;
                        const percent = Math.min(100, Math.round((completedActionsCount / totalCount) * 100));

                        return (
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-800">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        本日の改善進捗: <span className="text-emerald-700 text-sm">{completedActionsCount}</span> / {totalCount} 件完了
                                    </div>
                                    <div className="flex-1 sm:w-44 bg-zinc-200 h-2.5 rounded-full overflow-hidden min-w-[100px]">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-zinc-600">{percent}%</span>
                                </div>
                                <div className="text-[11px] font-mono text-zinc-500">
                                    {completedActionsCount === totalCount && totalCount > 0
                                        ? '🎉 本日の全タスク完了！明日新しい改善アクションが自動補充されます'
                                        : completedActionsCount > 0
                                        ? '✓ 本日分を反映済み（7日間効果測定中）。残りのアクションも実施できます'
                                        : '未実施: STUDIOへの反映完了後「実行済みにする」を押してください'}
                                </div>
                            </div>
                        );
                    })()}

                    {/* アクションリスト (3件) */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {(localActions.length > 0 ? localActions : (state.topActions && state.topActions.length > 0 ? state.topActions : (
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
                        ))).map((action, idx) => {
                            const isExecutedToday = action.status === 'executed_today';
                            const isObserving = action.status === 'observing';

                            return (
                                <div
                                    key={action.id || idx}
                                    className={`relative p-4 sm:p-5 rounded-xl border transition-all ${
                                        isExecutedToday
                                            ? 'bg-emerald-50/40 border-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.06)] ring-1 ring-emerald-400/30'
                                            : isObserving
                                            ? 'bg-indigo-50/40 border-indigo-200'
                                            : 'bg-zinc-50/70 border-zinc-200/90 hover:border-zinc-300 hover:bg-white'
                                    }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            {/* ヘッダータグ */}
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono">
                                                <span className="px-2 py-0.5 rounded-md bg-zinc-200/80 text-zinc-800 font-bold border border-zinc-300 text-[11px]">
                                                    ACTION 0{idx + 1}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                                    action.pageType === 'studio_cms_article'
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                                }`}>
                                                    {action.pageTypeLabel}
                                                </span>
                                                <span className="text-zinc-600 font-medium text-xs">
                                                    現在: <strong className="text-slate-900 font-bold">{action.currentRank}位</strong> ➔ 目標: <strong className="text-amber-700 font-bold">1位</strong>
                                                </span>
                                                {isExecutedToday && (
                                                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        本日反映済み（7日間検証中）
                                                    </span>
                                                )}
                                                {isObserving && !isExecutedToday && (
                                                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold flex items-center gap-1 text-[11px]">
                                                        <Hourglass className="w-3.5 h-3.5 text-indigo-600" />
                                                        7日間検証中（効果測定）
                                                    </span>
                                                )}
                                            </div>

                                            {/* キーワード & タイトル */}
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                                        「{action.keyword}」
                                                    </h3>
                                                    <span className="text-xs text-zinc-500 font-mono">
                                                        {action.targetPath}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-indigo-900">
                                                    {action.actionTitle}
                                                </div>
                                                <p className="text-xs text-zinc-600 leading-relaxed font-sans line-clamp-2">
                                                    {action.actionDetail}
                                                </p>
                                            </div>

                                            {/* 翌日追加の案内 */}
                                            {isExecutedToday && (
                                                <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 pt-1">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                                    反映完了: {action.executedAt || '本日'} ➔ 明日（{action.nextAvailableDate || '翌日'}）に次の改善アクションが自動補充されます
                                                </div>
                                            )}
                                        </div>

                                        {/* 右側アクションボタン群（スマホ時は押しやすい全幅、PC時は右寄せ） */}
                                        <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2 flex-shrink-0 pt-2 lg:pt-0">
                                            <button
                                                onClick={() => handleOpenKit(action.keyword, action.targetPath, action.currentRank)}
                                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                                            >
                                                <FileText className="w-4 h-4 text-indigo-600" />
                                                STUDIO改善キットを開く
                                            </button>

                                            {isExecutedToday ? (
                                                <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    本日反映済み (効果測定中)
                                                </div>
                                            ) : isObserving ? (
                                                <div className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-100/70 border border-indigo-300 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                                                    <Hourglass className="w-4 h-4 text-indigo-600" />
                                                    7日間検証中
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartObservingWithKit(generateSeoImprovementKit(action.keyword, action.targetPath, action.currentRank))}
                                                    disabled={isSubmitting}
                                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    実行済みにする (7日間検証開始)
                                                </button>
                                            )}

                                            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                                                <a
                                                    href="https://studio.design"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-zinc-600 hover:text-slate-900 hover:bg-zinc-100 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors border border-zinc-200"
                                                >
                                                    STUDIO
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                                <a
                                                    href={`https://swim-partners.com${action.targetPath}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-zinc-600 hover:text-slate-900 hover:bg-zinc-100 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors border border-zinc-200"
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
                {(() => {
                    const observingList = (state.observingItems && state.observingItems.length > 0)
                        ? state.observingItems
                        : (observingItem ? [observingItem] : []);

                    if (observingList.length === 0) return null;

                    return (
                        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0">
                                        <Clock className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-indigo-800 uppercase tracking-wider">
                                                7日間検証スプリント中（現在進行中: {observingList.length}施策）
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                                クローラー反映観察中
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-600 mt-0.5">
                                            STUDIO反映済みの施策です。検索順位の定着を測定するため、観察期間中は再編集を控えて順位変動をトラッキングします。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {observingList.map((ob, obIdx) => (
                                    <div
                                        key={ob.id || obIdx}
                                        className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-xs flex flex-col justify-between gap-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                                                    <span>{ob.target_path}</span>
                                                </div>
                                                <div className="text-sm font-bold text-slate-900 mt-0.5">
                                                    「{ob.keyword}」
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0">
                                                現在 {ob.current_rank}位 ➔ 1位狙い
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-xs">
                                            <div className="text-[11px] font-mono text-indigo-700 font-bold flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                                次回レビュー: {ob.log?.review_date || '7日後'} (残り {ob.remainingDays} 日)
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleMarkAchieved(ob.keyword)}
                                                    disabled={isSubmitting}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                                                >
                                                    <Trophy className="w-3 h-3" />
                                                    1位認定
                                                </button>
                                                <button
                                                    onClick={() => handleCompleteObserving(ob.keyword)}
                                                    disabled={isSubmitting}
                                                    className="px-2 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-[11px] font-medium border border-zinc-200 disabled:opacity-50"
                                                >
                                                    検証完了
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

            </div>

            {/* STUDIOコピペ用 完成形改善キット モーダル（明るいデザイン & リアルタイム最新ページ分析連動） */}
            {isKitModalOpen && activeKit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-800/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-zinc-200 rounded-2xl max-w-4xl w-full text-slate-900 shadow-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        {/* モーダルヘッダー（固定） */}
                        <div className="p-4 sm:p-6 border-b border-zinc-200 bg-slate-50/80 backdrop-blur-md flex-shrink-0">
                            <div className="flex items-start justify-between gap-3 sm:gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold border ${
                                            activeKit.pageType === 'studio_cms_article'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}>
                                            {activeKit.pageTypeLabel}
                                        </span>
                                        <span className="text-xs text-zinc-600 font-mono">
                                            現在 <strong className="text-slate-900 font-bold">{activeKit.currentRank}位</strong> ➔ 目標 <strong className="text-amber-600 font-bold">1位</strong>
                                        </span>
                                        {activeKit.isAlreadyOptimized && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 本番反映済み（検証中）
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                        「{activeKit.keyword}」1位獲得改善キット
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                                        <span className="break-all">
                                            対象: <a href={`https://swim-partners.com${activeKit.targetPath}`} target="_blank" rel="noreferrer" className="font-mono text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold">{activeKit.targetPath} <ExternalLink className="w-3 h-3" /></a>
                                        </span>
                                        <button
                                            onClick={() => handleOpenKit(activeKit.keyword, activeKit.targetPath, activeKit.currentRank, true)}
                                            disabled={isAnalyzingLivePage}
                                            className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-bold text-zinc-700 flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                                            title="公開サイトの最新HTMLを再取得して分析"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${isAnalyzingLivePage ? 'animate-spin text-indigo-600' : 'text-zinc-500'}`} />
                                            {isAnalyzingLivePage ? '最新情報取得中...' : '最新ページ情報を強制再取得'}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsKitModalOpen(false)}
                                    className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex-shrink-0"
                                    title="閉じる"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* タブナビゲーションバー（入れ子スクロールを排除し、目的のコンテンツに1発アクセス） */}
                            <div className="flex items-center gap-1 sm:gap-2 mt-4 sm:mt-5 border-b border-zinc-200 overflow-x-auto no-scrollbar pb-px">
                                <button
                                    onClick={() => setKitActiveTab('content')}
                                    className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'content'
                                            ? 'text-indigo-600 border-indigo-600 bg-white shadow-xs'
                                            : 'text-zinc-600 border-transparent hover:text-slate-900 hover:bg-zinc-100/50'
                                    }`}
                                >
                                    <FileText className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-600" />
                                    {activeKit.pageType === 'studio_landing_page' ? '① LP構成案' : '① 記事本文案'}
                                </button>

                                <button
                                    onClick={() => setKitActiveTab('title')}
                                    className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'title'
                                            ? 'text-purple-600 border-purple-600 bg-white shadow-xs'
                                            : 'text-zinc-600 border-transparent hover:text-slate-900 hover:bg-zinc-100/50'
                                    }`}
                                >
                                    <Layers className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-600" />
                                    ② タイトル・メタ設定
                                </button>

                                <button
                                    onClick={() => setKitActiveTab('jsonld')}
                                    className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'jsonld'
                                            ? 'text-emerald-700 border-emerald-600 bg-white shadow-xs'
                                            : 'text-zinc-600 border-transparent hover:text-slate-900 hover:bg-zinc-100/50'
                                    }`}
                                >
                                    <Code2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600" />
                                    ③ 構造化データ
                                </button>

                                <button
                                    onClick={() => setKitActiveTab('audit')}
                                    className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                                        kitActiveTab === 'audit'
                                            ? 'text-amber-700 border-amber-600 bg-white shadow-xs'
                                            : 'text-zinc-600 border-transparent hover:text-slate-900 hover:bg-zinc-100/50'
                                    }`}
                                >
                                    <ShieldAlert className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-600" />
                                    ④ 実測監査・反映手順
                                </button>
                            </div>
                        </div>

                        {/* モーダルコンテンツ本体（ここだけが滑らかにスクロール） */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6 text-sm bg-[#fafafa]">
                            {/* ================= タブ1: 本文・LP構成 ================= */}
                            {kitActiveTab === 'content' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* LP（ランディングページ）の場合：セクションごとに見やすくカード化 */}
                                    {activeKit.pageType === 'studio_landing_page' && activeKit.lpBlocks && activeKit.lpBlocks.length > 0 ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                                <div>
                                                    <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-amber-600" />
                                                        STUDIO通常デザイン編集用 LPセクション改善案（CVR・成約特化）
                                                    </div>
                                                    <div className="text-xs text-amber-800 mt-1">
                                                        LPの各構成要素（FV・強み・料金・CTA・FAQ）ごとに最適なテキストを提供しています。各枠右上のコピーボタンをご利用ください。
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(activeKit.bodyText, 'body', '全セクションテキスト')}
                                                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm flex-shrink-0"
                                                >
                                                    {copiedField === 'body' ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-zinc-950" /> 全文コピー完了！
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4 text-zinc-950" /> 全セクションを一括コピー
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* 各セクションブロック */}
                                            <div className="space-y-3">
                                                {activeKit.lpBlocks.map((block, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl bg-white border border-zinc-200/90 shadow-xs space-y-3">
                                                        <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-2.5">
                                                            <div>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 mr-2">
                                                                    BLOCK {idx + 1}
                                                                </span>
                                                                <span className="font-bold text-slate-900 text-sm">{block.sectionName}</span>
                                                                <p className="text-[11px] text-zinc-500 mt-0.5">{block.description}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleCopy(
                                                                    `${block.headline}\n${block.subheadline ? block.subheadline + '\n' : ''}${block.content}${block.ctaText ? '\n【ボタン】: ' + block.ctaText : ''}`,
                                                                    `block_${idx}`,
                                                                    block.sectionName
                                                                )}
                                                                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-200 flex-shrink-0"
                                                            >
                                                                {copiedField === `block_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                                コピー
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2 text-xs">
                                                            <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60">
                                                                <div className="text-[10px] font-mono text-zinc-500 font-bold mb-0.5">見出し (Headline)</div>
                                                                <div className="text-slate-900 font-bold text-sm leading-snug">{block.headline}</div>
                                                                {block.subheadline && (
                                                                    <div className="text-zinc-600 text-xs mt-1">{block.subheadline}</div>
                                                                )}
                                                            </div>

                                                            <div className="p-3 rounded-lg bg-zinc-50/60 border border-zinc-200/60 text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                                                {block.content}
                                                            </div>

                                                            {block.ctaText && (
                                                                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium flex items-center justify-between">
                                                                    <span>ボタン文面（CTA）: <strong>{block.ctaText}</strong></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* CMS記事の場合：リッチテキスト用全文 */
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-purple-50 border border-purple-200">
                                                <div>
                                                    <div className="font-bold text-purple-900 text-sm flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-purple-600" />
                                                        STUDIO CMS記事リッチテキスト用 追記テキスト
                                                    </div>
                                                    <div className="text-xs text-purple-800 mt-1">
                                                        既存の記事末尾に貼り付けるだけで、検索意図を満たすFAQおよび体験レッスンLP誘導CTAが完成します。
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(activeKit.bodyText, 'body', '記事追記テキスト')}
                                                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm flex-shrink-0"
                                                >
                                                    {copiedField === 'body' ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-white" /> コピー完了！
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4 text-white" /> 記事テキストをコピー
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* フル展開テキストエリア */}
                                            <div className="relative rounded-xl border border-zinc-200 bg-white p-5 font-sans leading-relaxed text-zinc-800 shadow-xs">
                                                <div className="whitespace-pre-wrap text-sm select-text">
                                                    {activeKit.bodyText}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ================= タブ2: タイトル・メタ設定 ================= */}
                            {kitActiveTab === 'title' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-purple-50 border border-purple-200">
                                        <div>
                                            <div className="font-bold text-purple-900 text-sm flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-purple-600" />
                                                タイトルタグのキーワード最適化
                                            </div>
                                            <div className="text-xs text-purple-800 mt-1">
                                                現在欠落している検索クエリを含め、既存キーワードの評価を落とさずに1位を奪取する設定案です。
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(activeKit.proposedTitle, 'title', 'タイトル')}
                                            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm flex-shrink-0"
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
                                        <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-xs">
                                            <div className="text-xs font-mono font-bold text-zinc-500 flex items-center justify-between">
                                                <span>【現状の実測タイトル】</span>
                                                {activeKit.isAlreadyOptimized && (
                                                    <span className="text-emerald-600 font-bold text-[10px]">✓ 改善反映済み確認</span>
                                                )}
                                            </div>
                                            <div className={`text-sm ${activeKit.isAlreadyOptimized ? 'text-slate-900 font-semibold' : 'text-zinc-500 line-through'}`}>
                                                {activeKit.factAudit.existingTitle}
                                            </div>
                                            <div className={`text-[11px] pt-1 ${activeKit.isAlreadyOptimized ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}`}>
                                                {activeKit.isAlreadyOptimized
                                                    ? '※ 狙撃キーワードが含まれており、本番反映が確認できています'
                                                    : '※ 重要キーワードの完全一致が不足しています'}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 shadow-xs">
                                            <div className="text-xs font-mono font-bold text-purple-700">【推奨タイトル（1位獲得案）】</div>
                                            <div className="text-sm font-bold text-slate-900">
                                                {activeKit.proposedTitle}
                                            </div>
                                            <div className="text-[11px] text-emerald-700 pt-1 font-medium">
                                                ✓ 完全一致キーワードでのGoogle評価を最大化
                                            </div>
                                        </div>
                                    </div>

                                    {/* ディスクリプション設定 */}
                                    <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold text-zinc-700 font-mono">
                                                推奨メタディスクリプション (Meta Description)
                                            </div>
                                            <button
                                                onClick={() => handleCopy(activeKit.proposedDescription, 'desc', 'ディスクリプション')}
                                                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-200"
                                            >
                                                {copiedField === 'desc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                ディスクリプションをコピー
                                            </button>
                                        </div>
                                        <p className="text-xs text-zinc-700 leading-relaxed">
                                            {activeKit.proposedDescription}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ================= タブ3: JSON-LD 構造化データ ================= */}
                            {kitActiveTab === 'jsonld' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                        <div>
                                            <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                                                <Code2 className="w-4 h-4 text-emerald-600" />
                                                {activeKit.pageType === 'studio_landing_page'
                                                    ? 'STUDIOカスタムコード用 LocalBusiness / Service構造化データ（JSON-LD）'
                                                    : 'STUDIOカスタムコード用 FAQPage構造化データ（JSON-LD）'}
                                            </div>
                                            <div className="text-xs text-emerald-800 mt-1">
                                                {activeKit.pageType === 'studio_landing_page'
                                                    ? '地域名（エリア）と水泳指導サービスの実体・価格・対応公営プールをGoogleに直接認識させ、MEO・地域検索順位を底上げします。'
                                                    : 'Google検索結果でアコーディオン状のFAQスニペットを表示させ、クリック率と順位を押し上げます。'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(activeKit.jsonLdScript, 'jsonld', 'JSON-LD構造化データ')}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm flex-shrink-0"
                                        >
                                            {copiedField === 'jsonld' ? (
                                                <>
                                                    <Check className="w-4 h-4 text-white" /> コピー完了！
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 text-white" /> JSON-LDをコピー
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* 技術的な設置方法の正確なガイダンス */}
                                    <div className="p-4 rounded-xl bg-white border border-zinc-200 text-xs space-y-1.5 leading-relaxed text-zinc-700 shadow-xs">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> STUDIOでの埋め込み先:
                                        </div>
                                        <div>
                                            STUDIOのデザインエディタ ➔ 対象ページ設定 ➔「カスタムコード」の <code className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono border border-indigo-200">&lt;head&gt;内</code> または <code className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono border border-indigo-200">&lt;body&gt;末尾</code> に貼り付けてください。
                                        </div>
                                        <div className="text-[11px] text-zinc-500">
                                            ※ STUDIOのページ設定にある「カスタムコード」に設置することで、デザインを一切崩さずに検索エンジンへセマンティック構造を伝達できます。
                                        </div>
                                    </div>

                                    {/* コード表示エリア（見やすいダークエディタ風） */}
                                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 font-mono text-xs leading-relaxed text-emerald-300 overflow-x-auto select-text shadow-inner">
                                        <pre>{activeKit.jsonLdScript}</pre>
                                    </div>
                                </div>
                            )}

                            {/* ================= タブ4: 実測監査 & 反映手順 ================= */}
                            {kitActiveTab === 'audit' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* 実測データ監査カード */}
                                    <div className="p-5 rounded-xl bg-white border border-zinc-200 space-y-3 shadow-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-indigo-600" />
                                                最新ライブHTML実測レポート（公開サイト検証結果）
                                            </div>
                                            <span className="text-[11px] font-mono text-zinc-500">
                                                検査日時: {activeKit.liveAudit?.fetchedAt || '最新キャッシュ'}
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 text-xs text-zinc-700">
                                            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-zinc-500 font-semibold min-w-[70px]">実測タイトル:</span>
                                                    <span className="text-slate-900 font-bold">{activeKit.factAudit.existingTitle}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-zinc-500 font-semibold min-w-[70px]">検出H1/H2:</span>
                                                    <span className="text-zinc-700">{activeKit.factAudit.existingHeadingsSummary}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-zinc-500 font-semibold min-w-[70px]">JSON-LD:</span>
                                                    <span className={`font-mono font-bold ${activeKit.liveAudit?.hasLdJson ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                                        {activeKit.liveAudit?.hasLdJson ? '✓ 検出済み (' + (activeKit.liveAudit.ldJsonTypes.join(', ') || 'OK') + ')' : '未検出'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`p-3.5 rounded-lg border leading-relaxed ${
                                                activeKit.isAlreadyOptimized
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                                            }`}>
                                                <div className="font-bold flex items-center gap-1.5 mb-1">
                                                    {activeKit.isAlreadyOptimized ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                                    )}
                                                    {activeKit.isAlreadyOptimized ? '【実測判定: 本番反映済み】' : '【実測判定: 改善推奨】'}
                                                </div>
                                                <div>{activeKit.factAudit.missingGapReason}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 反映手順ガイド */}
                                    <div className="p-5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3 text-xs">
                                        <div className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                            {activeKit.pageType === 'studio_cms_article' ? 'STUDIO CMSでの反映ステップ（所要時間: 約1分）' : 'STUDIOデザインエディタでの反映ステップ（所要時間: 約2分）'}
                                        </div>
                                        <ol className="list-decimal list-inside space-y-2 text-zinc-700 pl-1 leading-relaxed">
                                            {activeKit.studioSteps.map((step, idx) => (
                                                <li key={idx}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* モーダルフッター（固定） */}
                        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-white flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <a
                                    href="https://studio.design"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    STUDIOを開く
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={() => handleCopy(`${activeKit.proposedTitle}\n\n${activeKit.bodyText}`, 'all', 'タイトルと本文一括')}
                                    className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    タイトル＋本文一括コピー
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    onClick={() => setIsKitModalOpen(false)}
                                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-zinc-600 hover:text-slate-900 text-xs font-medium transition-colors"
                                >
                                    閉じる
                                </button>
                                <button
                                    onClick={() => handleStartObservingWithKit(activeKit)}
                                    disabled={isSubmitting}
                                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    反映完了・7日間検証を開始
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* 改善履歴ログ（Improvement Log）モーダル（明るいデザイン版） */}
            {isLogModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-zinc-200 rounded-2xl max-w-2xl w-full p-6 text-slate-900 space-y-6 shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                                    <History className="w-5 h-5 text-indigo-600" />
                                    SEO改善履歴ログ
                                </h3>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    過去に実施した「1つの本質的改善」と7日間の検証記録
                                </p>
                            </div>
                            <button
                                onClick={() => setIsLogModalOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
                            {improvementLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2 hover:border-zinc-300 transition-all text-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                            <span>「{log.keyword}」</span>
                                            <span className="text-[10px] font-mono text-zinc-500 font-normal">
                                                {log.target_path}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                            log.status === 'achieved'
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                : log.status === 'observing'
                                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                                : 'bg-zinc-200 text-zinc-700'
                                        }`}>
                                            {log.status === 'achieved' ? '👑 1位達成' : log.status === 'observing' ? '⏳ 7日観察中' : log.status}
                                        </span>
                                    </div>

                                    <div className="font-semibold text-zinc-800">{log.action_title}</div>
                                    <div className="text-zinc-600 leading-relaxed">{log.action_detail}</div>

                                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-200">
                                        <span>実施: {log.implemented_at} ➔ レビュー: {log.review_date}</span>
                                        <span className="font-bold text-zinc-800">
                                            順位推移: {log.rank_before}位 ➔ {log.current_rank}位
                                        </span>
                                    </div>
                                    {log.notes && (
                                        <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                                            メモ: {log.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 🎉 7日間検証スプリント開始 完了モーダル（明るいデザイン版） */}
            {startedSprintInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full text-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
                        {/* アイコン & タイトル */}
                        <div className="text-center space-y-3">
                            <div className="inline-flex p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
                                <PartyPopper className="w-8 h-8 animate-bounce" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    7日間検証スプリントを開始しました！
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-500">
                                    STUDIOへの反映と観察ログの記録が正常に完了しました。
                                </p>
                            </div>
                        </div>

                        {/* スプリント概要カード */}
                        <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3.5 text-xs">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
                                <span className="text-zinc-500 font-medium">対象キーワード</span>
                                <span className="font-bold text-slate-900 text-sm">「{startedSprintInfo.keyword}」</span>
                            </div>
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
                                <span className="text-zinc-500 font-medium">現在順位 ➔ 目標</span>
                                <span className="font-mono text-zinc-700">
                                    現在 <strong className="text-slate-900">{startedSprintInfo.currentRank}位</strong> ➔ <strong className="text-amber-600 font-bold">1位</strong>
                                </span>
                            </div>
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
                                <span className="text-zinc-500 font-medium">7日間検証期間</span>
                                <span className="font-mono font-bold text-indigo-700 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    本日 〜 {startedSprintInfo.reviewDate} (判定日)
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 font-medium">次回新アクション追加</span>
                                <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    明日（{startedSprintInfo.nextDay}）自動補充
                                </span>
                            </div>
                        </div>

                        {/* ガイドメッセージ */}
                        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 leading-relaxed space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                                <Clock className="w-3.5 h-3.5" />
                                検索エンジンの評価定着を監視中
                            </div>
                            <div className="text-[11px] text-indigo-800/80">
                                Googleクローラーが変更を検知・再評価するまで数日間かかります。観察期間中は該当ページの追加編集は控え、順位推移を静観します。
                            </div>
                        </div>

                        {/* 閉じるボタン */}
                        <button
                            onClick={() => setStartedSprintInfo(null)}
                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            了解してダッシュボードに戻る
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
