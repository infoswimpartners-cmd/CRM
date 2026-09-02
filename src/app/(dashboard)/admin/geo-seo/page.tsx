'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PriorityActionHero } from '@/components/admin/geo-seo/PriorityActionHero'
import { ScoreOverviewCard } from '@/components/admin/geo-seo/ScoreOverviewCard'
import { AnalyticsSyncCard } from '@/components/admin/geo-seo/AnalyticsSyncCard'
import { GeoAuditPanel } from '@/components/admin/geo-seo/GeoAuditPanel'
import { SeoMeoAuditPanel } from '@/components/admin/geo-seo/SeoMeoAuditPanel'
import { SnsContentPlanner } from '@/components/admin/geo-seo/SnsContentPlanner'
import { CroOptimizationPanel } from '@/components/admin/geo-seo/CroOptimizationPanel'
import { GamifiedQuestList, Quest } from '@/components/admin/geo-seo/GamifiedQuestList'
import { GeoAiPromptGenerator } from '@/components/admin/geo-seo/GeoAiPromptGenerator'
import { getMarketingDashboardData, toggleMarketingQuest, QuestItem } from '@/actions/marketing'

export default function GeoSeoMarketingPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'geo' | 'seo_meo' | 'sns' | 'cro' | 'quests' | 'ai_prompts'>('overview')
    const [loading, setLoading] = useState(true)

    // クエスト＆スコアのローカル・Server Actionステート
    const [quests, setQuests] = useState<Quest[]>([])
    const [scoreData, setScoreData] = useState({
        totalScore: 78,
        level: 14,
        levelTitle: 'MARKETING ARCHITECT',
        currentXp: 1420,
        nextLevelXp: 1500,
        categoryScores: [
            { name: 'GEO (生成AI引用)', score: 82, fullMark: 100, color: 'bg-purple-500' },
            { name: 'SEO (検索最適化)', score: 88, fullMark: 100, color: 'bg-blue-500' },
            { name: 'MEO (マップ集客)', score: 78, fullMark: 100, color: 'bg-amber-500' },
            { name: 'SNS / 短尺動画', score: 65, fullMark: 100, color: 'bg-rose-500' },
            { name: 'CRO (申込率)', score: 75, fullMark: 100, color: 'bg-emerald-500' },
        ],
    })

    // 初回データ読み込み (Server Action)
    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await getMarketingDashboardData()
                if (res) {
                    setQuests(res.quests)
                    setScoreData(res.scoreData)
                }
            } catch (err) {
                console.error('Failed to load marketing dashboard data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    // クエスト完了のリアルタイム更新・Server Action連携
    const handleToggleQuest = async (id: string) => {
        const target = quests.find((q) => q.id === id)
        if (!target) return

        const currentStatus = target.isCompleted
        const nextStatus = !currentStatus

        // 画面上の即時フィードバック
        setQuests((prev) =>
            prev.map((q) => (q.id === id ? { ...q, isCompleted: nextStatus } : q))
        )

        // スコア再計算
        const updatedQuests = quests.map((q) => (q.id === id ? { ...q, isCompleted: nextStatus } : q))
        const baseScore = 72
        const completedBonus = updatedQuests
            .filter((q) => q.isCompleted)
            .reduce((sum, q) => sum + q.scoreReward, 0)
        const newTotalScore = Math.min(100, baseScore + completedBonus)

        const baseCurrentXp = 1140
        const completedXp = updatedQuests
            .filter((q) => q.isCompleted)
            .reduce((sum, q) => sum + q.xpReward, 0)
        const newCurrentXp = baseCurrentXp + completedXp

        setScoreData((prev) => ({
            ...prev,
            totalScore: newTotalScore,
            currentXp: newCurrentXp,
        }))

        if (nextStatus) {
            toast.success(`🎉 タスク達成！ +${target.xpReward} XP / スコア +${target.scoreReward}pt 獲得`, {
                description: target.title,
            })
        }

        // Server Actionで永続化
        try {
            await toggleMarketingQuest(id, currentStatus)
        } catch (err) {
            console.error('Failed to sync quest status with DB:', err)
        }
    }

    // 最優先実行タスク（Priority Action）
    const priorityTask = quests.find((q) => !q.isCompleted) || quests[0] || {
        id: 'q1',
        title: 'FAQ構造化データ(JSON-LD)の設置',
        category: 'GEO' as const,
        difficulty: 'Easy' as const,
        xpReward: 150,
        scoreReward: 5,
        isCompleted: false,
        description: 'ChatGPT/Perplexityからの参照率を高めるため、FAQのJSON-LD構造化データをWebサイトヘッダーに追加します。',
    }

    return (
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 p-6 md:p-12 space-y-10">
            {/* ページタイトル (Stripe/Linear風 エディトリアルヘッダー) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200/80 pb-6 gap-4">
                <div>
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        INTELLIGENT MARKETING & ACTION CENTER
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900">
                        GEO ✕ SEO ✕ 集客支援
                    </h1>
                </div>

                <div className="text-xs font-mono text-zinc-400 bg-white px-3 py-1.5 rounded-lg border border-zinc-200/80 shadow-sm">
                    SWIM PARTNERS CRM v2.0
                </div>
            </div>

            {/* 1. 最優先アクション (何をすべきかが一目でわかるLinear風HERO) */}
            <PriorityActionHero
                title={priorityTask.title}
                category={priorityTask.category}
                impact={`スコア +${priorityTask.scoreReward}pt / +${priorityTask.xpReward} XP`}
                effort={priorityTask.difficulty === 'Easy' ? '15分 (簡単)' : '30分'}
                description={priorityTask.description}
                reason="PerplexityやChatGPTにおけるFAQ参照スコアが向上傾向にあります。このタスクを完了することで、生成AIからの自社推薦数が推定+25%増加します。"
                onExecute={() => handleToggleQuest(priorityTask.id)}
                isCompleted={priorityTask.isCompleted}
            />

            {/* 2. スコアボード */}
            <ScoreOverviewCard
                totalScore={scoreData.totalScore}
                level={scoreData.level}
                levelTitle={scoreData.levelTitle}
                currentXp={scoreData.currentXp}
                nextLevelXp={scoreData.nextLevelXp}
                categoryScores={scoreData.categoryScores}
            />

            {/* 3. データ連携 */}
            <AnalyticsSyncCard />

            {/* 4. セグメントタブ (Linear風 ピクセルパーフェクト タブ) */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl max-w-fit overflow-x-auto">
                {[
                    { id: 'overview', label: '全体ロードマップ' },
                    { id: 'geo', label: 'GEO (AI引用) 診断' },
                    { id: 'seo_meo', label: 'SEO ✕ MEO 診断' },
                    { id: 'sns', label: 'SNS短尺動画企画' },
                    { id: 'cro', label: 'CRO (成約率) 改善' },
                    { id: 'quests', label: '改善クエスト' },
                    { id: 'ai_prompts', label: 'AIプロンプト' },
                ].map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 whitespace-nowrap ${isActive
                                    ? 'bg-white text-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-bold'
                                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* タブコンテンツ */}
            <div className="pt-2">
                {activeTab === 'overview' && (
                    <div className="space-y-10">
                        <GamifiedQuestList quests={quests} onToggleQuest={handleToggleQuest} />
                        <GeoAuditPanel />
                        <SeoMeoAuditPanel />
                    </div>
                )}

                {activeTab === 'geo' && <GeoAuditPanel />}
                {activeTab === 'seo_meo' && <SeoMeoAuditPanel />}
                {activeTab === 'sns' && <SnsContentPlanner />}
                {activeTab === 'cro' && <CroOptimizationPanel />}
                {activeTab === 'quests' && (
                    <GamifiedQuestList quests={quests} onToggleQuest={handleToggleQuest} />
                )}
                {activeTab === 'ai_prompts' && <GeoAiPromptGenerator />}
            </div>
        </div>
    )
}
