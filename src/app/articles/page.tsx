import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getGeneratedArticles, GeneratedArticle } from '@/lib/generated-articles-storage';
import { Sparkles, Calendar, ArrowRight, BookOpen, Layers } from 'lucide-react';

export const metadata: Metadata = {
    title: '水泳上達コラム・個人指導ノウハウ一覧 | スイムパートナーズ',
    description: '大人の息継ぎ・フォーム改善からジュニアの進級テスト対策、水恐怖症の克服まで、水泳専任コーチが教える上達ノウハウ記事一覧。',
};

export default async function ArticlesListPage() {
    const allArticles = await getGeneratedArticles();
    // 公開中（published）の記事のみを一覧表示（draftは除外）
    const publishedArticles = allArticles.filter((a) => a.status === 'published');

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900">
            {/* ヘッダーナビ */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                            SP
                        </span>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight text-zinc-900 group-hover:text-blue-600 transition-colors">
                                スイムパートナーズ
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                                出張水泳マンツーマン個別指導
                            </span>
                        </div>
                    </Link>

                    <Link
                        href="/trial"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>体験レッスン予約</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
                {/* ページタイトル */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                        <BookOpen className="w-3.5 h-3.5" />
                        水泳個別指導コラム＆ノウハウ
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        水泳上達コラム・お悩み解決ガイド
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
                        「息継ぎで沈む」「進級テストで停滞している」「大人から水泳を始めたい」など、水泳のリアルなお悩みを専任プロコーチの視点から科学的・生体力学的に解決する解説記事をお届けします。
                    </p>
                </div>

                {/* 記事カード一覧グリッド */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {publishedArticles.map((article) => {
                        const slug = article.target_path.split('/').pop() || article.id;
                        return (
                            <Link
                                key={article.id}
                                href={`/articles/${slug}`}
                                className="group bg-white rounded-3xl border border-zinc-200/80 hover:border-blue-400 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            {article.keyword}
                                        </span>
                                        <span className="font-mono flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(article.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>

                                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors leading-snug">
                                        {article.title}
                                    </h2>

                                    <p className="text-xs sm:text-sm text-zinc-600 line-clamp-3 leading-relaxed">
                                        {article.meta_description}
                                    </p>
                                </div>

                                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                                    <span>記事を読む</span>
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {publishedArticles.length === 0 && (
                    <div className="p-12 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-500 text-sm">
                        現在公開準備中の記事です。毎朝4:00に最新記事が自動更新されます。
                    </div>
                )}
            </main>
        </div>
    );
}
