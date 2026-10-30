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
    Table,
    Image as ImageIcon,
    Save,
} from 'lucide-react';
import {
    triggerDailySeoArticleAction,
    previewNextDailyKeywordAction,
    getLatestStudioArticlesAction,
    getStudioExportBundleAction,
} from '@/actions/studio-seo-article-actions';
import {
    getSpreadsheetConfigStatusAction,
    saveSpreadsheetConfigAction,
    syncSingleArticleToSpreadsheetAction,
} from '@/actions/article-spreadsheet-actions';
import { deleteArticleAction } from '@/actions/seo-content-actions';
import { StudioCmsArticle, StudioExportBundle } from '@/lib/studio-cms-types';
import { SpreadsheetConfigStatus } from '@/lib/article-spreadsheet-service';

export function StudioDailySeoArticleCard() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSyncingSheet, setIsSyncingSheet] = useState<string | null>(null);
    const [nextCandidate, setNextCandidate] = useState<any>(null);
    const [articles, setArticles] = useState<StudioCmsArticle[]>([]);
    const [sheetStatus, setSheetStatus] = useState<SpreadsheetConfigStatus>({
        configured: false,
        spreadsheetId: null,
        spreadsheetUrl: null,
        serviceAccountEmail: null,
        targetSheetName: 'SEO記事一覧',
    });
    const [showSheetSettings, setShowSheetSettings] = useState(false);
    const [spreadsheetInput, setSpreadsheetInput] = useState('');
    const [isSavingSheet, setIsSavingSheet] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);

    // 初期データ読み込み
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [candRes, articlesRes, sheetRes] = await Promise.all([
                previewNextDailyKeywordAction(),
                getLatestStudioArticlesAction(),
                getSpreadsheetConfigStatusAction(),
            ]);

            if (candRes.success && candRes.candidate) {
                setNextCandidate(candRes.candidate);
            }

            if (articlesRes && articlesRes.length > 0) {
                setArticles(articlesRes);
            }

            if (sheetRes) {
                setSheetStatus(sheetRes);
                if (sheetRes.spreadsheetUrl) {
                    setSpreadsheetInput(sheetRes.spreadsheetUrl);
                }
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
        const toastId = toast.loading('キーワードを自律分析し、SEO記事＆サムネイルを自動執筆中...');

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
                toast.success('本日のSEO記事＆サムネイルを生成し、スプレッドシートへ自動追加しました！', { id: toastId });
                await loadData();
                setIsExpanded(true);
            } else {
                toast.error(res?.message || '記事生成処理でエラーが発生しました。再度お試しください。', { id: toastId });
            }
        } catch (err: any) {
            console.error('[Article Generate Catch]:', err);
            toast.error(err?.message || '記事生成中にエラーが発生しました。再度お試しください。', { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    // スプレッドシート設定の保存
    const handleSaveSpreadsheet = async () => {
        if (!spreadsheetInput.trim()) {
            toast.error('スプレッドシートのURLまたはIDを入力してください');
            return;
        }

        setIsSavingSheet(true);
        try {
            const res = await saveSpreadsheetConfigAction(spreadsheetInput);
            if (res.success) {
                toast.success('スプレッドシート連携先を保存しました！');
                await loadData();
                setShowSheetSettings(false);
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error('保存中にエラーが発生しました');
        } finally {
            setIsSavingSheet(false);
        }
    };

    // スプレッドシートへ手動追加
    const handleSyncToSpreadsheet = async (article: StudioCmsArticle) => {
        setIsSyncingSheet(article.id);
        const toastId = toast.loading(`スプレッドシートへ記事・本文・サムネイルを追加中...`);

        try {
            const res = await syncSingleArticleToSpreadsheetAction(article.id);
            if (res.success) {
                toast.success(`スプレッドシートへの追加が完了しました！`, { id: toastId });
                if (res.spreadsheetUrl) {
                    window.open(res.spreadsheetUrl, '_blank');
                }
            } else {
                toast.error(res.message, { id: toastId });
            }
        } catch {
            toast.error('スプレッドシート送信中にエラーが発生しました', { id: toastId });
        } finally {
            setIsSyncingSheet(null);
        }
    };

    // サービスアカウントメアドのコピー
    const handleCopyServiceAccountEmail = () => {
        if (sheetStatus.serviceAccountEmail) {
            navigator.clipboard.writeText(sheetStatus.serviceAccountEmail);
            setCopiedEmail(true);
            toast.success('Googleサービスアカウントのアドレスをコピーしました');
            setTimeout(() => setCopiedEmail(false), 3000);
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
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/70 via-white to-sky-50/50">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Table className="w-5 h-5 text-emerald-100" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-900 tracking-tight">
                                日次SEO記事・サムネイル自動生成 ＆ スプレッドシート蓄積システム
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                毎日 4:00 (JST) 自動追加
                            </span>
                            {sheetStatus.configured ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                                    <Table className="w-3 h-3 text-sky-600" />
                                    シート連携稼働中
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <Info className="w-3 h-3 text-amber-600" />
                                    スプレッドシートURL 未設定
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            AIが毎日自動で「記事タイトル・記事本文・サムネイル画像」を生成し、Googleスプレッドシートへ自動追記します（全 {articles.length} 本）。
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    {sheetStatus.spreadsheetUrl && (
                        <a
                            href={sheetStatus.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                            title="蓄積先スプレッドシートを新規タブで開く"
                        >
                            <Table className="w-3.5 h-3.5 text-emerald-600" />
                            <span>シートを開く</span>
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                    )}

                    <button
                        onClick={() => setShowSheetSettings(!showSheetSettings)}
                        className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="スプレッドシート連携の設定画面を開く"
                    >
                        <Database className="w-3.5 h-3.5 text-zinc-600" />
                        <span>シート設定</span>
                    </button>

                    <button
                        onClick={handleTriggerGenerate}
                        disabled={isGenerating}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="今すぐ新しいキーワードを自律分析し、記事とサムネイルを生成してスプレッドシートに追加します"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-100 ${isGenerating ? 'animate-spin' : ''}`} />
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

            {/* スプレッドシート連携設定パネル（アコーディオン） */}
            {showSheetSettings && (
                <div className="p-5 bg-emerald-50/60 border-t border-emerald-100 text-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-950 text-sm">
                            <Table className="w-4 h-4 text-emerald-600" />
                            Googleスプレッドシート連携の設定
                        </div>
                        <span className="text-[11px] text-emerald-700 font-medium">
                            対象シート: <strong>SEO記事一覧</strong>（未作成時は自動作成）
                        </span>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-zinc-700">
                            追加先GoogleスプレッドシートのURLまたはID:
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={spreadsheetInput}
                                onChange={(e) => setSpreadsheetInput(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/1xxxxxxxxxxxxxxxxx/edit"
                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                            <button
                                onClick={handleSaveSpreadsheet}
                                disabled={isSavingSheet}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs cursor-pointer disabled:bg-emerald-400"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isSavingSheet ? '保存中...' : '保存'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 権限共有の案内 */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 space-y-2 text-zinc-700">
                        <p className="font-semibold text-emerald-900 flex items-center gap-1">
                            <span>📌</span> スプレッドシートへの書き込み権限の付与手順:
                        </p>
                        <p className="text-[11px] leading-relaxed text-zinc-600">
                            指定したスプレッドシートの右上「<strong>共有</strong>」ボタンを押し、以下のサービスアカウントのメールアドレスを「<strong>編集者</strong>」として追加してください。
                        </p>
                        <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-lg border border-zinc-200 font-mono text-[11px]">
                            <span className="flex-1 truncate text-zinc-800">
                                {sheetStatus.serviceAccountEmail || 'swim-partners@siwm-partners.iam.gserviceaccount.com'}
                            </span>
                            <button
                                onClick={handleCopyServiceAccountEmail}
                                className="px-2 py-1 bg-white border border-zinc-300 hover:bg-zinc-100 rounded text-xs font-bold text-zinc-700 flex items-center gap-1 cursor-pointer"
                            >
                                {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedEmail ? 'コピー済' : 'コピー'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* サマリーバー（未展開時も最新記事情報を1行表示） */}
            {latest && (
                <div className="px-4 py-2.5 bg-zinc-50/80 border-t border-zinc-100 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 text-zinc-600 truncate max-w-xl">
                        <span className="font-semibold text-zinc-800 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            最新記事:
                        </span>
                        <span className="text-zinc-900 font-medium truncate">
                            {latest.title}
                        </span>
                        {latest.thumbnailUrl && (
                            <a
                                href={latest.thumbnailUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:underline flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                            >
                                <ImageIcon className="w-3 h-3" />
                                <span>サムネイル画像</span>
                            </a>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500">
                        {nextCandidate && (
                            <span className="hidden sm:inline flex items-center gap-1 text-[11px]">
                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                次回分析キーワード: <strong className="text-zinc-700">{nextCandidate.keyword}</strong>
                            </span>
                        )}
                        <button
                            onClick={() => handleCopyBundle(latest)}
                            className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        >
                            <Copy className="w-3 h-3" />
                            <span>本文コピー</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 展開パネル: 記事一覧テーブル＆管理 */}
            {isExpanded && (
                <div className="p-5 border-t border-zinc-200/80 bg-zinc-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-xs font-bold text-zinc-900">
                                自動生成記事一覧（全 {articles.length} 本）
                            </h4>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                            ※スプレッドシートには「タイトル」「本文」「サムネイル画像」「プレビュー関数」が自動で書き込まれます
                        </div>
                    </div>

                    {/* 記事一覧テーブル */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                                <tr>
                                    <th className="py-2.5 px-3">サムネイル</th>
                                    <th className="py-2.5 px-3">キーワード / タイトル</th>
                                    <th className="py-2.5 px-3">スラッグ</th>
                                    <th className="py-2.5 px-3">作成日時</th>
                                    <th className="py-2.5 px-3 text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {articles.map((art) => (
                                    <tr key={art.id} className="hover:bg-zinc-50/60 transition-colors">
                                        <td className="py-2 px-3 whitespace-nowrap">
                                            {art.thumbnailUrl ? (
                                                <a
                                                    href={art.thumbnailUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block group relative w-16 h-10 rounded-lg overflow-hidden border border-zinc-200 shadow-2xs bg-zinc-100"
                                                    title="クリックして原寸画像を開く"
                                                >
                                                    <img
                                                        src={art.thumbnailUrl}
                                                        alt={art.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                </a>
                                            ) : (
                                                <div className="w-16 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                                                    <ImageIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 max-w-xs">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
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
                                                    onClick={() => handleSyncToSpreadsheet(art)}
                                                    disabled={isSyncingSheet === art.id}
                                                    className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                                    title="指定スプレッドシートへこの行を追加"
                                                >
                                                    <Table className={`w-3 h-3 ${isSyncingSheet === art.id ? 'animate-spin' : ''}`} />
                                                    <span>シートに追加</span>
                                                </button>
                                                <button
                                                    onClick={() => handleCopyBundle(art)}
                                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors cursor-pointer"
                                                    title="記事テキストを一括コピー"
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
