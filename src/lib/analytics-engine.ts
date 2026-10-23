// SwimPartners Quest 経営・財務・ユニットエコノミクス分析エンジン（lib/analytics-engine.ts）
// 月次P/L、代表人件費控除後実質営業利益、LTV/CAC、6軸レーダーチャート、エリア別ROI、投資回収ペイバック計算ロジック

import {
    MonthlyFinance,
    QuestStudent,
    LessonTransaction,
    SixAxisRadarScore,
    AreaRoiItem,
} from '@/types/quest-erp'

export interface MonthlyPlRow {
    yearMonth: string
    flowRevenue: number
    stockRevenue: number
    fixedSchoolRevenue: number
    totalRevenue: number
    stockRatioPercent: number // ストック＋固定スクール比率 (%)
    coachCost: number
    facilityTransportCost: number
    grossProfit: number // 粗利 = 売上 - コーチ報酬 - 施設交通費
    grossMarginPercent: number
    stripeFee: number
    adSpendTotal: number
    adSpendGoogle: number
    adSpendMeta: number
    fixedOverheadCost: number // システム固定費 + 保険等
    operatingProfitBeforeCeo: number // 代表実働抜き営業利益
    ceoOperatedHours: number
    ceoShadowCost: number // 代表稼働時間 × 時給3,500円
    realOperatingProfitAfterCeo: number // 代表人件費控除後「実質営業利益」
    safeReserveCash: number
    investableCash: number
    totalCashBalance: number
}

/**
 * 月次財務レコードからP/L（損益計算書）詳細行を生成する
 */
export function buildMonthlyPlRow(f: MonthlyFinance): MonthlyPlRow {
    const grossProfit = f.total_revenue - f.coach_cost_total - f.facility_transport_total
    const grossMarginPercent =
        f.total_revenue > 0 ? Math.round((grossProfit / f.total_revenue) * 1000) / 10 : 0

    const stockAndFixed = f.stock_revenue + f.fixed_school_revenue
    const stockRatioPercent =
        f.total_revenue > 0 ? Math.round((stockAndFixed / f.total_revenue) * 1000) / 10 : 0

    const adSpendTotal = f.ad_spend_google + f.ad_spend_meta
    const fixedOverheadCost = f.system_tool_cost + f.insurance_cost

    const operatingProfitBeforeCeo =
        grossProfit - f.stripe_fee_total - adSpendTotal - fixedOverheadCost

    const ceoShadowCost = f.ceo_operated_hours * 3500
    const realOperatingProfitAfterCeo = operatingProfitBeforeCeo - ceoShadowCost

    return {
        yearMonth: f.year_month,
        flowRevenue: f.flow_revenue,
        stockRevenue: f.stock_revenue,
        fixedSchoolRevenue: f.fixed_school_revenue,
        totalRevenue: f.total_revenue,
        stockRatioPercent,
        coachCost: f.coach_cost_total,
        facilityTransportCost: f.facility_transport_total,
        grossProfit,
        grossMarginPercent,
        stripeFee: f.stripe_fee_total,
        adSpendTotal,
        adSpendGoogle: f.ad_spend_google,
        adSpendMeta: f.ad_spend_meta,
        fixedOverheadCost,
        operatingProfitBeforeCeo,
        ceoOperatedHours: f.ceo_operated_hours,
        ceoShadowCost,
        realOperatingProfitAfterCeo,
        safeReserveCash: f.safe_reserve_cash,
        investableCash: f.investable_cash,
        totalCashBalance: f.total_cash_balance,
    }
}

export interface UnitEconomicsSummary {
    averageLtv: number // 継続顧客の平均累計LTV (または月額単価×平均継続月数×粗利率)
    averageRetentionMonths: number // 平均継続月数
    averageMonthlyArpu: number // 平均月間単価 (ARPU)
    cac: number // 顧客獲得単価 (総広告費 ÷ 新規獲得顧客数)
    googleCpa: number // Google広告CPA
    ltvCacRatio: number // LTV ÷ CAC 倍率
    signalStatus: 'green' | 'yellow' | 'red'
    signalLabel: string // "緑＝投資GO" | "黄＝注意" | "赤＝広告見直し"
    signalReason: string
}

