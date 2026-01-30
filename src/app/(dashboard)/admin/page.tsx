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
import { calculateCoachRate, calculateMonthlyStats } from '@/lib/reward-system'
import { CoachFinancialsWidget } from '@/components/admin/CoachFinancialsWidget'

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
                membership_types!students_membership_type_id_fkey (
                    reward_master:lesson_masters!reward_master_id (
                        unit_price
                    )
                )
            )
        `)
        .order('lesson_date', { ascending: false })

    // 3. Fetch My Coach Data (Recent Lessons) - Similar to coach/page.tsx
    const { data: myRecentLessons } = await supabase
        .from('lessons')
        .select(`
            *,
            lesson_masters (
                is_trial,
                unit_price
            ),
            students (
                membership_types!students_membership_type_id_fkey (
                    reward_master:lesson_masters!reward_master_id (
                        unit_price
                    )
                )
            )
        `)
        .eq('coach_id', user.id)
        .order('lesson_date', { ascending: false }) // Use lesson_date for display order
        .limit(5)

    // 4. Fetch Recent Reports (All Coaches)
    const { data: recentReports } = await supabase
        .from('lessons')
        .select(`
            *,
            profiles (
                full_name,
                avatar_url
            )
        `)
        .order('lesson_date', { ascending: false })
        .limit(5)


    // 5. Fetch 6 Months Revenue Data (Lightweight)
    const sixMonthsAgo = subMonths(targetDate, 5) // Current + 5 previous = 6 months
    const sixMonthsStart = startOfMonth(sixMonthsAgo)

    const { data: sixMonthLessons } = await supabase
        .from('lessons')
        .select('lesson_date, price')
        .gte('lesson_date', sixMonthsStart.toISOString())
        .lte('lesson_date', endOfMonth(targetDate).toISOString())

    // Aggregate Revenue
    const revenueMap = new Map<string, number>()
    const graphData = []

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(targetDate, i)
        const key = format(d, 'yyyy-MM')
        const label = format(d, 'M月')
        revenueMap.set(key, 0)
        graphData.push({ name: label, key }) // store key for matching
    }

    sixMonthLessons?.forEach(l => {
        const key = format(new Date(l.lesson_date), 'yyyy-MM')
        if (revenueMap.has(key)) {
            revenueMap.set(key, revenueMap.get(key)! + (l.price || 0))
        }
    })

    const finalGraphData = graphData.map(d => ({
        name: d.name,
        revenue: revenueMap.get(d.key) || 0
    }))



    // 6. Fetch Upcoming Lessons (All Coaches)
    const { data: upcomingLessons } = await supabase
        .from('lesson_schedules')
        .select(`
            id,
            title,
            start_time,
            end_time,
            location,
            students (
                id,
                full_name
            ),
            profiles (
                full_name,
                avatar_url
            )
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20) // Increase limit to ensure Master's schedule isn't just pushed out

    const upcomingSchedules = upcomingLessons?.map(l => ({
        id: l.id,
        title: l.title || 'レッスン',
        start_time: l.start_time,
        end_time: l.end_time,
        location: l.location,
        // @ts-ignore
        student_name: Array.isArray(l.students) ? l.students[0]?.full_name : l.students?.full_name,
        // @ts-ignore
        student_id: Array.isArray(l.students) ? l.students[0]?.id : l.students?.id,
        coach: {
            // @ts-ignore
            full_name: l.profiles?.full_name || '管理者(Master)',
            // @ts-ignore
            avatar_url: l.profiles?.avatar_url
        }
    })) || []

    // 7. Fetch Total Students Count
    const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

    // Calculate Reward Rate for current user (Admin is always 100% locally, but for display logic)
    // Actually Admin rate is fixed 1.0 in calculation, but let's reuse logic for display consistency if needed.
    // For Admin dashboard, we can simplify/assume 1.0 or just calculate it if we want to be precise.
    // Let's stick to the calculateTotalReward logic used below which handles 'admin' role = 1.0.
    const myRate = 1.0

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

    // Filter active coaches (include admin)
    const activeCoaches = coaches?.filter(c => c.role === 'coach' || c.role === 'admin') || []

    // Calcluate Financials using Shared Logic
    const coachFinancials = activeCoaches.map(coach => {
        const rate = coach.role === 'admin' ? 1.0 : calculateCoachRate(coach.id, lessons as any[], targetDate)
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

    return (
        <div className="space-y-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
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
                            <p className="text-sm font-medium text-slate-500">今月の売上</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">¥{totalSales.toLocaleString()}</h3>
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
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">{activeCoaches.length} <span className="text-base font-normal text-slate-500">コーチ</span></h3>
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
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">{thisMonthLessons.length}</h3>
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
                            事業売上推移
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-xs font-medium text-cyan-700 bg-cyan-100 px-3 py-1 rounded-full cursor-pointer border border-cyan-200">6ヶ月</span>
                        </div>
                    </div>
                    <div className="flex-1 w-full h-[300px] bg-white rounded-xl overflow-hidden">
                        <RevenueChart data={[
                            { name: '8月', revenue: 1540000 },
                            { name: '9月', revenue: 1620000 },
                            { name: '10月', revenue: 1480000 },
                            { name: '11月', revenue: 1750000 },
                            { name: '12月', revenue: 1920000 },
                            { name: '1月', revenue: totalSales },
                        ]} />
                    </div>
                </div>

                {/* Activity Widget (Tabs) */}
                <div className="h-[500px]">
                    {/* @ts-ignore */}
                    <AdminActivityWidget schedules={upcomingSchedules} reports={recentReports || []} />
                </div>
            </div>

            <div className="py-6 border-t border-slate-200">
                <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-700">
                    <User className="h-5 w-5" />
                    マイ・コーチング活動
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <CoachRewardCard />

                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <History className="h-5 w-5 text-cyan-600" />
                                最近のレッスン履歴
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myRecentLessons && myRecentLessons.length > 0 ? (
                                <div className="space-y-4">
                                    {myRecentLessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-sm text-slate-700">{lesson.student_name}</p>
                                                <p className="text-xs text-slate-500">{new Date(lesson.lesson_date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-sm text-blue-600">
                                                    ¥{calculateMyLessonReward(lesson).toLocaleString()}
                                                </p>
                                                {lesson.lesson_masters?.is_trial ? (
                                                    <Badge variant="outline" className="text-[10px] h-5">体験</Badge>
                                                ) : (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">完了</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-cyan-700" asChild>
                                        <Link href="/coach/history">すべて見る</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 text-center py-4">
                                    履歴はありません。
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <PlusCircle className="h-5 w-5 text-green-600" />
                                クイックアクション
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button asChild className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 justify-start" size="lg">
                                <Link href="/coach/report" className="flex items-center gap-2">
                                    <PlusCircle className="h-5 w-5" />
                                    <span>新規レポート作成</span>
                                    <span className="ml-auto text-xs opacity-60">完了報告</span>
                                </Link>
                            </Button>
                            <Button asChild className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300 justify-start" size="lg">
                                <Link href="/coach/schedule" className="flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5" />
                                    <span>スケジュール追加</span>
                                    <span className="ml-auto text-xs opacity-60">予約管理</span>
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
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
