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
}

export default async function PayoutsPage({ searchParams }: { searchParams: { month?: string } }) {
    const supabase = await createClient()

    // Default to last month (most common payout scenario)
    const today = new Date()
    const lastMonth = subMonths(today, 1) // default target
    const targetMonthStr = searchParams.month || format(lastMonth, 'yyyy-MM')

    // 1. Fetch Coaches
    const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('role', 'coach')

    // 2. Fetch Lessons needed for calculation (Last 12 months for safety/history)
    // We'll calculate historical for say 12 months back, then filter for the selected month.
    // Optimization: fetching only relevant lessons would be better but reusing logic is safer.
    const twelveMonthsAgo = subMonths(today, 12)
    const { data: allLessons } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            students (membership_types (id, membership_type_lessons (lesson_master_id, reward_price)))
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

    if (coaches) {
        for (const coach of coaches) {
            const lessons = coachLessonsMap.get(coach.id) || []

            // Calculate History (we only need the specific month but function calculates all)
            // Ideally we'd have a specific function for one month but this works.
            const history = calculateHistoricalMonthlyRewards(coach.id, lessons, 12)

            // Find the target month data
            const targetData = history.find(h => h.month === targetMonthStr)

            const totalReward = targetData?.totalReward || 0
            const totalSales = targetData?.totalSales || 0
            const rate = targetData?.rate || 0
            const details = targetData?.details || []

            // Sum payouts
            const coachPayouts = payouts?.filter(p => p.coach_id === coach.id) || []
            const paidAmount = coachPayouts
                .filter(p => p.status === 'paid')
                .reduce((sum, p) => sum + p.amount, 0)
            const pendingAmount = coachPayouts
                .filter(p => p.status === 'pending')
                .reduce((sum, p) => sum + p.amount, 0)

            const unpaidAmount = totalReward - paidAmount
            let status: PayoutStatus['status'] = 'unpaid'
            // Logic: Unpaid > 0 but Unpaid - Pending <= 0 -> Processing
            // Actually, simply:
            if (unpaidAmount <= 0 && totalReward > 0) status = 'paid'
            else if (paidAmount > 0) status = 'partial'
            else if (unpaidAmount > 0 && (unpaidAmount - pendingAmount) <= 0) status = 'partial' // Or distinct 'processing'? 
            // Let's stick to existing types 'paid' | 'partial' | 'unpaid' for now, but maybe pass 'pending_amount' to dashboard to visualize.
            // If pending covers the rest, maybe we call it 'partial' but show a blue badge in dashboard.
            else if (totalReward === 0) status = 'paid'

            payoutStatuses.push({
                coach_id: coach.id,
                full_name: coach.full_name,
                avatar_url: coach.avatar_url,
                target_month: targetMonthStr,
                total_sales: totalSales,
                total_reward: totalReward,
                paid_amount: paidAmount,
                pending_amount: pendingAmount, // New
                unpaid_amount: Math.max(0, unpaidAmount),
                status,
                rate,
                details,
                payouts: coachPayouts // Pass raw payouts for history
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

            <PayoutDashboard data={payoutStatuses} targetMonth={targetMonthStr} />
        </div>
    )
}
