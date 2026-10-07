'use client';

import React, { useState, useEffect } from 'react';
import {
    Swords,
    ExternalLink,
    Search,
    Sparkles,
    Copy,
    Check,
    FileText,
    Rocket,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    ShieldAlert,
    Building2,
    DollarSign,
    RefreshCw,
    Award,
    Flame,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    CompetitorId,
    CompetitorProfile,
    KeywordCompetitorIntelligence,
} from '@/types/competitor-benchmark';
import {
    BENCHMARK_COMPETITORS,
    SEED_KEYWORD_INTELLIGENCE,
} from '@/lib/competitor-benchmark-data';
import {
    getBenchmarkCompetitorsAction,
    analyzeKeywordCompetitorsAction,
    getSavedCompetitorAnalysisAction,
} from '@/actions/competitor-benchmark-actions';
import { optimizeKitWithGeminiAction } from '@/actions/sp-tracker-actions';
import { ArticleType } from '@/lib/generated-articles-storage';

// 代表クイックキーワード定義
const QUICK_KEYWORDS = [
    '水泳 息継ぎ コツ 大人',
    '水泳 個人レッスン 品川',
    'スイミング 進級の 早い子',
    '水泳 個人レッスン 千葉',
    '水泳 個人レッスン 東京',
];

interface BenchmarkCompetitorPanelProps {
    initialKeyword?: string;
    onOpenGenerator?: (
        keyword: string,
        type: ArticleType,
        targetPath?: string,
        initialPrompt?: string,
        competitorIntelligence?: KeywordCompetitorIntelligence
    ) => void;
    onOpenKit?: (keyword: string, targetPath?: string) => void;
}

