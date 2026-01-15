import { createClient } from '@/lib/supabase/server'
import { LessonTable } from '@/components/admin/LessonTable'
import { SalesSummary } from '@/components/admin/SalesSummary'
import { CoachRewardTable } from '@/components/admin/CoachRewardTable'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Settings, Users, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminDashboardTabs } from '@/components/admin/AdminDashboardTabs'

export const dynamic = 'force-dynamic'

import { MonthSelector } from '@/components/admin/MonthSelector'
import { format } from 'date-fns'

export default async function AdminDashboard(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const monthParam = typeof searchParams.month === 'string' ? searchParams.month : format(new Date(), 'yyyy-MM')

    // Parse target date (default to 1st of the month)
    const targetDate = new Date(monthParam + '-01')

    const supabase = await createClient()

    // 1. Fetch Coaches (Profiles)
    // Note: In a real app we might filter by role, but assuming all profiles are relevant or we filter later
    // Let's assume anyone who has given a lesson is definitely a coach, but clearer to fetch all profiles
    const { data: coaches } = await supabase
        .from('profiles')
        .select('*')

    // 2. Fetch Lessons for Stats (Target Month + Past 3 Months for Rank)
    // We fetch broader range to cover rank calculation history relative to target date
    // Rank needs 3 months prior. Current stats need target month.
    // Ideally we filter in DB, but fetching all is simpler for now as designed.
    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
            *,
            profiles (
                full_name,
                email
            ),
            lesson_masters (
                unit_price,
                is_trial
            ),
            students (
                membership_types (
                    reward_master:lesson_masters!reward_master_id (
                        unit_price
                    )
                )
            )
        `)
        .order('lesson_date', { ascending: false })

    if (error) {
        console.error('Error fetching lessons:', error)
        return <div>Error loading data.</div>
    }

    // Filter for current month sales summary
    const monthStart = startOfMonth(targetDate)
    const monthEnd = endOfMonth(targetDate)

    const thisMonthLessons = lessons.filter(l => {
        const date = new Date(l.lesson_date)
        return date >= monthStart && date <= monthEnd
    })

    // Filter for LAST month sales summary (for comparison)
    const lastMonth = subMonths(targetDate, 1)
    const lastMonthStart = startOfMonth(lastMonth)
    const lastMonthEnd = endOfMonth(lastMonth)

    const lastMonthLessons = lessons.filter(l => {
        const date = new Date(l.lesson_date)
        return date >= lastMonthStart && date <= lastMonthEnd
    })

    const totalSales = thisMonthLessons.reduce((sum, l) => sum + (l.price || 0), 0)
    const lastMonthSales = lastMonthLessons.reduce((sum, l) => sum + (l.price || 0), 0)

    // Filter active coaches (include admin)
    // Note: Assuming 'role' column exists in profiles.
    const activeCoaches = coaches || []

    // Calculate Total Reward (Gross) for Profit Calculation
    const calculateTotalReward = (targetLessons: typeof thisMonthLessons, referenceDate: Date) => {
        let total = 0
        const rankStart = startOfMonth(subMonths(referenceDate, 3))
        const rankEnd = endOfMonth(subMonths(referenceDate, 1))

        activeCoaches.forEach(coach => {
            let rate = 0.50
            if (coach.role === 'admin') {
                rate = 1.0
            } else {
                // Rank
                const pastLessons = lessons.filter(l =>
                    l.coach_id === coach.id &&
                    new Date(l.lesson_date) >= rankStart &&
                    new Date(l.lesson_date) <= rankEnd
                )
                const average = pastLessons.length / 3
                if (average >= 30) rate = 0.70
                else if (average >= 25) rate = 0.65
                else if (average >= 20) rate = 0.60
                else if (average >= 15) rate = 0.55
            }

            const currentLessons = targetLessons.filter(l => l.coach_id === coach.id)
            let coachReward = 0
            currentLessons.forEach(l => {
                // @ts-ignore
                const master = l.lesson_masters
                // @ts-ignore
                const membershipRewardMaster = l.students?.membership_types?.reward_master

                if (master) {
                    if (master.is_trial) {
                        coachReward += 4500
                    } else {
                        const basePrice = membershipRewardMaster?.unit_price ?? master.unit_price
                        coachReward += basePrice * rate
                    }
                }
            })
            total += Math.floor(coachReward)
        })
        return total
    }

    const totalGrossReward = calculateTotalReward(thisMonthLessons, targetDate)
    const lastMonthGrossReward = calculateTotalReward(lastMonthLessons, lastMonth)

    const totalProfit = totalSales - totalGrossReward
    const lastMonthProfit = lastMonthSales - lastMonthGrossReward

    // Calculate Diffs
    const diffSales = totalSales - lastMonthSales
    const diffProfit = totalProfit - lastMonthProfit
    const diffCount = thisMonthLessons.length - lastMonthLessons.length

    return (
        <div className="space-y-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
                    <p className="text-gray-500">Swim Partnersの活動状況概要</p>
                </div>
                <MonthSelector currentMonth={monthParam} />
            </div>

            <SalesSummary
                totalSales={totalSales}
                lessonCount={thisMonthLessons.length}
                totalProfit={totalProfit}
                diffSales={diffSales}
                diffProfit={diffProfit}
                diffCount={diffCount}
            />

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1">
                <AdminDashboardTabs
                    performanceContent={<CoachRewardTable coaches={activeCoaches} lessons={lessons as any} targetDate={targetDate} />}
                    historyContent={<LessonTable lessons={lessons as any} />}
                />
            </div>

            <div className="border-t pt-8">
                <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-700">
                    <Settings className="h-5 w-5" />
                    システム管理
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <Link href="/admin/masters">
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">マスタ管理</CardTitle>
                                <Settings className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">レッスンの種類・単価・会員区分</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/customers">
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">顧客管理</CardTitle>
                                <Users className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">生徒情報・カルテ・履歴</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/coaches">
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">コーチ管理</CardTitle>
                                <User className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">担当生徒の確認・引継ぎ</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/settings">
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">システム設定</CardTitle>
                                <Settings className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">メールテンプレート・環境設定</div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    )
}