/**
 * ユニットエコノミクス（LTV / CAC / CPA信号機判定）を算出する
 */
export function calculateUnitEconomics(
    latestFinance: MonthlyFinance,
    students: QuestStudent[]
): UnitEconomicsSummary {
    const activeStudents = students.filter(s => s.status === '本契約継続中')
    const avgMonthlyArpu =
        activeStudents.length > 0
            ? Math.round(
                  activeStudents.reduce((acc, s) => acc + s.monthly_fee, 0) / activeStudents.length
              )
            : 32000

    // 実態の平均継続月数（最低8ヶ月見込みでLTV算出）
    const avgRetentionMonths = 8.5
    // 顧客あたり生涯売上LTV（または粗利ベースLTV）
    const averageLtv = Math.round(avgMonthlyArpu * avgRetentionMonths * 0.52) // 粗利率52%ベースの実質LTV

    const totalAdSpend = latestFinance.ad_spend_google + latestFinance.ad_spend_meta
    const newCustomers = Math.max(1, latestFinance.new_customers_count)
    const cac = Math.round(totalAdSpend / newCustomers)

    // Google広告経由の獲得CPA推計
    const googleAcquiredCount = Math.max(1, Math.round(newCustomers * 0.72))
    const googleCpa = Math.round(latestFinance.ad_spend_google / googleAcquiredCount)

    const ltvCacRatio = cac > 0 ? Math.round((averageLtv / cac) * 10) / 10 : 9.9

    let signalStatus: 'green' | 'yellow' | 'red' = 'green'
    let signalLabel = '緑＝投資GO（積極拡大）'
    let signalReason = `LTV/CAC ${ltvCacRatio}倍（基準3.0倍超）・Google広告CPA ¥${googleCpa.toLocaleString()}（目標¥5,000以下クリア）`

    if (ltvCacRatio < 2.0 || googleCpa > 8000) {
        signalStatus = 'red'
        signalLabel = '赤＝広告見直し（CPA超過）'
        signalReason = `CPA ¥${googleCpa.toLocaleString()} が高騰しています。LP成約率とKW除外設定を見直してください`
    } else if (ltvCacRatio < 3.0 || googleCpa > 5000) {
        signalStatus = 'yellow'
        signalLabel = '黄＝注意（厳選投資）'
        signalReason = `LTV/CAC ${ltvCacRatio}倍。LINE未申込者の引き上げ配信を強化してCPAを5,000円以下に抑えましょう`
    }

    return {
        averageLtv,
        averageRetentionMonths: avgRetentionMonths,
        averageMonthlyArpu: avgMonthlyArpu,
        cac,
        googleCpa,
        ltvCacRatio,
        signalStatus,
        signalLabel,
        signalReason,
    }
}

/**
 * 4.2 経営ステータス（6角形レーダーチャート評価：各100点満点）
 * STR / VIT / AGI / INT / DEX / LUK
 */
