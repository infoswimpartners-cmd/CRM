import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
    AREA_SEO_AUDIT_DATA,
    getAreaBySlugOrId,
    getAllAreaStaticParams,
    AreaSeoAuditItem,
} from '@/lib/area-seo-audit';
import {
    CheckCircle2,
    MapPin,
    Video,
    ShieldCheck,
    Clock,
    ArrowRight,
    Star,
    Sparkles,
    Waves,
    Calendar,
    Award,
    HelpCircle,
    ChevronRight,
    PhoneCall,
    Check,
    X,
} from 'lucide-react';

interface PageProps {
    params: Promise<{
        area: string;
    }>;
}

/**
 * 静的生成対象のパラメータ一覧を生成（主要エリア・全エリア対応）
 */
export async function generateStaticParams() {
    return getAllAreaStaticParams();
}

/**
 * SEOに最適化された動的メタデータを生成
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { area } = await params;
    const areaData = getAreaBySlugOrId(area);

    if (!areaData) {
        return {
            title: '水泳個人レッスン・マンツーマン指導｜Swim Partners',
            description: '公営温水プールへの出張専門・水泳個人レッスン指導のSwim Partners。',
        };
    }

    const facilityNames = areaData.majorFacilities.map((f) => f.name).join('・');
    const cleanAreaName = areaData.areaName.split('（')[0];

    const title = `${cleanAreaName}の水泳個人レッスン・マンツーマン指導｜公営プール出張のSwim Partners`;
    const description = `${cleanAreaName}（${facilityNames}等）の公営プールに出張対応する水泳個人レッスン・マンツーマン指導。水慣れからクロール25m完泳、進級テスト対策、大人の泳ぎ直しまで専任コーチが指導。毎回の動画カルテ付き、入会金0円。体験レッスン受付中。`;

    const canonicalPath = `/personal_swim/${areaData.slug}`;

    return {
        title,
        description,
        keywords: [
            `水泳 個人レッスン ${cleanAreaName}`,
            `水泳 マンツーマン ${cleanAreaName}`,
            `スイミング 個人指導 ${cleanAreaName}`,
            `${cleanAreaName} 公営プール 水泳`,
            ...areaData.majorFacilities.map((f) => f.name),
            'Swim Partners',
            'スイムパートナーズ',
        ],
        alternates: {
            canonical: `https://swim-partners.com${canonicalPath}`,
        },
        openGraph: {
            title,
            description,
            url: `https://swim-partners.com${canonicalPath}`,
            siteName: 'Swim Partners (スイムパートナーズ)',
            locale: 'ja_JP',
            type: 'website',
        },
    };
}

/**
 * 主要商圏エリアLP コンポーネント
 */
