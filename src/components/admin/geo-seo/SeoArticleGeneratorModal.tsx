'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Copy,
    Check,
    X,
    FileText,
    Code,
    HelpCircle,
    Send,
    Bot,
    BookOpen,
    Layers,
    ExternalLink,
    CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { GeneratedArticle, ArticleType } from '@/lib/generated-articles-storage';
import { generateArticleAction } from '@/actions/seo-content-actions';

interface SeoArticleGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialKeyword?: string;
    initialType?: ArticleType;
    initialTargetPath?: string;
    onArticleSaved?: (article: GeneratedArticle) => void;
}

export function SeoArticleGeneratorModal({
    isOpen,
    onClose,
    initialKeyword = '',
    initialType = 'seo',
    initialTargetPath = '',
    onArticleSaved,
}: SeoArticleGeneratorModalProps) {
    const [keyword, setKeyword] = useState(initialKeyword);
    const [articleType, setArticleType] = useState<ArticleType>(initialType);
    const [targetPath, setTargetPath] = useState(initialTargetPath);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'faq'>('preview');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setKeyword(initialKeyword || 'スイミング 進級の 早い子');
            setArticleType(initialType || 'seo');
            setTargetPath(initialTargetPath || '/zUHb45xV/swimming_tips_up');
        }
    }, [isOpen, initialKeyword, initialType, initialTargetPath]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!keyword.trim()) {
            toast.error('対象キーワードを入力してください');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await generateArticleAction({
                keyword: keyword.trim(),
                articleType,
                targetPath: targetPath.trim() || undefined,
                customPrompt: customPrompt.trim() || undefined,
            });

            if (res.success && res.data) {
                setGeneratedArticle(res.data);
                toast.success(`「${res.data.keyword}」の${articleType === 'seo' ? 'SEO記事' : 'AIO記事'}を自動生成しました！`);
                if (onArticleSaved) {
                    onArticleSaved(res.data);
                }
            } else {
                toast.error(res.error || '記事生成に失敗しました');
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(label);
            toast.success(`「${label}」をクリップボードにコピーしました`);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (e) {
            toast.error('コピーに失敗しました');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* ヘッダー */}
                <div className="p-5 sm:p-6 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-amber-50/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Sparkles className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                    SEO・AIO記事 自動生成スタジオ
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    ジョン直伝・内製化
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                検索1位奪取用SEOコンテンツ、またはChatGPT/Perplexity等に引用されるAIO記事を自律生成
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* メインエリア */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {/* 入力フォーム */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 p-4 sm:p-5 rounded-2xl border border-zinc-200/80">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    対象キーワード <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="例: スイミング 進級の 早い子"
                                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    対象ページ（URLパス）
                                </label>
                                <input
                                    type="text"
                                    value={targetPath}
                                    onChange={(e) => setTargetPath(e.target.value)}
                                    placeholder="/zUHb45xV/swimming_tips_up または /"
                                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    記事タイプ <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setArticleType('seo')}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            articleType === 'seo'
                                                ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                                                : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                            SEO記事
                                        </div>
                                        <div className="text-[10px] text-zinc-500 leading-tight">
                                            検索順位1位奪取・CVR向上
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setArticleType('aio')}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            articleType === 'aio'
                                                ? 'bg-purple-50/80 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                                                : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                                            <Bot className="w-3.5 h-3.5 text-purple-600" />
                                            AIO記事
                                        </div>
                                        <div className="text-[10px] text-zinc-500 leading-tight">
                                            AI検索引用・エビデンス網羅
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    ジョンへの追加リクエスト（任意）
                                </label>
                                <input
                                    type="text"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="例: 初心者向けのお風呂練習法を重点的に厚くして"
                                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-2 flex justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                {isGenerating ? 'AIが記事を自動執筆中...' : '記事を自動生成する'}
                            </button>
                        </div>
                    </div>

                    {/* 生成結果表示エリア */}
                    {generatedArticle && (
                        <div className="space-y-4 pt-2">
                            {/* タイトル & メタ情報 */}
                            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            generatedArticle.article_type === 'seo'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-purple-50 text-purple-700 border-purple-200'
                                        }`}>
                                            {generatedArticle.article_type === 'seo' ? 'SEO記事' : 'AIO記事'}
                                        </span>
                                        <span className="text-xs text-zinc-500 font-mono">
                                            対象パス: {generatedArticle.target_path}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopy(generatedArticle.title, 'タイトル')}
                                            className="px-2.5 py-1 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            {copiedField === 'タイトル' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                            タイトルコピー
                                        </button>
                                        <button
                                            onClick={() => handleCopy(generatedArticle.content_html, 'STUDIO用HTML')}
                                            className="px-3 py-1 text-xs rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            {copiedField === 'STUDIO用HTML' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
                                            STUDIO用HTMLを一括コピー
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                                        {generatedArticle.title}
                                    </h3>
                                    <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/70">
                                        <span className="font-bold text-zinc-700">メタディスクリプション: </span>
                                        {generatedArticle.meta_description}
                                    </p>
                                </div>
                            </div>

                            {/* タブ切り替え */}
                            <div className="flex border-b border-zinc-200">
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                                        activeTab === 'preview'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    プレビュー（Markdown）
                                </button>
                                <button
                                    onClick={() => setActiveTab('html')}
                                    className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                                        activeTab === 'html'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                    }`}
                                >
                                    <Code className="w-3.5 h-3.5" />
                                    STUDIO貼り付け用 HTML
                                </button>
                                <button
                                    onClick={() => setActiveTab('faq')}
                                    className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                                        activeTab === 'faq'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-800'
                                    }`}
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    FAQ & 構造化データ ({generatedArticle.faq_items?.length || 0}問)
                                </button>
                            </div>

                            {/* タブコンテンツ */}
                            {activeTab === 'preview' && (
                                <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 space-y-4">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => handleCopy(generatedArticle.content_md, 'Markdown本文')}
                                            className="px-3 py-1.5 text-xs rounded-xl bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                        >
                                            {copiedField === 'Markdown本文' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-600" />}
                                            Markdownをコピー
                                        </button>
                                    </div>
                                    <div className="prose prose-sm max-w-none bg-white p-6 rounded-xl border border-zinc-200 whitespace-pre-wrap font-sans text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
                                        {generatedArticle.content_md}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'html' && (
                                <div className="bg-zinc-900 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between text-zinc-400 text-xs">
                                        <span>STUDIOのCMS本文（HTMLブロック）にそのままペーストできます</span>
                                        <button
                                            onClick={() => handleCopy(generatedArticle.content_html, 'HTMLコード')}
                                            className="px-3 py-1.5 text-xs rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-1.5 transition-all"
                                        >
                                            {copiedField === 'HTMLコード' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                                            HTMLコードをコピー
                                        </button>
                                    </div>
                                    <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-200 text-xs font-mono overflow-x-auto max-h-96">
                                        {generatedArticle.content_html}
                                    </pre>
                                </div>
                            )}

                            {activeTab === 'faq' && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {generatedArticle.faq_items?.map((faq, idx) => (
                                            <div key={idx} className="bg-white rounded-xl border border-zinc-200 p-4 space-y-1.5">
                                                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                                                        Q
                                                    </span>
                                                    {faq.question}
                                                </div>
                                                <div className="text-xs text-zinc-600 pl-7 leading-relaxed">
                                                    {faq.answer}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {generatedArticle.json_ld && (
                                        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-zinc-700">Schema.org JSON-LD 構造化データ</span>
                                                <button
                                                    onClick={() => handleCopy(generatedArticle.json_ld || '', 'JSON-LD')}
                                                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold flex items-center gap-1"
                                                >
                                                    {copiedField === 'JSON-LD' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    JSON-LDコピー
                                                </button>
                                            </div>
                                            <pre className="p-3 bg-white rounded-lg border border-zinc-200 text-zinc-600 text-[11px] font-mono overflow-x-auto max-h-40">
                                                {generatedArticle.json_ld}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* フッター */}
                <div className="p-4 sm:p-5 border-t border-zinc-100 flex items-center justify-between bg-zinc-50">
                    <span className="text-xs text-zinc-500 font-mono">
                        {generatedArticle ? '✓ 生成した記事は自動で下書き保存されました' : 'キーワードを入力して生成ボタンを押してください'}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-slate-800 font-bold text-xs transition-colors"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
}