export function BenchmarkCompetitorPanel({
    initialKeyword = '水泳 息継ぎ コツ 大人',
    onOpenGenerator,
    onOpenKit,
}: BenchmarkCompetitorPanelProps) {
    // 競合3社マスタ状態
    const [competitorMasters, setCompetitorMasters] = useState<Record<CompetitorId, CompetitorProfile>>(BENCHMARK_COMPETITORS);
    const [isLoadingMasters, setIsLoadingMasters] = useState(false);

    // キーワード分析状態
    const [inputKeyword, setInputKeyword] = useState(initialKeyword);
    const [currentIntelligence, setCurrentIntelligence] = useState<KeywordCompetitorIntelligence | null>(
        SEED_KEYWORD_INTELLIGENCE[initialKeyword] || null
    );
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisSource, setAnalysisSource] = useState<'cache' | 'gemini' | 'rule_fallback' | undefined>(
        SEED_KEYWORD_INTELLIGENCE[initialKeyword] ? 'cache' : undefined
    );

    // コピー状態
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // 内蔵LP改善キットプレビューモーダル状態
    const [isKitModalOpen, setIsKitModalOpen] = useState(false);
    const [isOptimizingKit, setIsOptimizingKit] = useState(false);
    const [kitData, setKitData] = useState<any | null>(null);

    // initialKeyword が外部から変更された場合の追従
    useEffect(() => {
        if (initialKeyword && initialKeyword !== inputKeyword) {
            setInputKeyword(initialKeyword);
            handleAnalyze(initialKeyword, false);
        }
    }, [initialKeyword]);

    // 初期マスタのサーバー同期
    useEffect(() => {
        const loadMasters = async () => {
            setIsLoadingMasters(true);
            try {
                const res = await getBenchmarkCompetitorsAction();
                if (res.success && res.data) {
                    setCompetitorMasters(res.data);
                }
            } catch (err) {
                console.error('競合マスタ取得エラー:', err);
            } finally {
                setIsLoadingMasters(false);
            }
        };
        loadMasters();
    }, []);

    // 競合分析実行処理
    const handleAnalyze = async (kwToAnalyze?: string, forceRefresh = false) => {
        const targetKw = (kwToAnalyze || inputKeyword).trim();
        if (!targetKw) {
            toast.error('分析対象のキーワードを入力してください');
            return;
        }

        setIsAnalyzing(true);
        try {
            // まず保存済みキャッシュの確認（forceRefreshでない場合）
            if (!forceRefresh && SEED_KEYWORD_INTELLIGENCE[targetKw]) {
                setCurrentIntelligence(SEED_KEYWORD_INTELLIGENCE[targetKw]);
                setAnalysisSource('cache');
                toast.success(`「${targetKw}」の確定ベンチマーク分析を展開しました`);
                setIsAnalyzing(false);
                return;
            }

            const res = await analyzeKeywordCompetitorsAction(targetKw, undefined, forceRefresh);
            if (res.success && res.data) {
                setCurrentIntelligence(res.data);
                setAnalysisSource(res.source);
                if (res.source === 'gemini') {
                    toast.success(`「${targetKw}」をGemini 3.8 Flashでリアルタイム分析しました`);
                } else if (res.source === 'cache') {
                    toast.success(`「${targetKw}」のキャッシュ分析データを読み込みました`);
                } else {
                    toast.info(`「${targetKw}」の高精度ベンチマーク分析を生成しました`);
                }
            } else {
                toast.error(res.error || '競合分析の取得に失敗しました');
            }
        } catch (err: any) {
            console.error('分析実行エラー:', err);
            toast.error('分析実行中にエラーが発生しました: ' + (err.message || ''));
        } finally {
            setIsAnalyzing(false);
        }
    };

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

    // 1クリックで記事生成スタジオを開く
    const handleTriggerGenerator = () => {
        if (!currentIntelligence) return;
        const kw = currentIntelligence.keyword;
        const targetPath = currentIntelligence.targetPath || `/articles/${encodeURIComponent(kw.replace(/\s+/g, '-'))}`;
        const promptText = `競合3社（Swimmy、ベースプラス、スイサポ）の弱点を突き、自社推奨CTA「${currentIntelligence.recommendedCta.headline}」を自然に訴求するSEO上位獲得記事を執筆してください。`;

        if (onOpenGenerator) {
            onOpenGenerator(kw, 'seo', targetPath, promptText, currentIntelligence);
            toast.success(`「${kw}」の他社分析インテリジェンスを記事スタジオへ連携しました`);
        } else {
            toast.info('記事生成スタジオのハンドラが接続されていません');
        }
    };

    // 1クリックでLP改善キットへ反映
    const handleTriggerKit = async () => {
        if (!currentIntelligence) return;
        const kw = currentIntelligence.keyword;
        const targetPath = currentIntelligence.targetPath || '/personal_swim';

        // 親コールバックがあれば通知
        if (onOpenKit) {
            onOpenKit(kw, targetPath);
        }

        // 内蔵モーダルを開き、リアルタイムで競合反映済みキットを取得
        setIsKitModalOpen(true);
        setIsOptimizingKit(true);
        try {
            const res = await optimizeKitWithGeminiAction(kw, targetPath, 2, false);
            if (res.success && res.data) {
                setKitData(res.data);
                toast.success('競合3社ベンチマークを反映したLP改善キットを取得しました');
            } else {
                toast.error(res.message || 'LP改善キットの生成に失敗しました');
            }
        } catch (err: any) {
            console.error('LP改善キット取得エラー:', err);
            toast.error('LP改善キット取得中にエラーが発生しました');
        } finally {
            setIsOptimizingKit(false);
        }
    };

    // MarkdownテーブルをHTMLテーブルに簡易レンダリングするヘルパー
    const renderMarkdownTable = (markdown: string) => {
        if (!markdown) return null;
        const lines = markdown.trim().split('\n').filter((l) => l.trim().startsWith('|'));
        if (lines.length < 2) {
            return (
                <pre className="text-xs font-mono p-4 bg-zinc-900 text-zinc-100 rounded-xl overflow-x-auto whitespace-pre">
                    {markdown}
                </pre>
            );
        }

        const parseCells = (line: string) =>
            line
                .split('|')
                .slice(1, -1)
                .map((cell) => cell.trim());

        const headerCells = parseCells(lines[0]);
        // lines[1] はアライメント区切り（|:---|:---|等）
        const bodyLines = lines.slice(2);

        const formatCellText = (text: string) => {
            // **太字** の置換
            const parts = text.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={idx} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        return (
            <div className="overflow-x-auto no-scrollbar border border-zinc-200/80 rounded-xl shadow-xs">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-zinc-100/80 border-b border-zinc-200 text-zinc-600 font-bold">
                            {headerCells.map((head, idx) => (
                                <th
                                    key={idx}
                                    className={`py-3 px-3.5 ${
                                        idx === 1
                                            ? 'bg-indigo-50/90 text-indigo-950 font-black border-x border-indigo-200/80'
                                            : ''
                                    }`}
                                >
                                    {formatCellText(head)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {bodyLines.map((line, rIdx) => {
                            const cells = parseCells(line);
                            return (
                                <tr key={rIdx} className="hover:bg-zinc-50/80 transition-colors">
                                    {cells.map((cell, cIdx) => (
                                        <td
                                            key={cIdx}
                                            className={`py-3 px-3.5 leading-relaxed ${
                                                cIdx === 1
                                                    ? 'bg-indigo-50/40 font-bold text-indigo-950 border-x border-indigo-100'
                                                    : 'text-zinc-700'
                                            }`}
                                        >
                                            {formatCellText(cell)}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* 1. ヘッダーカード */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                            <Swords className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    競合3社ベンチマーク監視 ＆ 比較分析インテリジェンス
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Apple HIG 準拠
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                主要3社（Swimmy / ベースプラス / スイサポ）の料金体系・強み・弱点を常時監視。対象キーワードに対する自社勝ち筋・推奨CTAを自動導出します。
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-400">
                            監視対象: 3社常時同期
                        </span>
                    </div>
                </div>

                {/* 2. 競合3社監視カード並列表示（Swimmy / ベースプラス / スイサポ） */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 pt-2">
                    {(['swimmy', 'base_plus', 'suisapo'] as CompetitorId[]).map((compId) => {
                        const profile = competitorMasters[compId] || BENCHMARK_COMPETITORS[compId];
                        if (!profile) return null;

                        return (
                            <div
                                key={compId}
                                className="bg-zinc-50/70 rounded-xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 hover:shadow-xs transition-all"
                            >
                                <div className="space-y-3">
                                    {/* 企業ヘッダー */}
                                    <div className="flex items-start justify-between gap-2 border-b border-zinc-200/80 pb-3">
                                        <div>
                                            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                                                {profile.corporateName}
                                            </div>
                                            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                                                {profile.name}
                                            </h3>
                                        </div>
                                        <a
                                            href={profile.officialUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-zinc-200/50 transition-colors"
                                            title="公式サイトを開く"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>

                                    {/* 料金モデル */}
                                    <div className="bg-white rounded-lg p-3 border border-zinc-200/70 space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between font-bold text-slate-900">
                                            <span className="flex items-center gap-1 text-zinc-500 font-medium">
                                                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                                                料金モデル
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 text-zinc-700">
                                                透明性: {profile.pricingModel.transparencyRating.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-zinc-700 font-medium">
                                            • 入会金: <strong className="text-slate-900">{profile.pricingModel.admissionFee}</strong>
                                        </div>
                                        <div className="text-[11px] text-zinc-700 font-medium">
                                            • 指導料: <strong className="text-slate-900">{profile.pricingModel.lessonFeeRange}</strong>
                                        </div>
                                        {profile.pricingModel.hiddenCostsNotice && (
                                            <div className="text-[11px] text-amber-800 bg-amber-50/80 p-1.5 rounded border border-amber-200/60 leading-tight">
                                                ⚠️ {profile.pricingModel.hiddenCostsNotice}
                                            </div>
                                        )}
                                    </div>

                                    {/* 強み */}
                                    <div className="space-y-1 text-xs">
                                        <div className="font-bold text-zinc-600 flex items-center gap-1 text-[11px]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            強み
                                        </div>
                                        <ul className="list-disc list-inside text-zinc-600 text-[11px] space-y-0.5 leading-snug pl-1">
                                            {profile.strengths.slice(0, 2).map((s, idx) => (
                                                <li key={idx} className="truncate" title={s}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* 弱点・自社対比の盲点 */}
                                    <div className="space-y-1 text-xs">
                                        <div className="font-bold text-rose-700 flex items-center gap-1 text-[11px]">
                                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                            弱点・自社対比の盲点
                                        </div>
                                        <ul className="list-disc list-inside text-rose-950/80 text-[11px] space-y-0.5 leading-snug pl-1">
                                            {profile.weaknesses.slice(0, 2).map((w, idx) => (
                                                <li key={idx} className="truncate" title={w}>{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* 自社差別化決定打 */}
                                <div className="pt-2 border-t border-zinc-200/80">
                                    <div className="text-[10px] font-mono font-bold text-indigo-700 uppercase mb-0.5 flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-indigo-600" />
                                        自社（スイムパートナーズ）の差別化
                                    </div>
                                    <p className="text-[11px] font-bold text-indigo-950 leading-snug bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                                        {profile.ourDifferentiation.pitch}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. キーワード選択・自由入力 ＆ 分析実行バー */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            KEYWORD INTELLIGENCE ENGINE
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                            キーワード別 競合3社ベンチマーク分析
                        </h3>
                    </div>

                    {/* 代表キーワード選択クイックピル */}
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <span className="text-[11px] font-bold text-zinc-400 mr-1">クイック選択:</span>
                    </div>
                </div>

                {/* クイックピルリスト */}
                <div className="flex flex-wrap items-center gap-2">
                    {QUICK_KEYWORDS.map((kw) => {
                        const isSelected = inputKeyword === kw;
                        return (
                            <button
                                key={kw}
                                onClick={() => {
                                    setInputKeyword(kw);
                                    handleAnalyze(kw, false);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    isSelected
                                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70 border border-zinc-200/80'
                                }`}
                            >
                                {kw}
                            </button>
                        );
                    })}
                </div>

                {/* 自由入力欄 ＆ 実行ボタン */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={inputKeyword}
                            onChange={(e) => setInputKeyword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAnalyze(inputKeyword, false);
                                }
                            }}
                            placeholder="分析したいキーワードを入力（例: 水泳 個人レッスン 品川）"
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-zinc-50 rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-slate-900 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleAnalyze(inputKeyword, false)}
                            disabled={isAnalyzing}
                            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isAnalyzing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                                    <span>3社分析を実行中...</span>
                                </>
                            ) : (
                                <>
                                    <Swords className="w-4 h-4 text-amber-300" />
                                    <span>⚔️ 競合3社分析を実行</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => handleAnalyze(inputKeyword, true)}
                            disabled={isAnalyzing}
                            className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 border border-zinc-200"
                            title="Gemini AIで最新の推論を強制再実行"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>AI再分析</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. 分析結果詳細表示 */}
            {currentIntelligence && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* 4.1 分析サマリー ＆ ステータスヘッダー */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    対象: {currentIntelligence.keyword}
                                </span>
                                {analysisSource === 'gemini' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                        Gemini 3.8 Flash 動的推論
                                    </span>
                                )}
                                {analysisSource === 'cache' && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        確定データバンク
                                    </span>
                                )}
                            </div>

                            <span className="text-[11px] font-mono text-zinc-400">
                                分析日時: {new Date(currentIntelligence.analyzedAt).toLocaleString('ja-JP')}
                            </span>
                        </div>

                        {/* 総合サマリー */}
                        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs sm:text-sm text-zinc-700 leading-relaxed">
                            <span className="font-extrabold text-slate-900 block mb-1">💡 競合環境 ＆ 検索意図サマリー:</span>
                            {currentIntelligence.summary}
                        </div>

                        {/* 4.2 競合3社の個別弱点・自社勝ち筋グリッド */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            {(['swimmy', 'base_plus', 'suisapo'] as CompetitorId[]).map((compId) => {
                                const item = currentIntelligence.competitorAnalyses[compId];
                                if (!item) return null;

                                return (
                                    <div
                                        key={compId}
                                        className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-2xs hover:border-indigo-200 transition-all flex flex-col justify-between"
                                    >
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                                <h4 className="font-black text-slate-900 text-sm">
                                                    {item.competitorName}
                                                </h4>
                                                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                                                    {compId}
                                                </span>
                                            </div>

                                            {/* 想定ポジショニング */}
                                            <div className="text-xs">
                                                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-0.5">
                                                    上位ポジショニング
                                                </div>
                                                <div className="text-zinc-700 text-xs leading-snug">
                                                    {item.assumedPositioning}
                                                </div>
                                            </div>

                                            {/* 上位弱点 */}
                                            <div className="text-xs bg-rose-50/70 p-2.5 rounded-lg border border-rose-100">
                                                <div className="text-[10px] font-bold text-rose-800 uppercase mb-0.5 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                                    上位記事の弱点・盲点
                                                </div>
                                                <div className="text-rose-950 text-xs leading-snug font-medium">
                                                    {item.topRankWeakness}
                                                </div>
                                            </div>

                                            {/* 料金対比 */}
                                            {item.priceComparison && (
                                                <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-200/60 leading-snug">
                                                    💰 {item.priceComparison}
                                                </div>
                                            )}
                                        </div>

                                        {/* 自社の勝ち筋 */}
                                        <div className="pt-2 border-t border-zinc-100">
                                            <div className="text-[10px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                                                <Award className="w-3 h-3 text-emerald-600" />
                                                自社の勝ち筋（論理的切り口）
                                            </div>
                                            <div className="text-xs font-bold text-emerald-950 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/80 leading-snug">
                                                {item.ourWinningAngle}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4.3 「💡 各社が言及していない盲点」ハイライト */}
                    <div className="bg-gradient-to-br from-amber-50/90 via-amber-50/50 to-orange-50/40 rounded-xl border border-amber-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3">
                        <div className="flex items-center gap-2 text-amber-900">
                            <div className="w-7 h-7 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                                💡
                            </div>
                            <h3 className="font-black text-base sm:text-lg tracking-tight">
                                競合各社が言及していない決定的な盲点（ここを突けば1位独占）
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            {currentIntelligence.blindSpots.map((spot, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white/90 backdrop-blur-2xs rounded-lg p-3.5 border border-amber-200/70 text-xs text-amber-950 leading-relaxed font-semibold shadow-2xs flex items-start gap-2"
                                >
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span>{spot}</span>
                                </div>
                            ))}
                        </div>

                        <div className="text-xs text-amber-800 bg-white/70 p-3 rounded-lg border border-amber-200/50 font-medium">
                            <strong className="text-amber-950">自社必勝総合戦略:</strong> {currentIntelligence.ourWinningStrategy}
                        </div>
                    </div>

                    {/* 4.4 「🏆 自社推奨CTA」ブロック */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-500" />
                                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    自社推奨CTA（高成約キラー訴求）
                                </h3>
                            </div>
                            <span className="text-xs text-zinc-500 font-medium">
                                ターゲット: <strong className="text-slate-900">{currentIntelligence.recommendedCta.targetAudience}</strong>
                            </span>
                        </div>

                        <div className="bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 p-4 sm:p-5 rounded-xl border border-indigo-200/80 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-mono font-bold text-indigo-700 uppercase">
                                        RECOMMENDED CTA HEADLINE
                                    </div>
                                    <div className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                                        {currentIntelligence.recommendedCta.headline}
                                    </div>
                                    <div className="text-xs text-zinc-600 font-medium">
                                        {currentIntelligence.recommendedCta.subheadline}
                                    </div>
                                </div>

                                <button
                                    onClick={() =>
                                        handleCopy(
                                            `${currentIntelligence.recommendedCta.headline}\n${currentIntelligence.recommendedCta.subheadline}\n【ボタン】${currentIntelligence.recommendedCta.buttonText}`,
                                            'cta',
                                            '推奨CTA一式'
                                        )
                                    }
                                    className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-2xs flex-shrink-0 cursor-pointer"
                                    title="推奨CTAをクリップボードにコピー"
                                >
                                    {copiedField === 'cta' ? (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            <div className="pt-2 flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white font-black text-xs shadow-xs">
                                    {currentIntelligence.recommendedCta.buttonText}
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                    ← 記事末尾およびLP体験予約導線に配置
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 4.5 「📊 4社徹底比較テーブル」のMarkdown表示 */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                            <div>
                                <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                                    4-COMPANY COMPARISON MATRIX
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                    4社徹底比較テーブル（客観ファクト対比）
                                </h3>
                            </div>

                            <button
                                onClick={() =>
                                    handleCopy(
                                        currentIntelligence.comparisonMarkdownTable,
                                        'table',
                                        '4社比較Markdownテーブル'
                                    )
                                }
                                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-zinc-200 cursor-pointer"
                            >
                                {copiedField === 'table' ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>コピー完了</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>Markdown表をコピー</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* テーブルHTMLプレビュー */}
                        {renderMarkdownTable(currentIntelligence.comparisonMarkdownTable)}
                    </div>

                    {/* 4.6 1クリック連携アクションバー（最重要） */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-950 uppercase">
                                    1-CLICK SYNC
                                </span>
                                <h4 className="text-base sm:text-lg font-black tracking-tight">
                                    この他社分析インテリジェンスを次の施策へ即座に反映
                                </h4>
                            </div>
                            <p className="text-xs text-zinc-300">
                                上位3社の弱点・4社比較表・推奨CTAをそのまま引き継ぎ、新規SEO記事の執筆または公開LPの改善キットへ反映します。
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* 記事執筆スタジオ連携 */}
                            <button
                                onClick={handleTriggerGenerator}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                                <FileText className="w-4 h-4 text-amber-300" />
                                <span>📝 この他社分析で新規記事を執筆</span>
                            </button>

                            {/* LP改善キット連携 */}
                            <button
                                onClick={handleTriggerKit}
                                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                                <Rocket className="w-4 h-4 text-slate-950" />
                                <span>🚀 LP改善キットに反映</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. 内蔵LP改善キットプレビューモーダル */}
            {isKitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* モーダルヘッダー */}
                        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                                    <Rocket className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        LP改善キット プレビュー（競合3社ベンチマーク最適化）
                                    </h3>
                                    <p className="text-xs text-zinc-500">
                                        対象: 「{currentIntelligence?.keyword}」 | Swimmy・ベースプラス・スイサポ対比を組み込んだ6ブロック構成
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsKitModalOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* モーダル本文 */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {isOptimizingKit ? (
                                <div className="py-16 text-center space-y-3">
                                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                                    <p className="text-sm font-bold text-slate-700">
                                        Gemini 3.8 Flash で競合3社対比LPキットをリアルタイム生成中...
                                    </p>
                                </div>
                            ) : kitData ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 font-medium leading-relaxed">
                                        <strong className="text-indigo-900 block mb-0.5">
                                            {kitData.actionTitle}
                                        </strong>
                                        {kitData.summary}
                                    </div>

                                    {/* 6ブロック一覧 */}
                                    <div className="space-y-3">
                                        <div className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">
                                            GENERATED LP CONTENT BLOCKS ({kitData.lpBlocks?.length || 0} BLOCKS)
                                        </div>
                                        {kitData.lpBlocks?.map((block: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-indigo-200 transition-all space-y-2 shadow-2xs"
                                            >
                                                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                                    <span className="font-bold text-xs text-indigo-700">
                                                        {block.sectionName}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            handleCopy(
                                                                `${block.headline || ''}\n${block.body || ''}`,
                                                                `block_${idx}`,
                                                                block.sectionName
                                                            )
                                                        }
                                                        className="px-2 py-1 rounded text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-medium flex items-center gap-1 cursor-pointer"
                                                    >
                                                        {copiedField === `block_${idx}` ? (
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                        <span>コピー</span>
                                                    </button>
                                                </div>
                                                {block.headline && (
                                                    <div className="font-extrabold text-sm text-slate-900">
                                                        {block.headline}
                                                    </div>
                                                )}
                                                {block.body && (
                                                    <div className="text-xs text-zinc-600 whitespace-pre-line leading-relaxed">
                                                        {block.body}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-zinc-400 text-xs">
                                    LP改善キットデータがありません
                                </div>
                            )}
                        </div>

                        {/* モーダルフッター */}
                        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsKitModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-100 transition-colors cursor-pointer"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
