import { createClient } from '@/lib/supabase/server'
import { LessonTable } from '@/components/admin/LessonTable'
import { SalesSummary } from '@/components/admin/SalesSummary'
import { CoachRewardTable } from '@/components/admin/CoachRewardTable'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Settings, Users, User, PlusCircle, Calendar as CalendarIcon, History, DollarSign } from 'lucide-react'
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
        { count: totalStudents }
    ] = await Promise.all([
        // 1. Fetch Coaches
        supabase.from('profiles').select('*'),

        // 2. Fetch Lessons for Stats
        supabase.from('lessons')
            .select(`
                *,
                profiles ( full_name, email ),
                lesson_masters ( unit_price, is_trial ),
                students (
                    id,
                    full_name,
                    membership_types!students_membership_type_id_fkey (
                        reward_master:lesson_masters!reward_master_id ( unit_price )
                    )
                )
            `)
            .order('lesson_date', { ascending: false }),

        // 3. Fetch My Coach Data
        supabase.from('lessons')
            .select(`
                *,
                lesson_masters ( is_trial, unit_price ),
                students (
                    id,
                    full_name,
                    membership_types!students_membership_type_id_fkey (
                        reward_master:lesson_masters!reward_master_id ( unit_price )
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
        supabase.from('students').select('*', { count: 'exact', head: true })
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

    // Calcluate Financials using Shared Logic
    const coachFinancials = activeCoaches.map(coach => {
        const rate = coach.role === 'admin' ? 1.0 : calculateCoachRate(coach.id, lessons as any[], targetDate, coach.override_coach_rank)
        const stats = calculateMonthlyStats(coach.id, thisMonthLessons as any[], rate)

        return {
            coachId: coach.id,
            coachName: coach.full_name || '名称未設定',
            avatarUrl: coach.avatar_url,
            role: coach.role,
            lessonCount: stats.lessonCount,
            totalSales: stats.totalSales,
            rate: rate,
            totalReward: stats.totalReward
        }
    })

    // Calculate Totals from the list
    const totalSales = coachFinancials.reduce((sum, c) => sum + c.totalSales, 0)
    const totalGrossReward = coachFinancials.reduce((sum, c) => sum + c.totalReward, 0)
    const totalProfit = totalSales - totalGrossReward

    // Last Month (Simplified for comparison - treating 'rate' as same for simplicity or re-calc)
    // To be precise we should re-calc rate for last month but for "diff" usually approximation is ok or we duplicate logic.
    // Let's simple-calc last month totals
    const lastMonthFinancials = activeCoaches.map(coach => {
        const rate = coach.role === 'admin' ? 1.0 : calculateCoachRate(coach.id, lessons as any[], lastMonth)
        return calculateMonthlyStats(coach.id, lastMonthLessons as any[], rate)
    })
    const lastMonthSales = lastMonthFinancials.reduce((sum, c) => sum + c.totalSales, 0)
    const lastMonthProfit = lastMonthSales - lastMonthFinancials.reduce((sum, c) => sum + c.totalReward, 0)

    // Calculate Diffs
    const diffSales = totalSales - lastMonthSales
    const diffProfit = totalProfit - lastMonthProfit
    const diffCount = thisMonthLessons.length - lastMonthLessons.length

    // Helper for My Recent Lessons UI
    const calculateMyLessonReward = (lesson: any) => {
        const master = lesson.lesson_masters
        if (!master) return 0

        if (master.is_trial) {
            return 4500
        }

        // Membership Reward override
        const membershipRewardPrice = lesson.students?.membership_types?.reward_master?.unit_price
        const basePrice = membershipRewardPrice ?? master.unit_price

        return Math.floor(basePrice * myRate)
    }

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
        const rate = profile.role === 'admin' ? 1.0 : calculateCoachRate(coachId, lessons as any[], targetDate, profile.override_coach_rank)
        let totalSales = 0
        let totalReward = 0
        cLessons.forEach(l => {
            totalSales += (l.price || 0)
            totalReward += calculateLessonReward(l, rate)
        })
        coachRanking.push({
            id: coachId,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            count: cLessons.length,
            totalSales,
            totalReward
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

    // Calculate admin's own sales for this month
    const myThisMonthLessons = thisMonthLessons.filter(l => l.coach_id === user.id)
    const myTotalSalesThisMonth = myThisMonthLessons.reduce((sum, l) => sum + (l.price || 0), 0)

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
                            <div className={`flex items-center gap-2 mt-4 text-sm w-fit px-2 py-1 rounded-lg ${diffSales >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                <span>{diffSales >= 0 ? '+' : ''}{diffSales.toLocaleString()}</span>
                                <span className="text-slate-500">前月比</span>
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

            <div className="py-6 border-t border-slate-200">
                <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                    <User className="h-5 w-5 shrink-0" />
                    マイ・コーチング活動
                </h3>
                <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Combined Sales & History Card */}
                    <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:p-6">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base md:text-lg whitespace-nowrap shrink-0">
                                <History className="h-4 w-4 md:h-5 md:w-5 text-cyan-600 shrink-0" />
                                今月の売上とレッスン履歴
                            </CardTitle>
                            <div className="text-right">
                                <span className="text-[10px] md:text-xs text-slate-500 block">今月の個人売上</span>
                                <span className="text-lg md:text-xl font-bold text-cyan-700">¥{myTotalSalesThisMonth.toLocaleString()}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                            {myRecentLessons && myRecentLessons.length > 0 ? (
                                <div className="space-y-3">
                                    {myRecentLessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                <div className="w-8 md:w-10 text-[10px] md:text-xs text-slate-400 shrink-0">
                                                    {format(new Date(lesson.lesson_date), 'MM/dd')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-xs md:text-sm text-slate-700 truncate">{lesson.student_name || '生徒不明'}</p>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 capitalize truncate">{lesson.lesson_masters?.name || 'レッスン'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-xs md:text-sm text-slate-800">
                                                    ¥{(lesson.price || 0).toLocaleString()}
                                                </p>
                                                {lesson.lesson_masters?.is_trial && (
                                                    <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[9px] md:text-[10px] h-3.5 md:h-4">体験</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" className="w-full text-[10px] md:text-xs text-slate-500 hover:text-cyan-700 mt-2 h-8" asChild>
                                        <Link href="/coach/history">すべての履歴を表示</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-xs md:text-sm text-gray-500 text-center py-6">
                                    今月のレッスン履歴はありません。
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Lessons (Next 3) */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
                            <CardTitle className="flex items-center gap-2 text-slate-800 text-base md:text-lg whitespace-nowrap">
                                <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-purple-600 shrink-0" />
                                今後のレッスン予定
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                            <div className="space-y-3 md:space-y-4">
                                {myUpcomingSchedules && myUpcomingSchedules.length > 0 ? (
                                    myUpcomingSchedules.map((s: any) => (
                                        <div key={s.id} className="flex flex-col gap-1 p-2 md:p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] md:text-xs font-bold text-slate-500">
                                                    {format(new Date(s.start_time), 'MM/dd (E) HH:mm', { locale: (require('date-fns/locale')).ja })}
                                                </span>
                                                <Badge className="bg-white text-slate-600 border-slate-200 text-[9px] md:text-[10px] h-3.5 md:h-4 px-1.5 md:px-2">{s.location || '場所未設定'}</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs md:text-sm font-medium text-slate-700 truncate">{s.students?.full_name}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs md:text-sm text-gray-500 text-center py-4 text-slate-400 italic">
                                        予定されているレッスンはありません。
                                    </div>
                                )}
                                <Button asChild variant="outline" size="sm" className="w-full text-[10px] md:text-xs border-slate-200 hover:bg-slate-50 h-8">
                                    <Link href="/coach/schedule">カレンダーを表示</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Card className="bg-white border-slate-200 shadow-sm group">
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-800 text-base md:text-lg whitespace-nowrap">
                        <PlusCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 shrink-0" />
                        クイックアクション
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-0 flex flex-col sm:flex-row gap-3">
                    <Button asChild className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 justify-start h-10 md:h-12" size="lg">
                        <Link href="/coach/report" className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="text-sm md:text-base">新規レポート作成</span>
                            <span className="ml-auto text-[10px] md:text-xs opacity-60 hidden xs:inline">完了報告</span>
                        </Link>
                    </Button>
                    <Button asChild className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300 justify-start h-10 md:h-12" size="lg">
                        <Link href="/coach/schedule" className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="text-sm md:text-base">スケジュール追加</span>
                            <span className="ml-auto text-[10px] md:text-xs opacity-60 hidden xs:inline">予約管理</span>
                        </Link>
                    </Button>
                </CardContent>
            </Card>


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
