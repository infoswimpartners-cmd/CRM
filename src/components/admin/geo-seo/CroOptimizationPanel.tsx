'use client'

import React from 'react'

export function CroOptimizationPanel() {
    const conversionStats = [
        { title: '体験申込CVR', value: '4.2%', rate: '+0.8% (高水準)', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { title: 'フォーム完了率', value: '68%', rate: '離脱率 32%', style: 'bg-blue-50 text-blue-700 border-blue-200' },
        { title: 'LINE登録数', value: '180 件/月', rate: '好調', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ]

    const croActions = [
        {
            title: '体験申込みフォームの入力項目削減 (EFO)',
            impact: 'CVR向上 +20%',
            category: 'フォーム最適化',
            desc: '名前・メール・希望日時・年齢の4項目のみにし、詳細は申込完了後にLINEで取得します。',
        },
        {
            title: '「保護者の声・ビフォーアフター」をファーストビュー直下に配置',
            impact: 'CVR向上 +15%',
            category: 'LP最適化',
            desc: 'ファーストビューで受講生の指導風景と成果写真を提示し直帰率を削減します。',
        },
    ]

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        CONVERSION RATE OPTIMIZATION (CRO)
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        成約（申込率）指標 ＆ パフォーマンス
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {conversionStats.map((stat, idx) => (
                        <div key={idx} className="p-5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 hover:border-zinc-300 transition-all">
                            <div className="text-xs font-semibold text-zinc-500">{stat.title}</div>
                            <div className="mt-2 text-3xl font-black tracking-tight text-zinc-900">{stat.value}</div>
                            <div className="text-xs font-mono text-emerald-600 mt-1">{stat.rate}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        CRO ACTION PLAN
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        申込率・CVRアップ改善策
                    </h3>
                </div>

                <div className="space-y-4">
                    {croActions.map((action, idx) => (
                        <div
                            key={idx}
                            className="p-6 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-mono">
                                    <span className="bg-zinc-900 text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                                        {action.category}
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        {action.impact}
                                    </span>
                                </div>
                                <h4 className="font-bold text-zinc-900 text-lg tracking-tight">{action.title}</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">{action.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
