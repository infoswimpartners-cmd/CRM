
import { SupabaseClient } from '@supabase/supabase-js'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'

// Types for calculation
export interface MonthlyRewardStats {
    month: string
    totalSales: number
    totalReward: number
    baseAmount: number // 税抜
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
const RATE_TAX = 0 // 0.10 -> 0 (Internal Tax)
const RATE_WITHHOLDING = 0.1021
const SYSTEM_FEE_RATE = 0 // 0.05 -> 0
const TRANSFER_FEE = 0 // 220 -> 0

export async function calculateHistoricalPayments(
    supabase: SupabaseClient,
    coachId: string,
    monthsToLookBack: number = 12
): Promise<MonthlyRewardStats[]> {
    // 1. Fetch Profile for created_at and invoice status (if added later)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', coachId)
        .single()

    const coachCreatedAt = profile?.created_at ? new Date(profile.created_at) : null
    // Assuming invoices are registered if not specified, or we can add a flag later.
    // For now, let's assume registered = true for calculation as per request?
    // User request said "numbers are weird".
    // In PaymentDetailDialog: `isInvoiceRegistered ? 10% : 0`
    // Let's assume true for now or fetch from profile if we add that column.
    const isInvoiceRegistered = true

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

    // 2. Fetch Lessons
    const startDate = startOfMonth(subMonths(new Date(), monthsToLookBack + 3)) // +3 for rate calculation buffer

    const { data: allLessons, error } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            students (id, full_name, membership_types!students_membership_type_id_fkey (id, membership_type_lessons (lesson_master_id, reward_price)))
        `)
        .gte('lesson_date', startDate.toISOString())
        .eq('coach_id', coachId)

    if (error) {
        console.error('Error fetching lessons:', error)
        return []
    }

    const history: MonthlyRewardStats[] = []
    const today = new Date()

    for (let i = 0; i < monthsToLookBack; i++) {
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)

        if (coachCreatedAt && monthStart < startOfMonth(coachCreatedAt)) {
            continue
        }

        const monthEnd = endOfMonth(d)
        const monthKey = format(d, 'yyyy-MM') // '2024-02'

        // Display format: '2024年2月分'
        const displayMonth = `${format(d, 'yyyy')}年${format(d, 'M')}月分`

        // Calculate Rate
        const rate = calculateCoachRate(coachId, allLessons || [], d)

        // Filter lessons for this month
        const monthLessons = (allLessons || []).filter(l => {
            const ld = new Date(l.lesson_date)
            return ld >= monthStart && ld <= monthEnd
        })

        if (monthLessons.length === 0 && i > 0) continue // Skip empty past months

        const stats = calculateMonthlyStats(monthLessons, rate)

        // Calculate final amounts
        // Logic: Total Reward is Tax Inclusive
        const totalTaxIncluded = stats.totalReward

        // 1. Separate Taxable and Non-Taxable
        // Currently assuming all rewards are Taxable (Service). 
        // Future: If we have separate travel expenses, separate them here.
        const nonTaxableAmount = 0
        const taxableAmountIncluded = totalTaxIncluded - nonTaxableAmount

        // 2. Extract Consumption Tax (Internal)
        const taxRate = 0.10
        // Base = Inclusive / 1.10
        const taxableBase = isInvoiceRegistered ? Math.floor(taxableAmountIncluded / (1 + taxRate)) : taxableAmountIncluded
        const consumptionTax = taxableAmountIncluded - taxableBase

        // 3. Withholding Tax
        // Calculated on Tax Base (Excluding Consumption Tax)
        const withholdingTax = taxEnabled ? Math.floor(taxableBase * RATE_WITHHOLDING) : 0

        const systemFee = Math.floor(totalTaxIncluded * SYSTEM_FEE_RATE)

        // Only apply transfer fee if there is a payment
        const transferFee = totalTaxIncluded > 0 ? TRANSFER_FEE : 0

        const finalAmount = totalTaxIncluded - withholdingTax - systemFee - transferFee

        // Determine status and date
        // Payment date is usually 25th of next month
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 25)
        const paymentDateStr = format(nextMonth, 'yyyy/MM/dd')

        // Status: if next month 25th has passed, it is paid. Else processing.
        const isPaid = today >= nextMonth || (today.getDate() >= 25 && today.getMonth() === nextMonth.getMonth() && today.getFullYear() === nextMonth.getFullYear())
        const status = isPaid ? 'paid' : 'processing'

        history.push({
            month: displayMonth, // or monthKey if client formats it
            totalSales: stats.totalSales,
            totalReward: stats.totalReward,
            baseAmount: taxableBase, // This is now Taxable Base (Excluding Tax)
            consumptionTax,
            withholdingTax,
            systemFee,
            transferFee,
            finalAmount,
            rate,
            lessonCount: stats.lessonCount,
            details: stats.details,
            status,
            paymentDate: paymentDateStr,
            invoiceRegistered: isInvoiceRegistered
        })
    }

    return history
}

function calculateCoachRate(coachId: string, allLessons: any[], referenceDate: Date): number {
    const rankStart = startOfMonth(subMonths(referenceDate, 3))
    const rankEnd = endOfMonth(subMonths(referenceDate, 1))

    const pastLessons = allLessons.filter(l =>
        new Date(l.lesson_date) >= rankStart &&
        new Date(l.lesson_date) <= rankEnd
    )

    const average = pastLessons.length / 3

    if (average >= 30) return 0.70
    else if (average >= 25) return 0.65
    else if (average >= 20) return 0.60
    else if (average >= 15) return 0.55
    else return 0.50
}

function calculateLessonReward(lesson: any, rate: number): number {
    const master = lesson.lesson_masters
    const membership = lesson.students?.membership_types

    if (!master) return 0

    if (master.is_trial) {
        return 4500
    }

    let basePrice = master.unit_price

    if (membership?.membership_type_lessons) {
        const configs = Array.isArray(membership.membership_type_lessons)
            ? membership.membership_type_lessons
            : [membership.membership_type_lessons]

        const config = configs.find(
            (l: any) => l.lesson_master_id === master.id
        )
        if (config && config.reward_price !== null && config.reward_price !== undefined) {
            basePrice = config.reward_price
        }
    }

    return Math.floor(basePrice * rate)
}

function calculateMonthlyStats(monthLessons: any[], rate: number) {
    let totalSales = 0
    let totalReward = 0
    const details: LessonRewardDetail[] = []

    monthLessons.forEach(l => {
        const price = l.price || 0
        const reward = calculateLessonReward(l, rate)

        totalSales += price
        totalReward += reward
        details.push({
            date: l.lesson_date,
            title: l.lesson_masters?.is_trial ? '体験レッスン' : '通常レッスン',
            studentName: l.students?.full_name || '',
            price: price,
            reward: reward
        })
    })

    return { totalSales, totalReward, lessonCount: monthLessons.length, details }
}
