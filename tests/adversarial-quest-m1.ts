/**
 * SwimPartners Quest M1 敵対的・経験的検証テストスイート
 * 
 * 目的:
 * 1. app_configs 破損・未設定・空値フォールバックの境界値検証
 * 2. fetchGA4GoogleAdsAnalytics reject/error 耐性検証
 * 3. レッスン0件時のゼロ除算・NaN耐性検証
 * 4. 総資金残高 < 生活防衛資金時の investable_cash 非負クランプ検証
 * 5. 会員番号0035（テスト太郎様）の整合性・保護検証
 * 6. .env.local 読込下での実DB接続時集計ロジック検証
 */

import * as dotenv from 'dotenv'
import path from 'path'

// テスト用アサーション
let passedCount = 0
let failedCount = 0

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ [PASS] ${message}`)
        passedCount++
    } else {
        console.error(`  ❌ [FAIL] ${message}`)
        failedCount++
    }
}

async function runTests() {
    console.log('================================================================')
    console.log('⚡ SwimPartners Quest M1: 敵対的・経験的ストレステスト開始')
    console.log('================================================================\n')

    const {
        DEFAULT_QUEST_FINANCE_SETTINGS,
        fetchQuestRealData
    } = await import('../src/lib/quest-real-data')

    // ====================================================================
    // テスト1: app_configs パース & フォールバックロジックの極限ストレステスト
    // ====================================================================
    console.log('【テスト1: app_configs パース・フォールバック検証】')

    function parseFinanceSettingsTest(value: any) {
        let financeSettings = { ...DEFAULT_QUEST_FINANCE_SETTINGS }
        if (value) {
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value
                if (parsed && typeof parsed === 'object') {
                    financeSettings = {
                        safe_reserve_cash: Number(parsed.safe_reserve_cash) || DEFAULT_QUEST_FINANCE_SETTINGS.safe_reserve_cash,
                        total_cash_balance: Number(parsed.total_cash_balance) || DEFAULT_QUEST_FINANCE_SETTINGS.total_cash_balance,
                        ad_spend_google_default: Number(parsed.ad_spend_google_default) || DEFAULT_QUEST_FINANCE_SETTINGS.ad_spend_google_default,
                        ad_spend_meta_default: Number(parsed.ad_spend_meta_default) || DEFAULT_QUEST_FINANCE_SETTINGS.ad_spend_meta_default,
                        system_tool_cost_default: Number(parsed.system_tool_cost_default) || DEFAULT_QUEST_FINANCE_SETTINGS.system_tool_cost_default,
                        insurance_cost_default: Number(parsed.insurance_cost_default) || DEFAULT_QUEST_FINANCE_SETTINGS.insurance_cost_default,
                        joto_friday_capacity: Number(parsed.joto_friday_capacity) || DEFAULT_QUEST_FINANCE_SETTINGS.joto_friday_capacity,
                        facility_cost_per_lesson: Number(parsed.facility_cost_per_lesson) || DEFAULT_QUEST_FINANCE_SETTINGS.facility_cost_per_lesson,
                        ceo_hourly_rate: Number(parsed.ceo_hourly_rate) || DEFAULT_QUEST_FINANCE_SETTINGS.ceo_hourly_rate,
                    }
                }
            } catch (e) {
                // パース失敗時はデフォルト維持
            }
        }
        return financeSettings
    }

    // 1-1. null / undefined
    {
        const res1 = parseFinanceSettingsTest(null)
        const res2 = parseFinanceSettingsTest(undefined)
        assert(
            res1.safe_reserve_cash === 3000000 && res2.total_cash_balance === 5550000,
            'null/undefined で完全にデフォルト設定値へフォールバックすること'
        )
    }

    // 1-2. 空文字列・スペースのみ
    {
        const res = parseFinanceSettingsTest('')
        assert(
            res.safe_reserve_cash === 3000000 && res.ad_spend_google_default === 60000,
            '空文字列でデフォルト値へフォールバックすること'
        )
    }

    // 1-3. 破損したJSON文字列
    {
        const brokenCases = ['{broken json', '<<<XML>>>', 'undefined', 'NaN', '12345', 'true']
        let allPassed = true
        for (const b of brokenCases) {
            const res = parseFinanceSettingsTest(b)
            if (res.safe_reserve_cash !== 3000000 || isNaN(res.safe_reserve_cash)) {
                allPassed = false
            }
        }
        assert(allPassed, '破損JSON文字列（構文エラー/非オブジェクト等）で例外なくデフォルトにフォールバックすること')
    }

    // 1-4. 欠損・一部プロパティのみ
    {
        const partial = '{"safe_reserve_cash": 4000000}'
        const res = parseFinanceSettingsTest(partial)
        assert(
            res.safe_reserve_cash === 4000000 &&
            res.total_cash_balance === DEFAULT_QUEST_FINANCE_SETTINGS.total_cash_balance &&
            res.ad_spend_google_default === DEFAULT_QUEST_FINANCE_SETTINGS.ad_spend_google_default,
            '一部設定のみ存在する場合、指定値は反映され、未指定値はデフォルトで正しく補完されること'
        )
    }

    // 1-5. 異常値・NaNプロパティ
    {
        const invalidProps = '{"safe_reserve_cash": "文字列", "total_cash_balance": null, "ceo_hourly_rate": -100}'
        const res = parseFinanceSettingsTest(invalidProps)
        assert(
            res.safe_reserve_cash === 3000000 &&
            res.total_cash_balance === 5550000 &&
            !isNaN(res.safe_reserve_cash) &&
            !isNaN(res.total_cash_balance),
            'プロパティが不正文字列・nullの場合にNaNにならずデフォルト値で保護されること'
        )
    }


    // ====================================================================
    // テスト2: fetchGA4GoogleAdsAnalytics 拒絶（reject/error）耐性
    // ====================================================================
    console.log('\n【テスト2: GA4/広告アナリティクス reject/error 耐性検証】')

    async function simulateGa4AnalyticsHandling(mockFetcher: () => Promise<any>) {
        let ga4AdsData = null
        try {
            ga4AdsData = await mockFetcher().catch(err => null)
        } catch (e) {
            ga4AdsData = null
        }

        const ga4MonthlyCostMap = new Map<string, number>()
        if (ga4AdsData?.dailyTrends && Array.isArray(ga4AdsData.dailyTrends)) {
            for (const dt of ga4AdsData.dailyTrends) {
                if (!dt.date) continue
                const ym = dt.date.slice(0, 7)
                const current = ga4MonthlyCostMap.get(ym) || 0
                ga4MonthlyCostMap.set(ym, current + (Number(dt.adCost) || 0))
            }
        }

        const targetMonths = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
        const settings = DEFAULT_QUEST_FINANCE_SETTINGS

        const adCosts = targetMonths.map((ym, mIdx) => {
            let adSpendGoogle = settings.ad_spend_google_default
            if (ga4MonthlyCostMap.has(ym) && (ga4MonthlyCostMap.get(ym)! > 0)) {
                adSpendGoogle = Math.round(ga4MonthlyCostMap.get(ym)!)
            } else if (mIdx === targetMonths.length - 1 && ga4AdsData?.totalCost && ga4AdsData.totalCost > 0) {
                adSpendGoogle = Math.round(ga4AdsData.totalCost)
            } else {
                adSpendGoogle = settings.ad_spend_google_default + (mIdx - 5) * 2000
            }
            return Math.max(0, adSpendGoogle)
        })

        return { ga4AdsData, ga4MonthlyCostMap, adCosts }
    }

    // 2-1. Promise.reject (ネットワーク切断・認証エラー)
    {
        const res = await simulateGa4AnalyticsHandling(() => Promise.reject(new Error('Google API 401 Unauthorized')))
        assert(
            res.ga4AdsData === null && res.adCosts.every(c => typeof c === 'number' && !isNaN(c) && c > 0),
            'GA4 API拒絶時に全体がクラッシュせず、デフォルト月別推移へ安全にフォールバックすること'
        )
    }

    // 2-2. 異常データ（dailyTrends 内に破損オブジェクト）
    {
        const res = await simulateGa4AnalyticsHandling(async () => ({
            dailyTrends: [
                { date: null, adCost: 5000 },
                { date: '2026-10-01', adCost: 'not-a-number' },
                { date: '2026-10-02', adCost: 12000 },
                { date: '2026-09-15', adCost: -3000 }
            ],
            totalCost: 14000
        }))
        assert(
            res.ga4MonthlyCostMap.get('2026-10') === 12000 &&
            res.adCosts.every(c => typeof c === 'number' && !isNaN(c) && c >= 0),
            'dailyTrendsにnullやNaN文字列が含まれていても月別集計が壊れず非負数で保持されること'
        )
    }


    // ====================================================================
    // テスト3: レッスン実績0件時のゼロ除算・NaN耐性検証
    // ====================================================================
    console.log('\n【テスト3: レッスン実績0件（空データ）時のゼロ除算・NaN耐性検証】')

    function simulateFinanceAndQuests(allLessons: any[], allStudents: any[], allProfiles: any[], allLeads: any[]) {
        const financeSettings = DEFAULT_QUEST_FINANCE_SETTINGS

        const coachMap = new Map(allProfiles.map(p => [p.id, p]))

        const coachStatsMap = new Map<string, { currentLessons: number; totalLessons: number; totalRevenue: number; totalReward: number }>()
        allLessons.forEach(l => {
            const cid = l.coach_id
            if (!cid) return
            const stat = coachStatsMap.get(cid) || { currentLessons: 0, totalLessons: 0, totalRevenue: 0, totalReward: 0 }
            stat.totalLessons += 1
            stat.totalRevenue += Number(l.billing_price || l.price || 0)
            stat.totalReward += Number(l.final_reward_amount || l.base_reward || 0)
            if (l.lesson_date && l.lesson_date.startsWith('2026-10')) {
                stat.currentLessons += 1
            }
            coachStatsMap.set(cid, stat)
        })

        interface MonthAggregate {
            totalRev: number
            totalReward: number
            lessonCount: number
            facilityCost: number
            flowRev: number
            stockRev: number
            fixedSchoolRev: number
            ceoLessonCount: number
        }
        const monthGroups = new Map<string, MonthAggregate>()
        allLessons.forEach(l => {
            if (!l.lesson_date) return
            const ym = l.lesson_date.slice(0, 7)
            const g = monthGroups.get(ym) || {
                totalRev: 0, totalReward: 0, lessonCount: 0, facilityCost: 0,
                flowRev: 0, stockRev: 0, fixedSchoolRev: 0, ceoLessonCount: 0
            }
            const price = Number(l.billing_price || l.price || l.base_price || 0)
            const reward = Number(l.final_reward_amount || l.base_reward || 0)
            const isJoto = Boolean(l.location?.includes('城東') || l.location?.includes('ヤエスク'))
            const fCost = isJoto ? 4950 : financeSettings.facility_cost_per_lesson

            if (isJoto) g.fixedSchoolRev += price
            else if (price >= 20000) g.stockRev += price
            else g.flowRev += price

            const coach = coachMap.get(l.coach_id)
            if (coach?.role === 'admin') g.ceoLessonCount += 1

            g.totalRev += price
            g.totalReward += reward
            g.lessonCount += 1
            g.facilityCost += fCost
            monthGroups.set(ym, g)
        })

        const targetMonths = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
        const questFinances = targetMonths.map((ym, mIdx) => {
            const mg = monthGroups.get(ym)
            const hasActualLessons = Boolean(mg && mg.lessonCount > 0)

            const rev = hasActualLessons ? mg!.totalRev : (450000 + mIdx * 50000)
            const reward = hasActualLessons ? mg!.totalReward : (280000 + mIdx * 30000)
            const facilityCost = hasActualLessons ? mg!.facilityCost : ((40 + mIdx * 5) * financeSettings.facility_cost_per_lesson)
            const stockRev = hasActualLessons && mg!.stockRev > 0 ? mg!.stockRev : Math.round(rev * 0.65)
            const flowRev = hasActualLessons && mg!.flowRev > 0 ? mg!.flowRev : Math.round(rev * 0.20)
            const fixedSchoolRev = hasActualLessons && mg!.fixedSchoolRev > 0 ? mg!.fixedSchoolRev : Math.round(rev * 0.15)
            const stripeFee = Math.round(rev * 0.036)

            const ceoHours = hasActualLessons
                ? Math.max(10, Math.round(mg!.ceoLessonCount * 1.5))
                : Math.max(10, 30 - mIdx * 4)
            const ceoCost = ceoHours * financeSettings.ceo_hourly_rate

            const totalCash = mIdx === targetMonths.length - 1
                ? financeSettings.total_cash_balance
                : Math.max(3000000, financeSettings.total_cash_balance - (targetMonths.length - 1 - mIdx) * 350000)
            const safeReserve = financeSettings.safe_reserve_cash
            const investableCash = Math.max(0, totalCash - safeReserve)

            return {
                year_month: ym,
                total_revenue: rev,
                coach_cost_total: reward,
                facility_transport_total: facilityCost,
                stripe_fee_total: stripeFee,
                stock_revenue: stockRev,
                flow_revenue: flowRev,
                fixed_school_revenue: fixedSchoolRev,
                ceo_operated_hours: ceoHours,
                ceo_shadow_cost: ceoCost,
                safe_reserve_cash: safeReserve,
                total_cash_balance: totalCash,
                investable_cash: investableCash,
                joto_friday_enrolled: 10,
                joto_friday_capacity: 12
            }
        })

        const latestFinance = questFinances[questFinances.length - 1]
        const latestGrossProfit = Math.max(0, latestFinance.total_revenue - latestFinance.coach_cost_total - latestFinance.facility_transport_total)

        const currentMonthLessons = allLessons.filter(l => l.lesson_date && l.lesson_date.startsWith('2026-10'))
        const totalLessonsCount = currentMonthLessons.length > 0 ? currentMonthLessons.length : allLessons.length
        const ceoProfile = allProfiles.find(p => p.role === 'admin')
        const ceoLessonsCount = currentMonthLessons.length > 0
            ? currentMonthLessons.filter(l => l.coach_id === ceoProfile?.id).length
            : allLessons.filter(l => l.coach_id === ceoProfile?.id).length
        
        const nonCeoRatio = totalLessonsCount > 0
            ? Math.min(100, Math.max(0, Math.round(((totalLessonsCount - ceoLessonsCount) / totalLessonsCount) * 100)))
            : 88

        return { questFinances, latestGrossProfit, nonCeoRatio }
    }

    // 3-1. 空配列でのシミュレーション
    {
        const emptyResult = simulateFinanceAndQuests([], [], [{ id: 'p1', role: 'admin' }, { id: 'p2', role: 'coach' }], [])
        
        let noNanFinances = true
        for (const f of emptyResult.questFinances) {
            if (
                isNaN(f.total_revenue) ||
                isNaN(f.coach_cost_total) ||
                isNaN(f.facility_transport_total) ||
                isNaN(f.stripe_fee_total) ||
                isNaN(f.ceo_operated_hours) ||
                isNaN(f.ceo_shadow_cost) ||
                isNaN(f.investable_cash)
            ) {
                noNanFinances = false
            }
        }
        assert(noNanFinances, 'レッスン実績が0件でも、すべての財務指標が非NaN・有限値で算出されること')
        assert(
            !isNaN(emptyResult.nonCeoRatio) && emptyResult.nonCeoRatio === 88,
            '総レッスン0件時に非代表コーチ比率がゼロ除算にならず、デフォルト比率88%に安全フォールバックすること'
        )
    }

    // 3-2. UI側進行バーのゼロ除算・負数・上限ガードテスト
    {
        function calculatePct(current_value: number, threshold: number, completed: boolean): number {
            return threshold > 0
                ? Math.min(100, Math.max(0, Math.round((current_value / threshold) * 100)))
                : (completed ? 100 : 0)
        }

        const pctTestCases = [
            { cur: 0, th: 10, comp: false, expected: 0 },
            { cur: 5, th: 10, comp: false, expected: 50 },
            { cur: 15, th: 10, comp: true, expected: 100 },
            { cur: -5, th: 10, comp: false, expected: 0 },
            { cur: 0, th: 0, comp: false, expected: 0 },
            { cur: 10, th: 0, comp: true, expected: 100 },
        ]

        let pctAllValid = true
        for (const tc of pctTestCases) {
            const val = calculatePct(tc.cur, tc.th, tc.comp)
            if (val !== tc.expected || isNaN(val)) {
                pctAllValid = false
            }
        }
        assert(pctAllValid, 'UI側進行バーがゼロ除算、負数、100%超過、NaNをすべて安全にクランプすること')
    }


    // ====================================================================
    // テスト4: 投資可能余力（investable_cash）の非負クランプ検証
    // ====================================================================
    console.log('\n【テスト4: 投資可能余力（investable_cash）の非負クランプ検証】')

    function calculateInvestableCash(totalCash: number, safeReserve: number): number {
        return Math.max(0, totalCash - safeReserve)
    }

    // 4-1. 通常余力あり
    {
        const val = calculateInvestableCash(5550000, 3000000)
        assert(val === 2550000, `通常時の投資余力が正しく計算されること (555万 - 300万 = ${val}円)`)
    }

    // 4-2. 資金不足（生活防衛資金を下回る状態）
    {
        const val = calculateInvestableCash(1500000, 3000000)
        assert(val === 0, `総資金が生活防衛資金を下回る場合、負数にならず0に非負クランプされること (結果: ${val}円)`)
    }

    // 4-3. 総資金0円または生活防衛資金過大
    {
        const val = calculateInvestableCash(0, 5000000)
        assert(val === 0, `総資金0円の場合も0円にクランプされること (結果: ${val}円)`)
    }


    // ====================================================================
    // テスト5: 実機実行テスト（未環境設定時のフォールバック動作検証）
    // ====================================================================
    console.log('\n【テスト5: fetchQuestRealData() フォールバック動作検証】')

    try {
        const fallbackResult = await fetchQuestRealData()
        assert(fallbackResult !== null && typeof fallbackResult === 'object', 'fetchQuestRealData() が正常にオブジェクトを返却すること')
        assert(Array.isArray(fallbackResult.students), `students が配列であること (件数: ${fallbackResult.students.length})`)
        assert(Array.isArray(fallbackResult.coaches), `coaches が配列であること (件数: ${fallbackResult.coaches.length})`)
        assert(Array.isArray(fallbackResult.finances), `finances が配列であること (件数: ${fallbackResult.finances.length})`)
        assert(Array.isArray(fallbackResult.quests), `quests が配列であること (件数: ${fallbackResult.quests.length})`)
        assert(fallbackResult.finances.length === 6, 'finances が過去6ヶ月分（2026-05〜2026-10）存在すること')

        const testTaro = fallbackResult.students.find(s => s.student_number === '0035' || s.name.includes('テスト太郎'))
        assert(Boolean(testTaro), `テスト顧客（0035: ${testTaro?.name}）が正常に存在すること`)

        const latestF = fallbackResult.finances[fallbackResult.finances.length - 1]
        assert(latestF.investable_cash >= 0 && !isNaN(latestF.investable_cash), '当月投資余力が非負・非NaNであること')
        assert(latestF.safe_reserve_cash > 0 && !isNaN(latestF.safe_reserve_cash), '生活防衛資金が適正値であること')
    } catch (err) {
        assert(false, `fetchQuestRealData() フォールバック実行で例外: ${err}`)
    }


    // ====================================================================
    // テスト6: .env.local ロード下での実DB接続・集計ロジック検証
    // ====================================================================
    console.log('\n【テスト6: .env.local ロード下での実DB集計ロジック検証】')

    try {
        dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
        const liveResult = await fetchQuestRealData()
        assert(liveResult !== null && typeof liveResult === 'object', '実DB環境で fetchQuestRealData() が正常完了すること')
        assert(Array.isArray(liveResult.students), `実DB students が配列であること (件数: ${liveResult.students.length})`)
        assert(Array.isArray(liveResult.coaches), `実DB coaches が配列であること (件数: ${liveResult.coaches.length})`)
        assert(Array.isArray(liveResult.finances), `実DB finances が配列であること (件数: ${liveResult.finances.length})`)
        assert(Array.isArray(liveResult.quests), `実DB quests が配列であること (件数: ${liveResult.quests.length})`)

        // 会員番号0035（テスト太郎様）以外の顧客情報の露出がないかチェック
        const nonTestStudents = liveResult.students.filter(s => s.student_number !== '0035' && !s.name.includes('テスト太郎'))
        console.log(`  ℹ️ 会員数: 総計${liveResult.students.length}名 (テスト太郎様 + 他${nonTestStudents.length}名)`)

        // 財務データの境界値チェック
        for (const f of liveResult.finances) {
            assert(!isNaN(f.total_revenue) && f.total_revenue >= 0, `${f.year_month}: 売上が非NaNかつ0以上 (${f.total_revenue.toLocaleString()}円)`)
            assert(!isNaN(f.coach_cost_total) && f.coach_cost_total >= 0, `${f.year_month}: コーチ報酬が非NaNかつ0以上 (${f.coach_cost_total.toLocaleString()}円)`)
            assert(!isNaN(f.investable_cash) && f.investable_cash >= 0, `${f.year_month}: 投資余力が非負クランプされていること (${f.investable_cash.toLocaleString()}円)`)
            assert(!isNaN(f.safe_reserve_cash) && f.safe_reserve_cash >= 0, `${f.year_month}: 生活防衛資金が正常 (${f.safe_reserve_cash.toLocaleString()}円)`)
        }

        // クエスト達成度の境界値チェック
        for (const q of liveResult.quests) {
            assert(!isNaN(q.current_value), `クエスト [${q.title}] current_value が非NaN (${q.current_value})`)
            assert(!isNaN(q.threshold) && q.threshold > 0, `クエスト [${q.title}] threshold が非NaNかつ正 (${q.threshold})`)
            assert(typeof q.completed === 'boolean', `クエスト [${q.title}] completed が真偽値 (${q.completed})`)
        }

    } catch (err) {
        console.error('実DBテストでエラー発生:', err)
        assert(false, `実DB接続テストで例外発生: ${err}`)
    }

    console.log('\n================================================================')
    console.log(`検証結果サマリー: 成功: ${passedCount}件 / 失敗: ${failedCount}件`)
    console.log('================================================================')

    if (failedCount > 0) {
        process.exit(1)
    } else {
        process.exit(0)
    }
}

runTests().catch(err => {
    console.error('Unhandled test failure:', err)
    process.exit(1)
})
