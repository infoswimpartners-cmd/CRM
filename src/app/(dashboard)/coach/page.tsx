import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, History, User, Calendar as CalendarIcon, DollarSign, Users, Waves, FileText } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns'
import { CoachActivityWidget } from '@/components/dashboard/CoachActivityWidget'
import { calculateCoachRate, calculateMonthlyStats } from '@/lib/reward-system'

export const dynamic = 'force-dynamic'

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

    // 1. Fetch Lessons Data (Broad range for 3 months history)
    const today = new Date()
    const threeMonthsAgo = startOfMonth(subMonths(today, 3))

    const { data: allLessons } = await supabase
        .from('lessons')
        .select(`
            *,
            lesson_masters (
                id,
                name,
                unit_price,
                is_trial
            ),
            students (
                id,
                full_name,
                membership_types!students_membership_type_id_fkey (
                    id
                )
            ),
            profiles (
                full_name,
                avatar_url
            )
        `)
        .eq('coach_id', user.id)
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

    // Calculate Last Month Stats for KPI Diff
    const lastMonthDate = subMonths(today, 1)
    const lastMonthStart = startOfMonth(lastMonthDate)
    const lastMonthEnd = endOfMonth(lastMonthDate)
    const lastMonthRate = isAdmin ? 1.0 : calculateCoachRate(user.id, allLessons as any || [], lastMonthDate)
    const lastMonthLessons = allLessons?.filter(l => {
        const d = new Date(l.lesson_date)
        return d >= lastMonthStart && d <= lastMonthEnd
    }) || []
    const lastMonthStats = calculateMonthlyStats(user.id, lastMonthLessons as any[], lastMonthRate)

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
    const lessonDiff = thisMonthStats.lessonCount - lastMonthStats.lessonCount

    // Calculate Last Month Stats for K
    // ... (This context is just to locate safely)

    // ...

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Welcome & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Welcome back, <span className="text-blue-600">{profile?.full_name || 'Coach'}</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">今日の予定を確認して、レッスン業務を開始しましょう。</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200">
                        <Link href="/coach/schedule">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            予定を登録
                        </Link>
                    </Button>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 border-none">
                        <Link href="/coach/report">
                            <FileText className="mr-2 h-4 w-4" />
                            レッスン報告
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Reward Card */}
                        <Card className="border-none shadow-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white relative overflow-hidden group">
                            <div className="absolute right-0 top-0 h-full w-24 bg-white/10 -skew-x-12 transform translate-x-12 transition-transform group-hover:translate-x-6" />
                            <CardContent className="p-6 relative z-10">
                                <p className="text-blue-100 text-sm font-medium">今月の報酬 (見込)</p>
                                <h3 className="text-3xl font-bold mt-2">¥{thisMonthStats.totalReward.toLocaleString()}</h3>
                                <p className="text-xs text-blue-100 mt-4 opacity-80">確定までお待ちください</p>
                            </CardContent>
                            <DollarSign className="absolute right-4 bottom-4 text-white/20 w-24 h-24 -mb-8 -mr-8" />
                        </Card>

                        {/* Students Card */}
                        <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 bg-white">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">アクティブ生徒</p>
                                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{activeStudents}</h3>
                                    </div>
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                                        <Users className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-sm">
                                    {newStudentsCount > 0 && (
                                        <span className="text-green-600 font-medium badge bg-green-50 px-2 py-0.5 rounded text-xs">
                                            +{newStudentsCount} 新規
                                        </span>
                                    )}
                                    <span className="text-slate-400 text-xs">直近3ヶ月の受講者</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lessons Card */}
                        <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 bg-white">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">実施レッスン</p>
                                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{thisMonthStats.lessonCount}</h3>
                                    </div>
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600 group-hover:bg-purple-100 transition-colors">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-sm">
                                    <span className={`${lessonDiff >= 0 ? 'text-green-600' : 'text-red-500'} font-medium`}>
                                        {lessonDiff >= 0 ? '+' : ''}{lessonDiff}
                                    </span>
                                    <span className="text-slate-400">前月比</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full min-h-[500px] overflow-hidden">
                        <CoachActivityWidget
                            // @ts-ignore
                            schedules={upcomingSchedules || []}
                            // @ts-ignore
                            reports={recentLessons || []}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
