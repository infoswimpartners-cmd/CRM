'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    CheckCircle2,
    Hourglass,
    Calendar,
    FileText,
    ExternalLink,
    PlusCircle,
    RefreshCw,
    Zap,
    Check,
    Copy,
    X,
    Target,
    SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { SeoRankWatchState, SeoActionTask } from '@/lib/seo-rank-watch';
import { generateSeoImprovementKit, SeoImprovementKit } from '@/lib/seo-improvement-generator';
import { ActionRecommendationItem } from '@/lib/sp-tracker-seed';
import { ArticleType } from '@/lib/generated-articles-storage';
import {
    startObservingAction,
    optimizeKitWithGeminiAction,
} from '@/actions/sp-tracker-actions';
import { KeywordCompetitorIntelligence } from '@/types/competitor-benchmark';
import { formatErrorToastMessage, sanitizeErrorMessage } from '@/lib/error-formatter';

export interface UnifiedPriorityActionHubProps {
    rankWatchState?: SeoRankWatchState;
    actionRecommendations?: ActionRecommendationItem[];
    onResolveToggle?: (id: number, currentStatus: boolean) => void;
    onOpenGenerator?: (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string,
        competitorIntelligence?: KeywordCompetitorIntelligence
    ) => void;
    onRefresh?: () => Promise<void>;
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

/**
 * 統合優先改善アクションハブ (UnifiedPriorityActionHub)
 * 競合していた TOP 3 ACTIONS と HeroActions を1つの洗練されたアクションパイプラインに統合。
 * STUDIO改善キット、AI記事リライト、7日間検証スプリント開始、システム全般ディレクティブを完備。
 */
export function UnifiedPriorityActionHub({
    rankWatchState,
    actionRecommendations = [],
    onResolveToggle,
    onOpenGenerator,
    onRefresh,
}: UnifiedPriorityActionHubProps) {
    // アクティブビュー切り替え: 'sniper' (SEO 1位狙撃スプリント) | 'directive' (システム全般推奨ディレクティブ)
    const [actionView, setActionView] = useState<'sniper' | 'directive'>('sniper');

    // 改善キットモーダル管理
    const [isKitModalOpen, setIsKitModalOpen] = useState(false);
    const [activeKit, setActiveKit] = useState<SeoImprovementKit | null>(null);
    const [kitActiveTab, setKitActiveTab] = useState<'content' | 'title' | 'jsonld' | 'audit'>('content');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiOptimizing, setIsAiOptimizing] = useState(false);

    // 7日間検証スプリント開始 完了モーダル用ステート
    const [startedSprintInfo, setStartedSprintInfo] = useState<{
        keyword: string;
        targetPath: string;
        currentRank: number;
        reviewDate: string;
        actionTitle: string;
        nextDay: string;
    } | null>(null);

