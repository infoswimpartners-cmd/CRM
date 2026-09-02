'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export function GeoAiPromptGenerator() {
    const [promptType, setPromptType] = useState<'faq' | 'jsonld' | 'meo_reply' | 'line'>('faq')
    const [isCopied, setIsCopied] = useState(false)

    const promptTemplates = {
        faq: `【ChatGPT / Perplexity 入力用 GEO最適化プロンプト】
あなたは水泳教室・個人レッスンのマーケティングエキスパートです。
以下のサービス情報を元に、生成AI（ChatGPT/Perplexity）が質問者に対して推薦・引用しやすい「Q&A（FAQ）テキスト」を5セット作成してください。

【サービス概要】
- スクール名: スイムパートナーズ (Swim Partners)
- 対象: ジュニア（水嫌い〜進級対策）、大人（初心者〜マスターズ）
- 特徴: 経験豊富なプロコーチによる完全マンツーマン指導
- 体験レッスン: 随時受付中`,

        jsonld: `【JSON-LD FAQSchema 生成用プロンプト】
以下のFAQテキストを、GoogleおよびAI検索エンジンが解釈できるSchema.orgのFAQPage構造化データ（JSON-LD）に変換してコードブロックで出力してください。`,

        meo_reply: `【Googleビジネスプロフィール 口コミ返信プロンプト】
保護者様からいただいた以下の高評価口コミ（★5）に対する、温かく誠意ある返信文を作成してください。`,

        line: `【LINE公式アカウント 体験レッスン案内配信文プロンプト】
LINE友だち追加してくれた保護者様へ、体験レッスンの申込みを促すステップ配信メッセージを作成してください。`,
    }

    const currentPrompt = promptTemplates[promptType]

    const handleCopy = () => {
        navigator.clipboard.writeText(currentPrompt)
        setIsCopied(true)
        toast.success('プロンプトをコピーしました')
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        AI PROMPT GENERATOR
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        GEO ✕ マーケティング AIプロンプト作成
                    </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'faq', label: 'GEO用FAQ' },
                        { id: 'jsonld', label: 'JSON-LD' },
                        { id: 'meo_reply', label: 'MEO返信' },
                        { id: 'line', label: 'LINE配信' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setPromptType(tab.id as any)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-150 ${promptType === tab.id
                                    ? 'bg-zinc-900 text-white shadow-sm'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <textarea
                    readOnly
                    rows={8}
                    value={currentPrompt}
                    className="w-full p-4 rounded-xl bg-zinc-900 text-zinc-100 text-xs font-mono border border-zinc-900 leading-relaxed resize-none focus:outline-none"
                />
                <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 px-3.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'コピー完了' : 'プロンプトをコピー'}
                </button>
            </div>
        </div>
    )
}
