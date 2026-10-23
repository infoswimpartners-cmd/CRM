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
import { getTrioOnboardingStatus } from '@/actions/trio_onboarding'
import { getBroadcastCampaigns } from '@/actions/line-marketing'
import { AdminScheduledBroadcastWidget } from '@/components/admin/AdminScheduledBroadcastWidget'
import { AdminKpiCards } from '@/components/admin/dashboard/AdminKpiCards'
import { TodayScheduleTimeline } from '@/components/admin/dashboard/TodayScheduleTimeline'
import { NewLeadsWidget } from '@/components/admin/dashboard/NewLeadsWidget'
import { PendingApprovalsWidget } from '@/components/admin/dashboard/PendingApprovalsWidget'
import { QuickActionsWidget } from '@/components/admin/dashboard/QuickActionsWidget'
import { Crown, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Suspense } from 'react'

export default async function AdminDashboard(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const monthParam = typeof searchParams.month === 'string' ? searchParams.month : format(new Date(), 'yyyy-MM')

    return (
        <div className="relative space-y-6 md:space-y-8 pb-12 overflow-hidden px-4 md:px-0">
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

            {/* SwimPartners Quest (ERP & Gamification Dashboard) クイック起動バナー */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase">
                            NEW / ERP & RPG
                        </span>
                        <span className="text-xs font-bold text-cyan-300">
                            ギルドLv・月次P/L・投資回収計算機・コーチズギルド統合
                        </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        SwimPartners Quest（総合経営・顧客・コーチ評価コマンドセンター）
                    </h2>
                    <p className="text-xs text-slate-300">
                        年収1,000万円モデル（月間粗利105万円＝Guild Lv.50）到達度、代表人件費控除後P/L、LTV/CAC、自己資金ペイバック計算をリアルタイム分析
                    </p>
                </div>
                <Link
                    href="/admin/quest"
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs md:text-sm hover:brightness-110 transition shadow-lg"
                >
                    コマンドセンターを開く →
                </Link>
            </div>

            <Suspense fallback={<AdminDashboardSkeleton />}>
                <AdminDashboardContent monthParam={monthParam} />
            </Suspense>
        </div>
    )
}

function AdminDashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 h-36 border border-slate-200">
                        <div className="h-10 w-10 bg-slate-100 rounded-2xl mb-4"></div>
                        <div className="h-4 w-20 bg-slate-100 rounded mb-2"></div>
                        <div className="h-7 w-28 bg-slate-100 rounded"></div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                <div className="lg:col-span-8 bg-white rounded-3xl h-[600px] border border-slate-200"></div>
                <div className="lg:col-span-4 bg-white rounded-3xl h-[600px] border border-slate-200"></div>
            </div>
        </div>
    )
}