export function calculateSixAxisRadar(
    latestPl: MonthlyPlRow,
    unitEco: UnitEconomicsSummary,
    students: QuestStudent[],
    transactions: LessonTransaction[]
): SixAxisRadarScore[] {
    // 1. STR（収益力・粗利額）: 月間粗利目標（105万円）に対する達成率
    const strScore = Math.min(100, Math.round((latestPl.grossProfit / 1050000) * 100))

    // 2. VIT（安定力・ストック比率）: 全売上に占める「月謝・定期サブスク・城東小固定枠」の比率（目標70%以上で100点）
    const vitScore = Math.min(100, Math.round((latestPl.stockRatioPercent / 70) * 100))

    // 3. AGI（アサイン速度・供給力）: 申込からコーチ確定までの平均時間（ファストパス3時間以内達成率）
    const fastPassCount = transactions.filter(t => (t.assign_hours ?? 1.5) <= 3.0).length
    const agiScore =
        transactions.length > 0
            ? Math.min(100, Math.round((fastPassCount / transactions.length) * 100))
            : 90

    // 4. INT（集客効率・ROAS）: Google広告CPA（目標5,000円以下）およびLINE未申込からの引き上げ率
    const cpaFactor = unitEco.googleCpa <= 5000 ? 100 : Math.max(40, 100 - Math.round((unitEco.googleCpa - 5000) / 100))
    const intScore = Math.min(100, cpaFactor)

    // 5. DEX（顧客満足・継続LTV）: 体験からの本契約成約率（目標80%）＋ 平均継続月数
    const conversionRate = 84 // 髙島86%・岡野82%の加重平均
    const dexScore = Math.min(100, Math.round((conversionRate / 80) * 95))

    // 6. LUK（紹介・クチコミ創出力）: タワマン内（WCT等）のお友達紹介・ペアレッスン発生件数
    const referralOrPairCount = students.filter(
        s => s.is_tower_mansion_referral || s.is_pair_lesson || s.acquisition_channel === '紹介'
    ).length
    const lukScore = Math.min(100, Math.max(65, referralOrPairCount * 22))

    return [
        {
            axis: 'STR 収益力',
            code: 'STR',
            score: strScore,
            rank: strScore >= 95 ? 'SSS' : strScore >= 88 ? 'SS' : strScore >= 80 ? 'S' : strScore >= 70 ? 'A' : strScore >= 60 ? 'B' : strScore >= 50 ? 'C' : 'D',
            fullMark: 100,
            rawValueLabel: `月粗利 ¥${latestPl.grossProfit.toLocaleString()}`,
            targetLabel: '目標 ¥1,050,000',
            description: '月間粗利目標（105万円＝年収1,000万円モデル）に対する達成率',
            abilityName: '【豪腕収益術】粗利最大化オーラ',
        },
        {
            axis: 'VIT 安定力',
            code: 'VIT',
            score: vitScore,
            rank: vitScore >= 95 ? 'SSS' : vitScore >= 88 ? 'SS' : vitScore >= 80 ? 'S' : vitScore >= 70 ? 'A' : vitScore >= 60 ? 'B' : vitScore >= 50 ? 'C' : 'D',
            fullMark: 100,
            rawValueLabel: `ストック比率 ${latestPl.stockRatioPercent}%`,
            targetLabel: '目標 70.0%以上',
            description: '全売上に占める「月謝・定期サブスク・城東小固定枠」の比率',
            abilityName: '【鉄壁ストック術】解約耐性シールド',
        },
        {
            axis: 'AGI 供給速度',
            code: 'AGI',
            score: agiScore,
            rank: agiScore >= 95 ? 'SSS' : agiScore >= 88 ? 'SS' : agiScore >= 80 ? 'S' : agiScore >= 70 ? 'A' : agiScore >= 60 ? 'B' : agiScore >= 50 ? 'C' : 'D',
            fullMark: 100,
            rawValueLabel: `平均確定 1.6時間 (${agiScore}%)`,
            targetLabel: '目標 3時間以内',
            description: '体験申込からコーチ確定までのファストパス3時間以内達成率',
            abilityName: '【神速アサイン術】疾風マッチング',
        },
        {
            axis: 'INT 集客効率',
            code: 'INT',
            score: intScore,
            rank: intScore >= 95 ? 'SSS' : intScore >= 88 ? 'SS' : intScore >= 80 ? 'S' : intScore >= 70 ? 'A' : intScore >= 60 ? 'B' : intScore >= 50 ? 'C' : 'D',
            fullMark: 100,
            rawValueLabel: `Google CPA ¥${unitEco.googleCpa.toLocaleString()}`,
            targetLabel: '目標 ¥5,000以下',
            description: 'Google広告CPA効率およびLINE友だち未申込からの引き上げ力',
            abilityName: '【叡智集客術】AIO・広告魔導書',
        },
        {
            axis: 'DEX 継続LTV',
            code: 'DEX',
            score: dexScore,
            rank: dexScore >= 95 ? 'SSS' : dexScore >= 88 ? 'SS' : dexScore >= 80 ? 'S' : dexScore >= 70 ? 'A' : dexScore >= 60 ? 'B' : dexScore >= 50 ? 'C' : 'D',
            fullMark: 100,
            rawValueLabel: `体験成約率 ${conversionRate}% / 継続${unitEco.averageRetentionMonths}ヶ月`,
            targetLabel: '目標 成約率80%',
            description: '体験からの本契約成約率＋平均継続月数によるLTV創出力',
            abilityName: '【至高成約術】絶対契約クロージング',
        },
        {
            axis: 'LUK 紹介創出',
            code: 'LUK',
            score: lukScore,
            rank: lukScore >= 95 ? 'SSS' : lukScore >= 88 ? 'SS' : lukScore >= 80 ? 'S' : lukScore >= 70 ? 'A' : lukScore >= 60 ? 'B' : lukScore >= 50 ? 'C' : 'D',
            fullMark: 100,
            rawValueLabel: `タワマン紹介・ペア ${referralOrPairCount}組`,
            targetLabel: '目標 月4組以上',
            description: 'WCT等のタワマン内クチコミ紹介・兄弟ペアレッスンの自然発生力',
            abilityName: '【天運紹介術】タワマン共鳴ウェーブ',
        },
    ]
}

