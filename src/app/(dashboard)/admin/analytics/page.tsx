import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, TrendingUp, ArrowLeft, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { calculateCoachRate, calculateLessonReward } from '@/lib/reward-system'
import { CoachRankingTable } from '@/components/admin/analytics/CoachRankingTable'
import { CustomerRankingTable } from '@/components/admin/analytics/CustomerRankingTable'
import { CoachMonthlyPerformance } from '@/components/admin/analytics/CoachMonthlyPerformance'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ coach_id?: string, year?: string }> }) {
    const { coach_id: selectedCoachId, year: selectedYearStr } = await searchParams
    const supabase = await createClient()

    const currentYear = new Date().getFullYear()
    const selectedYear = selectedYearStr ? parseInt(selectedYearStr) : currentYear

    // 1. Fetch KPI Data (Total Sales, Total Customers for LTV)
    // ... (既存のKPI計算ロジックは変更なし)
    let lessonsQuery = supabase.from('lessons').select('price, coach_id, lesson_date, student_id')
    if (selectedCoachId) {
        lessonsQuery = lessonsQuery.eq('coach_id', selectedCoachId)
    }
    const { data: allLessons } = await lessonsQuery

    const { count: totalCustomers } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

    const totalRevenue = allLessons?.reduce((sum, l) => sum + (l.price || 0), 0) || 0
    const totalLessons = allLessons?.length || 0

    // a. 1回あたりの平均利益
    const avgProfitPerLesson = totalLessons ? Math.floor(totalRevenue / totalLessons) : 0

    // b. 年間の平均利用回数
    let operationYears = 1
    if (allLessons && allLessons.length > 0) {
        const dates = allLessons.map(l => new Date(l.lesson_date).getTime())
        const firstDate = Math.min(...dates)
        const lastDate = Math.max(...dates)
        const diffYears = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25)
        operationYears = Math.max(0.1, diffYears)
    }
    const avgUsagePerYear = (totalCustomers && operationYears) ? (totalLessons / totalCustomers / operationYears) : 0

    // c. 平均継続年数
    const studentRanges = new Map<string, { min: number, max: number }>()
    allLessons?.forEach(l => {
        if (!l.student_id) return
        const time = new Date(l.lesson_date).getTime()
        if (!studentRanges.has(l.student_id)) {
            studentRanges.set(l.student_id, { min: time, max: time })
        } else {
            const range = studentRanges.get(l.student_id)!
            range.min = Math.min(range.min, time)
            range.max = Math.max(range.max, time)
        }
    })

    const totalRetentionMs = Array.from(studentRanges.values()).reduce((sum, r) => sum + (r.max - r.min), 0)
    const avgRetentionYears = studentRanges.size ? (totalRetentionMs / (1000 * 60 * 60 * 24 * 365.25) / studentRanges.size) : 0
    const ltv = Math.floor(avgProfitPerLesson * avgUsagePerYear * Math.max(1, avgRetentionYears))

    // 2. Fetch Data for the Selected Year (12 Months)
    const yearStart = new Date(selectedYear, 0, 1)
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59)

    let yearlyQuery = supabase
        .from('lessons')
        .select('lesson_date, price, coach_id')
        .gte('lesson_date', yearStart.toISOString())
        .lte('lesson_date', yearEnd.toISOString())

    if (selectedCoachId) {
        yearlyQuery = yearlyQuery.eq('coach_id', selectedCoachId)
    }
    const { data: currentYearLessons } = await yearlyQuery

    // Available Years for Filter (from all lessons)
    const availableYearsSet = new Set<number>()
    availableYearsSet.add(currentYear)
    allLessons?.forEach(l => {
        availableYearsSet.add(new Date(l.lesson_date).getFullYear())
    })
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a)

    // Aggregate Revenue by Month for the selected year
    const monthlyRevenueMap = new Map<number, number>()
    // Initialize 1-12 months
    for (let m = 1; m <= 12; m++) {
        monthlyRevenueMap.set(m, 0)
    }

    currentYearLessons?.forEach(l => {
        const month = new Date(l.lesson_date).getMonth() + 1
        monthlyRevenueMap.set(month, (monthlyRevenueMap.get(month) || 0) + (l.price || 0))
    })

    const finalGraphData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        return {
            name: `${month}月`,
            revenue: monthlyRevenueMap.get(month) || 0
        }
    })

    // 3. Fetch Top Customers (Yearly filtered)
    let customerLessonsQuery = supabase
        .from('lessons')
        .select(`
            price,
            student_id,
            coach_id,
            students (
                id,
                full_name,
                sex,
                avatar_url
            )
        `)
        .gte('lesson_date', yearStart.toISOString())
        .lte('lesson_date', yearEnd.toISOString())

    if (selectedCoachId) {
        customerLessonsQuery = customerLessonsQuery.eq('coach_id', selectedCoachId)
    }
    const { data: customerLessons } = await customerLessonsQuery

    const customerSpendMap = new Map<string, { student: any, total: number, count: number }>()

    customerLessons?.forEach(l => {
        if (!l.students) return
        // @ts-ignore
        const student = Array.isArray(l.students) ? l.students[0] : l.students
        if (!student) return

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
        .slice(0, 10)

    // 4. Fetch Coach Sales Data (Yearly filtered)
    let coachLessonsQuery = supabase
        .from('lessons')
        .select(`
            id,
            price,
            lesson_date,
            coach_id,
            profiles (
                id,
                full_name,
                avatar_url,
                override_coach_rank
            ),
            lesson_masters (
                id,
                unit_price,
                is_trial
            ),
            students (
                membership_types (
                    id,
                    membership_type_lessons (
                        lesson_master_id,
                        reward_price
                    )
                )
            )
        `)
        .gte('lesson_date', yearStart.toISOString())
        .lte('lesson_date', yearEnd.toISOString())

    if (selectedCoachId) {
        coachLessonsQuery = coachLessonsQuery.eq('coach_id', selectedCoachId)
    }
    const { data: coachLessonsData } = await coachLessonsQuery

    const { data: filterCoaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['coach', 'admin', 'owner'])
        .order('full_name')

    const coachLessonsMap = new Map<string, any[]>()
    coachLessonsData?.forEach(lesson => {
        if (!lesson.coach_id) return
        const existing = coachLessonsMap.get(lesson.coach_id) || []
        existing.push(lesson)
        coachLessonsMap.set(lesson.coach_id, existing)
    })

    const coachRanking = []
    for (const [coachId, lessons] of coachLessonsMap.entries()) {
        const profile = Array.isArray(lessons[0].profiles) ? lessons[0].profiles[0] : lessons[0].profiles
        if (!profile) continue
        // @ts-ignore
        const currentRate = calculateCoachRate(coachId, lessons, new Date(), profile.override_coach_rank)
        let totalSales = 0
        let totalReward = 0
        lessons.forEach(l => {
            totalSales += (l.price || 0)
            // @ts-ignore
            totalReward += calculateLessonReward(l, currentRate)
        })
        coachRanking.push({
            id: coachId,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            count: lessons.length,
            totalSales,
            totalReward
        })
    }
    coachRanking.sort((a, b) => b.totalSales - a.totalSales)

    const coachMonthlyData = coachLessonsMap.size > 0 ? (
        Array.from(coachLessonsMap.entries()).map(([coachId, lessons]) => {
            const profile = Array.isArray(lessons[0].profiles) ? lessons[0].profiles[0] : lessons[0].profiles
            const monthlyRevenue = new Map<string, number>()
            lessons.forEach(l => {
                const key = format(new Date(l.lesson_date), 'yyyy-MM')
                monthlyRevenue.set(key, (monthlyRevenue.get(key) || 0) + (l.price || 0))
            })
            return {
                coachId,
                coachName: profile?.full_name || '不明',
                avatarUrl: profile?.avatar_url,
                monthlyRevenue
            }
        })
    ) : []

    return (
        <div className="space-y-8 pb-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">売上・LTV分析</h1>
                    <p className="text-gray-500">事業全体の収益構造詳細分析</p>
                </div>
            </div>

            {/* Coach Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">表示対象コーチ:</span>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant={!selectedCoachId ? "default" : "outline"}
                                size="sm"
                                className="text-xs h-8"
                                asChild
                            >
                                <Link href={`/admin/analytics${selectedYearStr ? `?year=${selectedYearStr}` : ''}`}>全員</Link>
                            </Button>
                            {filterCoaches?.map(coach => (
                                <Button
                                    key={coach.id}
                                    variant={selectedCoachId === coach.id ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs h-8"
                                    asChild
                                >
                                    <Link href={`/admin/analytics?coach_id=${coach.id}${selectedYearStr ? `&year=${selectedYearStr}` : ''}`}>
                                        {coach.full_name}
                                    </Link>
                                </Button>
                            ))}
                        </div>
                    </div>
                    {selectedCoachId && (
                        <p className="text-xs text-slate-500">
                            ※{filterCoaches?.find(c => c.id === selectedCoachId)?.full_name} コーチの担当分のみを表示中
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <Activity className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">表示対象年度:</span>
                    <div className="flex gap-2">
                        {availableYears.map(yr => (
                            <Button
                                key={yr}
                                variant={selectedYear === yr ? "default" : "outline"}
                                size="sm"
                                className="text-xs h-8"
                                asChild
                            >
                                <Link href={`/admin/analytics?year=${yr}${selectedCoachId ? `&coach_id=${selectedCoachId}` : ''}`}>
                                    {yr}年
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">累計総売上</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">サービス開始からの全売上</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">平均LTV (顧客生涯価値)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-cyan-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-600">¥{ltv.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            利益/回: ¥{avgProfitPerLesson.toLocaleString()} × 年間頻度: {avgUsagePerYear.toFixed(1)}回 × 継続: {Math.max(1, avgRetentionYears).toFixed(1)}年
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">総顧客数</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCustomers}名</div>
                        <p className="text-xs text-muted-foreground mt-1">登録生徒総数</p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>{selectedYear}年 月次売上推移</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px]">
                        <RevenueChart data={finalGraphData} />
                    </div>
                </CardContent>
            </Card>

            {/* Coach Monthly Performance */}
            <CoachMonthlyPerformance data={coachMonthlyData} year={selectedYear} />

            {/* Rankings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CoachRankingTable data={coachRanking} />
                <CustomerRankingTable data={topCustomers} />
            </div>
        </div>
    )
}
