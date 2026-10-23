'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
} from 'recharts'
import {
    Crown,
    Trophy,
    Flame,
    Zap,
    TrendingUp,
    ShieldCheck,
    DollarSign,
    Users,
    Sparkles,
    Award,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    Calculator,
    Layers,
    Swords,
    Heart,
    Send,
    Clock,
    MapPin,
    BookOpen,
    Star,
    Gift,
    Coins,
    Sliders,
    RefreshCw,
    Database,
    Crosshair,
    Shield,
    Sparkle,
    Gem,
    Activity,
    Compass,
    ScrollText,
} from 'lucide-react'
import {
    QuestStudent,
    QuestCoach,
    LessonTransaction,
    MonthlyFinance,
    QuestAchievement,
    FastPassLeadQuest,
    FunnelStage,
    SkillRank,
    SkillEvaluation,
} from '@/types/quest-erp'
import {
    INITIAL_QUEST_STUDENTS,
    INITIAL_QUEST_COACHES,
    INITIAL_LESSON_TRANSACTIONS,
    INITIAL_MONTHLY_FINANCES,
    INITIAL_QUEST_ACHIEVEMENTS,
    INITIAL_FAST_PASS_QUESTS,
    SWIM_STEP_LEVELS,
} from '@/lib/quest-mock-data'
import {
    calculateGuildStatus,
    calculateCoachRankUpImpact,
    calculateCoachLevelProgress,
    COACH_RANK_DEFINITIONS,
    COACH_EXP_RULES,
} from '@/lib/gamification-engine'
import {
    buildMonthlyPlRow,
    calculateUnitEconomics,
    calculateSixAxisRadar,
    calculateAreaRoiMatrix,
    simulateInvestmentPayback,
} from '@/lib/analytics-engine'
import { RealQuestDataResult, getScoreRank, getSwimStepRank } from '@/lib/quest-real-data'

type ActiveTab =
    | 'command_center'
    | 'skill_tree'
    | 'finance_simulator'
    | 'crm_funnel'
    | 'coaches_guild'

const FUNNEL_STAGES: FunnelStage[] = [
    'LINE友だち追加未申込',
    'ステップ配信中(Day1/3/5)',
    '日程調整・コーチ打診中',
    '体験予約済',
    '本契約継続中',
]

// スキルランクのカラー＆バッジ定義
export const RANK_STYLE_MAP: Record<SkillRank, { badge: string; text: string; glow: string }> = {
    SSS: {
        badge: 'bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-500 text-white font-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]',
        text: 'text-amber-300 font-black',
        glow: 'border-amber-400/80 shadow-amber-500/30',
    },
    SS: {
        badge: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-black border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.5)]',
        text: 'text-fuchsia-300 font-black',
        glow: 'border-fuchsia-400/70 shadow-fuchsia-500/20',
    },
    S: {
        badge: 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]',
        text: 'text-cyan-300 font-black',
        glow: 'border-cyan-400/60 shadow-cyan-500/20',
    },
    A: {
        badge: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-bold',
        text: 'text-emerald-400 font-bold',
        glow: 'border-emerald-500/40',
    },
    B: {
        badge: 'bg-blue-500/25 text-blue-300 border-blue-400/50 font-bold',
        text: 'text-blue-400 font-bold',
        glow: 'border-blue-500/40',
    },
    C: {
        badge: 'bg-slate-700 text-slate-200 border-slate-600 font-bold',
        text: 'text-slate-300 font-bold',
        glow: 'border-slate-700',
    },
    D: {
        badge: 'bg-slate-800 text-slate-400 border-slate-700 font-medium',
        text: 'text-slate-400',
        glow: 'border-slate-800',
    },
}

interface SwimPartnersQuestAppProps {
    initialTab?: ActiveTab
    initialRealData?: RealQuestDataResult
}

