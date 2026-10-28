import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGeneratedArticles, GeneratedArticle } from '@/lib/generated-articles-storage';
import { buildComparisonMarkdownTable } from '@/lib/competitor-benchmark-data';
import { Sparkles, Calendar, ChevronRight, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * SSG用の静的パラメータ生成（ビルド時に全記事ページを高速静的HTML化）
 */
export async function generateStaticParams() {
    try {
        const articles = await getGeneratedArticles();
        return articles.map((article) => ({
            slug: article.target_path.split('/').pop() || article.id,
        }));
    } catch {
        return [];
    }
}

/**
 * 検索エンジン（SEO / OGP）向け動的メタデータ生成
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const articles = await getGeneratedArticles();
    const article = articles.find(
        (a) => (a.target_path.split('/').pop() || a.id) === slug || a.id === slug
    );

    if (!article) {
        return {
            title: '記事が見つかりません | スイムパートナーズ',
        };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com';
    const canonicalUrl = `${appUrl}/articles/${slug}`;

    return {
        title: `${article.title} | スイムパートナーズ公式`,
        description: article.meta_description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: article.title,
            description: article.meta_description,
            url: canonicalUrl,
            siteName: '出張個別指導スイムパートナーズ',
            locale: 'ja_JP',
            type: 'article',
        },
    };
}

export default async function ArticleDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const articles = await getGeneratedArticles();
    const article = articles.find(
        (a) => (a.target_path.split('/').pop() || a.id) === slug || a.id === slug
    );

    if (!article) {
        notFound();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com';
    const trialUrl = `${appUrl}/trial`;
    const canonicalUrl = `${appUrl}/articles/${slug}`;

    // JSON-LD構造化データ（Article + FAQPage + SportsClub）
    const jsonLdData: any = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Article',
                '@id': `${canonicalUrl}#article`,
                headline: article.title,
                description: article.meta_description,
                inLanguage: 'ja',
                mainEntityOfPage: canonicalUrl,
                datePublished: article.created_at,
                author: {
                    '@type': 'Organization',
                    name: 'スイムパートナーズ 指導部',
                    url: appUrl,
                },
                publisher: {
                    '@type': 'Organization',
                    name: '出張個別指導スイミング スイムパートナーズ',
                    url: appUrl,
                },
                keywords: [article.keyword, '水泳 個人レッスン', 'マンツーマン 水泳指導', '公営プール 出張'],
            },
            {
                '@type': 'SportsClub',
                name: 'スイムパートナーズ',
                url: appUrl,
                description: '東京・神奈川・千葉・埼玉の公営温水プールへプロコーチが出張する完全マンツーマン水泳個別指導スクール。',
                priceRange: '¥6,600〜',
            },
        ],
    };

    if (article.faq_items && article.faq_items.length > 0) {
        jsonLdData['@graph'].push({
            '@type': 'FAQPage',
            '@id': `${canonicalUrl}#faq`,
            mainEntity: article.faq_items.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: f.answer,
                },
            })),
        });
    }

    const comparisonTable = buildComparisonMarkdownTable(article.keyword);

    return (
        <div className="min-h-screen bg-[#fafafa] text-slate-900">
            {/* JSON-LD 構造化データ */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
            />

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

                    <div className="flex items-center gap-3">
                        <Link
                            href="/articles"
                            className="text-xs font-semibold text-zinc-600 hover:text-blue-600 transition-colors hidden sm:inline"
                        >
                            記事コラム一覧
                        </Link>
                        <Link
                            href="/trial"
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>体験レッスン予約</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* パンくずリスト */}
            <nav className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-2 text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
                <Link href="/" className="hover:text-blue-600">トップ</Link>
                <ChevronRight className="w-3 h-3 text-zinc-400" />
                <Link href="/articles" className="hover:text-blue-600">コラム・上達法</Link>
                <ChevronRight className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-800 font-medium truncate max-w-xs">{article.keyword}</span>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
                {/* 記事ヘッダーカード */}
                <article className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 sm:p-10 space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {article.keyword}
                            </span>
                            <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(article.created_at).toLocaleDateString('ja-JP')}
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                            {article.title}
                        </h1>

                        <p className="text-sm sm:text-base text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                            {article.meta_description}
                        </p>
                    </div>

                    {/* ファーストビュー直結CTA */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">
                                専属プロコーチが身近な公営プールへ出張
                            </span>
                            <h3 className="text-base sm:text-lg font-black leading-snug">
                                60分で悩みを解消する出張マンツーマン体験レッスン
                            </h3>
                            <p className="text-xs text-blue-100">
                                入会金・年会費ずっと0円。東京・神奈川・千葉・埼玉対応。
                            </p>
                        </div>
                        <Link
                            href={trialUrl}
                            className="px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-600 text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                        >
                            <span>空き枠を確認する</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* 記事本文 */}
                    <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-3 prose-h2:mt-10 prose-h3:text-lg sm:prose-h3:text-xl prose-p:leading-relaxed prose-p:text-zinc-700 prose-li:text-zinc-700">
                        <div
                            className="space-y-6 text-zinc-800 leading-relaxed text-sm sm:text-base"
                            dangerouslySetInnerHTML={{
                                __html: article.content_html || article.content_md.replace(/\n/g, '<br/>'),
                            }}
                        />
                    </div>

                    {/* 4社徹底比較テーブルセクション */}
                    <div className="pt-8 border-t border-zinc-200/80 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-6 rounded-full bg-blue-600" />
                            <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                                【徹底比較】大手集団スクール・他社個人指導との違い
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-600">
                            スイムパートナーズは、完全専任プロコーチがマンツーマンで伴走し、毎回の水中動画カルテと入会金無料の明朗会計で選ばれています。
                        </p>

                        <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-2xs">
                            <div className="p-4 bg-zinc-50 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                                {comparisonTable}
                            </div>
                        </div>
                    </div>

                    {/* FAQセクション */}
                    {article.faq_items && article.faq_items.length > 0 && (
                        <div className="pt-8 border-t border-zinc-200/80 space-y-4">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                                    「{article.keyword}」に関するよくある質問（FAQ）
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {article.faq_items.map((faq, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200/70 space-y-2"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                Q
                                            </span>
                                            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                                                {faq.question}
                                            </h3>
                                        </div>
                                        <div className="flex items-start gap-2.5 pl-8">
                                            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                                                {faq.answer}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 記事末尾の大型体験予約CTA */}
                    <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white space-y-6 shadow-lg">
                        <div className="space-y-2">
                            <span className="px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold border border-white/20 inline-block">
                                60分マンツーマン体験レッスン受付中
                            </span>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight">
                                悩みを放置せず、まずはプロの個別指導で上達のきっかけを掴みませんか？
                            </h2>
                            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                                東京23区、神奈川、千葉、埼玉の身近な公営温水プールへプロコーチが出張します。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span>入会金・年会費ずっと0円（初期費用なし）</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span>毎回のレッスン後に水中動画カルテ送付</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span>近所の公営プールで受講できる高い利便性</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <span>完全専任プロコーチがつきっきりで指導</span>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-blue-200 text-center sm:text-left">
                                カレンダーから空き枠を選んで約1分でお申し込み完了
                            </div>
                            <Link
                                href={trialUrl}
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-sm sm:text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                            >
                                <span>体験レッスンを予約する（空き枠確認）</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
}
