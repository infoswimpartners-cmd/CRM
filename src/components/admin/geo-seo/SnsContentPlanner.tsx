'use client'

import React, { useState } from 'react'
import { Copy, Check, Flame } from 'lucide-react'
import { toast } from 'sonner'

export function SnsContentPlanner() {
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

    const videoIdeas = [
        {
            title: '【衝撃】水嫌いの小学生がたった1回のレッスンで潜れるようになった理由',
            platform: 'Reels / TikTok',
            viralScore: 'バズ度 95%',
            hook: '「プールに行くのが嫌」と泣いていた〇〇くんが...！？',
            script: '1. 冒頭3秒: 水に入れない受講生の悩みシーン\n2. 5秒: コーチ独自の呼吸法指導テクニック\n3. 15秒: スマイルで潜れた瞬間の表情\n4. ラスト: 体験レッスン案内',
        },
        {
            title: '大人のクロール息継ぎで沈まなくなる「たった1つの視線」のコツ',
            platform: 'Reels / Shorts',
            viralScore: 'バズ度 90%',
            hook: 'クロールで呼吸する時、横を見てませんか？実はNGです！',
            script: '1. 冒頭: 沈む息継ぎと正しい息継ぎの対比映像\n2. 視線を斜め後ろに向ける解説\n3. コーチの手本泳ぎ（水中視点）\n4. プロフィールURLへ案内',
        },
        {
            title: 'マンツーマン個人指導 vs 集団スクール どっちが早く上達する？',
            platform: 'TikTok / Shorts',
            viralScore: 'バズ度 88%',
            hook: 'スイミングスクールに通わせてるのに進級できない理由、知ってますか？',
            script: '1. 集団スクールでの待ち時間を指摘\n2. 個人指導なら60分間フル指導＆スピード上達\n3. LINE登録で体験特典',
        },
    ]

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text)
        setCopiedIdx(idx)
        toast.success('構成案をクリップボードにコピーしました')
        setTimeout(() => setCopiedIdx(null), 2000)
    }

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div>
                <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                    SHORT VIDEO CONTENT PLANNER
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                    SNS & 短尺動画コンテンツ企画AI
                </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {videoIdeas.map((idea, idx) => (
                    <div
                        key={idx}
                        className="p-6 rounded-xl bg-zinc-50/60 border border-zinc-200/60 hover:border-zinc-300 hover:shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all flex flex-col justify-between space-y-4"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="bg-zinc-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                                    {idea.platform}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                    <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> {idea.viralScore}
                                </span>
                            </div>

                            <h4 className="font-bold text-zinc-900 text-base leading-snug tracking-tight">{idea.title}</h4>

                            <div className="p-3 rounded-lg bg-zinc-900 text-white font-mono text-xs space-y-1">
                                <div className="text-indigo-300 font-bold">フック（冒頭3秒）:</div>
                                <p className="italic text-zinc-200">「{idea.hook}」</p>
                            </div>

                            <pre className="text-xs text-zinc-600 font-mono whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-zinc-200">
                                {idea.script}
                            </pre>
                        </div>

                        <button
                            onClick={() => handleCopy(`${idea.title}\n\nフック: ${idea.hook}\n\n構成:\n${idea.script}`, idx)}
                            className="w-full py-2.5 rounded-xl border border-zinc-900 text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all duration-150 flex items-center justify-center gap-2"
                        >
                            {copiedIdx === idx ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            {copiedIdx === idx ? 'コピー完了' : '構成案・フックをコピー'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
