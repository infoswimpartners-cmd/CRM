import { EarningsSummary } from "@/components/finance/EarningsSummary"
import { PaymentHistory } from "@/components/finance/PaymentHistory"
import { DollarSign } from "lucide-react"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns'
import { calculateCoachRate, calculateMonthlyStats } from '@/lib/reward-system'
import { MonthlyFinancialsWidget } from '@/components/coach/MonthlyFinancialsWidget'

export default async function FinancePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    // Fetch Data
    const today = new Date()
    const nineMonthsAgo = startOfMonth(subMonths(today, 9))

    const { data: allLessons } = await supabase
        .from('lessons')
        .select(`
            *,
            lesson_masters ( is_trial, unit_price ),
            students (
                full_name,
                membership_types!students_membership_type_id_fkey (
                    reward_master:lesson_masters!reward_master_id ( unit_price ),
                    membership_type_lessons ( lesson_master_id, reward_price )
                )
            )
        `)
        .eq('coach_id', user.id)
        .gte('lesson_date', nineMonthsAgo.toISOString())
        .order('lesson_date', { ascending: false })

    // Calculate Reports
    const monthlyReports = []
    for (let i = 0; i < 9; i++) { // Fetch 9 months for finance page
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)

        // Skip months before registration
        if (profile?.created_at && monthStart < startOfMonth(new Date(profile.created_at))) {
            continue
        }

        const monthEnd = endOfMonth(d)

        const monthRate = isAdmin ? 1.0 : calculateCoachRate(user.id, allLessons as any || [], d, profile?.override_coach_rank)

        const monthLessons = allLessons?.filter(l => {
            const date = new Date(l.lesson_date)
            return date >= monthStart && date <= monthEnd
        }) || []

        const stats = calculateMonthlyStats(user.id, monthLessons as any[], monthRate)

        monthlyReports.push({
            monthKey: format(d, 'yyyy-MM'),
            sales: stats.totalSales,
            reward: stats.totalReward,
            count: stats.lessonCount,
            rate: monthRate,
            details: stats.details
        })
    }

    const currentMonthStats = monthlyReports[0] || { reward: 0 }

    return (
        <div className="p-8 space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
                <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
                    <DollarSign className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">支払い通知書一覧</h1>
                    <p className="text-slate-500 text-sm">報酬額や支払い状況を確認できます</p>
                </div>
            </div>

            {/* Earnings Summary */}
            <section>
                <EarningsSummary
                    currentMonthReward={currentMonthStats.reward}
                // totalUnpaid and lastPayment require Payouts table logic which is separate
                />
            </section>

            {/* Monthly Reports (Migrated from Dashboard) */}
            <section>
                <h3 className="text-lg font-bold text-slate-900 mb-4">月次報酬履歴</h3>
                <MonthlyFinancialsWidget reports={monthlyReports} />
            </section>

            {/* Payment History (Mock) - Keep for now as Payout Slips */}
            <section>
                <h3 className="text-lg font-bold text-slate-900 mb-4">支払通知書</h3>
                <PaymentHistory />
            </section>
        </div>
    )
}
