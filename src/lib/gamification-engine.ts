// SwimPartners Quest ゲーミフィケーション評価エンジン（lib/gamification-engine.ts）
// 代表（経営ギルド）のLv・EXP・称号算出、および契約コーチのスライド報酬ランク（50%〜70%）・昇格インパクト算出ロジック

import { MonthlyFinance, RewardRank, QuestCoach } from '@/types/quest-erp'

// 報酬ランク定義テーブル（Standard 50% 〜 Platinum 70%）
export interface RankDefinition {
    rank: RewardRank
    japaneseTitle: string
    minLessons: number
    maxLessons: number | null
    rewardRate: number // 0.50 〜 0.70
    badgeColor: string
    accentGradient: string
}

export const COACH_RANK_DEFINITIONS: RankDefinition[] = [
    {
        rank: 'Standard',
        japaneseTitle: '見習い冒険者（Standard）',
        minLessons: 0,
        maxLessons: 14,
        rewardRate: 0.50,
        badgeColor: 'text-slate-300 border-slate-500/40 bg-slate-800/70',
        accentGradient: 'from-slate-500 to-slate-400',
    },
    {
        rank: 'Bronze',
        japaneseTitle: 'ブロンズコーチ（Bronze）',
        minLessons: 15,
        maxLessons: 19,
        rewardRate: 0.55,
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
        accentGradient: 'from-amber-600 to-amber-400',
    },
    {
        rank: 'Silver',
        japaneseTitle: 'シルバーコーチ（Silver）',
        minLessons: 20,
        maxLessons: 24,
        rewardRate: 0.60,
        badgeColor: 'text-cyan-200 border-cyan-400/50 bg-cyan-950/60',
        accentGradient: 'from-cyan-400 to-blue-500',
    },
    {
        rank: 'Gold',
        japaneseTitle: 'ゴールドコーチ（Gold）',
        minLessons: 25,
        maxLessons: 29,
        rewardRate: 0.65,
        badgeColor: 'text-yellow-300 border-yellow-400/60 bg-yellow-950/60',
        accentGradient: 'from-yellow-400 via-amber-400 to-orange-500',
    },
    {
        rank: 'Platinum',
        japaneseTitle: 'プラチナマスター（Platinum）',
        minLessons: 30,
        maxLessons: null,
        rewardRate: 0.70,
        badgeColor: 'text-fuchsia-200 border-fuchsia-400/60 bg-fuchsia-950/60',
        accentGradient: 'from-fuchsia-500 via-purple-500 to-indigo-400',
    },
]

// COACH EXP 獲得定数ルール
export const COACH_EXP_RULES = {
    LESSON_COMPLETED: 100, // 1レッスン完遂: +100 EXP
    FAST_PASS_ACCEPTED: 50, // 1時間以内の即レス受託: +50 EXP
    TRIAL_CONVERTED_STOCK: 500, // 初回体験から月4回または25m完泳保証へ成約: +500 EXP
    SWIM_STEP_CLEARED: 200, // 生徒のスイムステップが1段階クリア: +200 EXP
    PARENT_GRATITUDE: 300, // 保護者からの高評価・感謝コメント獲得: +300 EXP
} as const

// CEO（経営ギルド）EXP 獲得定数ルール
export const GUILD_EXP_RULES = {
    STOCK_REVENUE_PER_1000: 20, // 定期会員・城東小固定スクールの売上 1,000円ごとに +20 EXP
    FLOW_REVENUE_PER_1000: 10, // 単発・都度レッスンの売上 1,000円ごとに +10 EXP
    DELEGATED_GROSS_PROFIT_PER_1000: 30, // 代表以外（契約コーチ）が生んだ粗利 1,000円ごとに +30 EXP
    LTV_CAC_HEALTH_BONUS: 1500, // 月次の LTV ÷ CAC >= 3.0 達成で +1,500 EXP
} as const

/**
 * 必要累計EXP計算式: 1,000 × (Lv ^ 1.5)
 */
export function getRequiredExpForGuildLevel(level: number): number {
    if (level <= 1) return 0
    return Math.floor(1000 * Math.pow(level, 1.5))
}

/**
 * ギルドLvに応じた称号を返す
 * 「月間粗利105万円（年収1,000万円モデル）」を Guild Lv.50（マスターランク）と定義
 */
export function getGuildTitleForLevel(level: number): string {
    if (level >= 50) return 'Lv.50 マスター・オブ・スイムパートナーズ（月粗利105万・年商モデル達成）'
    if (level >= 45) return `Lv.${level} 首都圏アクア帝国のグランドマスター`
    if (level >= 40) return `Lv.${level} 都心タワマン＆固定スクールの覇王`
    if (level >= 30) return `Lv.${level} 八重洲スイムステップの覇者`
    if (level >= 20) return `Lv.${level} 都心パーソナルの統括ギルド長`
    if (level >= 15) return `Lv.${level} 湾岸エリアの開拓者`
    return `Lv.${level} スイムギルドの創設者`
}