async function AdminDashboardContent({ monthParam }: { monthParam: string }) {
    try {
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

    // 当日（JST 00:00〜23:59）のレッスン範囲
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

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
        { data: appConfigs },
        { data: pendingChangeRequests },
        { data: todaySchedules },
        { data: leadsData },
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
                    student_coaches ( coach_id, option_reward_fee, option_reward_note ),
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
                    student_coaches ( coach_id, option_reward_fee, option_reward_note ),
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
                students ( id, full_name, student_number ),
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
            .like('key', 'coach_tax:%'),

        // 10. Fetch Pending Membership Change Requests
        supabase.from('membership_change_requests')
            .select(`
                *,
                student:students ( id, full_name, student_number ),
                requested:membership_types!requested_membership_type_id ( name )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),

        // 11. Fetch Today Schedules
        supabase.from('lesson_schedules')
            .select(`
                id, title, start_time, end_time, location, status,
                students ( id, full_name, student_number ),
                profiles ( id, full_name, avatar_url )
            `)
            .gte('start_time', todayStart.toISOString())
            .lte('start_time', todayEnd.toISOString())
            .order('start_time', { ascending: true }),

        // 12. Fetch New Leads
        supabase.from('leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
    ])

    // 10. THE TRIO Status (Fetch separately to avoid blocking other data if it fails)
    let trioStatusRes = { activeCount: 0, waitlistCount: 0, isFull: false };
    try {
        const res = await getTrioOnboardingStatus();
        if (!res.error) {
            trioStatusRes = { ...res, isFull: res.isFull ?? false };
        }
    } catch (err) {
        console.error('Failed to fetch TRIO status in admin dashboard:', err);
    }

    // 11. LINE一括配信予約キャンペーンの取得
    let scheduledCampaigns: any[] = [];
    try {
        const campRes = await getBroadcastCampaigns({ status: 'scheduled', limit: 10 });
        if (campRes.success) {
            scheduledCampaigns = campRes.campaigns;
        }
    } catch (err) {
        console.error('Failed to fetch scheduled campaigns in admin dashboard:', err);
    }

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

    const safeLessons = lessons || []
    const thisMonthLessons = safeLessons.filter(l => {
        const date = new Date(l.lesson_date)
        return date >= monthStart && date <= monthEnd
    })

    // Filter for LAST month sales summary (for comparison)
    const lastMonth = subMonths(targetDate, 1)
    const lastMonthStart = startOfMonth(lastMonth)
    const lastMonthEnd = endOfMonth(lastMonth)

    const lastMonthLessons = safeLessons.filter(l => {
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
        const student = Array.isArray(s.students) ? s.students[0] : s.students
        return {
            ...s,
            coach: profile || { full_name: '不明' },
            student_name: student?.full_name,
            student_id: student?.id,
            student_number: student?.student_number,
        }
    }) || []

    // Format Today Schedules for TodayScheduleTimeline
    const todayFormattedSchedules = (todaySchedules || []).map((s: any) => {
        const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        const student = Array.isArray(s.students) ? s.students[0] : s.students
        return {
            id: s.id,
            title: s.title,
            start_time: s.start_time,
            end_time: s.end_time,
            location: s.location,
            status: s.status,
            student_name: student?.full_name,
            student_id: student?.id,
            student_number: student?.student_number,
            coach: {
                id: profile?.id,
                full_name: profile?.full_name || '名称未設定',
                avatar_url: profile?.avatar_url,
            },
        }
    })
    const todayLessonsCount = todayFormattedSchedules.length

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
        <div className="space-y-6 md:space-y-8 animate-fade-in-up">
            {/* 最上部 SchoolHub 4大KPI統計カード */}
            <AdminKpiCards
                totalStudents={totalStudents || 0}
                todayLessonsCount={todayLessonsCount}
                activeCoachesCount={activeCoaches.length}
                totalCoachesCount={coaches?.length}
                totalSales={totalSales}
                grossProfit={grossProfit}
                uncollectedAmount={0}
                uncollectedCount={0}
                diffSales={diffSales}
                diffGrossProfit={diffGrossProfit}
                targetMonth={format(targetDate, 'yyyy年M月')}
            />

            {/* メインエリア SchoolHub 2カラム構成 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* メイン列（左: 8 cols） */}
                <div className="lg:col-span-8 space-y-6">
                    {/* ① 本日のレッスンスケジュールタイムライン */}
                    <TodayScheduleTimeline
                        schedules={todayFormattedSchedules}
                        dateStr={format(new Date(), 'yyyy年M月d日')}
                    />

                    {/* ② 直近レッスン状況・カルテ報告 */}
                    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/70">
                        {/* @ts-ignore */}
                        <AdminActivityWidget schedules={formattedSchedules} reports={recentReports || []} />
                    </div>

                    {/* ③ 年間売上推移グラフ */}
                    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/70 flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <div className="w-2 h-6 bg-blue-600 rounded-full" />
                                売上推移
                            </h3>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                {targetYear}年 月別売上統計
                            </p>
                        </div>
                        <div className="min-h-[300px]">
                            <RevenueChart data={yearlyRevenueData} />
                        </div>
                    </div>

                    {/* ④ コーチ別・優良顧客ランキング */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/70">
                            <CoachRankingTable data={coachRanking} limit={5} title="コーチ別売上ランキング (TOP5)" />
                        </div>
                        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/70">
                            <CustomerRankingTable data={topCustomers} limit={5} title="優良顧客ランキング (TOP5)" />
                        </div>
                    </div>
                </div>

                {/* サブ列（右: 4 cols） */}
                <div className="lg:col-span-4 space-y-6">
                    {/* ① 新着体験申込リード */}
                    <NewLeadsWidget leads={leadsData || []} />

                    {/* ② 未承認請求・プラン変更申請 */}
                    <PendingApprovalsWidget pendingRequests={pendingChangeRequests || []} />

                    {/* ③ 実務クイックアクション */}
                    <QuickActionsWidget />

                    {/* ④ LINE予約配信 */}
                    <AdminScheduledBroadcastWidget initialCampaigns={scheduledCampaigns} />

                    {/* ⑤ THE TRIO 稼働ミニカード */}
                    <Link href="/admin/trio/slots" className="block group">
                        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-indigo-200 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 flex items-center justify-center">
                                        <Crown className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800">THE TRIO 稼働状況</span>
                                </div>
                                <Badge variant="outline" className={cn(
                                    "text-[10px] uppercase font-black px-2 py-0.5",
                                    trioStatusRes.isFull ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                )}>
                                    {trioStatusRes.isFull ? "満員" : "募集中"}
                                </Badge>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                                    {trioStatusRes.activeCount} <span className="text-xs font-medium text-slate-500">/ 12 名</span>
                                </span>
                                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                    <Timer className="w-3.5 h-3.5" />
                                    待ち {trioStatusRes.waitlistCount} 名
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
    } catch (e) {
        console.error('AdminDashboardContent render error:', e)
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <p className="text-base font-bold text-slate-800">ダッシュボードの表示中に一時的な遅延が発生しました</p>
                <p className="text-sm text-slate-500">時間をおいて再度読み込みをお試しください。</p>
            </div>
        )
    }
}
