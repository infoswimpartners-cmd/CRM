import { createClient } from '@/lib/supabase/server'
import { LessonTable } from '@/components/admin/LessonTable'
import { SalesSummary } from '@/components/admin/SalesSummary'
import { CoachRewardTable } from '@/components/admin/CoachRewardTable'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Settings, Users, User, Calendar as CalendarIcon, History, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminDashboardTabs } from '@/components/admin/AdminDashboardTabs'

export const dynamic = 'force-dynamic'

import { MonthSelector } from '@/components/admin/MonthSelector'
import { format } from 'date-fns'
import { CoachRewardCard } from '@/components/dashboard/CoachRewardCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AdminActivityWidget } from '@/components/admin/AdminActivityWidget'
import { getMonthlyRevenue } from '@/actions/analytics'
import { CoachRankingTable } from '@/components/admin/analytics/CoachRankingTable'
import { CustomerRankingTable } from '@/components/admin/analytics/CustomerRankingTable'
import { calculateCoachRate, calculateMonthlyStats, calculateLessonReward } from '@/lib/reward-system'

export default async function AdminDashboard(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const monthParam = typeof searchParams.month === 'string' ? searchParams.month : format(new Date(), 'yyyy-MM')

    // Parse target date (default to 1st of the month)
    const targetDate = new Date(monthParam + '-01')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Access Denied</div>
    }

    // 1. Fetch Coaches (Profiles)
    // Note: In a real app we might filter by role, but assuming all profiles are relevant or we filter later
    // Let's assume anyone who has given a lesson is definitely a coach, but clearer to fetch all profiles
    // 5. Fetch Revenue Data (Current Year)
    const targetYear = targetDate.getFullYear()

    // Parallelize independent data fetches
    const [
        { data: coaches },
        { data: lessons, error },
        { data: myRecentLessons },
        { data: recentReports },
        yearlyRevenueData,
        { data: upcomingSchedules },
        { data: myUpcomingSchedules },
        { count: totalStudents },
        { data: appConfigs }
    ] = await Promise.all([
        // 1. Fetch Coaches
        supabase.from('profiles').select('*'),

        // 2. Fetch Lessons for Stats
        supabase.from('lessons')
            .select(`
                *,
                profiles ( full_name, email, distant_reward_fee ),
                lesson_masters ( unit_price, is_trial ),
                students (
                    id,
                    full_name,
                    is_two_person_lesson,
                    is_default_distant_option,
                    membership_types!students_membership_type_id_fkey (
                        reward_master:lesson_masters!reward_master_id ( unit_price ),
                        membership_type_lessons (
                            lesson_master_id,
                            reward_price
                        )
                    )
                )
            `)
            .order('lesson_date', { ascending: false }),

        // 3. Fetch My Coach Data
        supabase.from('lessons')
            .select(`
                *,
                lesson_masters ( is_trial, unit_price ),
                profiles ( distant_reward_fee ),
                students (
                    id,
                    full_name,
                    is_two_person_lesson,
                    is_default_distant_option,
                    membership_types!students_membership_type_id_fkey (
                        reward_master:lesson_masters!reward_master_id ( unit_price ),
                        membership_type_lessons (
                            lesson_master_id,
                            reward_price
                        )
                    )
                )
            `)
            .eq('coach_id', user.id)
            .order('lesson_date', { ascending: false })
            .limit(5),

        // 4. Fetch Recent Reports (Sorted by creation time for "newest first")
        supabase.from('lessons')
            .select(`*, profiles ( full_name, avatar_url )`)
            .order('created_at', { ascending: false })
            .limit(5),

        // 5. Fetch Revenue Data
        getMonthlyRevenue(targetYear),

        // 6. Fetch Upcoming Lessons (All for widget)
        supabase.from('lesson_schedules')
            .select(`
                id, title, start_time, end_time, location,
                students ( id, full_name ),
                profiles ( full_name, avatar_url )
            `)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(20),

        // 7. Fetch My Upcoming Lessons (Specific for activities)
        supabase.from('lesson_schedules')
            .select(`
                id, title, start_time, end_time, location,
                students ( id, full_name )
            `)
            .eq('coach_id', user.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(3),

        // 8. Fetch Total Students Count
        supabase.from('students').select('*', { count: 'exact', head: true }),

        // 9. Fetch Tax Settings
        supabase.from('app_configs')
            .select('key, value')
            .like('key', 'coach_tax:%')
    ])

    // Calculate Reward Rate for current user (Admin is always 100% locally, but for display logic)
    // Actually Admin rate is fixed 1.0 in calculation, but let's reuse logic for display consistency if needed.
    // For Admin dashboard, we can simplify/assume 1.0 or just calculate it if we want to be precise.
    // Let's stick to the calculateTotalReward logic used below which handles 'admin' role = 1.0.
    const myRate = 1.0

    if (error) {
        console.error('Error fetching lessons:', error.message, error)
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

    // Filter active coaches (include admin)
    const activeCoaches = coaches?.filter(c => c.role === 'coach' || c.role === 'admin') || []

    // Parse Tax Settings Early for KPI calculations
    const taxMap = new Map<string, boolean>()
    appConfigs?.forEach((c: any) => {
        if (c.key.startsWith('coach_tax:')) {
            const coachId = c.key.replace('coach_tax:', '')
            try {
                const val = JSON.parse(c.value)
                taxMap.set(coachId, val.enabled !== false)
            } catch {
                taxMap.set(coachId, true)
            }
        }
    })

    // Calcluate Financials using Shared Logic
    const coachFinancials = activeCoaches.map(coach => {
        const rate = coach.role === 'admin' ? 1.0 : calculateCoachRate(coach.id, lessons as any[], targetDate, coach.override_coach_rank)
        const stats = calculateMonthlyStats(coach.id, thisMonthLessons as any[], rate)

        const taxEnabled = taxMap.has(coach.id) ? taxMap.get(coach.id) : true
        // 報酬額から直接引く（課税標準 = 総報酬）
        const withholdingTax = taxEnabled ? Math.floor(stats.totalReward * 0.1021) : 0
        const netReward = stats.totalReward - withholdingTax

        return {
            coachId: coach.id,
            coachName: coach.full_name || '名称未設定',
            avatarUrl: coach.avatar_url,
            role: coach.role,
            lessonCount: stats.lessonCount,
            totalSales: stats.totalSales,
            rate: rate,
            totalReward: netReward,
            grossReward: stats.totalReward
        }
    })

    // Calculate Totals from the list
    const totalSales = coachFinancials.reduce((sum, c) => sum + c.totalSales, 0)
    const totalNetReward = coachFinancials.reduce((sum, c) => sum + c.totalReward, 0)

    // 管理者以外の総報酬（粗利計算用/原価）
    const totalOthersGrossReward = coachFinancials.filter(c => c.role !== 'admin').reduce((sum, c) => sum + c.grossReward, 0)
    const grossProfit = totalSales - totalOthersGrossReward

    // Last Month (Simplified for comparison)
    const lastMonthFinancials = activeCoaches.map(coach => {
        const rate = coach.role === 'admin' ? 1.0 : calculateCoachRate(coach.id, lessons as any[], lastMonth)
        const stats = calculateMonthlyStats(coach.id, lastMonthLessons as any[], rate)

        const taxEnabled = taxMap.has(coach.id) ? taxMap.get(coach.id) : true
        const withholdingTax = taxEnabled ? Math.floor(stats.totalReward * 0.1021) : 0
        const netReward = stats.totalReward - withholdingTax

        return {
            ...stats,
            role: coach.role,
            totalReward: netReward,
            grossReward: stats.totalReward
        }
    })
    const lastMonthSales = lastMonthFinancials.reduce((sum, c) => sum + c.totalSales, 0)
    const lastMonthNetReward = lastMonthFinancials.reduce((sum, c) => sum + c.totalReward, 0)

    const lastMonthOthersGrossReward = lastMonthFinancials.filter(c => c.role !== 'admin').reduce((sum, c) => sum + c.grossReward, 0)
    const lastMonthGrossProfit = lastMonthSales - lastMonthOthersGrossReward

    // Calculate Diffs
    const diffSales = totalSales - lastMonthSales
    const diffGrossProfit = grossProfit - lastMonthGrossProfit
    const diffCount = thisMonthLessons.length - lastMonthLessons.length



    // Format Schedules for Widget
    const formattedSchedules = upcomingSchedules?.map((s: any) => {
        const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        return {
            ...s,
            coach: profile || { full_name: '不明' },
            student_name: s.students?.full_name,
            student_id: s.students?.id
        }
    }) || []

    // Ranking Data for Dashboard
    // Reuse lessons already fetched, filtered by targetYear
    const coachRankingMap = new Map<string, any[]>()
    lessons?.forEach((l: any) => {
        if (!l.coach_id) return
        // 年度フィルタを追加
        const lYear = new Date(l.lesson_date).getFullYear()
        if (lYear !== targetYear) return

        const existing = coachRankingMap.get(l.coach_id) || []
        existing.push(l)
        coachRankingMap.set(l.coach_id, existing)
    })

    const coachRanking = []
    for (const [coachId, cLessons] of coachRankingMap.entries()) {
        const profile = Array.isArray(cLessons[0].profiles) ? cLessons[0].profiles[0] : cLessons[0].profiles
        if (!profile) continue

        let totalSales = 0
        let totalGrossReward = 0

        // 月ごとにグループ化して、その月のレートで報酬を計算する（年間ランキングのため）
        const monthlyGroups = new Map<string, any[]>()
        cLessons.forEach(l => {
            const d = new Date(l.lesson_date)
            const mKey = format(d, 'yyyy-MM')
            if (!monthlyGroups.has(mKey)) monthlyGroups.set(mKey, [])
            monthlyGroups.get(mKey)!.push(l)
        })

        for (const [mKey, mLessons] of monthlyGroups) {
            const mDate = new Date(mKey + '-01')
            // adminは常に1.0、それ以外は該当月のレートを計算
            const mRate = profile.role === 'admin' ? 1.0 : calculateCoachRate(coachId, lessons as any[], mDate, profile.override_coach_rank)

            mLessons.forEach(l => {
                totalSales += (l.price || 0)
                totalGrossReward += calculateLessonReward(l, mRate)
            })
        }

        // Calculate Net Reward (Withholding Tax Deduction) - User Request: Gross * 10.21%
        const taxEnabled = taxMap.has(coachId) ? taxMap.get(coachId) : true
        // 報酬額から直接引く（課税標準 = 総報酬）
        const withholdingTax = taxEnabled ? Math.floor(totalGrossReward * 0.1021) : 0
        const netReward = totalGrossReward - withholdingTax

        coachRanking.push({
            id: coachId,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            count: cLessons.length,
            totalSales,
            withholdingTax,
            totalReward: netReward // This is now "Total Payment Amount"
        })
    }
    coachRanking.sort((a, b) => b.totalSales - a.totalSales)

    const customerSpendMap = new Map<string, { student: any, total: number, count: number }>()
    lessons?.forEach((l: any) => {
        if (!l.students) return
        const student = Array.isArray(l.students) ? l.students[0] : l.students
        if (!student) return

        // 年度フィルタを追加
        const lYear = new Date(l.lesson_date).getFullYear()
        if (lYear !== targetYear) return

        const sId = student.id
        if (!customerSpendMap.has(sId)) {
            customerSpendMap.set(sId, { student: student, total: 0, count: 0 })
        }
        const current = customerSpendMap.get(sId)!
        current.total += (l.price || 0)
        current.count += 1
    })
    const topCustomers = Array.from(customerSpendMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5) // Dashboard shows top 5

    // 削除された「マイ・コーチング活動」セクションで使われていた変数の未使用警告を回避
    void myRecentLessons;
    void myUpcomingSchedules;

    return (
        <div className="space-y-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
                    <p className="text-gray-500">Swim Partnersの活動状況概要</p>
                </div>
                <MonthSelector currentMonth={monthParam} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/admin/analytics">
                    <div className="bg-white rounded-2xl p-6 relative overflow-hidden group shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer h-full">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-32 h-32 text-cyan-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">全体売上 ({targetYear}年{targetDate.getMonth() + 1}月)</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">¥{totalSales.toLocaleString()}</h3>
                            <div className="flex flex-col gap-2 mt-4">
                                <div className="flex items-center text-sm text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-lg">
                                    <span>粗利額: ¥{grossProfit.toLocaleString()}</span>
                                </div>
                                <div className={`flex items-center gap-2 text-sm w-fit px-2 py-1 rounded-lg ${diffSales >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                    <span>{diffSales >= 0 ? '+' : ''}{diffSales.toLocaleString()}</span>
                                    <span className="text-slate-500">前月比(売上)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/customers">
                    <div className="bg-white rounded-2xl p-6 relative overflow-hidden group shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer h-full">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-32 h-32 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">アクティブ生徒数</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{activeCoaches.length} <span className="text-base font-normal text-slate-500">コーチ</span></h3>
                            <div className="flex items-center gap-2 mt-4 text-sm text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-lg">
                                <span>全生徒数: {totalStudents?.toLocaleString() || '-'}名</span>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/reports">
                    <div className="bg-white rounded-2xl p-6 relative overflow-hidden group shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer h-full">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CalendarIcon className="w-32 h-32 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">レッスン数 (今月)</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{thisMonthLessons.length}</h3>
                            <div className={`flex items-center gap-2 mt-4 text-sm w-fit px-2 py-1 rounded-lg ${diffCount >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                <span>{diffCount >= 0 ? '+' : ''}{diffCount}</span>
                                <span className="text-slate-500">前月比</span>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Revenue Chart & Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 flex flex-col shadow-sm border border-slate-200 h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <History className="h-5 w-5 text-cyan-600" />
                            事業売上推移 ({targetYear}年)
                        </h3>
                    </div>
                    <div className="flex-1 w-full h-[300px] bg-white rounded-xl overflow-hidden">
                        <RevenueChart data={yearlyRevenueData} />
                    </div>
                </div>

                <div className="h-[500px]">
                    {/* @ts-ignore */}
                    <AdminActivityWidget schedules={formattedSchedules} reports={recentReports || []} />
                </div>
            </div>

            {/* Dashboard Rankings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CoachRankingTable data={coachRanking} limit={5} title="コーチ別売上ランキング (TOP5)" />
                <CustomerRankingTable data={topCustomers} limit={5} title="優良顧客ランキング (TOP5)" />
            </div>


            <div className="border-t pt-8">
                <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-700">
                    <Settings className="h-5 w-5" />
                    システム管理
                </h3>
                <div className="grid gap-4 md:grid-cols-4">
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