export interface GuildExpBreakdown {
    stockExp: number
    flowExp: number
    delegationBonusExp: number
    ltvCacBonusExp: number
    monthlyTotalExp: number
    cumulativeExp: number
    currentLevel: number
    currentTitle: string
    currentLevelStartExp: number
    nextLevelRequiredExp: number
    expToNextLevel: number
    progressPercent: number
    masterRankProgressPercent: number // Lv.50 (月間粗利105万円モデル) への到達度
}

/**
 * 月次財務データ群とLTV/CAC倍率から、代表（経営ギルド）のレベル・EXP・進捗ゲージを算出する
 */
export function calculateGuildStatus(
    finances: MonthlyFinance[],
    currentLtvCacRatio: number
): GuildExpBreakdown {
    const latest = finances[finances.length - 1]

    // 各月の獲得EXPを累計計算
    let cumulativeExp = 42000 // 創業〜5月以前のベース累積EXP
    let latestStockExp = 0
    let latestFlowExp = 0
    let latestDelegationExp = 0
    let latestLtvCacBonus = 0

    finances.forEach((f, idx) => {
        const stockAndFixedRev = f.stock_revenue + f.fixed_school_revenue
        const sExp = Math.floor(stockAndFixedRev / 1000) * GUILD_EXP_RULES.STOCK_REVENUE_PER_1000
        const fExp = Math.floor(f.flow_revenue / 1000) * GUILD_EXP_RULES.FLOW_REVENUE_PER_1000

        // 総粗利 = 売上 - コーチ原価 - 施設交通費
        const grossProfit = f.total_revenue - f.coach_cost_total - f.facility_transport_total
        // 契約コーチ（非代表）による委任比率（代表稼働時間が減るほど委任粗利が増える）
        const delegationRatio = Math.min(0.95, Math.max(0.5, 1 - f.ceo_operated_hours / 80))
        const delegatedGrossProfit = Math.floor(grossProfit * delegationRatio)
        const dExp =
            Math.floor(delegatedGrossProfit / 1000) * GUILD_EXP_RULES.DELEGATED_GROSS_PROFIT_PER_1000

        const ltvBonus = currentLtvCacRatio >= 3.0 ? GUILD_EXP_RULES.LTV_CAC_HEALTH_BONUS : 0

        const monthExp = sExp + fExp + dExp + ltvBonus
        cumulativeExp += monthExp

        if (idx === finances.length - 1) {
            latestStockExp = sExp
            latestFlowExp = fExp
            latestDelegationExp = dExp
            latestLtvCacBonus = ltvBonus
        }
    })

    // 累計EXPから現在レベルを逆算 (1,000 * Lv^1.5 <= cumulativeExp)
    let currentLevel = 1
    while (getRequiredExpForGuildLevel(currentLevel + 1) <= cumulativeExp && currentLevel < 99) {
        currentLevel++
    }

    const currentLevelStartExp = getRequiredExpForGuildLevel(currentLevel)
    const nextLevelRequiredExp = getRequiredExpForGuildLevel(currentLevel + 1)
    const expInCurrentLevel = Math.max(0, cumulativeExp - currentLevelStartExp)
    const levelSpan = Math.max(1, nextLevelRequiredExp - currentLevelStartExp)
    const progressPercent = Math.min(100, Math.round((expInCurrentLevel / levelSpan) * 100))

    // 当月粗利の105万円（Guild Lv.50目標）に対する達成率
    const latestGrossProfit =
        latest.total_revenue - latest.coach_cost_total - latest.facility_transport_total
    const masterRankProgressPercent = Math.min(
        100,
        Math.round((latestGrossProfit / 1050000) * 100)
    )

    return {
        stockExp: latestStockExp,
        flowExp: latestFlowExp,
        delegationBonusExp: latestDelegationExp,
        ltvCacBonusExp: latestLtvCacBonus,
        monthlyTotalExp:
            latestStockExp + latestFlowExp + latestDelegationExp + latestLtvCacBonus,
        cumulativeExp,
        currentLevel,
        currentTitle: getGuildTitleForLevel(currentLevel),
        currentLevelStartExp,
        nextLevelRequiredExp,
        expToNextLevel: Math.max(0, nextLevelRequiredExp - cumulativeExp),
        progressPercent,
        masterRankProgressPercent,
    }
}

/**
 * コーチの当月コマ数から現在の報酬ランク定義を取得する
 */
