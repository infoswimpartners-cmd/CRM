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
    Send,
    Trash2,
    Database,
    BookOpen,
    Info,
} from 'lucide-react';
import {
    triggerDailySeoArticleAction,
    previewNextDailyKeywordAction,
    getLatestStudioArticlesAction,
    getStudioExportBundleAction,
    getNotionConnectionStatusAction,
    syncArticleToNotionAction,
} from '@/actions/studio-seo-article-actions';
import { deleteArticleAction } from '@/actions/seo-content-actions';
import { StudioCmsArticle, StudioExportBundle } from '@/lib/studio-cms-types';

export function StudioDailySeoArticleCard() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSyncingNotion, setIsSyncingNotion] = useState<string | null>(null);
    const [nextCandidate, setNextCandidate] = useState<any>(null);
    const [articles, setArticles] = useState<StudioCmsArticle[]>([]);
    const [notionStatus, setNotionStatus] = useState<{ isConfigured: boolean; hasApiKey: boolean; hasDatabaseId: boolean }>({
        isConfigured: false,
        hasApiKey: false,
        hasDatabaseId: false,
    });
    const [showNotionGuide, setShowNotionGuide] = useState(false);

    // 初期データ読み込み
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [candRes, articlesRes, notionRes] = await Promise.all([
                previewNextDailyKeywordAction(),
                getLatestStudioArticlesAction(),
                getNotionConnectionStatusAction(),
            ]);

            if (candRes.success && candRes.candidate) {
                setNextCandidate(candRes.candidate);
            }

            if (articlesRes && articlesRes.length > 0) {
                setArticles(articlesRes);
            }

            if (notionRes) {
                setNotionStatus(notionRes);
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
            // 1. まずServer Actionを試行
            let res = await triggerDailySeoArticleAction();

            // 2. 万が一通信エラーやタイムアウト等で失敗した場合は、専用APIルートで再試行
            if (!res || !res.success) {
                console.warn('[Article Generate] Server action returned error, trying direct API route...', res?.message);
                try {
                    const apiRes = await fetch('/api/admin/generate-daily-seo-article', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (apiRes.ok) {
                        res = await apiRes.json();
                    }
                } catch (apiErr) {
                    console.warn('[Article Generate] Direct API route failed as well:', apiErr);
                }
            }

            if (res && res.success && res.article) {
                toast.success('本日のSEO記事が正常に生成されました！', { id: toastId });
                await loadData();
                setIsExpanded(true);
            } else {
                toast.error(res?.message || '記事生成処理でエラーが発生しました。再度お試しください。', { id: toastId });
            }
        } catch (err: any) {
            console.error('[Article Generate Catch]:', err);
            // APIルートへの緊急フォールバック
            try {
                const apiRes = await fetch('/api/admin/generate-daily-seo-article', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (apiRes.ok) {
                    const res = await apiRes.json();
                    if (res.success && res.article) {
                        toast.success('本日のSEO記事が正常に生成されました！', { id: toastId });
                        await loadData();
                        setIsExpanded(true);
                        return;
                    }
                }
            } catch {}

            toast.error(err?.message || '記事生成中にエラーが発生しました。再度お試しください。', { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    // Notionデータベースへ手動送信
    const handleSyncToNotion = async (article: StudioCmsArticle) => {
        setIsSyncingNotion(article.id);
        const toastId = toast.loading(`Notionデータベースへ送信中...`);

        try {
            const res = await syncArticleToNotionAction(article.id);
            if (res.success) {
                toast.success(`Notionへ投稿完了！STUDIOへ自動同期されます`, { id: toastId });
                if (res.url) {
                    window.open(res.url, '_blank');
                }
            } else {
                toast.error(res.message, { id: toastId });
            }
        } catch {
            toast.error('Notion送信中にエラーが発生しました', { id: toastId });
        } finally {
            setIsSyncingNotion(null);
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
            toast.success('STUDIO用テキストを一括コピーしました！');
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
                                日次SEO記事自動生成＆Notion同期システム
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                毎日 4:00 (JST) 自律生成
                            </span>
                            {notionStatus.isConfigured ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                    <Database className="w-3 h-3 text-indigo-600" />
                                    Notion・STUDIO連携稼働中
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <Info className="w-3 h-3 text-amber-600" />
                                    Notion環境変数 設定待ち
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            GSC・商圏データから高CVRキーワードを自律選定し、STUDIO Businessプラン（Notion連携）向けに記事を自動投稿します。
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    <button
                        onClick={() => setShowNotionGuide(!showNotionGuide)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Notion・STUDIO連携の設定ガイドを表示"
                    >
                        <Database className="w-3.5 h-3.5 text-indigo-600" />
                        <span>連携ガイド</span>
                    </button>

                    <button
                        onClick={handleTriggerGenerate}
                        disabled={isGenerating}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="今すぐ新しいキーワードを自律分析し、SEO記事を1本即時作成してNotionへ送信します"
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

            {/* Notion・STUDIO連携ガイド（アコーディオン） */}
            {showNotionGuide && (
                <div className="p-4 bg-indigo-50/70 border-t border-indigo-100 text-xs text-indigo-950 space-y-3">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        STUDIO Businessプラン × Notion連携の手順
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 text-indigo-900/90 leading-relaxed">
                        <li>
                            <strong>Notionでデータベースを作成</strong>: タイトル（名前）、<code>Slug</code>（テキスト）、<code>Description</code>（テキスト）を含むDBを用意します。
                        </li>
                        <li>
                            <strong>Notionインテグレーション作成</strong>: Notion開発者ポータルでトークンを発行し、作成したDBに接続します。
                        </li>
                        <li>
                            <strong>環境変数を設定</strong>: Vercelに <code>NOTION_API_KEY</code> と <code>NOTION_DATABASE_ID</code> を設定します。
                        </li>
                        <li>
                            <strong>STUDIO側でNotion連携</strong>: STUDIO BusinessプランのCMS画面で「Notionと連携」を選択し、上記DBを紐付けると完全自動公開が開始されます。
                        </li>
                    </ol>
                </div>
            )}

            {/* サマリーバー（未展開時も最新記事情報を1行表示） */}
            {latest && (
                <div className="px-4 py-2.5 bg-zinc-50/80 border-t border-zinc-100 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 text-zinc-600 truncate max-w-xl">
                        <span className="font-semibold text-zinc-800 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            最新生成:
                        </span>
                        <span className="text-zinc-900 font-medium truncate">
                            {latest.title}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500">
                        {nextCandidate && (
                            <span className="hidden sm:inline flex items-center gap-1 text-[11px]">
                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                次回自動分析: <strong className="text-zinc-700">{nextCandidate.keyword}</strong>
                            </span>
                        )}
                        <button
                            onClick={() => handleCopyBundle(latest)}
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                            <Copy className="w-3 h-3" />
                            <span>STUDIO用コピー</span>
                        </button>
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
                            ※Notionへ送信すると、STUDIO BusinessのNotion同期機能で自動反映されます
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
                                            {art.slug}
                                        </td>
                                        <td className="py-3 px-3 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                                            {new Date(art.createdAt).toLocaleDateString('ja-JP')}
                                        </td>
                                        <td className="py-3 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleSyncToNotion(art)}
                                                    disabled={isSyncingNotion === art.id}
                                                    className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                                    title="Notionデータベースへ送信"
                                                >
                                                    <Send className={`w-3 h-3 ${isSyncingNotion === art.id ? 'animate-spin' : ''}`} />
                                                    <span>Notion送信</span>
                                                </button>
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
