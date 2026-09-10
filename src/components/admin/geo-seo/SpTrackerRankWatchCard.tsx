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

                {/* メインセクション: 現在「観察中」または「次の1位狙撃候補」 */}
                {observingItem ? (
                    // パターンA: 7日間観察中（再変更禁止モード）
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                                    <Clock className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <div className="text-[11px] font-mono font-bold text-indigo-300 tracking-wider uppercase">
                                        OBSERVING IN PROGRESS — 7日間効果測定中
                                    </div>
                                    <div className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                                        <span>「{observingItem.keyword}」</span>
                                        <span className="text-xs font-mono font-normal text-zinc-400">
                                            (現在 {observingItem.current_rank} 位 / 狙い: 1位)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs text-zinc-400 font-mono">次回レビュー予定日</div>
                                <div className="text-base font-black font-mono text-amber-300 flex items-center gap-1.5 justify-end mt-0.5">
                                    <Calendar className="w-4 h-4" />
                                    {observingItem.log?.review_date} (残り {observingItem.remainingDays} 日)
                                </div>
                            </div>
                        </div>

                        {/* 再変更禁止の注意喚起ガードレール */}
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3">
                            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <div className="font-bold text-amber-300">
                                    【重要】7日間の効果測定期間中（再変更禁止ガードレール）
                                </div>
                                <div className="text-zinc-300 leading-relaxed">
                                    検索エンジンのクローラーによる再巡回と順位定着を検証するため、観察期間中は該当ページ（{observingItem.target_path}）の再編集を控え、Search Consoleのデータ変動を待ちます。
                                </div>
                            </div>
                        </div>

                        {/* 実施した施策内容 */}
                        <div className="p-5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 space-y-2">
                            <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 実施した本質的改善（ONE-ACTION）:
                            </div>
                            <h4 className="text-base font-bold text-white">
                                {observingItem.log?.action_title}
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                {observingItem.log?.action_detail}
                            </p>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenKit(observingItem.keyword, observingItem.target_path, observingItem.current_rank)}
                                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                                >
                                    <FileText className="w-4 h-4 text-indigo-400" />
                                    反映中のSTUDIO改善キット（本文 & 構造化データ）を再確認・コピー
                                </button>
                                <a
                                    href="https://studio.design"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-800"
                                >
                                    STUDIOを開く
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleMarkAchieved(observingItem.keyword)}
                                    disabled={isSubmitting}
                                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Trophy className="w-4 h-4 text-zinc-950" />
                                    検索順位1位を達成した（Achieved認定）
                                </button>
                                <button
                                    onClick={() => handleCompleteObserving(observingItem.keyword)}
                                    disabled={isSubmitting}
                                    className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all border border-zinc-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    観察完了・次へ
                                </button>
                            </div>
                        </div>
                    </div>
                ) : topContender ? (
                    // パターンB: 改善対象候補（active）
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center gap-2 text-xs font-mono">
                                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                                    最優先 1位狙撃ターゲット
                                </span>
                                <span className="text-zinc-400">現在: {topContender.current_rank}位 → 目標: 1位</span>
                            </div>

                            <h3 className="text-3xl font-black text-white tracking-tight">
                                「{topContender.keyword}」
                            </h3>

                            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                現在 {topContender.current_rank} 位に位置しており、上位との差は僅かです。対象ページ（<span className="font-mono text-indigo-300">{topContender.target_path}</span>）に対して検索ニーズに合わせた本質的な改善を行い、7日間の効果測定を開始してください。
                            </p>

                            <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-200 font-sans space-y-2 backdrop-blur-sm">
                                <div className="text-zinc-400 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 推奨される本質的改善（ONE-ACTION DIRECTIVE）:
                                </div>
                                <div className="text-zinc-100 font-medium leading-relaxed">
                                    検索ユーザーの不安や疑問（進級基準・脱力のコツ・料金・指導手順）を解消する完成形テキストとリッチリザルト（FAQ構造化データ）を用意しました。STUDIOにコピペするだけで即座に反映できます。
                                </div>
                                <div className="pt-2">
                                    <button
                                        onClick={() => handleOpenKit(topContender.keyword, topContender.target_path, topContender.current_rank)}
                                        className="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                                    >
                                        <FileText className="w-4 h-4 text-indigo-400" />
                                        📋 STUDIO用コピペ改善キット（本文・FAQ・JSON-LD）を開く
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex flex-col justify-center gap-3">
                            <button
                                onClick={() => handleOpenKit(topContender.keyword, topContender.target_path, topContender.current_rank)}
                                className="w-full py-4 px-6 rounded-xl font-sans font-bold text-sm tracking-wide transition-all duration-200 shadow-lg flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.25)] active:scale-[0.99]"
                            >
                                <Sparkles className="w-4 h-4 text-zinc-950" />
                                コピペ用改善素材を表示して検証開始
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <a
                                    href="https://studio.design"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-2.5 px-3 rounded-xl font-sans font-medium text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 transition-all flex items-center justify-center gap-1.5"
                                >
                                    STUDIOを開く
                                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                                </a>
                                <a
                                    href={`https://swim-partners.com${topContender.target_path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-2.5 px-3 rounded-xl font-sans font-medium text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-zinc-800 transition-all flex items-center justify-center gap-1.5"
                                >
                                    ページを確認
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (
                    // パターンC: すべて1位達成または候補なし
                    <div className="p-8 text-center space-y-3 bg-zinc-800/30 rounded-xl border border-zinc-800">
                        <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                        <h4 className="text-lg font-bold text-white">監視対象キーワードが順調に推移しています</h4>
                        <p className="text-xs text-zinc-400">現在、改善を要する緊急のターゲットはありません。定点観測を継続します。</p>
                    </div>
                )}
            </div>

            {/* STUDIOコピペ用 完成形改善キット モーダル */}
            {isKitModalOpen && activeKit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 md:p-8 text-zinc-100 space-y-6 shadow-2xl max-h-[90vh] flex flex-col">
                        {/* モーダルヘッダー */}
                        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                        STUDIO 貼り付け用 改善キット
                                    </span>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        現在 {activeKit.currentRank}位 ➔ 目標 1位
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-white">
                                    「{activeKit.keyword}」1位獲得用コンテンツ
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

                        {/* 手順ガイド */}
                        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
                            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                                <Sparkles className="w-4 h-4" /> STUDIOへの反映手順（所要時間: 約1分）
                            </div>
                            <ol className="list-decimal list-inside space-y-0.5 text-zinc-300 pl-1">
                                {activeKit.studioSteps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                ))}
                            </ol>
                        </div>

                        {/* コンテンツタブ / カード一覧 */}
                        <div className="overflow-y-auto space-y-5 pr-2 flex-1 text-xs">
                            {/* ① 本文テキストブロック */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-amber-400" />
                                        ① STUDIOエディタ用 本文テキスト（見出し・チェックシート）
                                    </div>
                                    <button
                                        onClick={() => handleCopy(activeKit.bodyText, 'body', '本文テキスト')}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        {copiedField === 'body' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" /> コピー完了
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> 本文をコピー
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-sans text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-zinc-800">
                                    {activeKit.bodyText}
                                </pre>
                            </div>

                            {/* ② FAQ Q&Aブロック */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-400" />
                                        ② STUDIOエディタ用 よくある質問（FAQセクション）
                                    </div>
                                    <button
                                        onClick={() => handleCopy(activeKit.faqText, 'faq', 'FAQテキスト')}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        {copiedField === 'faq' ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" /> コピー完了
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> FAQをコピー
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-sans text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto border border-zinc-800">
                                    {activeKit.faqText}
                                </pre>
                            </div>

                            {/* ③ STUDIO Custom Code用 JSON-LD構造化データ */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            <Code2 className="w-4 h-4 text-emerald-400" />
                                            ③ STUDIOカスタムコード用 JSON-LD構造化データ
                                        </div>
                                        <div className="text-[11px] text-zinc-400">
                                            ※ STUDIOの「ページ設定 ➔ カスタムコード ➔ &lt;head&gt;内 または &lt;body&gt;末尾」に貼り付け
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
                                <pre className="p-3 rounded-lg bg-zinc-950 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto border border-zinc-800">
                                    {activeKit.jsonLdScript}
                                </pre>
                            </div>

                            {/* ④ メタタイトル & メタディスクリプション */}
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-800/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-sky-400" />
                                        ④ 推奨タイトル & ディスクリプション
                                    </div>
                                    <button
                                        onClick={() => handleCopy(`Title: ${activeKit.metaTitle}\nDescription: ${activeKit.metaDescription}`, 'meta', 'メタ情報')}
                                        className="px-2.5 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium flex items-center gap-1"
                                    >
                                        {copiedField === 'meta' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        メタ情報をコピー
                                    </button>
                                </div>
                                <div className="text-zinc-300 font-mono text-xs bg-zinc-950 p-2.5 rounded border border-zinc-800 space-y-1">
                                    <div><span className="text-zinc-500">Title:</span> {activeKit.metaTitle}</div>
                                    <div><span className="text-zinc-500">Desc:</span> {activeKit.metaDescription}</div>
                                </div>
                            </div>
                        </div>

                        {/* モーダルフッター: 反映完了ボタン */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                            <a
                                href="https://studio.design"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                                STUDIOエディタを開く
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