export function SwimPartnersQuestApp({
    initialTab = 'command_center',
    initialRealData,
}: SwimPartnersQuestAppProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab)

    // 5大テーブル状態（実データまたは初期データ）
    const [students, setStudents] = useState<QuestStudent[]>(
        initialRealData?.students || INITIAL_QUEST_STUDENTS
    )
    const [coaches, setCoaches] = useState<QuestCoach[]>(
        initialRealData?.coaches || INITIAL_QUEST_COACHES
    )
    const [transactions, setTransactions] = useState<LessonTransaction[]>(
        initialRealData?.transactions || INITIAL_LESSON_TRANSACTIONS
    )
    const [finances, setFinances] = useState<MonthlyFinance[]>(
        initialRealData?.finances || INITIAL_MONTHLY_FINANCES
    )
    const [quests, setQuests] = useState<QuestAchievement[]>(
        initialRealData?.quests || INITIAL_QUEST_ACHIEVEMENTS
    )
    const [fastPassQuests, setFastPassQuests] = useState<FastPassLeadQuest[]>(
        initialRealData?.fastPassQuests || INITIAL_FAST_PASS_QUESTS
    )
    const [isLiveDatabase, setIsLiveDatabase] = useState<boolean>(
        Boolean(initialRealData?.isRealData)
    )

    // クライアントサイドでの動的実データ再同期
    const handleSyncRealDatabase = async () => {
        try {
            const res = await fetch('/api/quest/real-data')
            if (res.ok) {
                const result = await res.json()
                if (result.isRealData) {
                    setStudents(result.students)
                    setCoaches(result.coaches)
                    setTransactions(result.transactions)
                    setFinances(result.finances)
                    setFastPassQuests(result.fastPassQuests)
                    setIsLiveDatabase(true)
                    setRewardCelebration({
                        visible: true,
                        title: '⚡ REAL DATABASE SYNC COMPLETE!',
                        gainedExp: 250,
                        gainedYen: 0,
                        subMessage: `Supabase本番DB（生徒${result.students.length}名、レッスン${result.transactions.length}件、コーチ${result.coaches.length}名）とのリアルタイム同期に成功しました！`,
                    })
                    return
                }
            }
            // フォールバック
            const { fetchQuestRealData } = await import('@/lib/quest-real-data')
            const result = await fetchQuestRealData()
            if (result.isRealData) {
                setStudents(result.students)
                setCoaches(result.coaches)
                setTransactions(result.transactions)
                setFinances(result.finances)
                setFastPassQuests(result.fastPassQuests)
                setIsLiveDatabase(true)
                setRewardCelebration({
                    visible: true,
                    title: '⚡ REAL DATABASE SYNC COMPLETE!',
                    gainedExp: 250,
                    gainedYen: 0,
                    subMessage: `Supabase本番DB（生徒${result.students.length}名、レッスン${result.transactions.length}件、コーチ${result.coaches.length}名）とのリアルタイム同期に成功しました！`,
                })
            }
        } catch (e) {
            console.error('Failed to sync real database:', e)
        }
    }

    // 画面①: 代表人件費控除トグル
    const [deductCeoShadowCost, setDeductCeoShadowCost] = useState<boolean>(true)

    // 画面②: 自己資金投資ペイバック計算機スライダー状態
    const [simAdSpend, setSimAdSpend] = useState<number>(30000)
    const [simPoolRental, setSimPoolRental] = useState<number>(20000)
    const [simConversionRate, setSimConversionRate] = useState<number>(82)

    // 画面④: 選択中のコーチ & 3行レッスン報告モーダル状態
    const [selectedCoachId, setSelectedCoachId] = useState<string>(
        coaches[0]?.coach_id || 'coach-takashima'
    )
    const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false)
    const [reportStudentId, setReportStudentId] = useState<string>(
        students.find(s => s.student_number === '0035')?.student_id || students[0]?.student_id || ''
    )
    const [reportGoodLine, setReportGoodLine] = useState<string>(
        'ストリームライン姿勢が安定し、クロール25mを息継ぎフォームを崩さず完泳できました！'
    )
    const [reportNextLine, setReportNextLine] = useState<string>(
        '次回は背泳ぎの背面浮き身とローリング動作の導入に進みます。'
    )
    const [reportCommentLine, setReportCommentLine] = useState<string>(
        '毎週の積み重ねで体幹が強くなっています。お家でもたくさん褒めてあげてください！'
    )
    const [reportSwimStepUp, setReportSwimStepUp] = useState<boolean>(true)
    const [reportTrialConverted, setReportTrialConverted] = useState<boolean>(false)

    // ゲーム演出トースト / 獲得モーダル状態
    const [rewardCelebration, setRewardCelebration] = useState<{
        visible: boolean
        title: string
        gainedExp: number
        gainedYen: number
        subMessage: string
    } | null>(null)

    // 最新の財務・分析計算
    const plRows = useMemo(() => finances.map(buildMonthlyPlRow), [finances])
    const latestPl = plRows[plRows.length - 1]
    const prevPl = plRows.length >= 2 ? plRows[plRows.length - 2] : latestPl
    const latestFinance = finances[finances.length - 1]

    const revenueMoMPercent = useMemo(() => {
        if (!prevPl || prevPl.totalRevenue === 0) return 0
        return (
            Math.round(
                ((latestPl.totalRevenue - prevPl.totalRevenue) / prevPl.totalRevenue) * 1000
            ) / 10
        )
    }, [latestPl, prevPl])

    const unitEco = useMemo(
        () => calculateUnitEconomics(latestFinance, students),
        [latestFinance, students]
    )

    const guildStatus = useMemo(
        () => calculateGuildStatus(finances, unitEco.ltvCacRatio),
        [finances, unitEco.ltvCacRatio]
    )

    const sixAxisScores = useMemo(
        () => calculateSixAxisRadar(latestPl, unitEco, students, transactions),
        [latestPl, unitEco, students, transactions]
    )

    const areaRoiList = useMemo(() => calculateAreaRoiMatrix(), [])

    const paybackResult = useMemo(
        () =>
            simulateInvestmentPayback({
                additionalAdSpendMonthly: simAdSpend,
                newPoolRentalCostMonthly: simPoolRental,
                expectedCpa: unitEco.googleCpa,
                trialConversionRatePercent: simConversionRate,
                averageMonthlyTuition: 31000,
                grossMarginRatePercent: 52,
            }),
        [simAdSpend, simPoolRental, unitEco.googleCpa, simConversionRate]
    )

    // 選択中コーチ
    const selectedCoach = useMemo(
        () => coaches.find(c => c.coach_id === selectedCoachId) || coaches[0],
        [coaches, selectedCoachId]
    )

    const coachRankImpact = useMemo(
        () => calculateCoachRankUpImpact(selectedCoach, 9500),
        [selectedCoach]
    )

    const coachLvProgress = useMemo(
        () => calculateCoachLevelProgress(selectedCoach?.coach_exp || 1200),
        [selectedCoach?.coach_exp]
    )

    // 城東小金曜枠の入会シミュレーション（メインクエスト）
    const handleSimulateJotoEnrollment = () => {
        setFinances(prev =>
            prev.map((f, idx) => {
                if (idx !== prev.length - 1) return f
                const nextEnrolled = Math.min(f.joto_friday_capacity, f.joto_friday_enrolled + 1)
                const addedRev = nextEnrolled > f.joto_friday_enrolled ? 26000 : 0
                return {
                    ...f,
                    joto_friday_enrolled: nextEnrolled,
                    fixed_school_revenue: f.fixed_school_revenue + addedRev,
                    total_revenue: f.total_revenue + addedRev,
                }
            })
        )
        setQuests(prev =>
            prev.map(q => {
                if (q.quest_id === 'q-ceo-main-1') {
                    const nextVal = Math.min(q.threshold, q.current_value + 1)
                    return {
                        ...q,
                        current_value: nextVal,
                        completed: nextVal >= q.threshold,
                    }
                }
                return q
            })
        )
        setRewardCelebration({
            visible: true,
            title: '🏰 城東小スイムステップ枠 +1名入会クリア！',
            gainedExp: 520,
            gainedYen: 26000,
            subMessage:
                'ヤエスク施設費4,950円が固定のため、追加1名の月謝26,000円がほぼ全額粗利として積み上がりました！',
        })
    }

    // カンバンボード：生徒のファネルステージを1段階進める
    const handleAdvanceStudentStage = (studentId: string) => {
        setStudents(prev =>
            prev.map(s => {
                if (s.student_id !== studentId) return s
                const currIdx = FUNNEL_STAGES.indexOf(s.status)
                if (currIdx === -1 || currIdx >= FUNNEL_STAGES.length - 1) return s
                const nextStage = FUNNEL_STAGES[currIdx + 1]
                const addedRev =
                    nextStage === '本契約継続中'
                        ? s.monthly_fee
                        : nextStage === '体験予約済'
                          ? 6000
                          : 0
                return {
                    ...s,
                    status: nextStage,
                    cumulative_revenue: s.cumulative_revenue + addedRev,
                }
            })
        )
    }

    // スイムステップ進級クリア（+200 EXP）
    const handleAdvanceSwimStep = (studentId: string) => {
        setStudents(prev =>
            prev.map(s => {
                if (s.student_id !== studentId) return s
                const nextLv = Math.min(20, s.swim_step_level + 1)
                const stepDef = SWIM_STEP_LEVELS.find(l => l.level === nextLv)
                return {
                    ...s,
                    swim_step_level: nextLv,
                    swim_step_rank: getSwimStepRank(nextLv),
                    swim_step_title: stepDef ? stepDef.title : `Lv.${nextLv}`,
                }
            })
        )
        setRewardCelebration({
            visible: true,
            title: '🐬 スイムステップ進級ランクアップ！',
            gainedExp: COACH_EXP_RULES.SWIM_STEP_CLEARED,
            gainedYen: 0,
            subMessage:
                '生徒の進級カルテが1段階昇格し、保護者LINEへお祝い進級バッジが自動発行されました！',
        })
    }

    // ファストパス・クエスト（緊急受託）
    const handleAcceptFastPassQuest = (leadId: string) => {
        const targetQuest = fastPassQuests.find(q => q.lead_id === leadId)
        if (!targetQuest || targetQuest.accepted_by_coach_id) return

        setFastPassQuests(prev =>
            prev.map(q =>
                q.lead_id === leadId
                    ? { ...q, accepted_by_coach_id: selectedCoach.coach_id }
                    : q
            )
        )

        setCoaches(prev =>
            prev.map(c => {
                if (c.coach_id !== selectedCoach.coach_id) return c
                const newLessons = c.current_month_lessons + 1
                const newRankDef =
                    COACH_RANK_DEFINITIONS.slice()
                        .reverse()
                        .find(r => newLessons >= r.minLessons) || COACH_RANK_DEFINITIONS[0]
                return {
                    ...c,
                    current_month_lessons: newLessons,
                    reward_rank: newRankDef.rank,
                    coach_exp:
                        c.coach_exp +
                        COACH_EXP_RULES.FAST_PASS_ACCEPTED +
                        COACH_EXP_RULES.LESSON_COMPLETED,
                }
            })
        )

        setRewardCelebration({
            visible: true,
            title: '⚡ ファストパス緊急クエスト受託完了！',
            gainedExp:
                COACH_EXP_RULES.FAST_PASS_ACCEPTED + COACH_EXP_RULES.LESSON_COMPLETED,
            gainedYen: targetQuest.estimated_reward,
            subMessage: `${selectedCoach.name}の当月完遂コマ数が +1 加算され、神速受託ボーナス +${COACH_EXP_RULES.FAST_PASS_ACCEPTED} EXP を獲得しました！`,
        })
    }

    // 3行レッスン報告送信＆EXP獲得
    const handleSubmitThreeLineReport = (e: React.FormEvent) => {
        e.preventDefault()
        const targetStudent =
            students.find(s => s.student_id === reportStudentId) || students[0]

        let gainedExp = COACH_EXP_RULES.LESSON_COMPLETED
        if (reportSwimStepUp) gainedExp += COACH_EXP_RULES.SWIM_STEP_CLEARED
        if (reportTrialConverted) gainedExp += COACH_EXP_RULES.TRIAL_CONVERTED_STOCK

        const lessonRevenue = 9500
        const baseCoachFee = Math.round(
            lessonRevenue * coachRankImpact.currentRankDef.rewardRate
        )
        const incentiveYen = reportTrialConverted ? 3000 : 0
        const totalGainedYen = baseCoachFee + incentiveYen

        setCoaches(prev =>
            prev.map(c => {
                if (c.coach_id !== selectedCoach.coach_id) return c
                const newLessons = c.current_month_lessons + 1
                const newRankDef =
                    COACH_RANK_DEFINITIONS.slice()
                        .reverse()
                        .find(r => newLessons >= r.minLessons) || COACH_RANK_DEFINITIONS[0]
                return {
                    ...c,
                    current_month_lessons: newLessons,
                    reward_rank: newRankDef.rank,
                    coach_exp: c.coach_exp + gainedExp,
                }
            })
        )

        if (reportSwimStepUp && targetStudent) {
            setStudents(prev =>
                prev.map(s => {
                    if (s.student_id !== targetStudent.student_id) return s
                    const nextLv = Math.min(20, s.swim_step_level + 1)
                    const stepDef = SWIM_STEP_LEVELS.find(l => l.level === nextLv)
                    return {
                        ...s,
                        swim_step_level: nextLv,
                        swim_step_rank: getSwimStepRank(nextLv),
                        swim_step_title: stepDef ? stepDef.title : `Lv.${nextLv}`,
                        next_challenge: reportNextLine || s.next_challenge,
                    }
                })
            )
        }

        setIsReportModalOpen(false)
        setRewardCelebration({
            visible: true,
            title: '🪙 チャリーン！ 3行レッスン報告完了！',
            gainedExp,
            gainedYen: totalGainedYen,
            subMessage: `${targetStudent?.name}様（会員番号${targetStudent?.student_number}）の報告が完了し、EXPと確定報酬が即時加算されました！`,
        })
    }

    const mainCeoQuest = quests.find(q => q.is_main_quest && q.target_role === 'CEO')

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 rounded-3xl p-4 md:p-6 shadow-2xl border-2 border-amber-500/30 relative overflow-hidden font-sans">
            {/* ゲーム風サイバー＆ファンタジーグリッド背景 */}
            <div
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                    backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />
            <div className="pointer-events-none absolute -top-40 -left-40 w-[450px] h-[450px] bg-amber-500/15 rounded-full blur-[120px]" />
            <div className="pointer-events-none absolute top-1/2 -right-40 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[120px]" />

            {/* チャリーン！ セレブレーションモーダル */}
            <AnimatePresence>
                {rewardCelebration?.visible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
                        onClick={() => setRewardCelebration(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-md w-full bg-gradient-to-b from-[#111827] via-[#0b0f19] to-[#030712] border-2 border-amber-400 rounded-3xl p-6 text-center shadow-[0_0_60px_rgba(251,191,36,0.35)] space-y-4 relative"
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs tracking-wider shadow-lg">
                                ★ QUEST CLEAR & REWARD ★
                            </div>
                            <motion.div
                                initial={{ rotate: -20, scale: 0.5 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/40 mt-3"
                            >
                                <Coins className="w-11 h-11 text-slate-950" />
                            </motion.div>
                            <h3 className="text-xl font-black text-white">
                                {rewardCelebration.title}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed px-2">
                                {rewardCelebration.subMessage}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-cyan-950/70 border border-cyan-400/50 rounded-2xl p-3">
                                    <div className="text-[11px] text-cyan-300 font-bold">
                                        獲得経験値 (EXP)
                                    </div>
                                    <div className="text-2xl font-black text-cyan-300">
                                        +{rewardCelebration.gainedExp.toLocaleString()} EXP
                                    </div>
                                </div>
                                <div className="bg-amber-950/70 border border-amber-400/50 rounded-2xl p-3">
                                    <div className="text-[11px] text-amber-300 font-bold">
                                        確定報酬・売上
                                    </div>
                                    <div className="text-2xl font-black text-amber-400">
                                        +¥{rewardCelebration.gainedYen.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRewardCelebration(null)}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-sm hover:brightness-110 transition shadow-lg cursor-pointer"
                            >
                                ステータス画面へ戻る
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= 1. RPGステータス HUD（最上部固定バー） ================= */}
            <header className="relative z-10 bg-[#0e1626]/95 border-2 border-amber-500/40 rounded-2xl p-4 md:p-5 mb-6 shadow-xl">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* ギルドマスターバッジ */}
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                                <div className="w-full h-full bg-[#070b14] rounded-[14px] flex flex-col items-center justify-center">
                                    <Crown className="w-4 h-4 text-amber-400" />
                                    <span className="text-lg font-black text-white leading-none mt-0.5">
                                        Lv.{guildStatus.currentLevel}
                                    </span>
                                </div>
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-400 text-slate-950">
                                MASTER
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/50">
                                    <Crown className="w-3.5 h-3.5" /> 称号：{guildStatus.currentTitle}
                                </span>
                                {isLiveDatabase ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                                        <Database className="w-3 h-3" /> 本番実DB接続中（生徒{students.length}名 / レッスン{transactions.length}件 / コーチ{coaches.length}名）
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSyncRealDatabase}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 hover:bg-cyan-500/30 transition cursor-pointer"
                                    >
                                        <RefreshCw className="w-3 h-3" /> 実DB同期を実行
                                    </button>
                                )}
                            </div>
                            <h1 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                                スイムパートナーズ 経営ギルド司令室
                            </h1>
                            <p className="text-xs text-slate-400">
                                Guild Lv.50 目標（月間粗利105万円モデル）達成度：
                                <span className="text-amber-400 font-black ml-1">
                                    {guildStatus.masterRankProgressPercent}%
                                </span>
                                （当月粗利 ¥{latestPl.grossProfit.toLocaleString()}G / 目標 ¥1,050,000G）
                            </p>
                        </div>
                    </div>

                    {/* RPG HUD ゲージ群（HP, MP, GOLD, EXP） */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 xl:w-[540px]">
                        {/* HPゲージ: 安全防衛資金 vs 総資金 */}
                        <div className="bg-[#070b14] border border-rose-500/40 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-rose-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> HP（防衛資金）
                                </span>
                                <span className="text-slate-300">
                                    ¥{(latestPl.totalCashBalance / 10000).toFixed(0)}万
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                                    style={{
                                        width: `${Math.min(100, Math.round((latestPl.totalCashBalance / 5000000) * 100))}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                                防衛枠: ¥{(latestPl.safeReserveCash / 10000).toFixed(0)}万確保済
                            </div>
                        </div>

                        {/* MPゲージ: 自己資金・投資可能枠 */}
                        <div className="bg-[#070b14] border border-cyan-500/40 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-cyan-400 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> MP（投資余力）
                                </span>
                                <span className="text-slate-300">
                                    ¥{(latestPl.investableCash / 10000).toFixed(0)}万
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                                    style={{
                                        width: `${Math.min(100, Math.round((latestPl.investableCash / 3000000) * 100))}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-cyan-300 font-bold truncate">
                                広告・新拠点に投入可能
                            </div>
                        </div>

                        {/* GOLD: 当月粗利 */}
                        <div className="bg-[#070b14] border border-amber-500/40 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-amber-400 flex items-center gap-1">
                                    <Coins className="w-3 h-3" /> GOLD（粗利）
                                </span>
                                <span className="text-amber-300 font-black">
                                    ¥{(latestPl.grossProfit / 10000).toFixed(1)}万
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                    style={{
                                        width: `${guildStatus.masterRankProgressPercent}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                                目標 ¥105万 (年収1000万)
                            </div>
                        </div>

                        {/* EXP: 累計ギルド経験値 */}
                        <div className="bg-[#070b14] border border-purple-500/40 rounded-xl p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-purple-400 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> EXP
                                </span>
                                <span className="text-purple-300 font-black">
                                    {guildStatus.progressPercent}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                    style={{ width: `${guildStatus.progressPercent}%` }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                                次Lvまで あと{guildStatus.expToNextLevel.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* メインクエストバナー */}
                {mainCeoQuest && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#070b14]/70 p-3 rounded-xl border border-amber-500/20">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-500/50 text-rose-300 text-[10px] font-black flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-rose-400" /> MAIN QUEST
                            </span>
                            <span className="text-xs md:text-sm font-black text-white">
                                {mainCeoQuest.title}
                            </span>
                            <span className="text-xs font-black text-amber-400">
                                （現在 {latestFinance.joto_friday_enrolled} / {latestFinance.joto_friday_capacity}名）
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSimulateJotoEnrollment}
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            城東小枠 +1名入会を実行 (+26,000円)
                        </button>
                    </div>
                )}
            </header>

            {/* ================= 2. 5大画面切替ナビゲーションタブ ================= */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('command_center')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                        activeTab === 'command_center'
                            ? 'bg-gradient-to-br from-blue-900/50 to-indigo-950/70 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                            : 'bg-[#0e1626]/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Crown className="w-5 h-5 text-amber-400 mb-1" />
                    <div className="text-[10px] font-black uppercase text-blue-300">COMMAND HUD</div>
                    <div className="text-xs md:text-sm font-black">代表コマンドセンター</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('skill_tree')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                        activeTab === 'skill_tree'
                            ? 'bg-gradient-to-br from-amber-900/50 to-orange-950/70 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                            : 'bg-[#0e1626]/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Trophy className="w-5 h-5 text-amber-400 mb-1" />
                    <div className="text-[10px] font-black uppercase text-amber-300">SKILL RANK TREE</div>
                    <div className="text-xs md:text-sm font-black">分野別スキル格付け</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('finance_simulator')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                        activeTab === 'finance_simulator'
                            ? 'bg-gradient-to-br from-emerald-900/50 to-teal-950/70 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                            : 'bg-[#0e1626]/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Calculator className="w-5 h-5 text-emerald-400 mb-1" />
                    <div className="text-[10px] font-black uppercase text-emerald-300">P/L & PAYBACK</div>
                    <div className="text-xs md:text-sm font-black">財務P/L＆投資計算機</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('crm_funnel')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                        activeTab === 'crm_funnel'
                            ? 'bg-gradient-to-br from-purple-900/50 to-indigo-950/70 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                            : 'bg-[#0e1626]/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Layers className="w-5 h-5 text-purple-400 mb-1" />
                    <div className="text-[10px] font-black uppercase text-purple-300">CRM & SWIM STEP</div>
                    <div className="text-xs md:text-sm font-black">顧客＆進級カルテ</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('coaches_guild')}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                        activeTab === 'coaches_guild'
                            ? 'bg-gradient-to-br from-rose-900/50 to-orange-950/70 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                            : 'bg-[#0e1626]/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Swords className="w-5 h-5 text-rose-400 mb-1" />
                    <div className="text-[10px] font-black uppercase text-rose-300">COACH PORTAL</div>
                    <div className="text-xs md:text-sm font-black">コーチズ・ギルド</div>
                </button>
            </div>

            {/* ================= 画面①：代表コマンドセンター ================= */}
            {activeTab === 'command_center' && (
                <div className="relative z-10 space-y-6">
                    {/* 財務サマリーカード 4枚 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-[#0e1626] border-2 border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ① 当月売上高 ({latestPl.yearMonth})
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                                    +{revenueMoMPercent}% 前月比
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-white">
                                    ¥{latestPl.totalRevenue.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    粗利益: ¥{latestPl.grossProfit.toLocaleString()}（粗利率 {latestPl.grossMarginPercent}%）
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-800 text-[11px] text-cyan-300 font-bold">
                                ストック比率: {latestPl.stockRatioPercent}%
                            </div>
                        </div>

                        <div className="bg-[#0e1626] border-2 border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ② 当月実質営業利益
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDeductCeoShadowCost(p => !p)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 hover:border-indigo-400 transition cursor-pointer"
                                >
                                    {deductCeoShadowCost ? '代表時給¥3,500控除済' : '控除前切替'}
                                </button>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-emerald-400">
                                    ¥
                                    {(deductCeoShadowCost
                                        ? latestPl.realOperatingProfitAfterCeo
                                        : latestPl.operatingProfitBeforeCeo
                                    ).toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    {deductCeoShadowCost
                                        ? `代表実働 ${latestPl.ceoOperatedHours}h (▲¥${latestPl.ceoShadowCost.toLocaleString()}) 控除後`
                                        : `実働抜き営業利益`}
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-800 text-[11px] text-amber-300 font-bold">
                                完全委任ボーナス: +{guildStatus.delegationBonusExp.toLocaleString()} EXP
                            </div>
                        </div>

                        <div className="bg-[#0e1626] border-2 border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ③ ユニットエコノミクス
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                                    ● {unitEco.signalLabel}
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-cyan-300">
                                    LTV/CAC {unitEco.ltvCacRatio}x
                                </div>
                                <div className="text-[11px] text-slate-300 mt-1">
                                    Google CPA: ¥{unitEco.googleCpa.toLocaleString()}（目標¥5,000以下）
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                                平均粗利LTV: ¥{unitEco.averageLtv.toLocaleString()}
                            </div>
                        </div>

                        <div className="bg-[#0e1626] border-2 border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ④ 自己資金・投資可能余力枠
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                    生活防衛枠完備
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-amber-400">
                                    ¥{latestPl.investableCash.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    今月新拠点や広告に投入可能な上限金額
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                                総資金 ¥{latestPl.totalCashBalance.toLocaleString()} - 防衛枠 ¥300万
                            </div>
                        </div>
                    </div>

                    {/* 6角形レーダー ＆ 6大経営スキルカード */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-6 bg-[#0e1626] border-2 border-cyan-500/30 rounded-2xl p-5 shadow-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">
                                        HEXAGON COMMAND RADAR
                                    </span>
                                    <h2 className="text-base font-black text-white">
                                        ギルドマスター戦闘力 6軸パラメータ評価
                                    </h2>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                                    総合評価 Sランク
                                </span>
                            </div>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={sixAxisScores}>
                                        <PolarGrid stroke="#1e293b" />
                                        <PolarAngleAxis
                                            dataKey="axis"
                                            tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }}
                                        />
                                        <PolarRadiusAxis
                                            angle={30}
                                            domain={[0, 100]}
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                        />
                                        <Radar
                                            name="経営パラメータ"
                                            dataKey="score"
                                            stroke="#38bdf8"
                                            strokeWidth={2.5}
                                            fill="#0284c7"
                                            fillOpacity={0.35}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: '#070b14',
                                                borderColor: '#38bdf8',
                                                borderRadius: '12px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                                {sixAxisScores.map(item => {
                                    const rankStyle = RANK_STYLE_MAP[item.rank] || RANK_STYLE_MAP.A
                                    return (
                                        <div
                                            key={item.code}
                                            className="bg-[#070b14] border border-slate-800 rounded-xl p-2.5 space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-cyan-400">
                                                    {item.code}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${rankStyle.badge}`}>
                                                    Rank {item.rank}
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-bold text-white truncate">
                                                {item.abilityName}
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate">
                                                {item.rawValueLabel}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* クエスト＆EXP獲得パネル */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="bg-[#0e1626] border-2 border-amber-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-400" />
                                        代表ギルドマスター・進行中クエスト
                                    </h3>
                                    <span className="text-xs font-black text-amber-400">
                                        達成でEXP＆称号解放
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {quests
                                        .filter(q => q.target_role === 'CEO')
                                        .map(quest => {
                                            const pct = Math.min(
                                                100,
                                                Math.round((quest.current_value / quest.threshold) * 100)
                                            )
                                            return (
                                                <div
                                                    key={quest.quest_id}
                                                    className={`p-3.5 rounded-xl border ${
                                                        quest.completed
                                                            ? 'bg-emerald-950/40 border-emerald-500/50'
                                                            : 'bg-[#070b14] border-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                                                                    {quest.quest_type}
                                                                </span>
                                                                <span className="text-xs font-black text-white">
                                                                    {quest.title}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-1">
                                                                {quest.description}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-black text-amber-400 shrink-0">
                                                            +{quest.reward_exp.toLocaleString()} EXP
                                                        </span>
                                                    </div>
                                                    <div className="mt-2.5 flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    quest.completed
                                                                        ? 'bg-emerald-400'
                                                                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                                                                }`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-300 shrink-0">
                                                            {quest.current_value.toLocaleString()} /{' '}
                                                            {quest.threshold.toLocaleString()}{quest.unit} ({pct}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 画面②：分野別スキル格付けボード（NEW!!） ================= */}
            {activeTab === 'skill_tree' && (
                <div className="relative z-10 space-y-6">
                    <div className="bg-[#0e1626] border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                    GUILD & COACH SKILL RANK EVALUATION
                                </span>
                                <h2 className="text-base font-black text-white">
                                    各分野のスキルランク格付け・アビリティ解放ツリー（SSS 〜 Dランク）
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                代表の経営パラメータ＆各契約コーチの指導・成約・機動力スキルを全格付け
                            </span>
                        </div>

                        {/* 1. ギルドマスター（代表・経営）の6大スキル */}
                        <div className="space-y-3 mb-6">
                            <h3 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
                                <Crown className="w-4 h-4 text-amber-400" />
                                ギルドマスター（代表・経営）6大統括スキル
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sixAxisScores.map(sk => {
                                    const rankStyle = RANK_STYLE_MAP[sk.rank] || RANK_STYLE_MAP.A
                                    return (
                                        <div
                                            key={sk.code}
                                            className="bg-[#070b14] border-2 border-slate-800 hover:border-amber-400/50 rounded-2xl p-4 space-y-2 transition shadow-md"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-cyan-400">
                                                    [{sk.code}] {sk.axis}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs ${rankStyle.badge}`}>
                                                    Rank {sk.rank}
                                                </span>
                                            </div>
                                            <div className="text-sm font-black text-white">
                                                {sk.abilityName}
                                            </div>
                                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                                {sk.description}
                                            </p>
                                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                                                <span className="text-slate-400">現在値: {sk.rawValueLabel}</span>
                                                <span className="text-amber-300 font-bold">{sk.targetLabel}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 2. 契約コーチ陣の個別スキルランク評価 */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase text-cyan-300 tracking-wider flex items-center gap-2">
                                <Swords className="w-4 h-4 text-cyan-400" />
                                契約コーチ陣 スキル格付け＆特殊クラス
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {coaches.map(c => (
                                    <div
                                        key={c.coach_id}
                                        className="bg-[#070b14] border-2 border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-white">
                                                        {c.name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        {c.reward_rank}ランク
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-cyan-300 mt-0.5">
                                                    {c.rpg_class}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400 font-bold">完遂コマ数</div>
                                                <div className="text-base font-black text-white">
                                                    {c.current_month_lessons}コマ
                                                </div>
                                            </div>
                                        </div>

                                        {/* 各スキルのランクバー */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {c.evaluations?.map(ev => {
                                                const rStyle = RANK_STYLE_MAP[ev.rank] || RANK_STYLE_MAP.A
                                                return (
                                                    <div
                                                        key={ev.id}
                                                        className="bg-[#0e1626] border border-slate-800 rounded-xl p-2.5 space-y-1"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-slate-200 truncate">
                                                                {ev.name}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${rStyle.badge}`}>
                                                                {ev.rank}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                            {ev.currentValueLabel}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 画面③：詳細財務P/L＆投資ペイバック計算機 ================= */}
            {activeTab === 'finance_simulator' && (
                <div className="relative z-10 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* ペイバック計算機 */}
                        <div className="lg:col-span-5 bg-[#0e1626] border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    PAYBACK MAGIC SIMULATOR
                                </span>
                                <h2 className="text-base font-black text-white flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-emerald-400" />
                                    自己資金投資ペイバック計算機
                                </h2>
                            </div>

                            <div className="space-y-3 bg-[#070b14] p-3.5 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-200">① 追加広告費</span>
                                    <span className="font-black text-cyan-300">+¥{simAdSpend.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={200000}
                                    step={5000}
                                    value={simAdSpend}
                                    onChange={e => setSimAdSpend(Number(e.target.value))}
                                    className="w-full accent-cyan-400 cursor-pointer"
                                />
                            </div>

                            <div className="space-y-3 bg-[#070b14] p-3.5 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-200">② 新拠点の貸切枠</span>
                                    <span className="font-black text-amber-300">+¥{simPoolRental.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100000}
                                    step={5000}
                                    value={simPoolRental}
                                    onChange={e => setSimPoolRental(Number(e.target.value))}
                                    className="w-full accent-amber-400 cursor-pointer"
                                />
                            </div>

                            <div className="bg-gradient-to-br from-emerald-950/60 to-[#070b14] border-2 border-emerald-400/50 rounded-2xl p-4 space-y-2">
                                <div className="text-xs font-bold text-emerald-300">投資回収期間判定</div>
                                <div className="text-2xl md:text-3xl font-black text-white">
                                    {paybackResult.paybackMonths}ヶ月と{paybackResult.paybackDays}日
                                    <span className="text-xs font-bold text-emerald-400 ml-2">
                                        （計{paybackResult.totalPaybackDays}日）で完済！
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-center">
                                    <div>
                                        <div className="text-[10px] text-slate-400">見込み本契約</div>
                                        <div className="text-sm font-black text-white">+{paybackResult.expectedNewRegularStudents}名</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400">月間増分粗利</div>
                                        <div className="text-sm font-black text-emerald-400">+¥{paybackResult.monthlyIncrementalGrossProfit.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400">12ヶ月純増利益</div>
                                        <div className="text-sm font-black text-amber-400">+¥{paybackResult.twelveMonthCumulativeNetProfit.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* P/L推移チャート */}
                        <div className="lg:col-span-7 bg-[#0e1626] border-2 border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">
                                    P/L FINANCIAL TRAJECTORY
                                </span>
                                <h2 className="text-base font-black text-white mb-3">
                                    売上構造＆実質営業利益推移（本番データ集計）
                                </h2>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={plRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="yearMonth" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <RechartsTooltip formatter={(v: any) => `¥${Number(v).toLocaleString()}`} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="stockRevenue" stackId="rev" name="定期サブスク(ストック)" fill="#0ea5e9" />
                                        <Bar dataKey="fixedSchoolRevenue" stackId="rev" name="城東小(固定枠)" fill="#f59e0b" />
                                        <Bar dataKey="flowRevenue" stackId="rev" name="都度・体験(フロー)" fill="#64748b" />
                                        <Line type="monotone" dataKey="grossProfit" name="粗利額" stroke="#34d399" strokeWidth={3} />
                                        <Line type="monotone" dataKey="realOperatingProfitAfterCeo" name="実質営業利益" stroke="#a855f7" strokeWidth={2.5} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 画面④：顧客カルテ＆進級ボード ================= */}
            {activeTab === 'crm_funnel' && (
                <div className="relative z-10 space-y-6">
                    <div className="bg-[#0e1626] border-2 border-purple-500/30 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">
                                    STUDENTS ADVENTURER RECORD
                                </span>
                                <h2 className="text-base font-black text-white">
                                    生徒冒険者カルテ・スイムステップ進級スキル一覧（全{students.length}名）
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                実質LTV・進級レベル・AIO記事化ステータス
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-[550px]">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 bg-[#070b14] text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th className="py-2.5 px-3 text-left">会員番号・氏名</th>
                                        <th className="py-2.5 px-3 text-left">進級スキルランク</th>
                                        <th className="py-2.5 px-3 text-left">エリア・プラン</th>
                                        <th className="py-2.5 px-3 text-right">実質LTV</th>
                                        <th className="py-2.5 px-3 text-center">ステータス</th>
                                        <th className="py-2.5 px-3 text-right">進級アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {students.map(st => {
                                        const rank = st.swim_step_rank || getSwimStepRank(st.swim_step_level)
                                        const rStyle = RANK_STYLE_MAP[rank] || RANK_STYLE_MAP.B
                                        return (
                                            <tr key={st.student_id} className="hover:bg-slate-800/40">
                                                <td className="py-2.5 px-3">
                                                    <div className="font-black text-white">
                                                        {st.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        #{st.student_number} / {st.grade} / 担当: {st.assigned_coach_name}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] ${rStyle.badge} mr-1.5`}>
                                                        {rank}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-slate-200">
                                                        {st.swim_step_title}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="text-slate-200">{st.area_station}</div>
                                                    <div className="text-[10px] text-amber-300">{st.plan_type}</div>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                                                    ¥{st.cumulative_revenue.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                                                        {st.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdvanceSwimStep(st.student_id)}
                                                        className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[10px] font-black transition cursor-pointer"
                                                    >
                                                        +1進級 (+200 EXP)
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 画面⑤：コーチズ・ギルド ================= */}
            {activeTab === 'coaches_guild' && (
                <div className="relative z-10 space-y-6">
                    {/* コーチ切替セレクター ＆ 報告ボタン */}
                    <div className="bg-[#0e1626] border-2 border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">選択中のコーチ:</span>
                            {coaches
                                .filter(c => !c.is_ceo)
                                .map(c => (
                                    <button
                                        key={c.coach_id}
                                        type="button"
                                        onClick={() => setSelectedCoachId(c.coach_id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                                            selectedCoach.coach_id === c.coach_id
                                                ? 'bg-amber-500/20 border-amber-400 text-white'
                                                : 'bg-[#070b14] border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        {c.name} ({c.reward_rank})
                                    </button>
                                ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReportModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer flex items-center gap-1.5"
                        >
                            <Send className="w-4 h-4" /> 3行レッスン報告でEXP＆報酬獲得！
                        </button>
                    </div>

                    {/* ステータスカード */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 bg-[#0e1626] border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-cyan-300">
                                        {selectedCoach.rpg_class}
                                    </div>
                                    <h2 className="text-xl font-black text-white">
                                        {selectedCoach.name} ステータス
                                    </h2>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/50">
                                    {selectedCoach.reward_rank}ランク（報酬率{Math.round(coachRankImpact.currentRankDef.rewardRate * 100)}%）
                                </span>
                            </div>

                            {/* ランクアップカウントダウン */}
                            <div className="bg-[#070b14] border border-amber-500/40 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-black text-amber-300">
                                        当月完遂: {selectedCoach.current_month_lessons}コマ
                                    </span>
                                    <span className="text-slate-300">
                                        次ランクまで あと {coachRankImpact.lessonsRemainingToNextRank}コマ
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                        style={{ width: `${coachRankImpact.rankProgressPercent}%` }}
                                    />
                                </div>
                                <p className="text-xs font-black text-amber-200">
                                    {coachRankImpact.motivationalMessage}
                                </p>
                            </div>
                        </div>

                        {/* 緊急クエスト */}
                        <div className="lg:col-span-5 bg-[#0e1626] border-2 border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-rose-400" /> 緊急ファストパス案件
                            </h3>
                            <div className="space-y-2.5">
                                {fastPassQuests.map(fp => (
                                    <div
                                        key={fp.lead_id}
                                        className="bg-[#070b14] border border-slate-800 rounded-xl p-3 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-white">
                                                {fp.student_label}
                                            </span>
                                            <span className="text-xs font-black text-amber-400">
                                                ¥{fp.estimated_reward.toLocaleString()}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleAcceptFastPassQuest(fp.lead_id)}
                                            className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1"
                                        >
                                            <Zap className="w-3.5 h-3.5" /> 1タップ受託 (+50 EXP)
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3行レッスン報告モーダル */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                        onClick={() => setIsReportModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-md w-full bg-[#0e1626] border-2 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="text-base font-black text-white">
                                    📱 スマホ3行報告＆EXP獲得
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleSubmitThreeLineReport} className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                        受講生徒（規定により 0035 テスト太郎様を選択可能）
                                    </label>
                                    <select
                                        value={reportStudentId}
                                        onChange={e => setReportStudentId(e.target.value)}
                                        className="w-full rounded-xl bg-[#070b14] border border-slate-700 px-3 py-2 text-xs text-white"
                                    >
                                        {students.map(s => (
                                            <option key={s.student_id} value={s.student_id}>
                                                #{s.student_number} {s.name} ({s.swim_step_title})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                                        1行目：成長ポイント（Good）
                                    </label>
                                    <input
                                        type="text"
                                        value={reportGoodLine}
                                        onChange={e => setReportGoodLine(e.target.value)}
                                        className="w-full rounded-xl bg-[#070b14] border border-slate-700 px-3 py-2 text-xs text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-cyan-300 mb-1">
                                        2行目：次回の課題（Next）
                                    </label>
                                    <input
                                        type="text"
                                        value={reportNextLine}
                                        onChange={e => setReportNextLine(e.target.value)}
                                        className="w-full rounded-xl bg-[#070b14] border border-slate-700 px-3 py-2 text-xs text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                                        3行目：保護者様へのメッセージ
                                    </label>
                                    <input
                                        type="text"
                                        value={reportCommentLine}
                                        onChange={e => setReportCommentLine(e.target.value)}
                                        className="w-full rounded-xl bg-[#070b14] border border-slate-700 px-3 py-2 text-xs text-white"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-lg cursor-pointer"
                                >
                                    🪙 報告を送信して EXP＆報酬を獲得！
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
