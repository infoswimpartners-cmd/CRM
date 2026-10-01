'use client';

import React, { useState, useEffect } from 'react';
import {
    FileText,
    Sparkles,
    Trash2,
    CheckCircle2,
    Clock,
    Copy,
    Check,
    Eye,
    Plus,
    BookOpen,
    Bot,
    ExternalLink,
    Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { GeneratedArticle, ArticleType, ArticleStatus } from '@/lib/generated-articles-storage';
import {
    getGeneratedArticlesAction,
    updateArticleStatusAction,
    deleteArticleAction,
} from '@/actions/seo-content-actions';
import { SeoArticleGeneratorModal } from './SeoArticleGeneratorModal';

export function GeneratedArticlesListView() {
    const [articles, setArticles] = useState<GeneratedArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'seo' | 'aio'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published'>('all');
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [previewArticle, setPreviewArticle] = useState<GeneratedArticle | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const loadArticles = async () => {
        try {
            setLoading(true);
            const res = await getGeneratedArticlesAction();
            setArticles(res);
        } catch (e) {
            console.error('Failed to load articles:', e);
            toast.error('記事一覧の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArticles();
    }, []);

    const handleStatusToggle = async (id: string, currentStatus: ArticleStatus) => {
        const nextStatus: ArticleStatus = currentStatus === 'draft' ? 'published' : 'draft';
        try {
            const res = await updateArticleStatusAction(id, nextStatus);
            if (res.success) {
                setArticles((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
                );
                toast.success(
                    nextStatus === 'published'
                        ? 'ステータスを「公開中」に更新しました'
                        : 'ステータスを「下書き」に戻しました'
                );
            }
        } catch (e) {
            toast.error('ステータス更新に失敗しました');
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`記事「${title}」を削除してもよろしいですか？`)) return;
        try {
            const res = await deleteArticleAction(id);
            if (res.success) {
                setArticles((prev) => prev.filter((a) => a.id !== id));
                toast.success('記事を削除しました');
            }
        } catch (e) {
            toast.error('削除に失敗しました');
        }
    };

    const handleCopyHtml = async (id: string, html: string) => {
        try {
            await navigator.clipboard.writeText(html);
            setCopiedId(id);
            toast.success('STUDIO用HTMLをコピーしました');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (e) {
            toast.error('コピーに失敗しました');
        }
    };

    const filtered = articles.filter((a) => {
        if (filterType !== 'all' && a.article_type !== filterType) return false;
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* 上部ヘッダー & アクションバー */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                            <FileText className="w-5 h-5" />
                        </span>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            内製化コンテンツ・生成記事管理
                        </h2>
                    </div>
                    <p className="text-xs text-zinc-500">
                        CMOジョンが生成したSEO・AIO記事の草稿保管・公開ステータス管理・STUDIOへの貼り付け
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        新しい記事を生成する
                    </button>
                </div>
            </div>

            {/* フィルターバー */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200/80">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 text-xs font-bold text-zinc-600 mr-2">
                        <Filter className="w-3.5 h-3.5" />
                        フィルター:
                    </div>
                    {/* タイプフィルター */}
                    <div className="flex bg-white rounded-lg p-0.5 border border-zinc-200 text-xs font-bold">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 rounded-md transition-all ${
                                filterType === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            すべて
                        </button>
                        <button
                            onClick={() => setFilterType('seo')}
                            className={`px-3 py-1 rounded-md transition-all ${
                                filterType === 'seo' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            SEO記事
                        </button>
                        <button
                            onClick={() => setFilterType('aio')}
                            className={`px-3 py-1 rounded-md transition-all ${
                                filterType === 'aio' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            AIO記事
                        </button>
                    </div>

                    {/* ステータスフィルター */}
                    <div className="flex bg-white rounded-lg p-0.5 border border-zinc-200 text-xs font-bold">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1 rounded-md transition-all ${
                                filterStatus === 'all' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            全状態
                        </button>
                        <button
                            onClick={() => setFilterStatus('draft')}
                            className={`px-3 py-1 rounded-md transition-all ${
                                filterStatus === 'draft' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            下書き
                        </button>
                        <button
                            onClick={() => setFilterStatus('published')}
                            className={`px-3 py-1 rounded-md transition-all ${
                                filterStatus === 'published' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                        >
                            公開中
                        </button>
                    </div>
                </div>

                <div className="text-xs font-mono text-zinc-500 font-bold">
                    表示件数: {filtered.length} 件
                </div>
            </div>

            {/* 記事一覧リスト */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-400 font-medium animate-pulse">
                    記事データを読み込み中...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                        該当する生成記事がありません
                    </div>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                        「新しい記事を生成する」ボタンから、監視キーワードを対象としたSEO・AIO記事を自動作成できます。
                    </p>
                    <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        記事を自動生成する
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5">
                    {filtered.map((art) => {
                        const isPublished = art.status === 'published';
                        const isSeo = art.article_type === 'seo';

                        return (
                            <div
                                key={art.id}
                                className="bg-white rounded-2xl border border-zinc-200 p-5 hover:border-zinc-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                                isSeo
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                            }`}
                                        >
                                            {isSeo ? <BookOpen className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                            {isSeo ? 'SEO記事' : 'AIO記事'}
                                        </span>

                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                            キーワード: {art.keyword}
                                        </span>

                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                                isPublished
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                            }`}
                                        >
                                            {isPublished ? (
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                                <Clock className="w-3 h-3 text-zinc-400" />
                                            )}
                                            {isPublished ? 'STUDIO公開中' : '下書き（未公開）'}
                                        </span>

                                        <span className="text-[11px] text-zinc-400 font-mono">
                                            {new Date(art.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>

                                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug hover:text-indigo-600 transition-colors">
                                        {art.title}
                                    </h3>

                                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                        {art.meta_description}
                                    </p>

                                    <div className="text-[11px] text-zinc-400 font-mono">
                                        対象パス: {art.target_path}
                                    </div>
                                </div>

                                <div className="flex flex-wrap md:flex-col items-center md:items-end justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleCopyHtml(art.id, art.content_html)}
                                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 transition-colors"
                                            title="STUDIOに貼り付けるHTMLコードをコピー"
                                        >
                                            {copiedId === art.id ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                                            )}
                                            HTMLコピー
                                        </button>

                                        <button
                                            onClick={() => setPreviewArticle(art)}
                                            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            閲覧
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleStatusToggle(art.id, art.status)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                isPublished
                                                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                            }`}
                                        >
                                            {isPublished ? '下書きに戻す' : '公開済みにする'}
                                        </button>

                                        <button
                                            onClick={() => handleDelete(art.id, art.title)}
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="記事を削除"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 記事自動生成モーダル */}
            <SeoArticleGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                onArticleSaved={() => {
                    loadArticles();
                }}
            />

            {/* プレビュー詳細モーダル */}
            {previewArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">
                                    {previewArticle.article_type === 'seo' ? 'SEO記事' : 'AIO記事'} / {previewArticle.status}
                                </span>
                                <h3 className="font-extrabold text-slate-900 text-base">
                                    {previewArticle.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setPreviewArticle(null)}
                                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600">
                                <span className="font-bold">メタ説明: </span>
                                {previewArticle.meta_description}
                            </div>
                            <div className="prose prose-sm max-w-none whitespace-pre-wrap font-sans text-slate-800 leading-relaxed bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100">
                                {previewArticle.content_md}
                            </div>
                        </div>
                        <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50">
                            <button
                                onClick={() => handleCopyHtml(previewArticle.id, previewArticle.content_html)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                STUDIO用HTMLをコピー
                            </button>
                            <button
                                onClick={() => setPreviewArticle(null)}
                                className="px-4 py-2 rounded-xl bg-zinc-200 text-zinc-700 font-bold text-xs"
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