export default async function AreaPersonalSwimPage({ params }: PageProps) {
    const { area } = await params;
    const areaData = getAreaBySlugOrId(area);

    if (!areaData) {
        notFound();
    }

    const cleanAreaName = areaData.areaName.split('（')[0];
    const facilityListText = areaData.majorFacilities.map((f) => f.name).join('、');

    // 体験予約リンク（エリア情報を付与してスムーズに引き継ぐ）
    const trialBookingUrl = `/trial?area=${encodeURIComponent(areaData.slug)}`;

    // 構造化データ（JSON-LD）: LocalBusiness + FAQPage
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'SportsClub',
                '@id': `https://swim-partners.com/personal_swim/${areaData.slug}#club`,
                name: `Swim Partners ${cleanAreaName} 水泳個人レッスン出張指導`,
                description: `${areaData.areaName}の身近な公営温水プールへ出張する水泳マンツーマン個人指導スクール。`,
                url: `https://swim-partners.com/personal_swim/${areaData.slug}`,
                priceRange: '¥¥',
                address: {
                    '@type': 'PostalAddress',
                    addressRegion: areaData.prefectureJa,
                    addressLocality: areaData.areaName,
                    addressCountry: 'JP',
                },
                areaServed: {
                    '@type': 'AdministrativeArea',
                    name: areaData.areaName,
                },
            },
            {
                '@type': 'FAQPage',
                '@id': `https://swim-partners.com/personal_swim/${areaData.slug}#faq`,
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: `${cleanAreaName}ではどの公営プールでレッスンを受講できますか？`,
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: `${facilityListText}など、${cleanAreaName}および近隣の公営温水プールに出張して完全マンツーマンレッスンを実施いたします。お客様のご都合に合わせたプールをご指定いただけます。`,
                        },
                    },
                    {
                        '@type': 'Question',
                        name: '顔つけが苦手で水が怖い子どもでも大丈夫でしょうか？',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'はい、大歓迎です。水慣れや水恐怖症の克服を得意とする専任コーチが、お子様のペースに合わせて優しく楽しくマンツーマンで寄り添います。無理に潜らせるような指導は一切いたしません。',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: '公営プールの施設利用料やコーチの交通費はいくらかかりますか？',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'コーチの出張交通費はすべてレッスン料金に含まれており、追加の交通費請求は0円です。公営プールの入場料（ご自身分およびコーチ分：各施設数百円程度）のみ現地券売機にて実費をご負担いただきます。',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: '大手スイミングスクールで進級テストに合格できず悩んでいます。',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: '大手スクールでは1人のコーチが10〜15人を指導するため、1回あたりの実際の遊泳・指導時間が数分程度になりがちです。Swim Partnersでは60分間完全専任で改善点をピンポイントに修正し、毎回の動画カルテでフォームを確認するため、早期の進級・合格が可能です。',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: '大人やマスターズ水泳、初心者シニアの受講も可能ですか？',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'はい、成人の方の受講実績も多数ございます。「息継ぎができずクロールが泳げない」「綺麗なフォームで楽に泳ぎたい」「健康維持のために始めたい」など、目的・泳力に合わせた無理のない指導を行います。',
                        },
                    },
                ],
            },
        ],
    };

    return (
        <div className="min-h-screen bg-white text-slate-800 selection:bg-blue-100 selection:text-blue-900">
            {/* 構造化データ（JSON-LD） */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ナビゲーションバー */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:opacity-90 transition">
                        <Waves className="w-6 h-6 text-blue-600" />
                        <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                            Swim Partners
                        </span>
                        <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            水泳個人レッスン
                        </span>
                    </Link>

                    <div className="flex items-center space-x-3">
                        <span className="hidden md:inline-block text-xs text-slate-500 font-medium">
                            {cleanAreaName}出張対応・完全専任マンツーマン
                        </span>
                        <Link
                            href={trialBookingUrl}
                            className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all"
                        >
                            体験レッスン予約
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                {/* 1. ファーストビュー (Hero Section) */}
                <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-sky-50/30 to-white pt-10 pb-16 md:pt-16 md:pb-20">
                    <div className="max-w-5xl mx-auto px-4">
                        {/* 地域バッジ */}
                        <div className="flex justify-center mb-4">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-white text-blue-700 border border-blue-200 shadow-sm">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span>{areaData.areaName} 出張指導対応エリア</span>
                            </span>
                        </div>

                        {/* H1見出し */}
                        <div className="text-center max-w-3xl mx-auto">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight sm:leading-tight md:leading-tight mb-5">
                                <span className="text-blue-600">{cleanAreaName}</span>の水泳個人レッスン・<br className="hidden sm:inline" />
                                マンツーマン個別指導ならSwim Partners
                            </h1>
                            <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed mb-8">
                                <strong className="text-slate-900 font-semibold">{facilityListText}</strong>
                                など、身近な公営温水プールへ専任プロコーチが出張指導。<br className="hidden md:inline" />
                                水嫌い・顔つけの克服からクロール25m完泳、進級テスト対策、大人の泳ぎ直しまで徹底サポートいたします。
                            </p>
                        </div>

                        {/* 4大強みクイックバッジ */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-10">
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="text-left">
                                    <div className="text-xs text-slate-500 font-medium">専任コーチ</div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-800">完全マンツーマン</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                                <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="text-left">
                                    <div className="text-xs text-slate-500 font-medium">通いやすさ</div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-800">近所の公営プール出張</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                                <Video className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="text-left">
                                    <div className="text-xs text-slate-500 font-medium">上達が見える</div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-800">毎回の動画カルテ</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                                <div className="text-left">
                                    <div className="text-xs text-slate-500 font-medium">入会金0円</div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-800">追加交通費なし明朗会計</div>
                                </div>
                            </div>
                        </div>

                        {/* ファーストビュー直下 CTA */}
                        <div className="max-w-md mx-auto text-center">
                            <Link
                                href={trialBookingUrl}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base sm:text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                            >
                                <span>【60分】{cleanAreaName}での体験レッスンを申し込む</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <p className="mt-2 text-xs text-slate-500 flex items-center justify-center gap-2">
                                <span>✓ 入会金・年会費0円</span>
                                <span>✓ 指名料不要</span>
                                <span>✓ Webから24時間即時予約</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* 2. 出張対応公営プールセクション（SEO・成約最重要項目） */}
                <section id="facilities" className="py-14 sm:py-16 bg-white border-t border-slate-100">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-10">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                公営プール出張対応施設
                            </span>
                            {/* H2見出しに主要プール名および地域名を確実に網羅 */}
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-4">
                                🏊‍♂️ {cleanAreaName}内の主な出張対応公営温水プール（{facilityListText}）
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                                ご自宅や学校・職場近くの身近な温水プールで手軽に受講いただけます。<br className="hidden sm:inline" />
                                面倒な入会金や施設縛りは一切不要。ご都合に合わせてお好きな施設をお選びいただけます。
                            </p>
                        </div>

                        {/* 施設一覧グリッド */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            {areaData.majorFacilities.map((facility, idx) => (
                                <div
                                    key={idx}
                                    className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span>{facility.name}</span>
                                            </h3>
                                            <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                                出張対応
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                            <span>所在地: {facility.address}</span>
                                        </div>
                                        <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                                            <p>
                                                <strong className="text-slate-900">プールスペック:</strong>{' '}
                                                {facility.poolSpecs}
                                            </p>
                                            <p>
                                                <strong className="text-slate-900">施設特徴:</strong>{' '}
                                                {facility.features}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-medium">
                                            専任コーチが出張指導
                                        </span>
                                        <Link
                                            href={`${trialBookingUrl}&facility=${encodeURIComponent(facility.name)}`}
                                            className="inline-flex items-center text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            このプールで体験レッスンを予約
                                            <ChevronRight className="w-4 h-4 ml-0.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-center text-xs sm:text-sm text-slate-600">
                            💡 上記以外の公営温水プールや、ご自宅マンション・施設の居住者専用プールへの出張も可能です。<br className="hidden sm:inline" />
                            「このプールでも受講できる？」など、まずはお気軽に体験予約フォームよりご相談ください。
                        </div>
                    </div>
                </section>

                {/* 3. 4大強み詳細セクション */}
                <section className="py-14 sm:py-16 bg-slate-50/70 border-t border-slate-100">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-12">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                4大メリット
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-4">
                                Swim Partnersが{cleanAreaName}で選ばれる4つの強み
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600">
                                集団スクールでは実現できない、完全マンツーマン指導だからこその圧倒的な上達実感と安心をお約束します。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 強み1 */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl mb-4">
                                    01
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">
                                    毎回同じプロコーチによる完全専任マンツーマン
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    レッスンごとにコーチが変わる不安はありません。生徒様一人ひとりの泳力・骨格・性格・過去のつまずきを深く理解した専任コーチが、一貫した指導方針で着実に泳力を伸ばします。
                                </p>
                            </div>

                            {/* 強み2 */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl mb-4">
                                    02
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">
                                    身近な公営プール出張で送迎の負担を大幅軽減
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    遠くのスイミングスクールへ毎週通う必要はありません。{facilityListText}など、ご自宅近くの身近な温水プールへコーチが出張するため、保護者様の送迎ストレスを最小化できます。
                                </p>
                            </div>

                            {/* 強み3 */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl mb-4">
                                    03
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">
                                    毎回のレッスン動画カルテで上達の軌跡を可視化
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    「今日どんな練習をしたか」「どこが直ったか」を毎回のレッスン後に専用の電子動画カルテでお届け。客観的な水中フォームや改善ポイントをご家庭でいつでも確認できます。
                                </p>
                            </div>

                            {/* 強み4 */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl mb-4">
                                    04
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">
                                    入会金・年会費・追加交通費なしの明朗会計
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    入会金や年会費、更新料は一切いただきません。また他社でよくある「不透明な出張交通費」や「コーチ指名料」も全てコミコミ。安心の明朗会計で無理なく続けられます。
                                </p>
                            </div>
                        </div>

                        {/* セクション間 CTA */}
                        <div className="mt-10 text-center">
                            <Link
                                href={trialBookingUrl}
                                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                            >
                                <span>{cleanAreaName}での体験レッスンを申し込む</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 4. 他社スクール徹底比較表 */}
                <section className="py-14 sm:py-16 bg-white border-t border-slate-100">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                徹底比較
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-4">
                                💡 他社スイミングスクール・都度払い個人指導との違い
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600">
                                集団スクールや一般的な個人レッスン派遣と比較して、Swim Partnersが選ばれ続ける理由をご確認ください。
                            </p>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                            <table className="w-full border-collapse text-left text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="p-3.5 sm:p-4 text-slate-700 font-bold">比較項目</th>
                                        <th className="p-3.5 sm:p-4 bg-blue-50/80 text-blue-800 font-extrabold border-x border-blue-200">
                                            当校（Swim Partners）
                                        </th>
                                        <th className="p-3.5 sm:p-4 text-slate-500 font-semibold">一般的な都度払い派遣</th>
                                        <th className="p-3.5 sm:p-4 text-slate-500 font-semibold">大手集団スイミング</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="p-3.5 sm:p-4 font-bold text-slate-800 bg-white">指導体制</td>
                                        <td className="p-3.5 sm:p-4 bg-blue-50/40 text-blue-900 font-bold border-x border-blue-200">
                                            完全専任マンツーマン（1対1）
                                        </td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">都度コーチが変わる</td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">1対10〜15人の集団</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 sm:p-4 font-bold text-slate-800 bg-white">出張交通費</td>
                                        <td className="p-3.5 sm:p-4 bg-blue-50/40 text-blue-900 font-bold border-x border-blue-200">
                                            <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold">
                                                追加0円（全額込み）
                                            </span>
                                        </td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">毎回 +1,000円〜実費</td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">（指定施設に通学）</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 sm:p-4 font-bold text-slate-800 bg-white">コーチ指名料</td>
                                        <td className="p-3.5 sm:p-4 bg-blue-50/40 text-blue-900 font-bold border-x border-blue-200">
                                            <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-bold">
                                                ずっと0円（無料）
                                            </span>
                                        </td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">+1,500円〜2,500円</td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">指名不可（固定）</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 sm:p-4 font-bold text-slate-800 bg-white">成長の可視化</td>
                                        <td className="p-3.5 sm:p-4 bg-blue-50/40 text-blue-900 font-bold border-x border-blue-200">
                                            毎回の動画カルテ送付
                                        </td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">口頭のアドバイスのみ</td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">月1回のテスト判定のみ</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 sm:p-4 font-bold text-slate-800 bg-white">実質練習時間</td>
                                        <td className="p-3.5 sm:p-4 bg-blue-50/40 text-blue-900 font-bold border-x border-blue-200">
                                            60分間みっちり泳げる
                                        </td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">60分間マンツーマン</td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">順番待ちで実質10分前後</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3.5 sm:p-4 font-bold text-slate-800 bg-white">予約の利便性</td>
                                        <td className="p-3.5 sm:p-4 bg-blue-50/40 text-blue-900 font-bold border-x border-blue-200">
                                            Webから24時間即時予約
                                        </td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">LINE等での日程相談</td>
                                        <td className="p-3.5 sm:p-4 text-slate-600">曜日・時間完全固定</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 5. お悩み・レベル別の選べる個別指導コース */}
                <section className="py-14 sm:py-16 bg-slate-50/70 border-t border-slate-100">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                レッスン対象
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-4">
                                🎯 お悩み・レベル別の選べる個別指導コース
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600">
                                年齢・泳力を問わず、お客様の現状とゴールに合わせたオーダーメイド指導を実施します。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* コース1: キッズ・水慣れ〜完泳 */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                                        Kids & Elementary
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">
                                        幼児・小学生<br />（水慣れ〜25m完泳）
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                                        顔つけや水が怖いお子様も安心。恐怖心を優しく解きほぐしながら、正しいキック・呼吸法・クロール25m完泳までを最短ルートで導きます。
                                    </p>
                                    <ul className="space-y-2 text-xs text-slate-700 mb-6">
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>顔つけ・バブリング・浮き身</span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>バタ足・板キック・呼吸動作</span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>クロール・背泳ぎ25m完泳</span>
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href={trialBookingUrl}
                                    className="w-full text-center py-2.5 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs sm:text-sm transition"
                                >
                                    水慣れ体験を申し込む
                                </Link>
                            </div>

                            {/* コース2: ジュニア進級・4泳法習得 */}
                            <div className="p-6 rounded-2xl bg-white border-2 border-blue-600 shadow-md flex flex-col justify-between relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                                    一番人気
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                                        Junior Improvement
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">
                                        スイミング進級対策<br />（4泳法・フォーム改善）
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                                        集団スクールで何度も同じ級で落ちてしまう原因を、毎回の動画分析で解明。平泳ぎ・バタフライの習得やテスト合格を最短で実現します。
                                    </p>
                                    <ul className="space-y-2 text-xs text-slate-700 mb-6">
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>スクールの進級テスト合格対策</span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>平泳ぎのキック・あおり足矯正</span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>バタフライのうねり・タイミング</span>
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href={trialBookingUrl}
                                    className="w-full text-center py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs sm:text-sm transition"
                                >
                                    進級対策体験を申し込む
                                </Link>
                            </div>

                            {/* コース3: 大人・シニア・マスターズ */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">
                                        Adult & Masters
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">
                                        大人・シニア水泳<br />（泳ぎ直し・健康維持）
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                                        「息が続かない」「肩や腰を痛めずに長く楽に泳ぎたい」「カナヅチを克服したい」など、大人の課題をバイオメカニクスに基づき丁寧に指導します。
                                    </p>
                                    <ul className="space-y-2 text-xs text-slate-700 mb-6">
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>大人のカナヅチ克服・息継ぎ習得</span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>腰痛・肩こり予防の楽なフォーム</span>
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <Check className="w-4 h-4 text-blue-600" />
                                            <span>マスターズ・トライアスロン対策</span>
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href={trialBookingUrl}
                                    className="w-full text-center py-2.5 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs sm:text-sm transition"
                                >
                                    大人の体験を申し込む
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. 明朗な料金体系セクション */}
                <section className="py-14 sm:py-16 bg-white border-t border-slate-100">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                料金案内
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-4">
                                💰 明朗な料金体系（入会金・年会費・コーチ指名料 0円）
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600">
                                指導料・出張料すべて込み。不透明な費用は一切いただきません。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
                            {/* 体験レッスン */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-600 shadow-sm">
                                <div className="inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-blue-600 text-white mb-3">
                                    初回限定
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    マンツーマン体験レッスン（60分）
                                </h3>
                                <div className="text-3xl font-black text-blue-600 mb-4">
                                    6,600<span className="text-lg font-normal text-slate-600">円（税込）</span>
                                </div>
                                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>専任コーチによる完全マンツーマン指導60分</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>近隣の公営プールへの出張費込み</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>レッスン後のアドバイス動画カルテ進呈</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span>入会金・年会費は一切かかりません</span>
                                    </li>
                                </ul>
                                <Link
                                    href={trialBookingUrl}
                                    className="w-full inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition"
                                >
                                    体験レッスンを予約する
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {/* 継続レッスン */}
                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 mb-3">
                                        継続プラン
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                                        定期レッスン / 単発チケット
                                    </h3>
                                    <div className="text-2xl font-black text-slate-900 mb-4">
                                        7,700<span className="text-base font-normal text-slate-600">円〜 / 回（税込）</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                                        月2回・月4回などの定期月額プラン、またはご都合に合わせて受講できる単発チケットをお選びいただけます。
                                    </p>
                                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                                        <p>✓ コーチ指名料：無料（ずっと同じコーチ）</p>
                                        <p>✓ 振替対応：前日までのご連絡で別日へ振替可能</p>
                                        <p>✓ 公営プール入場料（実費数百円）のみ現地払い</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 mt-4 text-center">
                                    <span className="text-xs text-slate-500">
                                        ※まずは体験レッスンにて相性をお確かめください
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 7. よくある質問（FAQ）セクション */}
                <section className="py-14 sm:py-16 bg-slate-50/70 border-t border-slate-100">
                    <div className="max-w-3xl mx-auto px-4">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                FAQ
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 mb-4">
                                ❓ {cleanAreaName}の水泳個人レッスンに関するよくある質問
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600">
                                初めて水泳マンツーマン指導を受講される方からよくいただくご質問にお答えします。
                            </p>
                        </div>

                        <div className="space-y-4">
                            <details className="group p-5 bg-white rounded-2xl border border-slate-200 shadow-xs [&_summary::-webkit-details-marker]:hidden open:border-blue-300">
                                <summary className="flex items-center justify-between font-bold text-slate-900 cursor-pointer list-none text-sm sm:text-base">
                                    <span className="flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                        <span>{cleanAreaName}ではどの公営プールでレッスンを受講できますか？</span>
                                    </span>
                                    <span className="transition group-open:rotate-180 shrink-0 ml-2">
                                        <ChevronRight className="w-5 h-5 text-slate-400 rotate-90 group-open:rotate-270" />
                                    </span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    {facilityListText}など、{cleanAreaName}および近隣の公営温水プールに出張して完全マンツーマンレッスンを実施いたします。お客様のご都合に合わせたプールをご指定いただけます。
                                </div>
                            </details>

                            <details className="group p-5 bg-white rounded-2xl border border-slate-200 shadow-xs [&_summary::-webkit-details-marker]:hidden open:border-blue-300">
                                <summary className="flex items-center justify-between font-bold text-slate-900 cursor-pointer list-none text-sm sm:text-base">
                                    <span className="flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                        <span>顔つけが苦手で水が怖い子どもでも大丈夫でしょうか？</span>
                                    </span>
                                    <span className="transition group-open:rotate-180 shrink-0 ml-2">
                                        <ChevronRight className="w-5 h-5 text-slate-400 rotate-90 group-open:rotate-270" />
                                    </span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    はい、大歓迎です。水慣れや水恐怖症の克服を得意とする専任コーチが、お子様のペースに合わせて優しく楽しくマンツーマンで寄り添います。無理に潜らせるような指導は一切いたしません。
                                </div>
                            </details>

                            <details className="group p-5 bg-white rounded-2xl border border-slate-200 shadow-xs [&_summary::-webkit-details-marker]:hidden open:border-blue-300">
                                <summary className="flex items-center justify-between font-bold text-slate-900 cursor-pointer list-none text-sm sm:text-base">
                                    <span className="flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                        <span>プールの利用料やコーチの交通費は別途かかりますか？</span>
                                    </span>
                                    <span className="transition group-open:rotate-180 shrink-0 ml-2">
                                        <ChevronRight className="w-5 h-5 text-slate-400 rotate-90 group-open:rotate-270" />
                                    </span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    コーチの出張交通費はすべてレッスン料金に含まれており、追加の交通費請求は0円です。公営プールの入場料（ご自身分およびコーチ分：各施設数百円程度）のみ現地券売機にて実費をご負担いただきます。
                                </div>
                            </details>

                            <details className="group p-5 bg-white rounded-2xl border border-slate-200 shadow-xs [&_summary::-webkit-details-marker]:hidden open:border-blue-300">
                                <summary className="flex items-center justify-between font-bold text-slate-900 cursor-pointer list-none text-sm sm:text-base">
                                    <span className="flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                        <span>体験レッスン当日に必要な持ち物は？</span>
                                    </span>
                                    <span className="transition group-open:rotate-180 shrink-0 ml-2">
                                        <ChevronRight className="w-5 h-5 text-slate-400 rotate-90 group-open:rotate-270" />
                                    </span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    水着、水泳キャップ、ゴーグル、タオル、プール入場料（数百円程度）をお持ちください。ビート板やヘルパーなどの練習補助具は多くの公営プールで無料貸出されています。
                                </div>
                            </details>

                            <details className="group p-5 bg-white rounded-2xl border border-slate-200 shadow-xs [&_summary::-webkit-details-marker]:hidden open:border-blue-300">
                                <summary className="flex items-center justify-between font-bold text-slate-900 cursor-pointer list-none text-sm sm:text-base">
                                    <span className="flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                        <span>予約後の日程変更やキャンセルはできますか？</span>
                                    </span>
                                    <span className="transition group-open:rotate-180 shrink-0 ml-2">
                                        <ChevronRight className="w-5 h-5 text-slate-400 rotate-90 group-open:rotate-270" />
                                    </span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    前日までのご連絡であれば、手数料なしで日時の振替が可能です。急な体調不良やご予定の変更にも柔軟に対応いたします。
                                </div>
                            </details>
                        </div>
                    </div>
                </section>

                {/* 8. 最下部コンバージョンセクション (Final CTA) */}
                <section className="py-16 sm:py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <div className="inline-block px-4 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs sm:text-sm font-bold mb-6">
                            📍 {cleanAreaName}エリア限定 体験レッスン受付中
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-6 leading-tight">
                            まずは1回、公営プールでのマンツーマン個別指導をお試しください
                        </h2>
                        <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
                            「うちの子でも集中できる？」「大人のカナヅチでも本当に泳げるようになる？」<br className="hidden sm:inline" />
                            そんなご不安を解消するための60分体験レッスンです。無理な勧誘は一切ございません。
                        </p>

                        <div className="max-w-md mx-auto">
                            <Link
                                href={trialBookingUrl}
                                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base sm:text-lg font-black text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xl shadow-amber-400/20 transition-all transform hover:-translate-y-0.5"
                            >
                                <span>{cleanAreaName}での体験レッスンに申し込む（60分）</span>
                                <ArrowRight className="w-5 h-5 text-slate-900" />
                            </Link>
                            <p className="mt-3 text-xs text-blue-200">
                                ※ Web予約フォームより24時間いつでも空き枠の確認・ご予約が可能です
                            </p>
                        </div>
                    </div>
                </section>

                {/* 9. 近隣エリアリンク一覧（内部リンクSEO強化） */}
                <section className="py-10 bg-slate-50 border-t border-slate-200 text-xs">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-slate-500 font-bold mb-3">
                            他の出張対応商圏エリア:
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {AREA_SEO_AUDIT_DATA.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/personal_swim/${item.slug}`}
                                    className={`px-3 py-1.5 rounded-lg border transition ${
                                        item.slug === areaData.slug
                                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                >
                                    {item.areaName.split('（')[0]}
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* フッター */}
            <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <Waves className="w-4 h-4 text-blue-400" />
                        <span>Swim Partners（スイムパートナーズ）</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-slate-400">
                        <Link href="/" className="hover:text-white transition">
                            ホーム
                        </Link>
                        <Link href="/trial" className="hover:text-white transition">
                            体験レッスン
                        </Link>
                        <Link href="/terms" className="hover:text-white transition">
                            利用規約
                        </Link>
                        <Link href="/privacy" className="hover:text-white transition">
                            プライバシーポリシー
                        </Link>
                    </div>
                    <div className="text-slate-500">
                        © {new Date().getFullYear()} Swim Partners. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
