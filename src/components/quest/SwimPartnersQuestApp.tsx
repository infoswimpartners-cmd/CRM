'use client'

import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import {
    QuestStudent,
    QuestCoach,
    LessonTransaction,
    MonthlyFinance,
    QuestAchievement,
    FastPassLeadQuest,
    FunnelStage,
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

type ActiveTab = 'command_center' | 'finance_simulator' | 'crm_funnel' | 'coaches_guild'

const FUNNEL_STAGES: FunnelStage[] = [
    'LINE友だち追加未申込',
    'ステップ配信中(Day1/3/5)',
    '日程調整・コーチ打診中',
    '体験予約済',
    '本契約継続中',
]

interface SwimPartnersQuestAppProps {
    initialTab?: ActiveTab
}

export function SwimPartnersQuestApp({
    initialTab = 'command_center',
}: SwimPartnersQuestAppProps) {
    // タブ状態
    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab)

    // 5大テーブルのリアクティブ状態
    const [students, setStudents] = useState<QuestStudent[]>(INITIAL_QUEST_STUDENTS)
    const [coaches, setCoaches] = useState<QuestCoach[]>(INITIAL_QUEST_COACHES)
    const [transactions, setTransactions] = useState<LessonTransaction[]>(
        INITIAL_LESSON_TRANSACTIONS
    )
    const [finances, setFinances] = useState<MonthlyFinance[]>(INITIAL_MONTHLY_FINANCES)
    const [quests, setQuests] = useState<QuestAchievement[]>(INITIAL_QUEST_ACHIEVEMENTS)
    const [fastPassQuests, setFastPassQuests] =
        useState<FastPassLeadQuest[]>(INITIAL_FAST_PASS_QUESTS)

    // 画面①: 代表人件費控除トグル（true = 代表人件費控除後の実質営業利益、false = 代表実働抜き利益）
    const [deductCeoShadowCost, setDeductCeoShadowCost] = useState<boolean>(true)

    // 画面②: 自己資金投資ペイバック計算機スライダー状態
    const [simAdSpend, setSimAdSpend] = useState<number>(30000) // +3万円
    const [simPoolRental, setSimPoolRental] = useState<number>(20000) // +2万円
    const [simConversionRate, setSimConversionRate] = useState<number>(82) // 82%

    // 画面④: 選択中のコーチ & 3行レッスン報告モーダル状態
    const [selectedCoachId, setSelectedCoachId] = useState<string>('coach-takashima')
    const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false)
    const [reportStudentId, setReportStudentId] = useState<string>(
        'e0fcec0b-b5ae-47a9-ab50-632a206d8aff' // デフォルトは会員番号0035 テスト太郎
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

    // コーチ情報とランク昇格インパクト
    const selectedCoach = useMemo(
        () => coaches.find(c => c.coach_id === selectedCoachId) || coaches[0],
        [coaches, selectedCoachId]
    )

    const coachRankImpact = useMemo(
        () => calculateCoachRankUpImpact(selectedCoach, 9500),
        [selectedCoach]
    )

    const coachLvProgress = useMemo(
        () => calculateCoachLevelProgress(selectedCoach.coach_exp),
        [selectedCoach.coach_exp]
    )

    // 城東小金曜枠の入会シミュレーション（メインクエスト達成アクション）
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
            title: '🏰 城東小スイムステップ金曜枠 +1名入会！',
            gainedExp: 520,
            gainedYen: 26000,
            subMessage:
                '固定スクール（ヤエスク枠）は施設費4,950円が固定のため、追加1名の月謝26,000円がほぼ丸ごと粗利として積み上がります！',
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
                    swim_step_title: stepDef ? stepDef.title : `Lv.${nextLv}`,
                }
            })
        )
        setRewardCelebration({
            visible: true,
            title: '🐬 スイムステップ進級クリア！',
            gainedExp: COACH_EXP_RULES.SWIM_STEP_CLEARED,
            gainedYen: 0,
            subMessage:
                '生徒の進級カルテが1段階ランクアップし、保護者LINEへ進級バッジ通知が送信されました！',
        })
    }

    // AIO記事ステータス更新
    const handleCycleAioStatus = (studentId: string) => {
        setStudents(prev =>
            prev.map(s => {
                if (s.student_id !== studentId) return s
                const nextStatus =
                    s.aio_status === '未作成'
                        ? 'AI下書き済'
                        : s.aio_status === 'AI下書き済'
                          ? '公開済(AIO上位)'
                          : '公開済(AIO上位)'
                return { ...s, aio_status: nextStatus }
            })
        )
    }

    // ファストパス・クエスト（緊急案件）1タップ即決受託
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
            subMessage: `${selectedCoach.name}の当月完遂コマ数が +1 加算され、スピード受託ボーナス +${COACH_EXP_RULES.FAST_PASS_ACCEPTED} EXP を獲得しました！`,
        })
    }

    // 3行レッスン報告送信＆EXP獲得ゲーム演出（「チャリーン！」）
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

        // コーチのコマ数・EXPを更新
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

        // 生徒の進級レベル更新
        if (reportSwimStepUp) {
            setStudents(prev =>
                prev.map(s => {
                    if (s.student_id !== targetStudent.student_id) return s
                    const nextLv = Math.min(20, s.swim_step_level + 1)
                    const stepDef = SWIM_STEP_LEVELS.find(l => l.level === nextLv)
                    return {
                        ...s,
                        swim_step_level: nextLv,
                        swim_step_title: stepDef ? stepDef.title : `Lv.${nextLv}`,
                        next_challenge: reportNextLine || s.next_challenge,
                    }
                })
            )
        }

        // トランザクション追加
        const newTx: LessonTransaction = {
            lesson_id: `tx-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            year_month: '2026-10',
            student_id: targetStudent.student_id,
            student_name: `${targetStudent.name}（${targetStudent.student_number}）`,
            coach_id: selectedCoach.coach_id,
            coach_name: selectedCoach.name,
            pool_facility: targetStudent.area_station,
            area_tier: targetStudent.area_tier,
            revenue_type: 'stock',
            plan_label: targetStudent.plan_type,
            revenue: lessonRevenue,
            coach_fee: totalGainedYen,
            facility_transport_cost: 600,
            stripe_fee: Math.round(lessonRevenue * 0.036),
            is_ceo_operated: Boolean(selectedCoach.is_ceo),
            gross_profit: lessonRevenue - totalGainedYen - 600,
            assign_hours: 1.0,
            is_fast_pass: true,
            is_trial_converted: reportTrialConverted,
        }
        setTransactions(prev => [newTx, ...prev])

        setIsReportModalOpen(false)
        setRewardCelebration({
            visible: true,
            title: '🪙 チャリーン！ 3行レッスン報告完了！',
            gainedExp,
            gainedYen: totalGainedYen,
            subMessage: `${targetStudent.name}様（会員番号${targetStudent.student_number}）への指導レポートが送信され、EXPと確定報酬が即時加算されました！`,
        })
    }

    const mainCeoQuest = quests.find(q => q.is_main_quest && q.target_role === 'CEO')

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 rounded-3xl p-4 md:p-7 shadow-2xl border border-slate-800/90 relative overflow-hidden">
            {/* 背景アンビエントグラデーション */}
            <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

            {/* チャリーン！ 報酬＆EXP獲得セレブレーションモーダル */}
            <AnimatePresence>
                {rewardCelebration?.visible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
                        onClick={() => setRewardCelebration(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/70 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(251,191,36,0.25)] space-y-4"
                        >
                            <motion.div
                                initial={{ rotate: -15, scale: 0.5 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                                className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                            >
                                <Coins className="w-9 h-9 text-slate-950" />
                            </motion.div>
                            <div className="text-xs font-black uppercase tracking-widest text-amber-400">
                                QUEST REWARD & EXP GAINED!
                            </div>
                            <h3 className="text-xl font-black text-white">
                                {rewardCelebration.title}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {rewardCelebration.subMessage}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-cyan-950/60 border border-cyan-500/40 rounded-2xl p-3">
                                    <div className="text-[11px] text-cyan-300 font-bold">
                                        獲得経験値 (EXP)
                                    </div>
                                    <div className="text-2xl font-black text-cyan-400">
                                        +{rewardCelebration.gainedExp.toLocaleString()} EXP
                                    </div>
                                </div>
                                <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-3">
                                    <div className="text-[11px] text-amber-300 font-bold">
                                        確定報酬・売上増分
                                    </div>
                                    <div className="text-2xl font-black text-amber-400">
                                        +¥{rewardCelebration.gainedYen.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRewardCelebration(null)}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-sm hover:brightness-110 transition cursor-pointer"
                            >
                                ステータス画面へ戻る
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= 1. 最上部ギルドステータスバー ================= */}
            <header className="relative z-10 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 mb-6 shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* 左: ギルドLv & 称号 */}
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20">
                                <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tighter">
                                        GUILD
                                    </span>
                                    <span className="text-xl font-black text-white leading-none">
                                        Lv.{guildStatus.currentLevel}
                                    </span>
                                </div>
                            </div>
                            <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-400 text-slate-950">
                                RPG
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                    <Sparkles className="w-3 h-3" /> SwimPartners Quest ERP
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <Crown className="w-3 h-3" /> 称号：{guildStatus.currentTitle}
                                </span>
                            </div>
                            <h1 className="text-lg md:text-xl font-black text-white tracking-tight">
                                スイムパートナーズ 総合経営＆ゲーミフィケーション指令室
                            </h1>
                            <p className="text-xs text-slate-400">
                                Guild Lv.50 マスターランク（月間粗利105万円 ＝ 年収1,000万円モデル）到達度：
                                <span className="text-amber-400 font-black ml-1">
                                    {guildStatus.masterRankProgressPercent}%
                                </span>
                                （当月粗利 ¥{latestPl.grossProfit.toLocaleString()} / 目標 ¥1,050,000）
                            </p>
                        </div>
                    </div>

                    {/* 右: 累計EXPゲージ */}
                    <div className="lg:w-80 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-cyan-400 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5" /> 累計 {guildStatus.cumulativeExp.toLocaleString()} EXP
                            </span>
                            <span className="text-slate-400 text-[11px]">
                                次Lvまで あと {guildStatus.expToNextLevel.toLocaleString()} EXP
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${guildStatus.progressPercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
                            />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>当月獲得: +{guildStatus.monthlyTotalExp.toLocaleString()} EXP</span>
                            <span>ストック売上2倍ボーナス適用中</span>
                        </div>
                    </div>
                </div>

                {/* 今月のメインクエスト・アラートバー */}
                {mainCeoQuest && (
                    <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <span className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-black shrink-0 flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-rose-400" /> MAIN QUEST
                            </span>
                            <span className="text-xs md:text-sm font-bold text-slate-100">
                                {mainCeoQuest.title}
                            </span>
                            <span className="text-xs font-black text-amber-400 shrink-0">
                                （現在 {latestFinance.joto_friday_enrolled} / {latestFinance.joto_friday_capacity}名）
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSimulateJotoEnrollment}
                            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:brightness-110 transition shadow-sm cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            城東小枠 +1名入会をシミュレート (+26,000円)
                        </button>
                    </div>
                )}
            </header>

            {/* ================= 2. 4大画面切替ナビゲーションタブ ================= */}
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('command_center')}
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'command_center'
                            ? 'bg-gradient-to-br from-blue-600/30 to-indigo-900/40 border-blue-400/70 text-white shadow-lg shadow-blue-500/10'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                            SCREEN 01 / CEO
                        </div>
                        <div className="text-xs md:text-sm font-black">
                            コマンドセンター
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('finance_simulator')}
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'finance_simulator'
                            ? 'bg-gradient-to-br from-emerald-600/30 to-teal-900/40 border-emerald-400/70 text-white shadow-lg shadow-emerald-500/10'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <Calculator className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            SCREEN 02 / P&L・ROI
                        </div>
                        <div className="text-xs md:text-sm font-black">
                            財務分析＆投資計算機
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('crm_funnel')}
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'crm_funnel'
                            ? 'bg-gradient-to-br from-purple-600/30 to-indigo-900/40 border-purple-400/70 text-white shadow-lg shadow-purple-500/10'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <Layers className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                            SCREEN 03 / CRM・AIO
                        </div>
                        <div className="text-xs md:text-sm font-black">
                            顧客ファネル＆進級カルテ
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('coaches_guild')}
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'coaches_guild'
                            ? 'bg-gradient-to-br from-amber-500/30 to-orange-900/40 border-amber-400/70 text-white shadow-lg shadow-amber-500/10'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                >
                    <Swords className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            SCREEN 04 / COACH
                        </div>
                        <div className="text-xs md:text-sm font-black">
                            コーチズ・ギルド
                        </div>
                    </div>
                </button>
            </div>

            {/* ================= 画面①：エグゼクティブ・コマンドセンター ================= */}
            {activeTab === 'command_center' && (
                <div className="relative z-10 space-y-6">
                    {/* 財務サマリーカード 4枚 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {/* カード1: 当月売上高 */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ① 当月売上高 ({latestPl.yearMonth})
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3 h-3" /> +{revenueMoMPercent}% 前月比
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-white">
                                    ¥{latestPl.totalRevenue.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    当月粗利: ¥{latestPl.grossProfit.toLocaleString()}（粗利率 {latestPl.grossMarginPercent}%）
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                                <span className="text-cyan-300 font-bold">
                                    ストック＋固定枠比率: {latestPl.stockRatioPercent}%
                                </span>
                                <span className="text-slate-400">
                                    ¥{(latestPl.stockRevenue + latestPl.fixedSchoolRevenue).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* カード2: 当月実質営業利益（代表人件費控除トグル付き） */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-400">
                                    ② 当月実質営業利益
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDeductCeoShadowCost(prev => !prev)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                                        deductCeoShadowCost
                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}
                                >
                                    {deductCeoShadowCost
                                        ? '✓ 代表人件費控除後'
                                        : '代表実働抜き利益（切替）'}
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
                                        ? `代表現場稼働 ${latestPl.ceoOperatedHours}h × 時給¥3,500 (▲¥${latestPl.ceoShadowCost.toLocaleString()}) 控除済`
                                        : `代表実働抜き営業利益（控除前）`}
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                                <span className="text-amber-300 font-bold">
                                    脱・現場ボーナスEXP対象
                                </span>
                                <span className="text-slate-400">
                                    +{guildStatus.delegationBonusExp.toLocaleString()} EXP
                                </span>
                            </div>
                        </div>

                        {/* カード3: ユニットエコノミクス（LTV/CAC & CPA信号機） */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ③ ユニットエコノミクス
                                </span>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                        unitEco.signalStatus === 'green'
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            : unitEco.signalStatus === 'yellow'
                                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    }`}
                                >
                                    ● {unitEco.signalLabel}
                                </span>
                            </div>
                            <div className="my-3 flex items-baseline gap-3">
                                <div className="text-2xl md:text-3xl font-black text-cyan-400">
                                    LTV/CAC {unitEco.ltvCacRatio}x
                                </div>
                                <div className="text-xs font-bold text-slate-300">
                                    Google CPA ¥{unitEco.googleCpa.toLocaleString()}
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                <span>平均粗利LTV: ¥{unitEco.averageLtv.toLocaleString()}</span>
                                <span>総合CAC: ¥{unitEco.cac.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* カード4: 自己資金・投資可能余力枠 */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    ④ 自己資金・投資可能余力枠
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    安全防衛資金確保済
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-amber-400">
                                    ¥{latestPl.investableCash.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    今月広告増額や新拠点貸切に即投入できる上限枠
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                <span>総資金: ¥{latestPl.totalCashBalance.toLocaleString()}</span>
                                <span>防衛枠: ¥{latestPl.safeReserveCash.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* 中段: 6角形レーダーチャート & ギルドEXP内訳・CEOクエスト */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 左 6角形レーダーチャート */}
                        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                        HEXAGON POWER RADAR
                                    </span>
                                    <h2 className="text-base font-black text-white">
                                        経営戦闘力 6軸パラメータ評価（100点満点）
                                    </h2>
                                </div>
                                <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-xs font-black text-cyan-300">
                                    総合戦闘力 Sランク
                                </span>
                            </div>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart
                                        cx="50%"
                                        cy="50%"
                                        outerRadius="72%"
                                        data={sixAxisScores}
                                    >
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis
                                            dataKey="axis"
                                            tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 700 }}
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
                                            fill="#0ea5e9"
                                            fillOpacity={0.35}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderColor: '#334155',
                                                borderRadius: '12px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                                {sixAxisScores.map(item => (
                                    <div
                                        key={item.code}
                                        className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-cyan-400">
                                                {item.code}
                                            </span>
                                            <span className="text-sm font-black text-white">
                                                {item.score}点
                                            </span>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-200 mt-0.5 truncate">
                                            {item.rawValueLabel}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                            {item.targetLabel}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 右: ギルドEXP獲得ルール稼働状況 ＆ 代表クエストボード */}
                        <div className="lg:col-span-6 space-y-4">
                            {/* EXP内訳パネル */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                            GUILD EXP ENGINE
                                        </span>
                                        <h2 className="text-base font-black text-white">
                                            当月経営アクション → 獲得EXP変換内訳
                                        </h2>
                                    </div>
                                    <span className="text-sm font-black text-amber-400">
                                        +{guildStatus.monthlyTotalExp.toLocaleString()} EXP
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-cyan-300">
                                                ① ストック＆城東小売上 (2倍ボーナス)
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                売上1,000円ごとに +20 EXP
                                            </div>
                                        </div>
                                        <span className="font-black text-cyan-400 text-sm">
                                            +{guildStatus.stockExp.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-emerald-300">
                                                ② 完全委任・脱現場ボーナス
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                契約コーチ粗利1,000円ごとに +30 EXP
                                            </div>
                                        </div>
                                        <span className="font-black text-emerald-400 text-sm">
                                            +{guildStatus.delegationBonusExp.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-slate-200">
                                                ③ フロー・単発・体験売上
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                売上1,000円ごとに +10 EXP
                                            </div>
                                        </div>
                                        <span className="font-black text-slate-300 text-sm">
                                            +{guildStatus.flowExp.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-amber-300">
                                                ④ LTV/CAC 3.0倍超 健全ボーナス
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                現在 {unitEco.ltvCacRatio}倍 クリア！
                                            </div>
                                        </div>
                                        <span className="font-black text-amber-400 text-sm">
                                            +{guildStatus.ltvCacBonusExp.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 代表用クエスト一覧 */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-400" />
                                        代表ギルド・クエスト一覧（経営ミッション）
                                    </h3>
                                    <span className="text-[11px] text-slate-400">
                                        達成でEXP＆称号解放
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {quests
                                        .filter(q => q.target_role === 'CEO')
                                        .map(quest => {
                                            const pct = Math.min(
                                                100,
                                                Math.round(
                                                    (quest.current_value / quest.threshold) * 100
                                                )
                                            )
                                            return (
                                                <div
                                                    key={quest.quest_id}
                                                    className={`p-3.5 rounded-xl border ${
                                                        quest.completed
                                                            ? 'bg-emerald-950/30 border-emerald-500/40'
                                                            : 'bg-slate-950/70 border-slate-800'
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
                                                        <span className="shrink-0 text-xs font-black text-amber-400">
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
                                                            {quest.threshold.toLocaleString()}
                                                            {quest.unit} ({pct}%)
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

            {/* ================= 画面②：詳細財務分析＆投資シミュレーター ================= */}
            {activeTab === 'finance_simulator' && (
                <div className="relative z-10 space-y-6">
                    {/* 上段: 自己資金投資ペイバック計算機 ＆ 売上・利益推移チャート */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 自己資金投資ペイバック計算機 */}
                        <div className="lg:col-span-5 bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                        SELF-FUNDED PAYBACK SIMULATOR
                                    </span>
                                    <h2 className="text-base font-black text-white flex items-center gap-2">
                                        <Sliders className="w-4 h-4 text-emerald-400" />
                                        自己資金投資ペイバック計算機
                                    </h2>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black">
                                    余力枠 ¥{latestPl.investableCash.toLocaleString()}
                                </span>
                            </div>

                            <p className="text-xs text-slate-400">
                                スライダーを動かすと、現在の成約率・LTVから「何ヶ月と何日で投資回収できるか」を即時シミュレーションします。
                            </p>

                            {/* スライダー1: 広告費増額 */}
                            <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-200">
                                        ① Google/Meta広告費をあと増やす
                                    </span>
                                    <span className="font-black text-cyan-400 text-sm">
                                        +¥{simAdSpend.toLocaleString()} / 月
                                    </span>
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
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>¥0</span>
                                    <span>+¥30,000（推奨）</span>
                                    <span>+¥100,000</span>
                                    <span>+¥200,000</span>
                                </div>
                            </div>

                            {/* スライダー2: 新拠点の貸切枠費用 */}
                            <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-200">
                                        ② 新拠点の貸切枠を借りる（ヤエスク型）
                                    </span>
                                    <span className="font-black text-amber-400 text-sm">
                                        +¥{simPoolRental.toLocaleString()} / 月
                                    </span>
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
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>¥0</span>
                                    <span>+¥20,000（週1枠）</span>
                                    <span>+¥50,000</span>
                                    <span>+¥100,000</span>
                                </div>
                            </div>

                            {/* スライダー3: 体験→本契約成約率 */}
                            <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-200">
                                        ③ 想定 体験→本契約成約率
                                    </span>
                                    <span className="font-black text-emerald-400 text-sm">
                                        {simConversionRate}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={50}
                                    max={95}
                                    step={2}
                                    value={simConversionRate}
                                    onChange={e => setSimConversionRate(Number(e.target.value))}
                                    className="w-full accent-emerald-400 cursor-pointer"
                                />
                            </div>

                            {/* シミュレーション結果ボックス */}
                            <div className="bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-500/50 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-300">
                                        投資回収期間（ペイバック）
                                    </span>
                                    <span className="text-xs text-slate-300">
                                        投資合計: ¥{paybackResult.totalMonthlyInvestment.toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-2xl md:text-3xl font-black text-white">
                                    {paybackResult.paybackMonths}ヶ月と{paybackResult.paybackDays}日
                                    <span className="text-xs font-bold text-emerald-400 ml-2">
                                        （計{paybackResult.totalPaybackDays}日）で完済！
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-center">
                                    <div>
                                        <div className="text-[10px] text-slate-400">新規本契約</div>
                                        <div className="text-sm font-black text-white">
                                            +{paybackResult.expectedNewRegularStudents}名
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400">月間増分粗利</div>
                                        <div className="text-sm font-black text-emerald-400">
                                            +¥{paybackResult.monthlyIncrementalGrossProfit.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400">12ヶ月純増利益</div>
                                        <div className="text-sm font-black text-amber-400">
                                            +¥{paybackResult.twelveMonthCumulativeNetProfit.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] font-bold text-emerald-200">
                                    {paybackResult.judgmentText}
                                </p>
                            </div>
                        </div>

                        {/* 右: 月次売上構造＆実質営業利益チャート */}
                        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                    MONTHLY P/L TRAJECTORY
                                </span>
                                <h2 className="text-base font-black text-white mb-4">
                                    ストック収益の積み上がり ＆ 実質営業利益推移（6ヶ月）
                                </h2>
                            </div>

                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={plRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis
                                            dataKey="yearMonth"
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        />
                                        <YAxis
                                            tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        />
                                        <RechartsTooltip
                                            formatter={(value: any) =>
                                                `¥${Number(value).toLocaleString()}`
                                            }
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderColor: '#334155',
                                                borderRadius: '12px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar
                                            dataKey="stockRevenue"
                                            stackId="rev"
                                            name="定期サブスク売上(ストック)"
                                            fill="#0ea5e9"
                                            radius={[0, 0, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="fixedSchoolRevenue"
                                            stackId="rev"
                                            name="城東小スイムステップ(固定枠)"
                                            fill="#f59e0b"
                                        />
                                        <Bar
                                            dataKey="flowRevenue"
                                            stackId="rev"
                                            name="都度・体験売上(フロー)"
                                            fill="#64748b"
                                            radius={[6, 6, 0, 0]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="grossProfit"
                                            name="月間粗利額"
                                            stroke="#34d399"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="realOperatingProfitAfterCeo"
                                            name="実質営業利益(代表控除後)"
                                            stroke="#a855f7"
                                            strokeWidth={2.5}
                                            dot={{ r: 4 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* エリア別・施設別ROIマトリクス */}
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-cyan-400" />
                                    エリア別・施設別 ROI（採算性）マトリクス
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                                                <th className="py-2 pr-3">エリア・拠点</th>
                                                <th className="py-2 px-2 text-right">月間件数</th>
                                                <th className="py-2 px-2 text-right">平均移動/施設費</th>
                                                <th className="py-2 px-2 text-right">粗利額</th>
                                                <th className="py-2 px-2 text-right">粗利率</th>
                                                <th className="py-2 pl-2 text-right">投資判定</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {areaRoiList.map(item => (
                                                <tr
                                                    key={item.area_name}
                                                    className="hover:bg-slate-800/40"
                                                >
                                                    <td className="py-2.5 pr-3">
                                                        <div className="font-bold text-white">
                                                            {item.area_name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {item.main_facilities}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right font-bold">
                                                        {item.lesson_count}件
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right text-slate-300">
                                                        ¥{item.avg_transport_facility_cost.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right font-black text-emerald-400">
                                                        ¥{item.total_gross_profit.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right font-black text-cyan-300">
                                                        {item.gross_margin_rate}%
                                                    </td>
                                                    <td className="py-2.5 pl-2 text-right">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                                item.roi_rank.startsWith('S')
                                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                                    : item.roi_rank.startsWith('A')
                                                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                      : 'bg-slate-800 text-slate-300'
                                                            }`}
                                                        >
                                                            {item.roi_rank}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 下段: 自動生成 月次P/L（損益計算書）フルテーブル */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    AUTOMATED MONTHLY P/L STATEMENT
                                </span>
                                <h2 className="text-base font-black text-white">
                                    月次損益計算書（P/L）・代表シャドウコスト控除推移
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                ※ Stripe手数料3.6%・ヤエスク貸切費4,950円/回・代表仮想時給3,500円を自動計上
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                                        <th className="py-2.5 px-3 text-left">勘定科目 / 指標</th>
                                        {plRows.map(r => (
                                            <th
                                                key={r.yearMonth}
                                                className="py-2.5 px-3 text-right font-black text-slate-200"
                                            >
                                                {r.yearMonth}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/70">
                                    <tr>
                                        <td className="py-2 px-3 text-slate-300">
                                            ・定期サブスク売上（月2回/月4回/25m保証）
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-cyan-300 font-semibold"
                                            >
                                                ¥{r.stockRevenue.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-300">
                                            ・城東小スイムステップ売上（固定スクール）
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-amber-300 font-semibold"
                                            >
                                                ¥{r.fixedSchoolRevenue.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-300">
                                            ・都度払い・体験売上（フロー）
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-slate-300"
                                            >
                                                ¥{r.flowRevenue.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-950/50 font-black text-white">
                                        <td className="py-2.5 px-3">売上高 合計（ストック比率）</td>
                                        {plRows.map(r => (
                                            <td key={r.yearMonth} className="py-2.5 px-3 text-right">
                                                ¥{r.totalRevenue.toLocaleString()}{' '}
                                                <span className="text-[10px] text-cyan-400 block">
                                                    ({r.stockRatioPercent}%)
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-400">
                                            ▲ コーチ支払報酬原価（50%〜70%スライド）
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-rose-300"
                                            >
                                                -¥{r.coachCost.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-400">
                                            ▲ 施設貸切費（ヤエスク等）・コーチ交通費
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-rose-300"
                                            >
                                                -¥{r.facilityTransportCost.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-emerald-950/30 font-black text-emerald-300">
                                        <td className="py-2.5 px-3">
                                            売上総利益（粗利額 / Guild Lv判定基準）
                                        </td>
                                        {plRows.map(r => (
                                            <td key={r.yearMonth} className="py-2.5 px-3 text-right">
                                                ¥{r.grossProfit.toLocaleString()}{' '}
                                                <span className="text-[10px] text-emerald-400 block">
                                                    (粗利率 {r.grossMarginPercent}%)
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-400">
                                            ▲ 広告宣伝費（Google広告 + Meta広告）
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-slate-300"
                                            >
                                                -¥{r.adSpendTotal.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-slate-400">
                                            ▲ Stripe決済手数料(3.6%)・システム・保険固定費
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-slate-300"
                                            >
                                                -¥{(r.stripeFee + r.fixedOverheadCost).toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="font-bold text-slate-100 bg-slate-950/40">
                                        <td className="py-2 px-3">営業利益（代表実働抜き利益）</td>
                                        {plRows.map(r => (
                                            <td key={r.yearMonth} className="py-2 px-3 text-right">
                                                ¥{r.operatingProfitBeforeCeo.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-2 px-3 text-indigo-300">
                                            ▲ 代表実働シャドウコスト（稼働h × 時給¥3,500）
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-2 px-3 text-right text-indigo-300"
                                            >
                                                -¥{r.ceoShadowCost.toLocaleString()} ({r.ceoOperatedHours}h)
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="bg-indigo-950/50 font-black text-white text-sm">
                                        <td className="py-3 px-3 text-amber-300">
                                            ★ 代表人件費控除後「実質営業利益」
                                        </td>
                                        {plRows.map(r => (
                                            <td
                                                key={r.yearMonth}
                                                className="py-3 px-3 text-right text-amber-400"
                                            >
                                                ¥{r.realOperatingProfitAfterCeo.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 画面③：顧客カルテ＆ファネル進捗ボード ================= */}
            {activeTab === 'crm_funnel' && (
                <div className="relative z-10 space-y-6">
                    {/* カンバンボード表示 */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                    CRM FUNNEL KANBAN BOARD
                                </span>
                                <h2 className="text-base font-black text-white">
                                    LINE友だち追加〜ステップ配信〜体験確定〜定期サブスク継続カンバン
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                「次ステージへ進める →」でファネル昇格＆LTV自動加算
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
                            {FUNNEL_STAGES.map(stage => {
                                const stageStudents = students.filter(s => s.status === stage)
                                return (
                                    <div
                                        key={stage}
                                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col"
                                    >
                                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                                            <span className="text-xs font-black text-slate-200">
                                                {stage}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-300">
                                                {stageStudents.length}名
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 flex-1">
                                            {stageStudents.map(st => (
                                                <div
                                                    key={st.student_id}
                                                    className="bg-slate-900 border border-slate-800/90 rounded-xl p-3 space-y-2 hover:border-purple-500/50 transition"
                                                >
                                                    <div className="flex items-start justify-between gap-1">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                #{st.student_number} / {st.grade}
                                                            </span>
                                                            <div className="text-xs font-black text-white">
                                                                {st.name}
                                                            </div>
                                                        </div>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300">
                                                            Lv.{st.swim_step_level}
                                                        </span>
                                                    </div>

                                                    <div className="text-[11px] text-slate-400 truncate">
                                                        📍 {st.area_station}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-amber-300 font-bold">
                                                            {st.plan_type}
                                                        </span>
                                                        <span className="text-slate-400">
                                                            LTV ¥{st.cumulative_revenue.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    {stage !== '本契約継続中' && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleAdvanceStudentStage(
                                                                    st.student_id
                                                                )
                                                            }
                                                            className="w-full mt-1 py-1.5 px-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                                        >
                                                            次ステージへ進める
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* スイムステップ（進級カルテ）＆ AIO記事化ステータス一覧 */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                    SWIM STEP & AIO CONTENT GENERATOR
                                </span>
                                <h2 className="text-base font-black text-white">
                                    スイムステップ（Lv.1〜Lv.20進級カルテ）＆ AIO記事化ステータス統合ボード
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400">
                                進級1段階クリアごとにコーチへ +200 EXP 付与
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                                        <th className="py-2.5 px-3 text-left">会員番号・氏名</th>
                                        <th className="py-2.5 px-3 text-left">エリア・プラン</th>
                                        <th className="py-2.5 px-3 text-left">
                                            現在スイムステップ (Lv.1〜20)
                                        </th>
                                        <th className="py-2.5 px-3 text-left">次回レッスンの課題</th>
                                        <th className="py-2.5 px-3 text-right">累計LTV</th>
                                        <th className="py-2.5 px-3 text-center">AIO記事ステータス</th>
                                        <th className="py-2.5 px-3 text-right">進級アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {students.map(st => {
                                        const lvPct = Math.round((st.swim_step_level / 20) * 100)
                                        return (
                                            <tr
                                                key={st.student_id}
                                                className="hover:bg-slate-800/40"
                                            >
                                                <td className="py-3 px-3">
                                                    <div className="font-black text-white">
                                                        {st.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        #{st.student_number} / {st.grade} / 担当:{' '}
                                                        {st.assigned_coach_name}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="text-slate-200 font-semibold">
                                                        {st.area_station}
                                                    </div>
                                                    <div className="text-[10px] text-amber-300">
                                                        {st.plan_type}（{st.acquisition_channel}）
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 min-w-[200px]">
                                                    <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 mb-1">
                                                        <span>{st.swim_step_title}</span>
                                                        <span>{st.swim_step_level}/20</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                                                            style={{ width: `${lvPct}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 max-w-xs text-slate-300">
                                                    {st.next_challenge}
                                                </td>
                                                <td className="py-3 px-3 text-right font-black text-emerald-400">
                                                    ¥{st.cumulative_revenue.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleCycleAioStatus(st.student_id)
                                                        }
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border cursor-pointer ${
                                                            st.aio_status === '公開済(AIO上位)'
                                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                                : st.aio_status === 'AI下書き済'
                                                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}
                                                    >
                                                        {st.aio_status}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleAdvanceSwimStep(st.student_id)
                                                        }
                                                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-black text-[11px] transition cursor-pointer"
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

            {/* ================= 画面④：コーチズ・ギルド（契約コーチ専用ポータル） ================= */}
            {activeTab === 'coaches_guild' && (
                <div className="relative z-10 space-y-6">
                    {/* コーチ切替セレクター ＆ 3行レッスン報告ボタン */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 mr-1">
                                表示中のコーチマイページ：
                            </span>
                            {coaches
                                .filter(c => !c.is_ceo)
                                .map(coach => (
                                    <button
                                        key={coach.coach_id}
                                        type="button"
                                        onClick={() => setSelectedCoachId(coach.coach_id)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-2 ${
                                            selectedCoach.coach_id === coach.coach_id
                                                ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <span>{coach.name}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-300">
                                            {coach.reward_rank} ({coach.current_month_lessons}コマ)
                                        </span>
                                    </button>
                                ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsReportModalOpen(true)}
                            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black text-xs md:text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Send className="w-4 h-4" />
                            3行レッスン報告を送信して EXP＆報酬獲得！
                        </button>
                    </div>

                    {/* コーチマイステータス ＆ リアルタイム・ランクアップゲージ */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex flex-col items-center justify-center text-slate-950 font-black shadow-lg">
                                        <span className="text-[10px] uppercase">COACH</span>
                                        <span className="text-xl leading-none">
                                            Lv.{coachLvProgress.level}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${coachRankImpact.currentRankDef.badgeColor}`}
                                            >
                                                {coachRankImpact.currentRankDef.japaneseTitle}（報酬率
                                                {Math.round(
                                                    coachRankImpact.currentRankDef.rewardRate * 100
                                                )}
                                                %）
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {selectedCoach.coach_type}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black text-white mt-1">
                                            {selectedCoach.name} ステータスボード
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            拠点: {selectedCoach.home_station} / 体験引き上げ率:{' '}
                                            <span className="text-emerald-400 font-bold">
                                                {Math.round(
                                                    selectedCoach.trial_conversion_rate * 100
                                                )}
                                                %
                                            </span>{' '}
                                            / 満足度: ★{selectedCoach.avg_satisfaction}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-right">
                                    <div className="text-[10px] text-slate-400 font-bold">
                                        累計コーチ経験値
                                    </div>
                                    <div className="text-lg font-black text-cyan-400">
                                        {selectedCoach.coach_exp.toLocaleString()} EXP
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        次Lvまで{' '}
                                        {(
                                            coachLvProgress.nextLevelExp - selectedCoach.coach_exp
                                        ).toLocaleString()}{' '}
                                        EXP
                                    </div>
                                </div>
                            </div>

                            {/* リアルタイム・ランクアップゲージ（金額インパクト表示） */}
                            <div className="bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-slate-950 border border-amber-500/50 rounded-2xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-black text-amber-300 flex items-center gap-1.5">
                                        <Flame className="w-4 h-4 text-orange-400" />
                                        スライド報酬ランク進捗（当月完遂:{' '}
                                        {selectedCoach.current_month_lessons}コマ）
                                    </span>
                                    {coachRankImpact.nextRankDef && (
                                        <span className="font-black text-white">
                                            次ランク: {coachRankImpact.nextRankDef.rank} (
                                            {coachRankImpact.nextRankDef.minLessons}コマ〜)
                                        </span>
                                    )}
                                </div>

                                <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${coachRankImpact.rankProgressPercent}%`,
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                                    />
                                </div>

                                <p className="text-xs md:text-sm font-black text-amber-200">
                                    {coachRankImpact.motivationalMessage}
                                </p>

                                {/* 5段階ランク早見バー */}
                                <div className="grid grid-cols-5 gap-1.5 pt-2">
                                    {COACH_RANK_DEFINITIONS.map(r => {
                                        const isCurrent =
                                            r.rank === coachRankImpact.currentRankDef.rank
                                        return (
                                            <div
                                                key={r.rank}
                                                className={`p-2 rounded-lg text-center border ${
                                                    isCurrent
                                                        ? 'bg-amber-500/20 border-amber-400 text-white'
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                                }`}
                                            >
                                                <div className="text-[10px] font-black">
                                                    {r.rank}
                                                </div>
                                                <div className="text-xs font-black text-amber-400">
                                                    {Math.round(r.rewardRate * 100)}%
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                    {r.minLessons}コマ〜
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 今月の確定報酬見込額 vs 希望月収目標 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                                    <div className="text-[11px] text-slate-400 font-bold">
                                        今月の確定報酬見込額
                                    </div>
                                    <div className="text-2xl font-black text-emerald-400 mt-1">
                                        ¥
                                        {coachRankImpact.currentEstimatedMonthlyReward.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">
                                        希望月収目標 ¥
                                        {selectedCoach.target_monthly_income.toLocaleString()} に対する達成率:{' '}
                                        <span className="text-white font-black">
                                            {Math.round(
                                                (coachRankImpact.currentEstimatedMonthlyReward /
                                                    selectedCoach.target_monthly_income) *
                                                    100
                                            )}
                                            %
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                                    <div className="text-[11px] text-slate-400 font-bold">
                                        次ランク昇格時の報酬見込額
                                    </div>
                                    <div className="text-2xl font-black text-amber-400 mt-1">
                                        ¥
                                        {coachRankImpact.nextRankEstimatedMonthlyReward.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-amber-300 mt-1 font-bold">
                                        昇格インパクト: +¥
                                        {coachRankImpact.rankUpBonusIncreaseAmount.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 右: ファストパス・クエストボード（緊急案件受託画面） */}
                        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                                        FAST-PASS QUEST BOARD
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                        1時間以内即決で +50 EXP
                                    </span>
                                </div>
                                <h3 className="text-base font-black text-white">
                                    ⚡ 緊急クエスト（新規体験レッスン受託ボード）
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    対応エリアに合致する新規案件を1タップで即決受託できます。
                                </p>
                            </div>

                            <div className="space-y-3 flex-1">
                                {fastPassQuests.map(fp => {
                                    const isAccepted = Boolean(fp.accepted_by_coach_id)
                                    return (
                                        <div
                                            key={fp.lead_id}
                                            className={`p-3.5 rounded-xl border transition ${
                                                isAccepted
                                                    ? 'bg-emerald-950/30 border-emerald-500/40'
                                                    : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 mr-1.5">
                                                        残り{fp.time_remaining_minutes}分
                                                    </span>
                                                    <span className="text-xs font-black text-white">
                                                        {fp.student_label}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-black text-amber-400 shrink-0">
                                                    報酬 ¥{fp.estimated_reward.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-slate-300 mt-1.5 space-y-0.5">
                                                <div>📍 会場: {fp.pool_facility}</div>
                                                <div>🗓 希望: {fp.preferred_datetime}</div>
                                                <div className="text-cyan-300 font-bold">
                                                    🎁 成約時ボーナス: +{fp.conversion_bonus_exp}{' '}
                                                    EXP ＆ +¥
                                                    {fp.conversion_incentive.toLocaleString()}
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                {isAccepted ? (
                                                    <div className="w-full py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black text-center flex items-center justify-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        受託完了（+1コマ＆+150 EXP獲得済）
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleAcceptFastPassQuest(fp.lead_id)
                                                        }
                                                        className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs hover:brightness-110 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Zap className="w-3.5 h-3.5" />
                                                        1タップでファストパス受託（+
                                                        {fp.fast_pass_exp} EXP）
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 下段: 感謝の宝箱（保護者高評価コレクション） ＆ コーチスキルツリー */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* 感謝の宝箱 */}
                        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-rose-400" />
                                    感謝の宝箱（保護者様からの高評価メッセージ：1件 +300 EXP）
                                </h3>
                                <span className="text-xs font-black text-rose-300">
                                    {selectedCoach.gratitude_chest.length}件 コレクション
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {selectedCoach.gratitude_chest.map(gr => (
                                    <div
                                        key={gr.id}
                                        className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3.5 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                                                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                                                {gr.student_name}
                                            </span>
                                            <span className="text-[11px] font-black text-cyan-400">
                                                +{gr.exp_bonus} EXP ({gr.date})
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-200 leading-relaxed">
                                            「{gr.comment}」
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* スキルツリー */}
                        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <Award className="w-4 h-4 text-cyan-400" />
                                    コーチ・スキルツリー（指導＆成約アビリティ）
                                </h3>
                                <span className="text-xs text-slate-400">
                                    EXP蓄積でスキルLv解放
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {selectedCoach.skills.map(sk => (
                                    <div
                                        key={sk.id}
                                        className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                                {sk.category}
                                            </span>
                                            <span className="text-xs font-black text-amber-400">
                                                Lv.{sk.level} / {sk.max_level}
                                            </span>
                                        </div>
                                        <div className="text-xs font-black text-white">
                                            {sk.name}
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-snug">
                                            {sk.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 3行レッスン報告＆EXP獲得モーダル ================= */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
                        onClick={() => setIsReportModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-lg w-full bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                        3-LINE LESSON REPORT QUEST
                                    </span>
                                    <h3 className="text-lg font-black text-white">
                                        📱 スマホ3行レッスン報告 ＆ EXP獲得
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                                >
                                    閉じる ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmitThreeLineReport} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        対象生徒（テスト検証規定により 0035 テスト太郎様を初期選択）
                                    </label>
                                    <select
                                        value={reportStudentId}
                                        onChange={e => setReportStudentId(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                                    >
                                        {students.map(st => (
                                            <option key={st.student_id} value={st.student_id}>
                                                #{st.student_number} {st.name}（現在:{' '}
                                                {st.swim_step_title}）
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-emerald-300 mb-1">
                                        1行目：今日できたこと・成長ポイント（Good）
                                    </label>
                                    <input
                                        type="text"
                                        value={reportGoodLine}
                                        onChange={e => setReportGoodLine(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-cyan-300 mb-1">
                                        2行目：次回の課題・目標（Next Challenge）
                                    </label>
                                    <input
                                        type="text"
                                        value={reportNextLine}
                                        onChange={e => setReportNextLine(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-amber-300 mb-1">
                                        3行目：保護者様への一言メッセージ
                                    </label>
                                    <input
                                        type="text"
                                        value={reportCommentLine}
                                        onChange={e => setReportCommentLine(e.target.value)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    <label className="flex items-center gap-2 bg-slate-950 border border-cyan-500/40 rounded-xl p-2.5 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={reportSwimStepUp}
                                            onChange={e => setReportSwimStepUp(e.target.checked)}
                                            className="accent-cyan-400"
                                        />
                                        <span className="font-bold text-cyan-300">
                                            スイムステップ1段階クリア (+200 EXP)
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 bg-slate-950 border border-amber-500/40 rounded-xl p-2.5 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={reportTrialConverted}
                                            onChange={e =>
                                                setReportTrialConverted(e.target.checked)
                                            }
                                            className="accent-amber-400"
                                        />
                                        <span className="font-bold text-amber-300">
                                            月4回/25m保証成約 (+500 EXP & +¥3,000)
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black text-sm hover:brightness-110 transition shadow-lg cursor-pointer"
                                >
                                    🪙 報告を送信して EXP＆確定報酬を受け取る！
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
