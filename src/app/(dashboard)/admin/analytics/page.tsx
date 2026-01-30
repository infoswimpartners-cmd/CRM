import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, TrendingUp, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { calculateCoachRate, calculateLessonReward } from '@/lib/reward-system'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
    const supabase = await createClient()

    // 1. Fetch KPI Data (Total Sales, Total Customers for LTV)
    const { data: allLessons } = await supabase
        .from('lessons')
        .select('price')

    const { count: totalCustomers } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

    const totalRevenue = allLessons?.reduce((sum, l) => sum + (l.price || 0), 0) || 0
    const ltv = totalCustomers ? Math.floor(totalRevenue / totalCustomers) : 0

    // 2. Fetch 12 Months Revenue Data
    const today = new Date()
    const twelveMonthsAgo = subMonths(today, 11)
    const twelveMonthsStart = startOfMonth(twelveMonthsAgo)

    const { data: twelveMonthLessons } = await supabase
        .from('lessons')
        .select('lesson_date, price')
        .gte('lesson_date', twelveMonthsStart.toISOString())
        .lte('lesson_date', endOfMonth(today).toISOString())

    // Aggregate Revenue
    const revenueMap = new Map<string, number>()
    const graphData = []

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
        const d = subMonths(today, i)
        const key = format(d, 'yyyy-MM')
        const label = format(d, 'yyyy/MM')
        revenueMap.set(key, 0)
        graphData.push({ name: label, key }) // store key for matching
    }

    twelveMonthLessons?.forEach(l => {
        const key = format(new Date(l.lesson_date), 'yyyy-MM')
        if (revenueMap.has(key)) {
            revenueMap.set(key, revenueMap.get(key)! + (l.price || 0))
        }
    })

    const finalGraphData = graphData.map(d => ({
        name: d.name,
        revenue: revenueMap.get(d.key) || 0
    }))

    // 3. Fetch Top Customers (LTV Ranking)
    // This is expensive in SQL without aggregation, doing JS aggregation for now as dataset is small
    const { data: customerLessons } = await supabase
        .from('lessons')
        .select(`
            price,
            student_id,
            students (
                id,
                full_name,
                sex,
                avatar_url
            )
        `)

    const customerSpendMap = new Map<string, { student: any, total: number, count: number }>()

    customerLessons?.forEach(l => {
        if (!l.students) return
        // @ts-ignore: Handle array or object return from Supabase
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
        .slice(0, 10) // Top 10

    // 4. Fetch Coach Sales Data with details for Reward Calculation
    const { data: coachLessonsData } = await supabase
        .from('lessons')
        .select(`
            id,
            price,
            lesson_date,
            coach_id,
            profiles (
                id,
                full_name,
                avatar_url
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

    // Group lessons by coach to calculate rate and rewards
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

        // Calculate Current Rate (using today as reference)
        // @ts-ignore: Type compatibility for helper function
        const currentRate = calculateCoachRate(coachId, lessons, new Date())

        let totalSales = 0
        let totalReward = 0

        lessons.forEach(l => {
            totalSales += (l.price || 0)
            // @ts-ignore: Type compatibility
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

    // Sort by Total Sales desc
    coachRanking.sort((a, b) => b.totalSales - a.totalSales)

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
                        <p className="text-xs text-muted-foreground mt-1">1人あたりの平均累計支払額</p>
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
                    <CardTitle>月次売上推移 (直近12ヶ月)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px]">
                        <RevenueChart data={finalGraphData} />
                    </div>
                </CardContent>
            </Card>

            {/* Top Customers (LTV Ranking) */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800">優良顧客ランキング (Top 10)</h2>
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">順位</th>
                                    <th className="px-6 py-3 font-medium">生徒名</th>
                                    <th className="px-6 py-3 font-medium text-right">レッスン回数</th>
                                    <th className="px-6 py-3 font-medium text-right">累計支払額 (LTV)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topCustomers.map((customer, index) => (
                                    <tr key={customer.student.id} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 w-16">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={customer.student.avatar_url} />
                                                    <AvatarFallback>{customer.student.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <Link href={`/customers/${customer.student.id}`} className="font-medium text-slate-700 hover:text-cyan-600 hover:underline">
                                                    {customer.student.full_name}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {customer.count}回
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-cyan-700">
                                            ¥{customer.total.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Coach Sales Ranking */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800">コーチ別売上・報酬ランキング</h2>
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">順位</th>
                                    <th className="px-6 py-3 font-medium">コーチ名</th>
                                    <th className="px-6 py-3 font-medium text-right">レッスン回数</th>
                                    <th className="px-6 py-3 font-medium text-right">累計売上</th>
                                    <th className="px-6 py-3 font-medium text-right">累計報酬 (概算)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coachRanking.map((coach, index) => (
                                    <tr key={coach.id} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 w-16">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={coach.avatar_url} />
                                                    <AvatarFallback>{coach.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <Link href={`/admin/coaches/${coach.id}`} className="font-medium text-slate-700 hover:text-cyan-600 hover:underline">
                                                    {coach.full_name}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {coach.count}回
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                                            ¥{coach.totalSales.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-cyan-700">
                                            ¥{coach.totalReward.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
