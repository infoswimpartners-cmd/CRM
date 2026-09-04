'use client';

import React from 'react';
import { CitationGapItem } from '@/lib/sp-tracker-seed';
import { ExternalLink, CheckCircle2, AlertCircle, Mail, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface SpTrackerCitationGapViewProps {
    citationGaps: CitationGapItem[];
}

export function SpTrackerCitationGapView({ citationGaps }: SpTrackerCitationGapViewProps) {
    const handleCopyOutreachTemplate = (gap: CitationGapItem) => {
        const template = `件名: 「${gap.name}」への水泳個人レッスン「スイムパートナーズ」掲載情報のご案内

${gap.name} 編集部・ご担当者様

突然のご連絡失礼いたします。
首都圏（東京・神奈川・千葉）で出張型パーソナル水泳レッスンを提供しております「スイムパートナーズ」の担当者と申します。

貴サイトの掲載記事（${gap.sample_url}）を拝見し、水泳個人指導を検討されている読者様にとって非常に有益な情報を提供されていると感じております。

弊社スイムパートナーズも、公営プールへのマンツーマン出張指導で累計1,500名以上の水嫌い克服や大人の泳ぎ直しを支援しており、ぜひ貴サイトの記事内にも掲載・ご紹介をご検討いただけないかと思いご連絡いたしました。

公式Webサイト: https://swim-partners.com/
特徴: 完全マンツーマン、東京・神奈川・千葉の公営プールに対応、体験レッスン受付中

読者様向けの専用紹介クーポンや画像素材のご提供も可能です。
ご検討いただけますと幸いです。何卒よろしくお願い申し上げます。`;

        navigator.clipboard.writeText(template);
        toast.success(`「${gap.name}」向けの掲載依頼メール文面をコピーしました`);
    };

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div>
                <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                    CITATION GAP ANALYSIS & OUTREACH
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                    AI引用元ギャップリスト（競合掲載・自社未掲載メディア）
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                    ChatGPTやPerplexityが回答時に頻繁に引用しているWebサイトのうち、**競合他社は載っているがスイムパートナーズが載っていないメディア**を自動検出しています。これらに掲載されることで、AIによる言及率（GEO SOV）が劇的に向上します。
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-200 text-[11px] font-mono font-bold text-zinc-400 uppercase">
                            <th className="pb-3 px-3">引用メディア名 / ドメイン</th>
                            <th className="pb-3 px-3 text-center">AI引用頻度</th>
                            <th className="pb-3 px-3">掲載されている競合</th>
                            <th className="pb-3 px-3 text-center">自社掲載状況</th>
                            <th className="pb-3 px-3 text-right">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                        {citationGaps.map((gap, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                                <td className="py-4 px-3 space-y-1">
                                    <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                                        {gap.name}
                                    </div>
                                    <a
                                        href={gap.sample_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-mono"
                                    >
                                        {gap.domain}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </td>

                                <td className="py-4 px-3 text-center font-mono font-bold text-zinc-800">
                                    <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-xs">
                                        {gap.cited_count} 回引用
                                    </span>
                                </td>

                                <td className="py-4 px-3 text-xs text-zinc-600">
                                    <div className="flex flex-wrap gap-1">
                                        {gap.competitors_listed.map((c, cIdx) => (
                                            <span key={cIdx} className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </td>

                                <td className="py-4 px-3 text-center font-mono text-xs">
                                    {gap.is_swim_partners_listed ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> 掲載済み
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                            <AlertCircle className="w-3.5 h-3.5" /> 未掲載（ギャップ）
                                        </span>
                                    )}
                                </td>

                                <td className="py-4 px-3 text-right">
                                    {!gap.is_swim_partners_listed ? (
                                        <button
                                            onClick={() => handleCopyOutreachTemplate(gap)}
                                            className="px-3.5 py-1.5 rounded-lg border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Mail className="w-3.5 h-3.5" /> 掲載依頼文をコピー
                                        </button>
                                    ) : (
                                        <span className="text-xs text-zinc-400 font-mono">網羅完了</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