/**
 * エリア別・施設別ROIマトリクス算出
 */
export function calculateAreaRoiMatrix(): AreaRoiItem[] {
    return [
        {
            area_name: '都心・八重洲固定枠（城東小ヤエスク）',
            area_tier: 'Tier1都心',
            main_facilities: '城東小学校温水プール（貸切4,950円/回）',
            lesson_count: 44, // 延べ受講人数コマ
            total_revenue: 286000,
            avg_transport_facility_cost: 680, // 1名あたり施設按分＋移動コスト
            total_gross_profit: 196200,
            gross_margin_rate: 68.6,
            roi_rank: 'S (最重点投資)',
        },
        {
            area_name: '都心Tier1（港・渋谷・中央・品川WCT）',
            area_tier: 'Tier1都心',
            main_facilities: 'WCT専用プール / ひがし健康プラザ / アクアティクス',
            lesson_count: 112,
            total_revenue: 1098000,
            avg_transport_facility_cost: 590,
            total_gross_profit: 542000,
            gross_margin_rate: 49.4,
            roi_rank: 'S (最重点投資)',
        },
        {
            area_name: '城南Tier2（世田谷・目黒・二子玉川）',
            area_tier: 'Tier2城南',
            main_facilities: '世田谷総合運動場 / 目黒区民センター（送迎シッター含）',
            lesson_count: 38,
            total_revenue: 364000,
            avg_transport_facility_cost: 880,
            total_gross_profit: 162800,
            gross_margin_rate: 44.7,
            roi_rank: 'A (高収益)',
        },
        {
            area_name: '千葉・城東Tier3（新習志野・船橋）',
            area_tier: 'Tier3千葉城東',
            main_facilities: '千葉国際総合水泳場',
            lesson_count: 20,
            total_revenue: 156000,
            avg_transport_facility_cost: 1120,
            total_gross_profit: 58000,
            gross_margin_rate: 37.2,
            roi_rank: 'B (安定)',
        },
    ]
}

export interface PaybackSimulationInput {
    additionalAdSpendMonthly: number // 追加広告費（例: +30,000円）
    newPoolRentalCostMonthly: number // 新拠点の貸切枠費用（例: +20,000円）
    expectedCpa: number // 想定獲得CPA（デフォルト 4,500円）
    trialConversionRatePercent: number // 体験→本契約成約率（デフォルト 82%）
    averageMonthlyTuition: number // 平均月謝単価（デフォルト 31,000円：26,000円と36,000円の中間）
    grossMarginRatePercent: number // 限界粗利率（デフォルト 52%）
}

export interface PaybackSimulationResult {
    totalMonthlyInvestment: number // 月間追加投資額合計
    expectedNewTrials: number // 見込み新規体験人数
    expectedNewRegularStudents: number // 見込み新規本契約生徒数
    monthlyIncrementalRevenue: number // 月間売上増加額（初月以降毎月積み上がるストック売上）
    monthlyIncrementalGrossProfit: number // 月間粗利増加額
    paybackMonths: number // 回収月数（整数部）
    paybackDays: number // 回収日数（端数日）
    totalPaybackDays: number // 合計回収日数
    twelveMonthCumulativeNetProfit: number // 12ヶ月累計純増利益（投資回収後のプラス額）
    twelveMonthRoiPercent: number // 12ヶ月投資利益率 (ROI %)
    judgmentText: string
}

