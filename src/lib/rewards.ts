
import { SupabaseClient } from '@supabase/supabase-js'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'
import { calculateCoachRate, calculateLessonReward, LessonData } from './reward-system'

// Types for calculation
export interface MonthlyRewardStats {
    month: string
    totalSales: number
    totalReward: number
    baseAmount: number // 税付（現在の仕様では総報酬額と同じ）
    consumptionTax: number // 消費税
    withholdingTax: number // 源泉徴収
    systemFee: number // システム手数料
    transferFee: number // 振込手数料
    finalAmount: number // 手取り
    rate: number // 適用レート
    lessonCount: number
    details: LessonRewardDetail[]
    status: 'paid' | 'processing'
    paymentDate: string
    invoiceRegistered: boolean
}

interface LessonRewardDetail {
    date: string
    title: string
    studentName: string
    price: number
    reward: number
}

// Constants
const RATE_WITHHOLDING = 0.1021
const SYSTEM_FEE_RATE = 0
const TRANSFER_FEE = 0

export async function calculateHistoricalPayments(
    supabase: SupabaseClient,
    coachId: string,
    monthsToLookBack: number = 12
): Promise<MonthlyRewardStats[]> {
    // 1. Fetch Profile for created_at, override rank, etc.
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', coachId)
        .single()

    const coachCreatedAt = profile?.created_at ? new Date(profile.created_at) : null
    const overrideRate = profile?.override_coach_rank
    const isInvoiceRegistered = true // デフォルトでインボイス登録ありとして扱う（旧仕様との互換性）

    // 1.5 Fetch Tax Settings
    const { data: taxConfig } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', `coach_tax:${coachId}`)
        .single()

    let taxEnabled = true // Default to true
    if (taxConfig) {
        try {
            const taxInfo = JSON.parse(taxConfig.value)
            if (taxInfo.enabled === false) taxEnabled = false
        } catch { }
    }

    // 2. Fetch Lessons with all necessary fields for correct reward calculation
    const startDate = startOfMonth(subMonths(new Date(), monthsToLookBack + 3))

    const { data: allLessons, error } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            profiles ( distant_reward_fee, role ),
            students (
                id,
                full_name,
                is_two_person_lesson,
                is_default_distant_option,
                membership_types!students_membership_type_id_fkey (
                    id,
                    membership_type_lessons (lesson_master_id, reward_price)
                )
            )
        `)
        .gte('lesson_date', startDate.toISOString())
        .eq('coach_id', coachId)

    if (error) {
        console.error('Error fetching lessons:', error)
        return []
    }

    const { data: payouts } = await supabase
        .from('payouts')
        .select('target_month, status')
        .eq('coach_id', coachId)

    const history: MonthlyRewardStats[] = []
    const today = new Date()

    for (let i = 0; i < monthsToLookBack; i++) {
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)

        if (coachCreatedAt && monthStart < startOfMonth(coachCreatedAt)) {
            continue
        }

        const monthEnd = endOfMonth(d)
        const monthKey = format(d, 'yyyy-MM')
        const displayMonth = `${format(d, 'yyyy')}年${format(d, 'M')}月分`

        // 1. Calculate Rate (Using reward-system.ts logic)
        const rate = calculateCoachRate(coachId, (allLessons as any) as LessonData[] || [], d, overrideRate)

        // 2. Filter lessons for this month
        const monthLessons = (allLessons || []).filter(l => {
            const ld = new Date(l.lesson_date)
            return ld >= monthStart && ld <= monthEnd
        })

        if (monthLessons.length === 0 && i > 0) continue

        // 3. Calculate Stats using correct lesson reward logic
        let totalSales = 0
        let totalReward = 0
        const details: LessonRewardDetail[] = []

        monthLessons.forEach((rawL: any) => {
            // Fix Supabase array-like join result to single objects
            const l = {
                ...rawL,
                lesson_masters: Array.isArray(rawL.lesson_masters) ? rawL.lesson_masters[0] : rawL.lesson_masters,
                students: Array.isArray(rawL.students) ? rawL.students[0] : rawL.students,
                profiles: Array.isArray(rawL.profiles) ? rawL.profiles[0] : rawL.profiles
            }

            // Also ensure membership_types inside students is handled if it's an array
            if (l.students && Array.isArray(l.students.membership_types)) {
                l.students.membership_types = l.students.membership_types[0]
            }

            const price = l.price || 0
            const reward = calculateLessonReward(l, rate)

            let title = l.lesson_masters?.is_trial ? '体験レッスン' : '通常レッスン'
            if (l.lesson_masters && price > l.lesson_masters.unit_price) {
                title += ' (施設利用料込)'
            }
            if (l.students?.is_default_distant_option) {
                title += ' (遠方対応)'
            }

            totalSales += price
            totalReward += reward
            details.push({
                date: l.lesson_date,
                title: title,
                studentName: l.students?.full_name || '',
                price: price,
                reward: reward
            })
        })

        // 4. Tax Calculation (Synced with Admin View)
        const totalTaxIncluded = totalReward
        const nonTaxableAmount = 0
        const taxableAmountIncluded = totalTaxIncluded - nonTaxableAmount

        // Logic Change: Taxable Base is now the full amount (no division by 1.1)
        const taxableBase = taxableAmountIncluded
        const consumptionTax = 0 // Admin view separates this as 0 when using gross as base

        const withholdingTax = taxEnabled ? Math.floor(taxableBase * RATE_WITHHOLDING) : 0
        const systemFee = Math.floor(totalTaxIncluded * SYSTEM_FEE_RATE)
        const transferFee = totalTaxIncluded > 0 ? TRANSFER_FEE : 0

        const finalAmount = totalTaxIncluded - withholdingTax - systemFee - transferFee

        // 5. Payment Date and Status
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 25)
        const paymentDateStr = format(nextMonth, 'yyyy/MM/dd')

        // Fetch actual status from payouts table if it exists
        const payoutRecord = payouts?.find(p => p.target_month === monthKey)
        const status = payoutRecord?.status === 'paid' ? 'paid' : (today >= nextMonth ? 'paid' : 'processing')

        history.push({
            month: displayMonth,
            totalSales,
            totalReward,
            baseAmount: taxableBase,
            consumptionTax,
            withholdingTax,
            systemFee,
            transferFee,
            finalAmount,
            rate,
            lessonCount: monthLessons.length,
            details,
            status: status as 'paid' | 'processing',
            paymentDate: payoutRecord?.status === 'paid' ? paymentDateStr : paymentDateStr, // Keep date as estimated for now
            invoiceRegistered: isInvoiceRegistered
        })
    }

    return history
}
