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
        <div className="relative space-y-6 md:space-y-10 pb-12 overflow-hidden px-4 md:px-0">
            {/* 装飾用背景要素 */}
            <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-linear-to-bl from-blue-500/5 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-[-100px] left-[-100px] -z-10 w-[500px] h-[500px] bg-linear-to-tr from-cyan-400/5 to-transparent rounded-full blur-3xl" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-8 bg-blue-600 rounded-full"></span>
                        <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Overview</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                        管理者ダッシュボード
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base font-medium">ビジネスの現在地をリアルタイムに把握</p>
                </div>
                <div className="mx-auto md:mx-0">
                    <MonthSelector currentMonth={monthParam} />
                </div>
            </div>

            {/* ビジネス概要セクション */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-700">ビジネス概況</h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href="/admin/analytics">
                        <div className="group relative bg-white rounded-3xl p-6 md:p-8 overflow-hidden border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] transition-all duration-500 cursor-pointer h-full ring-1 ring-slate-200/50 hover:ring-blue-200">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-cyan-100/30 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <DollarSign className="w-6 h-6 text-cyan-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">今月の売上</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">¥{totalSales.toLocaleString()}</h3>
                                    <span className="text-sm font-medium text-slate-500">({targetDate.getMonth() + 1}月)</span>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">粗利額</span>
                                        <span className="text-sm font-bold text-slate-700">¥{grossProfit.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">前月比</span>
                                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${diffSales >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                            {diffSales >= 0 ? '+' : ''}{diffSales.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>

                    <Link href="/customers">
                        <div className="group relative bg-white rounded-3xl p-6 md:p-8 overflow-hidden border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(59,_130,_246,_0.07)] transition-all duration-500 cursor-pointer h-full ring-1 ring-slate-200/50 hover:ring-blue-200">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-blue-100/30 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">稼働コーチ数</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">{activeCoaches.length}</h3>
                                    <span className="text-base font-medium text-slate-500">名</span>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">全生徒数</span>
                                        <span className="text-sm font-bold text-slate-700">{totalStudents?.toLocaleString() || '-'} 名</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">ステータス</span>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>

                    <Link href="/admin/reports">
                        <div className="group relative bg-white rounded-3xl p-6 md:p-8 overflow-hidden border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(168,_85,_247,_0.07)] transition-all duration-500 cursor-pointer h-full ring-1 ring-slate-200/50 hover:ring-purple-200">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-purple-100/30 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <CalendarIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">月間レッスン数</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">{thisMonthLessons.length}</h3>
                                    <span className="text-base font-medium text-slate-500">回</span>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">前月比</span>
                                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${diffCount >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                            {diffCount >= 0 ? '+' : ''}{diffCount} 回
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">アサイン状況</span>
                                        <span className="text-sm font-bold text-slate-700">順調</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </section>

            {/* アクティビティ & トレンド セクション */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-700">現場の動きと売上トレンド</h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    <div className="lg:col-span-2 order-2 lg:order-1">
                        <div className="min-h-[450px] md:h-[560px] bg-white rounded-3xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 ring-1 ring-slate-200/50">
                            {/* @ts-ignore */}
                            <AdminActivityWidget schedules={formattedSchedules} reports={recentReports || []} />
                        </div>
                    </div>
                    <div className="lg:col-span-1 order-1 lg:order-2">
                        <div className="h-full bg-white rounded-3xl p-5 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 ring-1 ring-slate-200/50 flex flex-col">
                            <div className="mb-6">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-blue-600 rounded-full" />
                                    売上推移
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">売上統計</p>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                <RevenueChart data={yearlyRevenueData} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 詳細分析セクション */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-700">パフォーマンス分析</h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-200/60 ring-1 ring-slate-100">
                        <CoachRankingTable data={coachRanking} limit={5} title="コーチ別売上ランキング (TOP5)" />
                    </div>
                    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-200/60 ring-1 ring-slate-100">
                        <CustomerRankingTable data={topCustomers} limit={5} title="優良顧客ランキング (TOP5)" />
                    </div>
                </div>
            </section>

            {/* Control Center Section */}
            <div className="pt-12 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">コントロールセンター</h3>
                        <p className="text-sm text-slate-500">システムの重要設定とリソース管理</p>
                    </div>
                </div>

                <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
                    {[
                        { href: "/admin/masters", title: "マスタ管理", desc: "レッスンの種類・単価・会員区分", icon: Settings, color: "bg-blue-50 text-blue-600" },
                        { href: "/customers", title: "顧客管理", desc: "生徒情報・カルテ・履歴", icon: Users, color: "bg-indigo-50 text-indigo-600" },
                        { href: "/admin/coaches", title: "コーチ管理", desc: "担当生徒の確認・引継ぎ", icon: User, color: "bg-violet-50 text-violet-600" },
                        { href: "/admin/settings", title: "システム設定", desc: "メールテンプレート・環境設定", icon: Settings, color: "bg-slate-50 text-slate-600" }
                    ].map((item, i) => (
                        <Link key={i} href={item.href}>
                            <div className="group h-full bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 cursor-pointer">
                                <div className={`w-10 h-10 md:w-12 md:h-12 ${item.color} rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <item.icon className="h-5 w-5 md:h-6 md:w-6" />
                                </div>
                                <h4 className="text-sm md:text-base font-bold text-slate-900 mb-1 md:mb-2 truncate">{item.title}</h4>
                                <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed line-clamp-2 md:line-clamp-none">{item.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