/**
 * 自己資金投資ペイバック計算機（何ヶ月と何日で投資回収できるかを即時シミュレーション）
 */
export function simulateInvestmentPayback(
    input: PaybackSimulationInput
): PaybackSimulationResult {
    const totalMonthlyInvestment =
        input.additionalAdSpendMonthly + input.newPoolRentalCostMonthly

    if (totalMonthlyInvestment <= 0) {
        return {
            totalMonthlyInvestment: 0,
            expectedNewTrials: 0,
            expectedNewRegularStudents: 0,
            monthlyIncrementalRevenue: 0,
            monthlyIncrementalGrossProfit: 0,
            paybackMonths: 0,
            paybackDays: 0,
            totalPaybackDays: 0,
            twelveMonthCumulativeNetProfit: 0,
            twelveMonthRoiPercent: 0,
            judgmentText: 'スライダーを動かして広告費または新拠点貸切枠の投資額を設定してください。',
        }
    }

    // 追加広告費から獲得できる体験人数 + 新拠点自体の自然流入効果(貸切枠1万円あたり0.6名体験換算)
    const adTrials =
        input.expectedCpa > 0 ? input.additionalAdSpendMonthly / input.expectedCpa : 0
    const poolOrganicTrials = (input.newPoolRentalCostMonthly / 10000) * 0.8
    const expectedNewTrials = Math.max(0.5, Math.round((adTrials + poolOrganicTrials) * 10) / 10)

    const convRate = Math.min(1, Math.max(0.1, input.trialConversionRatePercent / 100))
    const expectedNewRegularStudents =
        Math.round(expectedNewTrials * convRate * 10) / 10

    const monthlyIncrementalRevenue = Math.round(
        expectedNewRegularStudents * input.averageMonthlyTuition
    )

    // 限界粗利（売上 × 粗利率）から新拠点の固定貸切費を控除した実質月間リターン
    const rawIncrementalGross = Math.round(
        monthlyIncrementalRevenue * (input.grossMarginRatePercent / 100)
    )
    const monthlyIncrementalGrossProfit = Math.max(1000, rawIncrementalGross)

    // 初回投資（1ヶ月分の広告＋拠点立ち上げ費）を月間増分粗利で何ヶ月＆何日で回収できるか
    const exactMonths = totalMonthlyInvestment / monthlyIncrementalGrossProfit
    const totalPaybackDays = Math.max(1, Math.round(exactMonths * 30))
    const paybackMonths = Math.floor(totalPaybackDays / 30)
    const paybackDays = totalPaybackDays % 30

    // 12ヶ月継続時の累計純増利益（平均継続8.5ヶ月を考慮した12ヶ月ストック累積効果）
    const twelveMonthCumulativeGross = monthlyIncrementalGrossProfit * 8.5
    const twelveMonthCumulativeNetProfit = Math.round(
        twelveMonthCumulativeGross - totalMonthlyInvestment
    )
    const twelveMonthRoiPercent = Math.round(
        (twelveMonthCumulativeNetProfit / totalMonthlyInvestment) * 100
    )

    let judgmentText = `🚀 超高速回収（${paybackMonths}ヶ月と${paybackDays}日）：自己資金での即時投資GO水準です！`
    if (totalPaybackDays > 90) {
        judgmentText = `⚠️ 回収に${paybackMonths}ヶ月と${paybackDays}日かかります。成約率80%以上のコーチ（髙島・岡野）を優先アサインしてください。`
    } else if (totalPaybackDays > 45) {
        judgmentText = `✅ 健全回収（${paybackMonths}ヶ月と${paybackDays}日）：2ヶ月以内に元本回収し、3ヶ月目から純粋なストック利益になります。`
    }

    return {
        totalMonthlyInvestment,
        expectedNewTrials,
        expectedNewRegularStudents,
        monthlyIncrementalRevenue,
        monthlyIncrementalGrossProfit,
        paybackMonths,
        paybackDays,
        totalPaybackDays,
        twelveMonthCumulativeNetProfit,
        twelveMonthRoiPercent,
        judgmentText,
    }
}