    // 楽観的UI更新用のローカルアクション状態（LocalStorage同期）
    const [localActions, setLocalActions] = useState<SeoActionTask[]>(() => {
        if (!rankWatchState?.topActions) return [];
        const executedKwList = getExecutedKeywordsFromStorage();
        return rankWatchState.topActions.map((action) => {
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

    useEffect(() => {
        if (rankWatchState?.topActions && rankWatchState.topActions.length > 0) {
            const executedKwList = getExecutedKeywordsFromStorage();
            const merged = rankWatchState.topActions.map((action) => {
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
    }, [rankWatchState?.topActions]);

    // クリップボードコピー処理
    const handleCopy = async (text: string, fieldKey: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldKey);
            toast.success(`「${label}」をクリップボードにコピーしました`);
            setTimeout(() => {
                setCopiedField((prev) => (prev === fieldKey ? null : prev));
            }, 2000);
        } catch {
            toast.error('コピーに失敗しました');
        }
    };

    // STUDIO改善キットを開く
    const handleOpenKit = async (keyword: string, targetPath: string, currentRank: number, forceRefresh = false) => {
        const baseKit = generateSeoImprovementKit(keyword, targetPath, currentRank);
        setActiveKit(baseKit);
        setKitActiveTab('content');
        setIsKitModalOpen(true);
        setIsAiOptimizing(true);

        try {
            const res = await optimizeKitWithGeminiAction(keyword, targetPath, currentRank, forceRefresh);
            if (res.success && res.data) {
                setActiveKit(res.data);
                if (res.isAiGenerated) {
                    toast.success('⚡ Gemini 3.8 Flash でリアルタイムAI最適化しました');
                }
            }
        } catch (e) {
            console.warn('AI optimize fetch error:', e);
        } finally {
            setIsAiOptimizing(false);
        }
    };

    // Gemini リアルタイムAI再推論
    const handleAiOptimizeKit = async (keyword: string, targetPath: string, currentRank: number) => {
        setIsAiOptimizing(true);
        try {
            const res = await optimizeKitWithGeminiAction(keyword, targetPath, currentRank, true);
            if (res.success && res.data) {
                setActiveKit(res.data);
                if (res.isAiGenerated) {
                    toast.success('⚡ Gemini 3.8 Flash によるリアルタイムAI最適化が完了しました！');
                } else {
                    toast.info(res.message);
                }
            } else {
                toast.error(sanitizeErrorMessage(res.message, 'AI最適化に失敗しました'));
            }
        } catch (err: unknown) {
            toast.error(formatErrorToastMessage(err, 'AI最適化中にエラーが発生しました: '));
        } finally {
            setIsAiOptimizing(false);
        }
    };

    // 候補プール
    const displayedKeywords = new Set(localActions.map((a) => a.keyword));
    const observingKeywords = new Set((rankWatchState?.observingItems || []).map((o) => o.keyword));
    const availableCandidates = (rankWatchState?.candidatePool || []).filter(
        (c) => !displayedKeywords.has(c.keyword) && !observingKeywords.has(c.keyword)
    );

    const handleAddNewTask = () => {
        if (availableCandidates.length === 0) {
            toast.info('現在すべてのアクティブな改善候補キーワードが表示されています');
            return;
        }
        const nextTask = availableCandidates[0];
        setLocalActions((prev) => [...prev, nextTask]);
        toast.success(`新たな改善タスク「${nextTask.keyword}」を追加表示しました`);
    };

    const handleSwapTask = (targetKeyword: string) => {
        if (availableCandidates.length === 0) {
            toast.info('入れ替え可能な別の待機中キーワードがありません');
            return;
        }
        const nextTask = availableCandidates[0];
        setLocalActions((prev) =>
            prev.map((a) => (a.keyword === targetKeyword ? nextTask : a))
        );
        toast.success(`「${targetKeyword}」を「${nextTask.keyword}」の改善タスクに入れ替えました`);
    };

    // 改善アクション実施 -> 7日間スプリント開始
    const handleStartObservingWithKit = async (kit?: SeoImprovementKit | null) => {
        const topContender = rankWatchState?.topContender;
        const target = kit || (topContender ? generateSeoImprovementKit(topContender.keyword, topContender.target_path, topContender.current_rank) : null);
        if (!target) return;

        const todayStr = getTodayJstKey();
        const today = new Date();
        const reviewDateObj = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const tomorrowObj = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const reviewDateStr = `${reviewDateObj.getFullYear()}-${String(reviewDateObj.getMonth() + 1).padStart(2, '0')}-${String(reviewDateObj.getDate()).padStart(2, '0')}`;
        const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

        saveExecutedKeywordToStorage(target.keyword);

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
                if (onRefresh) await onRefresh();
            } else {
                toast.error(sanitizeErrorMessage(res.message, '観察モードへの遷移に失敗しました'));
                if (onRefresh) await onRefresh();
            }
        } catch (err: unknown) {
            toast.error(formatErrorToastMessage(err));
            if (onRefresh) await onRefresh();
        } finally {
            setIsSubmitting(false);
        }
    };

    // HeroActions 用データ
    const activeDirectives = actionRecommendations.filter((a) => !a.is_resolved);
    const primaryDirective = activeDirectives[0] || actionRecommendations[0];

    const getDirectiveBadge = (priority: ActionRecommendationItem['priority']) => {
        switch (priority) {
            case 'high':
                return { label: '最優先（至急）', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
            case 'medium':
                return { label: '改善チャンス（推奨）', color: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
            default:
                return { label: '維持・良好', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
        }
    };

    // スプリント進捗計算
    const actionsList = localActions.length > 0 ? localActions : (rankWatchState?.topActions || []);
    const completedSprintCount = actionsList.filter((a) => a.status === 'executed_today' || a.status === 'observing').length;
    const totalSprintCount = actionsList.length || 3;
    const sprintPercent = Math.min(100, Math.round((completedSprintCount / (totalSprintCount || 1)) * 100));

    return (
        <div className="space-y-6">
            {/* 1. ハブヘッダー ＆ ビュー切り替えトレイ */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
                                <Zap className="w-5 h-5 fill-amber-300" />
                            </span>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                優先改善アクション統合ハブ (Priority Actions)
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                実行 ✕ 7日間検証
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                            SEO 1位獲得のための具体的タスクと、ファネル全体の改善ディレクティブをワンストップで実行・追跡します。
                        </p>
                    </div>

                    {/* アクションビュー切り替え（セグメントコントロール） */}
                    <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold self-start sm:self-auto">
                        <button
                            onClick={() => setActionView('sniper')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                actionView === 'sniper'
                                    ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            <Target className="w-3.5 h-3.5 text-indigo-600" />
                            <span>1位狙撃スプリント ({actionsList.length})</span>
                        </button>
                        <button
                            onClick={() => setActionView('directive')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                actionView === 'directive'
                                    ? 'bg-white text-indigo-900 font-extrabold shadow-xs'
                                    : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                            <span>システム推奨指示 ({actionRecommendations.length})</span>
                        </button>
                    </div>
                </div>

                {/* スプリント進捗インジケーター */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-50 via-indigo-50/20 to-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            本日の改善進捗: <span className="text-emerald-700 text-sm font-extrabold">{completedSprintCount}</span> / {totalSprintCount} 件完了
                        </div>
                        <div className="flex-1 sm:w-44 bg-zinc-200 h-2.5 rounded-full overflow-hidden min-w-[100px]">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${sprintPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-600">{sprintPercent}%</span>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500">
                        {completedSprintCount === totalSprintCount && totalSprintCount > 0
                            ? '🎉 本日の全タスク完了！明日新しい改善アクションが自動補充されます'
                            : completedSprintCount > 0
                            ? '✓ 本日分を反映済み（7日間効果測定中）。残りのアクションも実施できます'
                            : '未実施: STUDIOへの反映完了後「実行済みにする」を押してください'}
                    </div>
                </div>
            </div>

            {/* 2. ビュー A: 【SEO 1位狙撃スプリント（TOP 3 ACTIONS）】 */}
            {actionView === 'sniper' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 px-1">
                        <div className="text-xs font-mono font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-indigo-600" />
                            本日集中投下すべき優先改善タスク（TOP 3）
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddNewTask}
                                disabled={availableCandidates.length === 0}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                            >
                                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                                次のタスクを追加 ({availableCandidates.length}件待機)
                            </button>
                        </div>
                    </div>

                    {/* アクションカードグリッド */}
                    <div className="grid grid-cols-1 gap-4">
                        {actionsList.map((action, idx) => {
                            const isExecutedToday = action.status === 'executed_today';
                            const isObserving = action.status === 'observing';

                            return (
                                <div
                                    key={action.id || idx}
                                    className={`relative p-5 sm:p-6 rounded-2xl border transition-all ${
                                        isExecutedToday
                                            ? 'bg-emerald-50/40 border-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.06)] ring-1 ring-emerald-400/30'
                                            : isObserving
                                            ? 'bg-indigo-50/40 border-indigo-200'
                                            : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-xs'
                                    }`}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="space-y-2.5 flex-1 min-w-0">
                                            {/* ヘッダータグ */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                                                <span className="px-2 py-0.5 rounded-md bg-zinc-200/80 text-zinc-800 font-bold border border-zinc-300 text-[11px]">
                                                    ACTION 0{idx + 1}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                                    action.actionTitle.includes('新規') || action.pageTypeLabel.includes('新規')
                                                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
                                                        : action.pageType === 'studio_cms_article'
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
                                                {!isExecutedToday && !isObserving && availableCandidates.length > 0 && (
                                                    <button
                                                        onClick={() => handleSwapTask(action.keyword)}
                                                        className="ml-auto px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 text-[11px] font-medium flex items-center gap-1 transition-all"
                                                        title="別の待機中キーワードに入れ替え"
                                                    >
                                                        <RefreshCw className="w-3 h-3 text-zinc-500" />
                                                        別のタスクに入れ替え
                                                    </button>
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
                                                <div className="text-xs font-bold text-indigo-950">
                                                    {action.actionTitle}
                                                </div>
                                                <p className="text-xs text-zinc-600 leading-relaxed font-sans line-clamp-2">
                                                    {action.actionDetail}
                                                </p>
                                            </div>

                                            {isExecutedToday && (
                                                <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 pt-1">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                                    反映完了: {action.executedAt || '本日'} ➔ 明日（{action.nextAvailableDate || '翌日'}）に次の改善アクションが自動補充されます
                                                </div>
                                            )}
                                        </div>

                                        {/* 右側アクションボタン群 */}
                                        <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2 flex-shrink-0 pt-2 lg:pt-0">
                                            <button
                                                onClick={() => handleOpenKit(action.keyword, action.targetPath, action.currentRank)}
                                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                                            >
                                                <FileText className="w-4 h-4 text-indigo-600" />
                                                STUDIO改善キットを開く
                                            </button>

                                            {onOpenGenerator && (
                                                <button
                                                    onClick={() => {
                                                        const isCms = action.pageType === 'studio_cms_article';
                                                        onOpenGenerator(
                                                            action.keyword,
                                                            isCms ? 'seo' : 'aio',
                                                            action.targetPath,
                                                            `【既存ページリライト・改善】\n対象パス: ${action.targetPath}\n現在のGoogle順位: ${action.currentRank}位\n生体力学的な解説と具体的ドリルを含めた高品質Markdown形式でリライトしてください。`
                                                        );
                                                    }}
                                                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                                    title="このキーワードでMarkdown記事を作成・リライト"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                                    Markdownで記事リライト
                                                </button>
                                            )}

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
            )}

            {/* 3. ビュー B: 【システム全般推奨ディレクティブ（HeroActions統合）】 */}
            {actionView === 'directive' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="text-xs font-mono font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 px-1">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                        週次最優先システム改善ディレクティブ (DIRECTIVES)
                    </div>

                    {primaryDirective ? (
                        <div className="bg-white rounded-2xl border border-amber-200 p-5 sm:p-7 shadow-xs space-y-5">
                            {/* プライマリディレクティブ */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getDirectiveBadge(primaryDirective.priority).dot}`}></span>
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getDirectiveBadge(primaryDirective.priority).dot}`}></span>
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${getDirectiveBadge(primaryDirective.priority).color}`}>
                                        {getDirectiveBadge(primaryDirective.priority).label}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                                        {primaryDirective.category.toUpperCase()}
                                    </span>
                                </div>

                                <button
                                    onClick={() => onResolveToggle?.(primaryDirective.id, primaryDirective.is_resolved)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                                        primaryDirective.is_resolved
                                            ? 'bg-zinc-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {primaryDirective.is_resolved ? '対応完了（未完了に戻す）' : 'この指示を完了済みにする'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                    {primaryDirective.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-sans">
                                    {primaryDirective.issue_description}
                                </p>
                                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1.5 text-xs text-zinc-800">
                                    <div className="text-indigo-900 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 具体的な作業指示（DIRECTIVE）:
                                    </div>
                                    <div className="text-slate-900 font-medium leading-relaxed font-sans">
                                        {primaryDirective.action_directive}
                                    </div>
                                </div>
                            </div>

                            {/* サブディレクティブ一覧 */}
                            {actionRecommendations.length > 1 && (
                                <div className="pt-3 border-t border-zinc-100 space-y-2">
                                    <div className="text-[11px] font-mono font-bold text-zinc-500">
                                        その他の推奨指示 ({actionRecommendations.length - 1}件):
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {actionRecommendations.slice(1).map((act) => {
                                            const b = getDirectiveBadge(act.priority);
                                            return (
                                                <div
                                                    key={act.id}
                                                    onClick={() => onResolveToggle?.(act.id, act.is_resolved)}
                                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                        act.is_resolved
                                                            ? 'bg-zinc-50/50 border-zinc-200 opacity-60'
                                                            : 'bg-zinc-50/80 border-zinc-200 hover:border-zinc-300 hover:bg-white'
                                                    }`}
                                                >
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{act.category}</span>
                                                            {act.is_resolved && <span className="text-[10px] text-emerald-700 font-bold">DONE</span>}
                                                        </div>
                                                        <div className={`text-xs font-bold truncate ${act.is_resolved ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                                                            {act.title}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-zinc-500 font-mono flex-shrink-0">
                                                        {act.is_resolved ? '解除' : '完了'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-zinc-400 font-mono text-xs bg-white rounded-2xl border border-zinc-200">
                            現在保留中の推奨ディレクティブはありません
                        </div>
                    )}
                </div>
            )}

            {/* 4. STUDIO改善キット モーダル */}
            {isKitModalOpen && activeKit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* モーダルヘッダー */}
                        <div className="p-5 sm:p-6 border-b border-zinc-200 bg-slate-50 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                                        STUDIO改善キット
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-800">
                                        「{activeKit.keyword}」 (現在{activeKit.currentRank}位)
                                    </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-slate-900">
                                    {activeKit.actionTitle}
                                </h3>
                            </div>

                            <button
                                onClick={() => setIsKitModalOpen(false)}
                                className="p-2 text-zinc-400 hover:text-zinc-700 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* モーダルタブ */}
                        <div className="flex border-b border-zinc-200 bg-zinc-50 px-5 text-xs font-bold gap-4">
                            <button
                                onClick={() => setKitActiveTab('content')}
                                className={`py-3 border-b-2 transition-all ${
                                    kitActiveTab === 'content'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                📄 本文・セクション構成
                            </button>
                            <button
                                onClick={() => setKitActiveTab('title')}
                                className={`py-3 border-b-2 transition-all ${
                                    kitActiveTab === 'title'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                🏷️ タイトル・メタタグ
                            </button>
                            <button
                                onClick={() => setKitActiveTab('jsonld')}
                                className={`py-3 border-b-2 transition-all ${
                                    kitActiveTab === 'jsonld'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                🤖 JSON-LD構造化データ
                            </button>
                            <button
                                onClick={() => setKitActiveTab('audit')}
                                className={`py-3 border-b-2 transition-all ${
                                    kitActiveTab === 'audit'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                }`}
                            >
                                🌐 公開実ページ監査
                            </button>
                        </div>

                        {/* モーダルコンテンツ */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* Gemini AI 再推論ボタン */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
                                <div className="flex items-center gap-2 text-purple-900 font-bold">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <span>Gemini 3.8 Flash によるリアルタイム最適化エンジン連携</span>
                                </div>
                                <button
                                    onClick={() => handleAiOptimizeKit(activeKit.keyword, activeKit.targetPath, activeKit.currentRank)}
                                    disabled={isAiOptimizing}
                                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isAiOptimizing ? 'animate-spin' : ''}`} />
                                    {isAiOptimizing ? 'AI推論中...' : 'AIで再最適化'}
                                </button>
                            </div>

                            {/* タブ1: 本文 */}
                            {kitActiveTab === 'content' && (
                                <div className="space-y-4">
                                    {activeKit.lpBlocks && activeKit.lpBlocks.length > 0 ? (
                                        <div className="space-y-3">
                                            {activeKit.lpBlocks.map((sec, sIdx) => (
                                                <div key={sIdx} className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-900 text-sm">{sec.sectionName}</span>
                                                        <button
                                                            onClick={() => handleCopy(`${sec.headline}\n${sec.content}\n${sec.ctaText || ''}`, `sec_${sIdx}`, sec.sectionName)}
                                                            className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1"
                                                        >
                                                            {copiedField === `sec_${sIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                            コピー
                                                        </button>
                                                    </div>
                                                    <div className="text-xs font-bold text-indigo-950">{sec.headline}</div>
                                                    <p className="text-xs text-zinc-600 whitespace-pre-wrap">{sec.content}</p>
                                                    {sec.ctaText && (
                                                        <div className="text-[11px] text-amber-800 font-bold bg-amber-50 p-2 rounded border border-amber-200">
                                                            CTAボタン: {sec.ctaText}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleCopy(activeKit.bodyText, 'bodyText', '記事Markdown全文')}
                                                    className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                                                >
                                                    {copiedField === 'bodyText' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    Markdown全文をコピー
                                                </button>
                                            </div>
                                            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 font-sans text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                                                {activeKit.bodyText}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* タブ2: タイトル・メタ */}
                            {kitActiveTab === 'title' && (
                                <div className="space-y-3">
                                    <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-zinc-500 font-mono">推奨 Title タグ:</span>
                                            <button
                                                onClick={() => handleCopy(activeKit.proposedTitle, 'titleTag', 'Titleタグ')}
                                                className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" /> コピー
                                            </button>
                                        </div>
                                        <div className="text-sm font-black text-slate-900">{activeKit.proposedTitle}</div>
                                    </div>

                                    <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-zinc-500 font-mono">推奨 Meta Description:</span>
                                            <button
                                                onClick={() => handleCopy(activeKit.proposedDescription, 'metaDesc', 'Meta Description')}
                                                className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" /> コピー
                                            </button>
                                        </div>
                                        <div className="text-xs text-zinc-700 leading-relaxed">{activeKit.proposedDescription}</div>
                                    </div>
                                </div>
                            )}

                            {/* タブ3: JSON-LD */}
                            {kitActiveTab === 'jsonld' && (
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => handleCopy(activeKit.jsonLdScript, 'jsonldCode', 'JSON-LD構造化データ')}
                                            className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                                        >
                                            <Copy className="w-4 h-4" /> JSON-LDをコピー
                                        </button>
                                    </div>
                                    <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto max-h-[350px]">
                                        {activeKit.jsonLdScript}
                                    </pre>
                                </div>
                            )}

                            {/* タブ4: 監査 */}
                            {kitActiveTab === 'audit' && (
                                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 text-xs">
                                    <div className="font-bold text-slate-900">対象パス: {activeKit.targetPath}</div>
                                    <p className="text-zinc-600 leading-relaxed font-sans">
                                        公開ページの最新HTML監査結果をチェックし、キーワード欠落や見出しタグの構造的不整合を解消するためのデータです。
                                    </p>
                                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-600">
                                        監査ステータス: 正常稼働中 ✕ STUDIO CMS/LP自動判別対応
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* モーダルフッター */}
                        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <a
                                href="https://studio.design"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                            >
                                STUDIOエディタを開く <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleStartObservingWithKit(activeKit)}
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    この内容で7日間検証スプリントを開始
                                </button>
                                <button
                                    onClick={() => setIsKitModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl bg-zinc-200 text-zinc-700 font-bold text-xs"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. 7日間検証スプリント開始 完了ポップアップ */}
            {startedSprintInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl border border-emerald-300 shadow-2xl w-full max-w-lg p-6 sm:p-8 space-y-5 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900">
                                7日間検証スプリントを開始しました！
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono">
                                対象キーワード: 「{startedSprintInfo.keyword}」 (現在{startedSprintInfo.currentRank}位)
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-2 text-left">
                            <div className="flex items-center justify-between font-mono">
                                <span className="text-zinc-500">次回レビュー予定日:</span>
                                <span className="font-bold text-emerald-700">{startedSprintInfo.reviewDate} (7日後)</span>
                            </div>
                            <div className="flex items-center justify-between font-mono">
                                <span className="text-zinc-500">次回アクション補充日:</span>
                                <span className="font-bold text-indigo-700">{startedSprintInfo.nextDay} (翌日)</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setStartedSprintInfo(null)}
                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-sm"
                        >
                            了解しました
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