export function getCoachRankByLessons(lessonCount: number): RankDefinition {
    for (let i = COACH_RANK_DEFINITIONS.length - 1; i >= 0; i--) {
        if (lessonCount >= COACH_RANK_DEFINITIONS[i].minLessons) {
            return COACH_RANK_DEFINITIONS[i]
        }
    }
    return COACH_RANK_DEFINITIONS[0]
}

export interface CoachRankUpImpact {
    currentRankDef: RankDefinition
    nextRankDef: RankDefinition | null
    lessonsRemainingToNextRank: number
    rankProgressPercent: number
    averageLessonUnitRevenue: number
    currentEstimatedMonthlyReward: number
    nextRankEstimatedMonthlyReward: number
    rankUpBonusIncreaseAmount: number // 昇格した瞬間に跳ね上がる報酬増額インパクト（例: +12,000円）
    motivationalMessage: string
}

/**
 * コーチの現在コマ数から、次ランクまでの残りコマ数＆昇格時の金額インパクトをリアルタイム算出する
 */
export function calculateCoachRankUpImpact(
    coach: QuestCoach,
    avgLessonUnitRevenue: number = 9500
): CoachRankUpImpact {
    const lessons = coach.current_month_lessons
    const currentRankDef = getCoachRankByLessons(lessons)

    const currentIdx = COACH_RANK_DEFINITIONS.findIndex(r => r.rank === currentRankDef.rank)
    const nextRankDef =
        currentIdx < COACH_RANK_DEFINITIONS.length - 1
            ? COACH_RANK_DEFINITIONS[currentIdx + 1]
            : null

    const currentEstimatedMonthlyReward = Math.round(
        lessons * avgLessonUnitRevenue * currentRankDef.rewardRate
    )

    if (!nextRankDef) {
        return {
            currentRankDef,
            nextRankDef: null,
            lessonsRemainingToNextRank: 0,
            rankProgressPercent: 100,
            averageLessonUnitRevenue: avgLessonUnitRevenue,
            currentEstimatedMonthlyReward,
            nextRankEstimatedMonthlyReward: currentEstimatedMonthlyReward,
            rankUpBonusIncreaseAmount: 0,
            motivationalMessage:
                '👑 最高峰 Platinumランク（報酬率70%）到達中！1コマごとに最大報酬率が適用されています！',
        }
    }

    const lessonsRemainingToNextRank = Math.max(0, nextRankDef.minLessons - lessons)
    const span = Math.max(1, nextRankDef.minLessons - currentRankDef.minLessons)
    const progressed = Math.max(0, lessons - currentRankDef.minLessons)
    const rankProgressPercent = Math.min(100, Math.round((progressed / span) * 100))

    // 次ランク到達時（nextRankDef.minLessons コマ時点）における「現在レート維持」と「次ランクレート適用」+「追加コマ報酬」の総額インパクト
    const rewardAtNextThresholdWithNewRate = Math.round(
        nextRankDef.minLessons * avgLessonUnitRevenue * nextRankDef.rewardRate
    )
    const rankUpBonusIncreaseAmount = Math.max(
        0,
        rewardAtNextThresholdWithNewRate - currentEstimatedMonthlyReward
    )

    const ratePercent = Math.round(nextRankDef.rewardRate * 100)
    const motivationalMessage = `🔥 ${nextRankDef.rank}ランク（報酬率${ratePercent}%）昇格まで、あと${lessonsRemainingToNextRank}コマ！（昇格すると今月の報酬総額が +${rankUpBonusIncreaseAmount.toLocaleString()}円 アップします！）`

    return {
        currentRankDef,
        nextRankDef,
        lessonsRemainingToNextRank,
        rankProgressPercent,
        averageLessonUnitRevenue: avgLessonUnitRevenue,
        currentEstimatedMonthlyReward,
        nextRankEstimatedMonthlyReward: rewardAtNextThresholdWithNewRate,
        rankUpBonusIncreaseAmount,
        motivationalMessage,
    }
}

/**
 * コーチの累計EXPからコーチLvと次Lvまでの進捗を算出する
 */
export function calculateCoachLevelProgress(coachExp: number): {
    level: number
    currentLevelExp: number
    nextLevelExp: number
    progressPercent: number
} {
    // コーチLv計算式: 500 * (Lv ^ 1.35)
    let level = 1
    const reqForLv = (lv: number) => (lv <= 1 ? 0 : Math.floor(500 * Math.pow(lv, 1.35)))
    while (reqForLv(level + 1) <= coachExp && level < 99) {
        level++
    }
    const startExp = reqForLv(level)
    const nextExp = reqForLv(level + 1)
    const progressPercent = Math.min(
        100,
        Math.round(((coachExp - startExp) / Math.max(1, nextExp - startExp)) * 100)
    )

    return {
        level,
        currentLevelExp: startExp,
        nextLevelExp: nextExp,
        progressPercent,
    }
}
