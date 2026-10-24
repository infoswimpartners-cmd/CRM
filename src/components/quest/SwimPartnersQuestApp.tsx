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
    Settings,
    X,
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
import {
    DEFAULT_QUEST_FINANCE_SETTINGS,
    type QuestFinanceSettings,
} from '@/types/quest-erp'
import type { RealQuestDataResult } from '@/lib/quest-real-data'

/**
 * スイムステップレベル（Lv.1〜20）からスキルランクを算出する（クライアント側ヘルパー）
 */
function getSwimStepRank(level: number): SkillRank {
    if (level >= 20) return 'SSS'
    if (level >= 16) return 'SS'
    if (level >= 13) return 'S'
    if (level >= 11) return 'A'
    if (level >= 8) return 'B'
    if (level >= 5) return 'C'
    return 'D'
}

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

// スキルランクのカラー＆バッジ定義（SchoolHubライトテーマ調和版）
export const RANK_STYLE_MAP: Record<SkillRank, { badge: string; text: string; glow: string }> = {
    SSS: {
        badge: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black border border-amber-300 shadow-sm',
        text: 'text-amber-600 font-black',
        glow: 'border-amber-300 shadow-amber-100',
    },
    SS: {
        badge: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-black border border-fuchsia-300 shadow-sm',
        text: 'text-fuchsia-600 font-black',
        glow: 'border-fuchsia-200 shadow-fuchsia-100',
    },
    S: {
        badge: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black border border-sky-300 shadow-sm',
        text: 'text-sky-600 font-black',
        glow: 'border-sky-200 shadow-sky-100',
    },
    A: {
        badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
        text: 'text-emerald-700 font-bold',
        glow: 'border-emerald-200',
    },
    B: {
        badge: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
        text: 'text-blue-700 font-bold',
        glow: 'border-blue-200',
    },
    C: {
        badge: 'bg-slate-100 text-slate-700 border border-slate-300 font-bold',
        text: 'text-slate-600 font-bold',
        glow: 'border-slate-200',
    },
    D: {
        badge: 'bg-slate-100 text-slate-500 border border-slate-200 font-medium',
        text: 'text-slate-500',
        glow: 'border-slate-200',
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

    // 固定費・財務マスタ設定モーダルの状態
    const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false)
    const [financeForm, setFinanceForm] = useState<QuestFinanceSettings>(DEFAULT_QUEST_FINANCE_SETTINGS)
    const [isSavingSettings, setIsSavingSettings] = useState(false)
    const [settingsSaveStatus, setSettingsSaveStatus] = useState<string | null>(null)

    // 財務マスタ設定をAPIから取得
    const fetchFinanceSettings = async () => {
        try {
            const res = await fetch('/api/quest/settings')
            if (res.ok) {
                const data = await res.json()
                setFinanceForm(prev => ({ ...prev, ...data }))
            }
        } catch (e) {
            console.error('Failed to fetch finance settings:', e)
        }
    }

    // 初回ロード時に財務マスタ設定を取得
    useEffect(() => {
        fetchFinanceSettings()
    }, [])

    // 固定費設定の保存処理
    const handleSaveFinanceSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSavingSettings(true)
        setSettingsSaveStatus(null)
        try {
            const res = await fetch('/api/quest/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(financeForm),
            })
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}))
                throw new Error(errJson.error || '設定の保存に失敗しました')
            }
            setSettingsSaveStatus('設定を保存しました。実DBとP/Lを再集計中...')
            // 実DBと財務計算を即時再同期
            await handleSyncRealDatabase()
            setTimeout(() => {
                setSettingsSaveStatus(null)
                setIsFinanceModalOpen(false)
            }, 1000)
        } catch (err: any) {
            setSettingsSaveStatus(`保存エラー: ${err.message || '通信に失敗しました'}`)
        } finally {
            setIsSavingSettings(false)
        }
    }

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
                    if (result.quests && Array.isArray(result.quests)) {
                        setQuests(result.quests)
                    }
                    setFastPassQuests(result.fastPassQuests)
                    setIsLiveDatabase(true)
                    setRewardCelebration({
                        visible: true,
                        title: '⚡ REAL DATABASE SYNC COMPLETE!',
                        gainedExp: 250,
                        gainedYen: 0,
                        subMessage: `Supabase本番DB（生徒${result.students.length}名、レッスン${result.transactions.length}件、コーチ${result.coaches.length}名、クエスト${result.quests?.length || 0}件）とのリアルタイム同期に成功しました！`,
                    })
                    return
                }
            }
            // フォールバック（API未疎通時の安全なクライアントサイドフォールバック）
            if (initialRealData) {
                setStudents(initialRealData.students)
                setCoaches(initialRealData.coaches)
                setTransactions(initialRealData.transactions)
                setFinances(initialRealData.finances)
                if (initialRealData.quests && Array.isArray(initialRealData.quests)) {
                    setQuests(initialRealData.quests)
                }
                setFastPassQuests(initialRealData.fastPassQuests)
                setIsLiveDatabase(initialRealData.isRealData)
            } else {
                const {
                    INITIAL_QUEST_STUDENTS,
                    INITIAL_QUEST_COACHES,
                    INITIAL_LESSON_TRANSACTIONS,
                    INITIAL_MONTHLY_FINANCES,
                    INITIAL_QUEST_ACHIEVEMENTS,
                    INITIAL_FAST_PASS_QUESTS
                } = await import('@/lib/quest-mock-data')
                setStudents(INITIAL_QUEST_STUDENTS)
                setCoaches(INITIAL_QUEST_COACHES)
                setTransactions(INITIAL_LESSON_TRANSACTIONS)
                setFinances(INITIAL_MONTHLY_FINANCES)
                setQuests(INITIAL_QUEST_ACHIEVEMENTS)
                setFastPassQuests(INITIAL_FAST_PASS_QUESTS)
                setIsLiveDatabase(false)
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
        <div className="min-h-screen bg-slate-50/70 text-slate-900 rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200/90 relative overflow-hidden font-sans">
            {/* ゲーム風グリッド背景（SchoolHubライト調和） */}
            <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                    backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
                    backgroundSize: '36px 36px',
                }}
            />
            <div className="pointer-events-none absolute -top-40 -left-40 w-[450px] h-[450px] bg-amber-200/25 rounded-full blur-[120px]" />
            <div className="pointer-events-none absolute top-1/2 -right-40 w-[450px] h-[450px] bg-sky-200/30 rounded-full blur-[120px]" />

            {/* チャリーン！ セレブレーションモーダル */}
            <AnimatePresence>
                {rewardCelebration?.visible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                        onClick={() => setRewardCelebration(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-md w-full bg-white border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl space-y-4 relative"
                        >
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs tracking-wider shadow-md">
                                ★ QUEST CLEAR & REWARD ★
                            </div>
                            <motion.div
                                initial={{ rotate: -20, scale: 0.5 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 mt-2"
                            >
                                <Coins className="w-11 h-11 text-slate-950" />
                            </motion.div>
                            <h3 className="text-xl font-black text-slate-900">
                                {rewardCelebration.title}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed px-2">
                                {rewardCelebration.subMessage}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3">
                                    <div className="text-[11px] text-sky-800 font-bold">
                                        獲得経験値 (EXP)
                                    </div>
                                    <div className="text-2xl font-black text-sky-600">
                                        +{rewardCelebration.gainedExp.toLocaleString()} EXP
                                    </div>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                                    <div className="text-[11px] text-amber-800 font-bold">
                                        確定報酬・売上
                                    </div>
                                    <div className="text-2xl font-black text-amber-600">
                                        +¥{rewardCelebration.gainedYen.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRewardCelebration(null)}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-sm hover:brightness-105 transition shadow-md cursor-pointer"
                            >
                                ステータス画面へ戻る
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= 1. RPGステータス HUD（最上部固定バー） ================= */}
            <header className="relative z-10 bg-white/95 border border-slate-200/90 rounded-2xl p-4 md:p-5 mb-6 shadow-sm backdrop-blur-md">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* ギルドマスターバッジ */}
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-0.5 shadow-md shadow-amber-200/50">
                                <div className="w-full h-full bg-white rounded-[14px] flex flex-col items-center justify-center">
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    <span className="text-lg font-black text-slate-900 leading-none mt-0.5">
                                        Lv.{guildStatus.currentLevel}
                                    </span>
                                </div>
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-400 text-slate-950 shadow-sm">
                                MASTER
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    <Crown className="w-3.5 h-3.5 text-amber-600" /> 称号：{guildStatus.currentTitle}
                                </span>
                                {isLiveDatabase ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
                                        <Database className="w-3 h-3 text-emerald-600" /> 本番実DB接続中（生徒{students.length}名 / レッスン{transactions.length}件 / コーチ{coaches.length}名）
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSyncRealDatabase}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 transition cursor-pointer"
                                    >
                                        <RefreshCw className="w-3 h-3 text-sky-600" /> 実DB同期を実行
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        fetchFinanceSettings()
                                        setIsFinanceModalOpen(true)
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition cursor-pointer"
                                    title="固定費や保有資金の手動設定・freee連携案内"
                                >
                                    <Settings className="w-3 h-3 text-slate-600" /> 固定費・財務設定
                                </button>
                            </div>
                            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                スイムパートナーズ 経営ギルド司令室
                            </h1>
                            <p className="text-xs text-slate-500">
                                Guild Lv.50 目標（月間粗利105万円モデル）達成度：
                                <span className="text-amber-600 font-black ml-1">
                                    {guildStatus.masterRankProgressPercent}%
                                </span>
                                （当月粗利 ¥{latestPl.grossProfit.toLocaleString()}G / 目標 ¥1,050,000G）
                            </p>
                        </div>
                    </div>

                    {/* RPG HUD ゲージ群（HP, MP, GOLD, EXP） */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 xl:w-[540px]">
                        {/* HPゲージ: 安全防衛資金 vs 総資金 */}
                        <div className="bg-slate-50/80 border border-rose-200/90 rounded-xl p-2.5 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-rose-700 flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-rose-500" /> HP（防衛資金）
                                </span>
                                <span className="text-slate-700">
                                    ¥{(latestPl.totalCashBalance / 10000).toFixed(0)}万
                                </span>
                            </div>
                            <div className="w-full h-2 bg-rose-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                                    style={{
                                        width: `${Math.min(100, Math.round((latestPl.totalCashBalance / 5000000) * 100))}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                                防衛枠: ¥{(latestPl.safeReserveCash / 10000).toFixed(0)}万確保済
                            </div>
                        </div>

                        {/* MPゲージ: 自己資金・投資可能枠 */}
                        <div className="bg-slate-50/80 border border-sky-200/90 rounded-xl p-2.5 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-sky-700 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-sky-500" /> MP（投資余力）
                                </span>
                                <span className="text-slate-700">
                                    ¥{(latestPl.investableCash / 10000).toFixed(0)}万
                                </span>
                            </div>
                            <div className="w-full h-2 bg-sky-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"
                                    style={{
                                        width: `${Math.min(100, Math.round((latestPl.investableCash / 3000000) * 100))}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-sky-700 font-bold truncate">
                                広告・新拠点に投入可能
                            </div>
                        </div>

                        {/* GOLD: 当月粗利 */}
                        <div className="bg-slate-50/80 border border-amber-200/90 rounded-xl p-2.5 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-amber-800 flex items-center gap-1">
                                    <Coins className="w-3 h-3 text-amber-500" /> GOLD（粗利）
                                </span>
                                <span className="text-amber-700 font-black">
                                    ¥{(latestPl.grossProfit / 10000).toFixed(1)}万
                                </span>
                            </div>
                            <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                    style={{
                                        width: `${guildStatus.masterRankProgressPercent}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                                目標 ¥105万 (年収1000万)
                            </div>
                        </div>

                        {/* EXP: 累計ギルド経験値 */}
                        <div className="bg-slate-50/80 border border-purple-200/90 rounded-xl p-2.5 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between text-[10px] font-black">
                                <span className="text-purple-700 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-purple-500" /> EXP
                                </span>
                                <span className="text-purple-700 font-black">
                                    {guildStatus.progressPercent}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                                    style={{ width: `${guildStatus.progressPercent}%` }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                                次Lvまで あと{guildStatus.expToNextLevel.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* メインクエストバナー */}
                {mainCeoQuest && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-700 text-[10px] font-black flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-rose-500" /> MAIN QUEST
                            </span>
                            <span className="text-xs md:text-sm font-black text-slate-900">
                                {mainCeoQuest.title}
                            </span>
                            <span className="text-xs font-black text-amber-700">
                                （現在 {latestFinance.joto_friday_enrolled} / {latestFinance.joto_friday_capacity}名）
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSimulateJotoEnrollment}
                            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs hover:brightness-105 transition shadow-sm cursor-pointer flex items-center gap-1.5"
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
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'command_center'
                            ? 'bg-white border-2 border-sky-500 text-slate-900 shadow-sm ring-2 ring-sky-500/10'
                            : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <Crown className="w-5 h-5 text-sky-600 mb-1" />
                    <div className="text-[10px] font-black uppercase text-sky-600">COMMAND HUD</div>
                    <div className="text-xs md:text-sm font-black">代表コマンドセンター</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('skill_tree')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'skill_tree'
                            ? 'bg-white border-2 border-amber-500 text-slate-900 shadow-sm ring-2 ring-amber-500/10'
                            : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <Trophy className="w-5 h-5 text-amber-500 mb-1" />
                    <div className="text-[10px] font-black uppercase text-amber-600">SKILL RANK TREE</div>
                    <div className="text-xs md:text-sm font-black">分野別スキル格付け</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('finance_simulator')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'finance_simulator'
                            ? 'bg-white border-2 border-emerald-500 text-slate-900 shadow-sm ring-2 ring-emerald-500/10'
                            : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <Calculator className="w-5 h-5 text-emerald-600 mb-1" />
                    <div className="text-[10px] font-black uppercase text-emerald-600">P/L & PAYBACK</div>
                    <div className="text-xs md:text-sm font-black">財務P/L＆投資計算機</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('crm_funnel')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'crm_funnel'
                            ? 'bg-white border-2 border-purple-500 text-slate-900 shadow-sm ring-2 ring-purple-500/10'
                            : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <Layers className="w-5 h-5 text-purple-600 mb-1" />
                    <div className="text-[10px] font-black uppercase text-purple-600">CRM & SWIM STEP</div>
                    <div className="text-xs md:text-sm font-black">顧客＆進級カルテ</div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('coaches_guild')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        activeTab === 'coaches_guild'
                            ? 'bg-white border-2 border-rose-500 text-slate-900 shadow-sm ring-2 ring-rose-500/10'
                            : 'bg-white/90 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <Swords className="w-5 h-5 text-rose-500 mb-1" />
                    <div className="text-[10px] font-black uppercase text-rose-600">COACH PORTAL</div>
                    <div className="text-xs md:text-sm font-black">コーチズ・ギルド</div>
                </button>
            </div>

            {/* ================= 画面①：代表コマンドセンター ================= */}
            {activeTab === 'command_center' && (
                <div className="relative z-10 space-y-6">
                    {/* 財務サマリーカード 4枚 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-200/90 hover:border-sky-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">
                                    ① 当月売上高 ({latestPl.yearMonth})
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
                                    +{revenueMoMPercent}% 前月比
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-slate-900">
                                    ¥{latestPl.totalRevenue.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    粗利益: ¥{latestPl.grossProfit.toLocaleString()}（粗利率 {latestPl.grossMarginPercent}%）
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-100 text-[11px] text-sky-700 font-bold">
                                ストック比率: {latestPl.stockRatioPercent}%
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">
                                    ② 当月実質営業利益
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setDeductCeoShadowCost(p => !p)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-400 transition cursor-pointer"
                                >
                                    {deductCeoShadowCost ? '代表時給¥3,500控除済' : '控除前切替'}
                                </button>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-emerald-600">
                                    ¥
                                    {(deductCeoShadowCost
                                        ? latestPl.realOperatingProfitAfterCeo
                                        : latestPl.operatingProfitBeforeCeo
                                    ).toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    {deductCeoShadowCost
                                        ? `代表実働 ${latestPl.ceoOperatedHours}h (▲¥${latestPl.ceoShadowCost.toLocaleString()}) 控除後`
                                        : `実働抜き営業利益`}
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-100 text-[11px] text-amber-700 font-bold">
                                完全委任ボーナス: +{guildStatus.delegationBonusExp.toLocaleString()} EXP
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/90 hover:border-sky-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">
                                    ③ ユニットエコノミクス
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-300">
                                    ● {unitEco.signalLabel}
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-sky-700">
                                    LTV/CAC {unitEco.ltvCacRatio}x
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    Google CPA: ¥{unitEco.googleCpa.toLocaleString()}（目標¥5,000以下）
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                                平均粗利LTV: ¥{unitEco.averageLtv.toLocaleString()}
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/90 hover:border-amber-300 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">
                                    ④ 自己資金・投資可能余力枠
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    生活防衛枠完備
                                </span>
                            </div>
                            <div className="my-3">
                                <div className="text-2xl md:text-3xl font-black text-amber-600">
                                    ¥{latestPl.investableCash.toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    今月新拠点や広告に投入可能な上限金額
                                </div>
                            </div>
                            <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                                総資金 ¥{latestPl.totalCashBalance.toLocaleString()} - 防衛枠 ¥300万
                            </div>
                        </div>
                    </div>

                    {/* 6角形レーダー ＆ 6大経営スキルカード */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-sky-600 tracking-widest">
                                        HEXAGON COMMAND RADAR
                                    </span>
                                    <h2 className="text-base font-black text-slate-900">
                                        ギルドマスター戦闘力 6軸パラメータ評価
                                    </h2>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-300">
                                    総合評価 Sランク
                                </span>
                            </div>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={sixAxisScores}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis
                                            dataKey="axis"
                                            tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                                        />
                                        <PolarRadiusAxis
                                            angle={30}
                                            domain={[0, 100]}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        />
                                        <Radar
                                            name="経営パラメータ"
                                            dataKey="score"
                                            stroke="#0284c7"
                                            strokeWidth={2.5}
                                            fill="#38bdf8"
                                            fillOpacity={0.25}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderColor: '#cbd5e1',
                                                borderRadius: '12px',
                                                color: '#0f172a',
                                                fontSize: '12px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                                            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-sky-700">
                                                    {item.code}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${rankStyle.badge}`}>
                                                    Rank {item.rank}
                                                </span>
                                            </div>
                                            <div className="text-[11px] font-bold text-slate-800 truncate">
                                                {item.abilityName}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate">
                                                {item.rawValueLabel}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* クエスト＆EXP獲得パネル */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        代表ギルドマスター・進行中クエスト
                                    </h3>
                                    <span className="text-xs font-black text-amber-700">
                                        達成でEXP＆称号解放
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {quests
                                        .filter(q => q.target_role === 'CEO')
                                        .map(quest => {
                                            const pct = quest.threshold > 0
                                                ? Math.min(100, Math.max(0, Math.round((quest.current_value / quest.threshold) * 100)))
                                                : (quest.completed ? 100 : 0)
                                            return (
                                                <div
                                                    key={quest.quest_id}
                                                    className={`p-3.5 rounded-xl border transition-all ${
                                                        quest.completed
                                                            ? 'bg-emerald-50/80 border-emerald-300'
                                                            : 'bg-white border-slate-200/90 shadow-xs hover:border-sky-300'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                                                    quest.completed
                                                                        ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                                                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                                                }`}>
                                                                    {quest.quest_type}
                                                                </span>
                                                                <span className="text-xs font-black text-slate-900">
                                                                    {quest.title}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 mt-1">
                                                                {quest.description}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-black text-amber-600 shrink-0">
                                                            +{quest.reward_exp.toLocaleString()} EXP
                                                        </span>
                                                    </div>
                                                    <div className="mt-2.5 flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    quest.completed
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-sky-500'
                                                                }`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 shrink-0">
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
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                                    GUILD & COACH SKILL RANK EVALUATION
                                </span>
                                <h2 className="text-base font-black text-slate-900">
                                    各分野のスキルランク格付け・アビリティ解放ツリー（SSS 〜 Dランク）
                                </h2>
                            </div>
                            <span className="text-xs text-slate-500">
                                代表の経営パラメータ＆各契約コーチの指導・成約・機動力スキルを全格付け
                            </span>
                        </div>

                        {/* 1. ギルドマスター（代表・経営）の6大スキル */}
                        <div className="space-y-3 mb-6">
                            <h3 className="text-xs font-black uppercase text-amber-700 tracking-wider flex items-center gap-2">
                                <Crown className="w-4 h-4 text-amber-500" />
                                ギルドマスター（代表・経営）6大統括スキル
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sixAxisScores.map(sk => {
                                    const rankStyle = RANK_STYLE_MAP[sk.rank] || RANK_STYLE_MAP.A
                                    return (
                                        <div
                                            key={sk.code}
                                            className="bg-slate-50 border border-slate-200 hover:border-amber-400 rounded-2xl p-4 space-y-2 transition shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-sky-700">
                                                    [{sk.code}] {sk.axis}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs ${rankStyle.badge}`}>
                                                    Rank {sk.rank}
                                                </span>
                                            </div>
                                            <div className="text-sm font-black text-slate-900">
                                                {sk.abilityName}
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                                {sk.description}
                                            </p>
                                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                                                <span className="text-slate-500">現在値: {sk.rawValueLabel}</span>
                                                <span className="text-amber-700 font-bold">{sk.targetLabel}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 2. 契約コーチ陣の個別スキルランク評価 */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase text-sky-700 tracking-wider flex items-center gap-2">
                                <Swords className="w-4 h-4 text-sky-600" />
                                契約コーチ陣 スキル格付け＆特殊クラス
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {coaches.map(c => (
                                    <div
                                        key={c.coach_id}
                                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900">
                                                        {c.name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                                        {c.reward_rank}ランク
                                                    </span>
                                                </div>
                                                <div className="text-xs font-bold text-sky-600 mt-0.5">
                                                    {c.rpg_class}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-500 font-bold">完遂コマ数</div>
                                                <div className="text-base font-black text-slate-900">
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
                                                        className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1 shadow-xs"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-slate-700 truncate">
                                                                {ev.name}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[10px] ${rStyle.badge}`}>
                                                                {ev.rank}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 truncate">
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
                        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                    PAYBACK MAGIC SIMULATOR
                                </span>
                                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-emerald-600" />
                                    自己資金投資ペイバック計算機
                                </h2>
                            </div>

                            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700">① 追加広告費</span>
                                    <span className="font-black text-sky-700">+¥{simAdSpend.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={200000}
                                    step={5000}
                                    value={simAdSpend}
                                    onChange={e => setSimAdSpend(Number(e.target.value))}
                                    className="w-full accent-sky-600 cursor-pointer"
                                />
                            </div>

                            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700">② 新拠点の貸切枠</span>
                                    <span className="font-black text-amber-700">+¥{simPoolRental.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100000}
                                    step={5000}
                                    value={simPoolRental}
                                    onChange={e => setSimPoolRental(Number(e.target.value))}
                                    className="w-full accent-amber-500 cursor-pointer"
                                />
                            </div>

                            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-2">
                                <div className="text-xs font-bold text-emerald-800">投資回収期間判定</div>
                                <div className="text-2xl md:text-3xl font-black text-emerald-950">
                                    {paybackResult.paybackMonths}ヶ月と{paybackResult.paybackDays}日
                                    <span className="text-xs font-bold text-emerald-700 ml-2">
                                        （計{paybackResult.totalPaybackDays}日）で完済！
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 text-center">
                                    <div>
                                        <div className="text-[10px] text-slate-500">見込み本契約</div>
                                        <div className="text-sm font-black text-slate-800">+{paybackResult.expectedNewRegularStudents}名</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500">月間増分粗利</div>
                                        <div className="text-sm font-black text-emerald-700">+¥{paybackResult.monthlyIncrementalGrossProfit.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500">12ヶ月純増利益</div>
                                        <div className="text-sm font-black text-amber-700">+¥{paybackResult.twelveMonthCumulativeNetProfit.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* P/L推移チャート */}
                        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-sky-600 tracking-widest">
                                    P/L FINANCIAL TRAJECTORY
                                </span>
                                <h2 className="text-base font-black text-slate-900 mb-3">
                                    売上構造＆実質営業利益推移（本番データ集計）
                                </h2>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={plRows}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="yearMonth" tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <YAxis tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <RechartsTooltip
                                            formatter={(v: any) => `¥${Number(v).toLocaleString()}`}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderColor: '#cbd5e1',
                                                borderRadius: '12px',
                                                color: '#0f172a',
                                                fontSize: '12px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="stockRevenue" stackId="rev" name="定期サブスク(ストック)" fill="#0ea5e9" />
                                        <Bar dataKey="fixedSchoolRevenue" stackId="rev" name="城東小(固定枠)" fill="#f59e0b" />
                                        <Bar dataKey="flowRevenue" stackId="rev" name="都度・体験(フロー)" fill="#94a3b8" />
                                        <Line type="monotone" dataKey="grossProfit" name="粗利額" stroke="#10b981" strokeWidth={3} />
                                        <Line type="monotone" dataKey="realOperatingProfitAfterCeo" name="実質営業利益" stroke="#8b5cf6" strokeWidth={2.5} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* 当月P/L構造 内訳明細＆マイナス要因の構造分析カード */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <div>
                                <span className="text-[10px] font-black uppercase text-sky-600 tracking-widest">
                                    CURRENT MONTH P/L BREAKDOWN & STRUCTURAL ANALYSIS
                                </span>
                                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-sky-600" />
                                    当月({latestPl.yearMonth}) P/L構造・費用内訳と利益改善シミュレーション
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    fetchFinanceSettings()
                                    setIsFinanceModalOpen(true)
                                }}
                                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-black hover:bg-sky-700 transition shadow-sm cursor-pointer"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                固定費・財務マスタ設定を変更
                            </button>
                        </div>

                        {/* P/L内訳グリッド */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* ① 売上構造 */}
                            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 space-y-2">
                                <div className="text-xs font-black text-sky-900 flex items-center justify-between">
                                    <span>① 売上高合計</span>
                                    <span className="text-base text-sky-950 font-black">¥{latestPl.totalRevenue.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-sky-200 text-xs text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・定期サブスク(ストック):</span>
                                        <span className="font-bold">¥{latestPl.stockRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・城東小金曜固定枠:</span>
                                        <span className="font-bold">¥{latestPl.fixedSchoolRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・都度受講・体験(フロー):</span>
                                        <span className="font-bold">¥{latestPl.flowRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-sky-700 font-bold pt-1">
                                        ストック売上比率: {latestPl.stockRatioPercent}%
                                    </div>
                                </div>
                            </div>

                            {/* ② 売上原価・粗利 */}
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                                <div className="text-xs font-black text-emerald-900 flex items-center justify-between">
                                    <span>② 売上原価 ＆ 粗利益</span>
                                    <span className="text-base text-emerald-950 font-black">粗利 ¥{latestPl.grossProfit.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-emerald-200 text-xs text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・コーチ指導委託費:</span>
                                        <span className="font-bold text-rose-600">¥{latestPl.coachCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・プール施設利用料:</span>
                                        <span className="font-bold text-rose-600">¥{latestPl.facilityTransportCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-emerald-200 font-bold">
                                        <span>原価合計:</span>
                                        <span className="text-rose-700">¥{(latestPl.coachCost + latestPl.facilityTransportCost).toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700 font-bold">
                                        粗利率: {latestPl.grossMarginPercent}%
                                    </div>
                                </div>
                            </div>

                            {/* ③ 販管費・営業利益 */}
                            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-2">
                                <div className="text-xs font-black text-purple-900 flex items-center justify-between">
                                    <span>③ 販管費 ＆ 営業利益</span>
                                    <span className={`text-base font-black ${latestPl.operatingProfitBeforeCeo >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                        {latestPl.operatingProfitBeforeCeo >= 0 ? `+¥${latestPl.operatingProfitBeforeCeo.toLocaleString()}` : `▲¥${Math.abs(latestPl.operatingProfitBeforeCeo).toLocaleString()}`}
                                    </span>
                                </div>
                                <div className="space-y-1.5 pt-2 border-t border-purple-200 text-xs text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 flex items-center gap-1">
                                            ・Google広告費:
                                            <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 text-[9px] rounded font-bold">実測連動</span>
                                        </span>
                                        <span className="font-bold">¥{latestPl.adSpendGoogle.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・Meta広告費:</span>
                                        <span className="font-bold">¥{latestPl.adSpendMeta.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・システム・ツール代:</span>
                                        <span className="font-bold">¥{latestFinance.system_tool_cost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">・指導者賠償保険等:</span>
                                        <span className="font-bold">¥{latestFinance.insurance_cost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-purple-200 font-bold">
                                        <span>販管費合計:</span>
                                        <span className="text-rose-700">¥{(latestPl.adSpendTotal + latestPl.fixedOverheadCost + latestPl.stripeFee).toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-purple-700 font-bold">
                                        実質営業利益(代表時給控除後): {latestPl.realOperatingProfitAfterCeo >= 0 ? `+¥${latestPl.realOperatingProfitAfterCeo.toLocaleString()}` : `▲¥${Math.abs(latestPl.realOperatingProfitAfterCeo).toLocaleString()}`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 営業利益マイナス要因の分析 ＆ 黒字化ブレイクスルーのロードマップ */}
                        <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                当月の営業利益マイナス要因分析 ＆ 最短黒字化ロードマップ
                            </div>
                            <div className="text-xs text-amber-950/90 leading-relaxed space-y-1.5">
                                <p>
                                    <strong>【マイナスの直接原因】</strong> 当月粗利益 <span className="font-bold">¥{latestPl.grossProfit.toLocaleString()}</span> に対し、販売管理費（Google実測広告費 ¥{latestPl.adSpendGoogle.toLocaleString()} ＋ Meta広告費 ¥{latestPl.adSpendMeta.toLocaleString()} ＋ ツール・保険固定費 ¥{latestPl.fixedOverheadCost.toLocaleString()} ＋ 決済手数料 ¥{latestPl.stripeFee.toLocaleString()}）の合計 <span className="font-bold text-rose-700">¥{(latestPl.adSpendTotal + latestPl.fixedOverheadCost + latestPl.stripeFee).toLocaleString()}</span> が上回っているため、代表時給控除前で <span className="font-bold text-rose-700">▲¥{Math.abs(latestPl.operatingProfitBeforeCeo).toLocaleString()}</span>（代表時給控除後 ▲¥{Math.abs(latestPl.realOperatingProfitAfterCeo).toLocaleString()}）となっております。
                                </p>
                                <p>
                                    <strong>【最速の黒字化レバー】</strong> 城東小金曜固定枠（現在 {latestFinance.joto_friday_enrolled}名 / 定員{latestFinance.joto_friday_capacity}名）は追加のコーチ人件費が発生しない高粗利構造です。残り{Math.max(0, latestFinance.joto_friday_capacity - latestFinance.joto_friday_enrolled)}名の空き枠が埋まると <span className="font-bold text-emerald-800">＋¥{(Math.max(0, latestFinance.joto_friday_capacity - latestFinance.joto_friday_enrolled) * 26000).toLocaleString()}/月 の粗利純増</span> となり、営業利益は一気に <span className="font-bold text-emerald-800">大幅黒字</span> へ好転します！
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= 画面④：顧客カルテ＆進級ボード ================= */}
            {activeTab === 'crm_funnel' && (
                <div className="relative z-10 space-y-6">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest">
                                    STUDENTS ADVENTURER RECORD
                                </span>
                                <h2 className="text-base font-black text-slate-900">
                                    生徒冒険者カルテ・スイムステップ進級スキル一覧（全{students.length}名）
                                </h2>
                            </div>
                            <span className="text-xs text-slate-500">
                                実質LTV・進級レベル・AIO記事化ステータス
                            </span>
                        </div>

                        <div className="overflow-x-auto max-h-[550px] border border-slate-200/80 rounded-xl">
                            <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 bg-slate-100/90 text-slate-600 border-b border-slate-200 backdrop-blur-sm">
                                    <tr>
                                        <th className="py-2.5 px-3 text-left">会員番号・氏名</th>
                                        <th className="py-2.5 px-3 text-left">進級スキルランク</th>
                                        <th className="py-2.5 px-3 text-left">エリア・プラン</th>
                                        <th className="py-2.5 px-3 text-right">実質LTV</th>
                                        <th className="py-2.5 px-3 text-center">ステータス</th>
                                        <th className="py-2.5 px-3 text-right">進級アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {students.map(st => {
                                        const rank = st.swim_step_rank || getSwimStepRank(st.swim_step_level)
                                        const rStyle = RANK_STYLE_MAP[rank] || RANK_STYLE_MAP.B
                                        return (
                                            <tr key={st.student_id} className="hover:bg-slate-50/80 transition">
                                                <td className="py-2.5 px-3">
                                                    <div className="font-black text-slate-900">
                                                        {st.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        #{st.student_number} / {st.grade} / 担当: {st.assigned_coach_name}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] ${rStyle.badge} mr-1.5`}>
                                                        {rank}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-slate-800">
                                                        {st.swim_step_title}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <div className="text-slate-800 font-medium">{st.area_station}</div>
                                                    <div className="text-[10px] text-sky-700 font-bold">{st.plan_type}</div>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                                                    ¥{st.cumulative_revenue.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        {st.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdvanceSwimStep(st.student_id)}
                                                        className="px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-700 text-[10px] font-black transition cursor-pointer"
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
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">選択中のコーチ:</span>
                            {coaches
                                .filter(c => !c.is_ceo)
                                .map(c => (
                                    <button
                                        key={c.coach_id}
                                        type="button"
                                        onClick={() => setSelectedCoachId(c.coach_id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                                            selectedCoach.coach_id === c.coach_id
                                                ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {c.name} ({c.reward_rank})
                                    </button>
                                ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReportModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs shadow-sm cursor-pointer flex items-center gap-1.5 hover:brightness-105 transition"
                        >
                            <Send className="w-4 h-4" /> 3行レッスン報告でEXP＆報酬獲得！
                        </button>
                    </div>

                    {/* ステータスカード */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-sky-700">
                                        {selectedCoach.rpg_class}
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        {selectedCoach.name} ステータス
                                    </h2>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300">
                                    {selectedCoach.reward_rank}ランク（報酬率{Math.round(coachRankImpact.currentRankDef.rewardRate * 100)}%）
                                </span>
                            </div>

                            {/* ランクアップカウントダウン */}
                            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-black text-amber-800">
                                        当月完遂: {selectedCoach.current_month_lessons}コマ
                                    </span>
                                    <span className="text-slate-600">
                                        次ランクまで あと {coachRankImpact.lessonsRemainingToNextRank}コマ
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-amber-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                        style={{ width: `${coachRankImpact.rankProgressPercent}%` }}
                                    />
                                </div>
                                <p className="text-xs font-black text-amber-900">
                                    {coachRankImpact.motivationalMessage}
                                </p>
                            </div>
                        </div>

                        {/* 緊急クエスト */}
                        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-rose-500" /> 緊急ファストパス案件
                            </h3>
                            <div className="space-y-2.5">
                                {fastPassQuests.map(fp => (
                                    <div
                                        key={fp.lead_id}
                                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-900">
                                                {fp.student_label}
                                            </span>
                                            <span className="text-xs font-black text-amber-700">
                                                ¥{fp.estimated_reward.toLocaleString()}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleAcceptFastPassQuest(fp.lead_id)}
                                            className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1 hover:brightness-105 transition shadow-xs"
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                        onClick={() => setIsReportModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-md w-full bg-white border-2 border-amber-400 rounded-3xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-base font-black text-slate-900">
                                    📱 スマホ3行報告＆EXP獲得
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleSubmitThreeLineReport} className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        受講生徒（規定により 0035 テスト太郎様を選択可能）
                                    </label>
                                    <select
                                        value={reportStudentId}
                                        onChange={e => setReportStudentId(e.target.value)}
                                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-sky-500"
                                    >
                                        {students.map(s => (
                                            <option key={s.student_id} value={s.student_id}>
                                                #{s.student_number} {s.name} ({s.swim_step_title})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                                        1行目：成長ポイント（Good）
                                    </label>
                                    <input
                                        type="text"
                                        value={reportGoodLine}
                                        onChange={e => setReportGoodLine(e.target.value)}
                                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-sky-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-sky-800 mb-1">
                                        2行目：次回の課題（Next）
                                    </label>
                                    <input
                                        type="text"
                                        value={reportNextLine}
                                        onChange={e => setReportNextLine(e.target.value)}
                                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-sky-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-800 mb-1">
                                        3行目：保護者様へのメッセージ
                                    </label>
                                    <input
                                        type="text"
                                        value={reportCommentLine}
                                        onChange={e => setReportCommentLine(e.target.value)}
                                        className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-sky-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black text-xs hover:brightness-105 transition shadow-sm cursor-pointer"
                                >
                                    🪙 報告を送信して EXP＆報酬を獲得！
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= 固定費・財務マスタ設定モーダル（管理者専用） ================= */}
            <AnimatePresence>
                {isFinanceModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
                        onClick={() => setIsFinanceModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
                        >
                            {/* モーダルヘッダー */}
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">
                                            固定費・財務マスタ設定（管理者専用）
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Google広告費は自動取得中。その他の固定費・資金枠を手動設定できます。
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFinanceModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveFinanceSettings} className="space-y-4">
                                {/* ① 広告宣伝費セクション */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                    <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                                        <span>① 広告宣伝費（当月P/L）</span>
                                        <span className="text-[10px] text-slate-500">Google広告は実測値、Metaは手動</span>
                                    </div>

                                    {/* Google広告（実測・読み取り専用） */}
                                    <div className="bg-white border border-sky-200 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-800">Google広告 実消化額</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                                                    ⚡ GA4実測API連動中
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                GA4/Google広告アカウントより当月消化額を自動取得しています
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-black text-sky-900">
                                                ¥{latestPl.adSpendGoogle.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400">（自動集計値）</div>
                                        </div>
                                    </div>

                                    {/* Meta広告費（手動入力） */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Meta広告費（月額・手動入力）
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0}
                                                step={1000}
                                                value={financeForm.ad_spend_meta_default}
                                                onChange={e => setFinanceForm({ ...financeForm, ad_spend_meta_default: Number(e.target.value) })}
                                                className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500 pl-7"
                                                required
                                            />
                                            <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">¥</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">Instagram・Facebook広告の月間概算消化額</p>
                                    </div>
                                </div>

                                {/* ② 月額固定費・ツール・保険セクション */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                    <div className="text-xs font-black text-slate-900">
                                        ② 月額固定費（販管費・手動設定）
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                システム・ツール代（月額）
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={500}
                                                    value={financeForm.system_tool_cost_default}
                                                    onChange={e => setFinanceForm({ ...financeForm, system_tool_cost_default: Number(e.target.value) })}
                                                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500 pl-7"
                                                    required
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">¥</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">Workspace, Notion, Canva, Supabase等</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                賠償責任保険料（月割換算）
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={500}
                                                    value={financeForm.insurance_cost_default}
                                                    onChange={e => setFinanceForm({ ...financeForm, insurance_cost_default: Number(e.target.value) })}
                                                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500 pl-7"
                                                    required
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">¥</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">水泳指導者・施設損害賠償責任保険</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ③ 資金管理・手元キャッシュセクション */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                    <div className="text-xs font-black text-slate-900">
                                        ③ 手元資金残高 ＆ 生活防衛資金（MP/HPゲージ連動）
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                総保有キャッシュ残高（手元資金）
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={100000}
                                                    value={financeForm.total_cash_balance}
                                                    onChange={e => setFinanceForm({ ...financeForm, total_cash_balance: Number(e.target.value) })}
                                                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500 pl-7"
                                                    required
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">¥</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">銀行口座残高＋現預金合計</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                生活防衛資金（確保枠・不可侵HP）
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={100000}
                                                    value={financeForm.safe_reserve_cash}
                                                    onChange={e => setFinanceForm({ ...financeForm, safe_reserve_cash: Number(e.target.value) })}
                                                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500 pl-7"
                                                    required
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">¥</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">※総資金から防衛枠を引いた額が投資可能MPとなります</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ④ 代表工数＆城東小枠パラメータ */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                    <div className="text-xs font-black text-slate-900">
                                        ④ 経営評価・事業パラメータ設定
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                城東小金曜枠 月間定員数
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={financeForm.joto_friday_capacity}
                                                onChange={e => setFinanceForm({ ...financeForm, joto_friday_capacity: Number(e.target.value) })}
                                                className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500"
                                                required
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">現在定員: 24名（1コマ6名 × 4時間）</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                代表時給換算額（シャドウコスト）
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={500}
                                                    value={financeForm.ceo_hourly_rate}
                                                    onChange={e => setFinanceForm({ ...financeForm, ceo_hourly_rate: Number(e.target.value) })}
                                                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 font-bold focus:outline-sky-500 pl-7"
                                                    required
                                                />
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">¥</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">実質営業利益判定用の代表実働評価単価</p>
                                        </div>
                                    </div>
                                </div>

                                {/* freee 会計システム連携の案内カード */}
                                <div className="bg-sky-50/70 border border-sky-300 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-black text-sky-950">
                                        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                                        会計システム「freee（フリー）」との自動連携について
                                    </div>
                                    <div className="text-xs text-sky-900/90 leading-relaxed space-y-1">
                                        <p>
                                            <strong>Q. freeeとの自動連携は可能ですか？</strong><br />
                                            <strong>A. はい、技術的に完全連携が可能です。</strong>
                                        </p>
                                        <p className="text-[11px] text-slate-700">
                                            freee 会計 API（試算表API / 取引API）を用いることで、freee上で仕訳された「広告宣伝費」「通信費」「支払手数料」「保険料」「消耗品費」などの月次実績額を自動取得し、手動入力なしでこの司令室P/Lへ即時反映させる自動連携モジュールを追加できます。
                                        </p>
                                        <p className="text-[11px] text-sky-800 font-bold">
                                            ※freee連携を導入される場合は、freeeのデベロッパー登録（アプリ作成）とOAuth2認証キーの発行を行うことで即座に本番接続できます。
                                        </p>
                                    </div>
                                </div>

                                {settingsSaveStatus && (
                                    <div className="text-xs font-bold text-center py-2 px-3 rounded-xl bg-slate-100 text-slate-800">
                                        {settingsSaveStatus}
                                    </div>
                                )}

                                {/* ボタン群 */}
                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setIsFinanceModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                                    >
                                        閉じる
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingSettings}
                                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs hover:brightness-105 transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                    >
                                        {isSavingSettings ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                保存中...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                設定を保存してP/Lを再集計
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
