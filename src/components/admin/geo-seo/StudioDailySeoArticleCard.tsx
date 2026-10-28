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
} from 'lucide-react';
import {
    triggerDailySeoArticleAction,
    previewNextDailyKeywordAction,
    getLatestStudioArticlesAction,
    getStudioExportBundleAction,
    getNotionConnectionStatusAction,
    syncArticleToNotionAction,
} from '@/actions/studio-seo-article-actions';
import { StudioCmsArticle, StudioExportBundle } from '@/lib/studio-cms-types';

export function StudioDailySeoArticleCard() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [nextCandidate, setNextCandidate] = useState<any>(null);
    const [latestArticles, setLatestArticles] = useState<StudioCmsArticle[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<StudioCmsArticle | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [notionStatus, setNotionStatus] = useState<{ isConfigured: boolean; hasApiKey: boolean; hasDatabaseId: boolean }>({
        isConfigured: false,
        hasApiKey: false,
        hasDatabaseId: false,
    });
    const [isSyncingNotion, setIsSyncingNotion] = useState(false);

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
                setLatestArticles(articlesRes);
                setSelectedArticle(articlesRes[0]);
            }

            if (notionRes) {
                setNotionStatus(notionRes);
            }
        } catch (err) {
            console.warn('Failed to load studio daily article data:', err);
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
        const toastId = toast.loading('キーワードを自律分析し、STUDIO CMS最適化記事を生成中...');

        try {
            const res = await triggerDailySeoArticleAction();
            if (res.success && res.article) {
                toast.success('本日のSTUDIO CMS記事が完成しました！', { id: toastId });
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

    // STUDIO CMS用 一括テキストコピー
    const handleCopyBundle = async (article: StudioCmsArticle) => {
        try {
            const bundle: StudioExportBundle | null = await getStudioExportBundleAction(article.id);
            if (!bundle) throw new Error('データが見つかりませんでした');

            await navigator.clipboard.writeText(bundle.fullStudioClipboardText);
            setCopiedField('all');
            toast.success('STUDIO CMS用テキストを一括コピーしました！エディタにそのまま貼り付け可能です。');
            setTimeout(() => setCopiedField(null), 3000);
        } catch {
            toast.error('クリップボードへのコピーに失敗しました。');
        }
    };

    // 個別フィールドコピー
    const handleCopyField = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            toast.success(`「${fieldName}」をコピーしました`);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            toast.error('コピーに失敗しました');
        }
    };

    // Notionデータベースへ手動送信
    const handleSyncNotion = async (article: StudioCmsArticle) => {
        setIsSyncingNotion(true);
        const toastId = toast.loading('Notionデータベースへ記事を送信中...');

        try {
            const res = await syncArticleToNotionAction(article.id);
            if (res.success) {
                toast.success('Notionへ自動投稿しました！STUDIO CMS側へ自動同期されます。', { id: toastId });
                if (res.url) {
                    window.open(res.url, '_blank');
                }
            } else {
                toast.error(res.message || 'Notionへの送信に失敗しました。', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || '通信エラーが発生しました。', { id: toastId });
        } finally {
            setIsSyncingNotion(false);
        }
    };

    const latest = latestArticles[0];

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden transition-all">
            {/* ヘッダーバー */}
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-900 tracking-tight">
                                STUDIO 記事自律生成システム
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                毎日 4:00 自動稼働中
                            </span>
                            {notionStatus.isConfigured && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                    Notion自動同期中
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            毎日キーワードを分析し、STUDIO CMS仕様（タイトル・スラッグ・本文・FAQ・JSON-LD）に最適化した記事を自動作成します。
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    {latest && (
                        <button
                            onClick={() => handleCopyBundle(latest)}
                            className="px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="STUDIO CMSエディタに直接貼り付けられるテキストを一括コピー"
                        >
                            {copiedField === 'all' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-zinc-600" />
                            )}
                            <span>{copiedField === 'all' ? 'コピー完了！' : 'STUDIO用テキストをコピー'}</span>
                        </button>
                    )}

                    <button
                        onClick={handleTriggerGenerate}
                        disabled={isGenerating}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="今すぐ新しいキーワードを自律分析し、STUDIO記事を1本即時作成します"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>{isGenerating ? '記事生成中...' : '⚡ 今日の記事を今すぐ生成'}</span>
                    </button>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 text-xs transition-all cursor-pointer"
                        title={isExpanded ? '詳細を閉じる' : '詳細を展開'}
                    >
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
                            最新作成:
                        </span>
                        <span className="text-zinc-900 font-medium truncate">
                            {latest.title}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-700 font-mono">
                            {latest.slug}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500">
                        {nextCandidate && (
                            <span className="hidden sm:inline flex items-center gap-1 text-[11px]">
                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                次回分析予定: <strong className="text-zinc-700">{nextCandidate.keyword}</strong>
                            </span>
                        )}
                        <a
                            href="https://studio.design"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                            <span>STUDIOを開く</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}

            {/* 展開パネル: STUDIO用記事エディタコピー＆詳細ビュー */}
            {isExpanded && selectedArticle && (
                <div className="p-5 border-t border-zinc-200/80 bg-zinc-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-bold text-zinc-900">
                                STUDIO CMS 反映用プレビュー（{selectedArticle.categoryLabel} / キーワード: {selectedArticle.keyword}）
                            </h4>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                            生成日時: {new Date(selectedArticle.createdAt).toLocaleString('ja-JP')}
                        </div>
                    </div>

                    {/* STUDIO CMS入力項目グリッド */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* タイトル */}
                        <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-zinc-500 font-semibold">
                                <span>■ タイトル（STUDIO「Title」枠）</span>
                                <button
                                    onClick={() => handleCopyField(selectedArticle.title, 'タイトル')}
                                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    {copiedField === 'タイトル' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>コピー</span>
                                </button>
                            </div>
                            <p className="font-bold text-zinc-900 leading-snug">{selectedArticle.title}</p>
                        </div>

                        {/* スラッグ */}
                        <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-zinc-500 font-semibold">
                                <span>■ スラッグ（STUDIO「Slug」枠）</span>
                                <button
                                    onClick={() => handleCopyField(selectedArticle.slug, 'スラッグ')}
                                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    {copiedField === 'スラッグ' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>コピー</span>
                                </button>
                            </div>
                            <p className="font-mono text-zinc-900 font-semibold">{selectedArticle.slug}</p>
                        </div>

                        {/* メタディスクリプション */}
                        <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-1.5 md:col-span-2">
                            <div className="flex items-center justify-between text-zinc-500 font-semibold">
                                <span>■ メタディスクリプション（STUDIO「SEO説明文」枠）</span>
                                <button
                                    onClick={() => handleCopyField(selectedArticle.metaDescription, 'メタ説明文')}
                                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    {copiedField === 'メタ説明文' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>コピー</span>
                                </button>
                            </div>
                            <p className="text-zinc-700 leading-relaxed">{selectedArticle.metaDescription}</p>
                        </div>
                    </div>

                    {/* 本文プレビュー＆コピー枠 */}
                    <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
                            <span>■ 記事本文（STUDIO CMSリッチテキストにそのままペースト）</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleCopyField(selectedArticle.bodyMarkdown, '本文Markdown')}
                                    className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-blue-600 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                                >
                                    {copiedField === '本文Markdown' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>本文をコピー</span>
                                </button>
                            </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-3 bg-zinc-50 rounded-lg text-xs font-mono text-zinc-700 whitespace-pre-wrap leading-relaxed border border-zinc-100">
                            {selectedArticle.bodyMarkdown}
                        </div>
                    </div>

                    {/* Notion連携（完全自動同期）ボックス */}
                    <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                                    📘 STUDIO 公式Notion同期連携:
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    notionStatus.isConfigured
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}>
                                    {notionStatus.isConfigured ? '✓ API連携設定済み（完全自動同期）' : '未設定（APIキー待ち）'}
                                </span>
                            </div>

                            <button
                                onClick={() => handleSyncNotion(selectedArticle)}
                                disabled={isSyncingNotion}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                                title="Notionデータベースへ直接記事を送信し、STUDIOへ同期させます"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNotion ? 'animate-spin' : ''}`} />
                                <span>{isSyncingNotion ? 'Notion送信中...' : 'Notion DBへ手動送信'}</span>
                            </button>
                        </div>

                        <p className="text-[11px] text-purple-800 leading-relaxed">
                            {notionStatus.isConfigured
                                ? 'Notion APIが接続されています。毎日4:00の記事自動作成時にNotionへ自動投稿され、STUDIO CMSに完全自動反映されます。'
                                : '環境変数 `NOTION_API_KEY` と `NOTION_DATABASE_ID` を設定すると、STUDIO公式Notion同期機能を通じて毎日の記事が手放しで完全自動公開されます。'}
                        </p>
                    </div>

                    {/* 反映ガイド */}
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <span className="font-bold">💡 STUDIOでの反映手順（約1分）:</span>
                            <ol className="list-decimal list-inside mt-0.5 text-blue-800 text-[11px] space-y-0.5">
                                <li>「STUDIOを開く」からCMSダッシュボードの記事コレクションを開く</li>
                                <li>右上の「新規アイテム作成」をクリック</li>
                                <li>上記の「STUDIO用テキストをコピー」で取得した内容を貼り付けて「公開」をクリック</li>
                            </ol>
                        </div>
                        <a
                            href="https://studio.design"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs flex-shrink-0"
                        >
                            <span>STUDIOエディタへ移動</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
