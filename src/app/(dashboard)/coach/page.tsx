import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, History, User, Calendar as CalendarIcon, DollarSign, Users, Waves } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns'
import { CoachActivityWidget } from '@/components/dashboard/CoachActivityWidget'
import { calculateCoachRate, calculateMonthlyStats } from '@/lib/reward-system'
import { MonthlyFinancialsWidget } from '@/components/coach/MonthlyFinancialsWidget'

export default async function CoachDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // 1. Fetch Lessons Data (Broad range for 6 months history + 3 months rank)
    // We need 9 months of data ideally (6 months display + 3 months calc for the oldest displayed month)
    // But for simplicity/performance in this view, let's fetch last 9 months.
    const today = new Date()
    const nineMonthsAgo = startOfMonth(subMonths(today, 9))

    const { data: allLessons } = await supabase
        .from('lessons')
        .select(`
            *,
            lesson_masters (
                is_trial,
                unit_price
            ),
            students (
                membership_types (
                    reward_master:lesson_masters!reward_master_id (
                        unit_price
                    )
                )
            )
        `)
        .eq('coach_id', user.id)
        .gte('lesson_date', nineMonthsAgo.toISOString())
        .order('lesson_date', { ascending: false })

    // 2. Calculate Stats for this month and past months
    const isAdmin = profile?.role === 'admin'
    const currentRate = isAdmin ? 1.0 : calculateCoachRate(user.id, allLessons as any || [], today)
    const thisMonthStart = startOfMonth(today)
    const thisMonthEnd = endOfMonth(today)

    const thisMonthLessons = allLessons?.filter(l => {
        const d = new Date(l.lesson_date)
        return d >= thisMonthStart && d <= thisMonthEnd
    }) || []

    const thisMonthStats = calculateMonthlyStats(user.id, thisMonthLessons as any[], currentRate)

    // Generate 6 months reports for widget
    const monthlyReports = []
    for (let i = 0; i < 6; i++) {
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)
        const monthEnd = endOfMonth(d)

        // Rate for THAT specific month (based on 3 months prior to THAT month)
        const monthRate = isAdmin ? 1.0 : calculateCoachRate(user.id, allLessons as any || [], d)

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

    // 3. (Kept) Fetch Upcoming Schedules
    const now = new Date().toISOString()
    const { data: upcomingSchedulesRaw } = await supabase
        .from('lesson_schedules')
        .select(`
            id,
            title,
            start_time,
            end_time,
            location,
            students ( full_name )
        `)
        .eq('coach_id', user.id)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5)

    const upcomingSchedules = upcomingSchedulesRaw?.map(s => ({
        id: s.id,
        title: s.title || 'レッスン',
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location,
        // @ts-ignore
        student_name: Array.isArray(s.students) ? s.students[0]?.full_name : s.students?.full_name,
        coach: {
            full_name: profile?.full_name || '名称未設定',
            avatar_url: profile?.avatar_url
        }
    })) || []

    // 4. (Kept) Recent Lessons for "Report/Memo Tab" (already have allLessons, just slice top 5)
    // But existing code uses `getStudentMemos` or specific fetch? logic was fetch with students..
    // allLessons has what we need but simplified. Let's reuse allLessons or fetch proper structure if needed.
    // The previous code fetched separate recentLessons.
    // Let's use `allLessons` slice(0,5) but ensure it has `students` and `profiles` if needed.
    // `allLessons` has `students`.
    const recentLessons = allLessons?.slice(0, 5) || []

    // Calculate Active & New Students
    const threeMonthsStart = startOfMonth(subMonths(today, 2))
    const activeStudents = new Set(
        allLessons?.filter(l => new Date(l.lesson_date) >= threeMonthsStart)
            .map(l => l.student_id)
    ).size

    const previousStudents = new Set(
        allLessons?.filter(l => new Date(l.lesson_date) < thisMonthStart)
            .map(l => l.student_id)
    )
    const thisMonthStudentIds = new Set(thisMonthLessons.map(l => l.student_id))
    let newStudentsCount = 0
    thisMonthStudentIds.forEach(id => {
        if (!previousStudents.has(id)) newStudentsCount++
    })

    // Calculate Lesson Diff
    const lastMonthCount = monthlyReports[1]?.count || 0
    const lessonDiff = thisMonthStats.lessonCount - lastMonthCount

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[800px] xl:h-[600px]">
                {/* Left Column: Charts & KPIs */}
                <div className="xl:col-span-2 flex flex-col gap-6 h-full overflow-y-auto pr-2">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                        <div className="bg-white rounded-2xl p-6 relative overflow-hidden group shadow-sm border border-slate-200">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign className="w-32 h-32 text-cyan-500" />
                            </div>
                            <div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">今月の報酬 (見込)</p>
                                    <h3 className="text-3xl font-bold text-slate-900 mt-1">¥{thisMonthStats.totalReward.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 relative overflow-hidden group shadow-sm border border-slate-200">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users className="w-32 h-32 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">アクティブ生徒数 (直近3ヶ月)</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1">{activeStudents}</h3>
                                <div className="flex items-center gap-2 mt-4 text-sm text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
                                    <span>{newStudentsCount > 0 ? '+' : ''}{newStudentsCount}</span>
                                    <span className="text-slate-500">今月の新規</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 relative overflow-hidden group shadow-sm border border-slate-200">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CalendarIcon className="w-32 h-32 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">レッスン数 (今月)</p>
                                <h3 className="text-3xl font-bold text-slate-900 mt-1">{thisMonthStats.lessonCount}</h3>
                                <div className={`flex items-center gap-2 mt-4 text-sm w-fit px-2 py-1 rounded-lg ${lessonDiff >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                    <span>{lessonDiff >= 0 ? '+' : ''}{lessonDiff}</span>
                                    <span className="text-slate-500">前月比</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Financials Widget */}
                    <div className="mt-6">
                        <MonthlyFinancialsWidget reports={monthlyReports} />
                    </div>
                </div>

                {/* Right Column: Activity Widget */}
                <div className="xl:col-span-1 h-full min-h-[500px]">
                    <CoachActivityWidget
                        // @ts-ignore
                        schedules={upcomingSchedules || []}
                        // @ts-ignore
                        reports={recentLessons || []}
                    />
                </div>
            </div>
        </div >
    )
}
