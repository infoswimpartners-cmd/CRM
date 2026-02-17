import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { calculateHistoricalMonthlyRewards } from '@/lib/reward-system'
import { PayoutDashboard } from '@/components/finance/PayoutDashboard'

export const dynamic = 'force-dynamic'

type PayoutStatus = {
    coach_id: string
    full_name: string
    avatar_url: string
    target_month: string
    total_sales: number
    total_reward: number
    paid_amount: number
    unpaid_amount: number
    pending_amount: number
    status: 'paid' | 'partial' | 'unpaid'
    rate: number
    details: any[]
    payouts: any[]
    baseAmount: number
    consumptionTax: number
    withholdingTax: number
    systemFee: number
    transferFee: number
    finalAmount: number
}

export default async function PayoutsPage({ searchParams }: { searchParams: { month?: string } }) {
    const supabase = await createClient()

    // Default to last month (most common payout scenario)
    const resolvedParams = await searchParams
    const today = new Date()
    const lastMonth = subMonths(today, 1) // default target
    const targetMonthStr = resolvedParams.month || format(lastMonth, 'yyyy-MM')

    // 1. Fetch Coaches
    const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, override_coach_rank')
        .in('role', ['coach', 'admin'])

    // 2. Fetch Lessons needed for calculation (Last 12 months for safety/history)
    // We'll calculate historical for say 12 months back, then filter for the selected month.
    // Optimization: fetching only relevant lessons would be better but reusing logic is safer.
    const twelveMonthsAgo = subMonths(today, 12)
    const { data: allLessons } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            students (membership_types!students_membership_type_id_fkey (id, membership_type_lessons (lesson_master_id, reward_price)))
        `)
        .gte('lesson_date', twelveMonthsAgo.toISOString())

    // 3. Fetch Payouts for this target month
    const { data: payouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('target_month', targetMonthStr)

    // 4. Calculate Status for Each Coach
    const payoutStatuses: PayoutStatus[] = []

    // Cache lessons by coach
    const coachLessonsMap = new Map<string, any[]>()
    allLessons?.forEach(l => {
        const list = coachLessonsMap.get(l.coach_id) || []
        list.push(l)
        coachLessonsMap.set(l.coach_id, list)
    })

    // 3.5 Fetch Tax Settings AND Company Info
    const { data: appConfigs } = await supabase
        .from('app_configs')
        .select('key, value')
        .or('key.like.coach_tax:%,key.in.(company_name,company_address,invoice_registration_number,contact_email,company_payment_bank_name,company_info)')

    const taxMap = new Map<string, boolean>()

    // Initialize with empty object
    let companyInfo: Record<string, string> = {}

    appConfigs?.forEach(c => {
        if (c.key === 'company_info') {
            // Legacy support: if company_info JSON exists, use it as base
            try {
                const legacyInfo = JSON.parse(c.value)
                companyInfo = { ...companyInfo, ...legacyInfo }
            } catch { }
        } else if (['company_name', 'company_address', 'invoice_registration_number', 'contact_email', 'company_payment_bank_name'].includes(c.key)) {
            // Overwrite with individual keys (preferred)
            companyInfo[c.key] = c.value
        } else if (c.key.startsWith('coach_tax:')) {
            const coachId = c.key.replace('coach_tax:', '')
            try {
                const val = JSON.parse(c.value)
                taxMap.set(coachId, val.enabled !== false)
            } catch {
                taxMap.set(coachId, true)
            }
        }
    })

    if (coaches) {
        for (const coach of coaches) {
            const lessons = coachLessonsMap.get(coach.id) || []

            // Calculate History (we only need the specific month but function calculates all)
            // Ideally we'd have a specific function for one month but this works.
            const history = calculateHistoricalMonthlyRewards(coach.id, lessons, 12, undefined, coach.override_coach_rank)

            // Find the target month data
            const targetData = history.find(h => h.month === targetMonthStr)

            const totalReward = targetData?.totalReward || 0
            const totalSales = targetData?.totalSales || 0
            const rate = targetData?.rate || 0
            const details = targetData?.details || []

            // Calculate Final Amount with Tax/Withholding
            const taxEnabled = taxMap.has(coach.id) ? taxMap.get(coach.id) : true // Default true

            // Logic: Total Reward is Tax Inclusive
            const totalTaxIncluded = totalReward

            // 1. Separate Taxable and Non-Taxable
            const nonTaxableAmount = 0
            const taxableAmountIncluded = totalTaxIncluded - nonTaxableAmount

            // 2. Consumption Tax - User Request: Reward Amount = Gross Reward
            // The "baseAmount" displayed in the slip should be the Total Reward (Gross).
            // Taxable Base for Withholding is ALSO the Total Reward (Gross).
            const taxableBase = taxableAmountIncluded // No longer dividing by 1.1
            const consumptionTax = 0 // Not effectively used/displayed separately as "Consumption Tax" if base is gross



            const RATE_WITHHOLDING = 0.1021
            const SYSTEM_FEE_RATE = 0
            const TRANSFER_FEE = 0

            // 3. Withholding Tax (On Taxable Base)
            const withholdingTax = taxEnabled ? Math.floor(taxableBase * RATE_WITHHOLDING) : 0

            const systemFee = Math.floor(totalTaxIncluded * SYSTEM_FEE_RATE)
            const transferFee = totalTaxIncluded > 0 ? TRANSFER_FEE : 0

            const finalAmount = totalTaxIncluded - withholdingTax - systemFee - transferFee

            // Sum payouts
            const coachPayouts = payouts?.filter(p => p.coach_id === coach.id) || []
            const paidAmount = coachPayouts
                .filter(p => p.status === 'paid')
                .reduce((sum, p) => sum + p.amount, 0)
            const pendingAmount = coachPayouts
                .filter(p => p.status === 'pending')
                .reduce((sum, p) => sum + p.amount, 0)

            // Status Logic: Compare Paid Amount with Final Amount (Transfer Target)
            const unpaidAmount = finalAmount - paidAmount

            let status: PayoutStatus['status'] = 'unpaid'
            if (unpaidAmount <= 0 && finalAmount > 0) status = 'paid'
            else if (paidAmount > 0) status = 'partial'
            else if (unpaidAmount > 0 && (unpaidAmount - pendingAmount) <= 0) status = 'partial'
            else if (finalAmount === 0) status = 'paid'

            payoutStatuses.push({
                coach_id: coach.id,
                full_name: coach.full_name,
                avatar_url: coach.avatar_url,
                target_month: targetMonthStr,
                total_sales: totalSales,
                total_reward: finalAmount, // Update to show Transfer Target Amount (or maybe totalReward as base?)
                // User requirement: "Admin reward payment management page also updated"
                // Usually dashboard shows "Payout Amount", so finalAmount is more appropriate.
                // But previously it was totalReward. Let's use finalAmount and maybe rename field or keep as is?
                // Using finalAmount is safer for "Payout" context.
                // To be robust, let's pass all distinct values if PayoutStatus supports it.
                // But PayoutStatus interface only has total_reward.
                // I'll stick to putting finalAmount into total_reward for now, OR add base_reward field.
                // Better to use finalAmount (transfer target) for "total_reward" in Payout Dashboard context.

                paid_amount: paidAmount,
                pending_amount: pendingAmount,
                unpaid_amount: Math.max(0, unpaidAmount),
                status,
                rate,
                details: details.map(d => ({
                    ...d,
                    studentName: d.studentName || ''
                })),
                payouts: coachPayouts,

                // Add extra fields for the dialog which reads from this object?
                // The dashboard likely passes this object to the dialog. 
                // We need to ensure the dialog gets consumptionTax, withholdingTax etc.
                // But PayoutStatus type doesn't have them.
                // I need to update PayoutStatus type definition in page.tsx as well.
                baseAmount: taxableBase,
                consumptionTax,
                withholdingTax,
                systemFee,
                transferFee,
                finalAmount
            })
        }
    }

    // Sort: Unpaid > Partial > Paid
    payoutStatuses.sort((a, b) => {
        const score = (s: string) => s === 'unpaid' ? 3 : s === 'partial' ? 2 : 1
        return score(b.status) - score(a.status)
    })

    return (
        <div className="space-y-8 pb-8 p-8 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">報酬支払管理</h1>
                    <p className="text-gray-500">{targetMonthStr}の報酬状況</p>
                </div>
            </div>

            <div className="flex gap-4 items-center">
                <Link href={`?month=${format(subMonths(new Date(targetMonthStr), 1), 'yyyy-MM')}`}>
                    <Button variant="outline">前月</Button>
                </Link>
                <span className="font-bold text-lg">{targetMonthStr}</span>
                <Link href={`?month=${format(subMonths(new Date(targetMonthStr), -1), 'yyyy-MM')}`}>
                    <Button variant="outline">翌月</Button>
                </Link>
            </div>

            <PayoutDashboard data={payoutStatuses} targetMonth={targetMonthStr} companyInfo={companyInfo} />
        </div>
    )
}
