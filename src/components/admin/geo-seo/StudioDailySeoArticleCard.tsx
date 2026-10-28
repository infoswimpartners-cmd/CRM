'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Sparkles,
    Copy,
    Check,
    ExternalLink,
    RefreshCw,
    FileText,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Layers,
    Globe,
    Eye,
    Trash2,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';
import {
    triggerDailySeoArticleAction,
    previewNextDailyKeywordAction,
    getLatestStudioArticlesAction,
    getStudioExportBundleAction,
    toggleStudioArticleStatusAction,
} from '@/actions/studio-seo-article-actions';
import { deleteArticleAction } from '@/actions/seo-content-actions';
import { StudioCmsArticle, StudioExportBundle } from '@/lib/studio-cms-types';

export function StudioDailySeoArticleCard() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [nextCandidate, setNextCandidate] = useState<any>(null);
    const [articles, setArticles] = useState<StudioCmsArticle[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<StudioCmsArticle | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // 初期データ読み込み
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [candRes, articlesRes] = await Promise.all([
                previewNextDailyKeywordAction(),
                getLatestStudioArticlesAction(),
            ]);

            if (candRes.success && candRes.candidate) {
                setNextCandidate(candRes.candidate);
            }

            if (articlesRes && articlesRes.length > 0) {
                setArticles(articlesRes);
                setSelectedArticle(articlesRes[0]);
            }
        } catch (err) {
            console.warn('Failed to load daily article data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // 手動での即時分析＆記事生成
    const handleTriggerGenerate = async () => {
        setIsGenerating(true);
        const toastId = toast.loading('キーワードを自律分析し、SEO記事を自動執筆中...');

        try {
            const res = await triggerDailySeoArticleAction();
            if (res.success && res.article) {
                toast.success('本日のSEO記事が即時公開されました！', { id: toastId });
                await loadData();
                setIsExpanded(true);
            } else {
                toast.error(res.message || '記事生成に失敗しました。', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || 'エラーが発生しました。', { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    // 公開ステータスの切り替え
    const handleToggleStatus = async (article: StudioCmsArticle) => {
        const newStatus = article.status === 'published' ? 'draft' : 'published';
        try {
            const res = await toggleStudioArticleStatusAction(article.id, newStatus);
            if (res.success) {
                toast.success(`ステータスを「${newStatus === 'published' ? '公開' : '下書き'}」に変更しました`);
                await loadData();
            } else {
                toast.error('更新に失敗しました');
            }
        } catch {
            toast.error('エラーが発生しました');
        }
    };

    // 記事の削除
    const handleDeleteArticle = async (article: StudioCmsArticle) => {
        if (!confirm(`「${article.title}」を削除してもよろしいですか？`)) return;

        try {
            const res = await deleteArticleAction(article.id);
            if (res.success) {
                toast.success('記事を削除しました');
                await loadData();
            } else {
                toast.error('削除に失敗しました');
            }
        } catch {
            toast.error('エラーが発生しました');
        }
    };

    // STUDIO CMS用 一括テキストコピー
    const handleCopyBundle = async (article: StudioCmsArticle) => {
        try {
            const bundle: StudioExportBundle | null = await getStudioExportBundleAction(article.id);
            if (!bundle) throw new Error('データが見つかりませんでした');

            await navigator.clipboard.writeText(bundle.fullStudioClipboardText);
            setCopiedField('all');
            toast.success('STUDIO用テキストを一括コピーしました！');
            setTimeout(() => setCopiedField(null), 3000);
        } catch {
            toast.error('コピーに失敗しました');
        }
    };

    const latest = articles[0];

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden transition-all space-y-0">
            {/* ヘッダーバー */}
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/40">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-900 tracking-tight">
                                毎日自動SEO記事生成＆公開システム
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                毎日 4:00 (JST) 完全自動公開中
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            GSC・商圏診断から高CVRキーワードを自律選定し、SEO記事を自動執筆・即時公開します（全 {articles.length} 件管理中）。
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    <a
                        href="/articles"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                        title="公開中の記事一覧ページを新規タブで開く"
                    >
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>公開サイト一覧</span>
                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </a>

                    <button
                        onClick={handleTriggerGenerate}
                        disabled={isGenerating}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="今すぐ新しいキーワードを自律分析し、SEO記事を1本即時作成・公開します"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>{isGenerating ? '自律生成中...' : '⚡ 今日の記事を今すぐ生成'}</span>
                    </button>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-xs transition-all cursor-pointer flex items-center gap-1"
                        title={isExpanded ? '管理パネルを閉じる' : '管理パネルを展開'}
                    >
                        <span className="text-[11px] font-semibold hidden sm:inline">
                            {isExpanded ? '閉じる' : '記事一覧・管理'}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* サマリーバー（未展開時も最新記事情報を1行表示） */}
            {latest && (
                <div className="px-4 py-2.5 bg-zinc-50/80 border-t border-zinc-100 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 text-zinc-600 truncate max-w-xl">
                        <span className="font-semibold text-zinc-800 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            最新公開:
                        </span>
                        <span className="text-zinc-900 font-medium truncate">
                            {latest.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {latest.status === 'published' ? '公開中' : '下書き'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500">
                        {nextCandidate && (
                            <span className="hidden sm:inline flex items-center gap-1 text-[11px]">
                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                次回自動分析: <strong className="text-zinc-700">{nextCandidate.keyword}</strong>
                            </span>
                        )}
                        <a
                            href={`/articles/${latest.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                            <span>記事を確認</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}

            {/* 展開パネル: 記事一覧テーブル＆管理 */}
            {isExpanded && (
                <div className="p-5 border-t border-zinc-200/80 bg-zinc-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-bold text-zinc-900">
                                自動生成記事一覧（全 {articles.length} 件）
                            </h4>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                            ※公開ステータスが「公開中」の記事は、検索エンジン向けサイトマップに自動登録されます
                        </div>
                    </div>

                    {/* 記事一覧テーブル */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                                <tr>
                                    <th className="py-2.5 px-3">キーワード / タイトル</th>
                                    <th className="py-2.5 px-3">スラッグ</th>
                                    <th className="py-2.5 px-3">作成日時</th>
                                    <th className="py-2.5 px-3 text-center">公開ステータス</th>
                                    <th className="py-2.5 px-3 text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {articles.map((art) => (
                                    <tr key={art.id} className="hover:bg-zinc-50/60 transition-colors">
                                        <td className="py-3 px-3 max-w-xs">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                                    {art.keyword}
                                                </span>
                                            </div>
                                            <p className="font-bold text-zinc-900 truncate" title={art.title}>
                                                {art.title}
                                            </p>
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-500 truncate max-w-[120px]">
                                            /articles/{art.slug}
                                        </td>
                                        <td className="py-3 px-3 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                                            {new Date(art.createdAt).toLocaleDateString('ja-JP')}
                                        </td>
                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleStatus(art)}
                                                className={`px-2 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                                                    art.status === 'published'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
                                                }`}
                                                title="クリックして公開/下書きを切り替え"
                                            >
                                                {art.status === 'published' ? (
                                                    <>
                                                        <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>公開中</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="w-3.5 h-3.5 text-zinc-400" />
                                                        <span>下書き</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="py-3 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a
                                                    href={`/articles/${art.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors"
                                                    title="公開ページを確認"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                </a>
                                                <button
                                                    onClick={() => handleCopyBundle(art)}
                                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors cursor-pointer"
                                                    title="STUDIO用テキストをコピー"
                                                >
                                                    <Copy className="w-3.5 h-3.5 text-zinc-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteArticle(art)}
                                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                                    title="記事を削除"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
