import { createClient } from '@/lib/supabase/server'
import { LessonTable } from '@/components/admin/LessonTable'
import { SalesSummary } from '@/components/admin/SalesSummary'
import { CoachRewardTable } from '@/components/admin/CoachRewardTable'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Settings, Users, User, PlusCircle, Calendar as CalendarIcon, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminDashboardTabs } from '@/components/admin/AdminDashboardTabs'

export const dynamic = 'force-dynamic'

import { MonthSelector } from '@/components/admin/MonthSelector'
import { format } from 'date-fns'
import { CoachRewardCard } from '@/components/dashboard/CoachRewardCard'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
                membership_types (
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
                membership_types (
                    reward_master:lesson_masters!reward_master_id (
                        unit_price
                    )
                )
            )
        `)
        .eq('coach_id', user.id)
        .order('lesson_date', { ascending: false }) // Use lesson_date for display order
        .limit(5)

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
                // @ts-ignore (not handling all potential nulls perfectly here for brevity)

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


            <SalesSummary
                totalSales={totalSales}
                lessonCount={thisMonthLessons.length}
                totalProfit={totalProfit}
                diffSales={diffSales}
                diffProfit={diffProfit}
                diffCount={diffCount}
            />

            <div className="py-6">
                <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-700">
                    <User className="h-5 w-5" />
                    マイ・コーチング活動
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <CoachRewardCard />

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                最近のレッスン履歴
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myRecentLessons && myRecentLessons.length > 0 ? (
                                <div className="space-y-4">
                                    {myRecentLessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-sm">{lesson.student_name}</p>
                                                <p className="text-xs text-gray-500">{new Date(lesson.lesson_date).toLocaleDateString()}</p>
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
                                    <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
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
                </div>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-1">
                <AdminDashboardTabs
                    performanceContent={<CoachRewardTable coaches={activeCoaches} lessons={lessons as any} targetDate={targetDate} />}
                    historyContent={<LessonTable lessons={lessons as any} />}
                />
            </div>

            <div className="border-t pt-8">
                <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-slate-700">
                    <User className="h-5 w-5" />
                    コーチ業務メニュー
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <Link href="/coach/report">
                        <Card className="hover://bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">新規レポート作成</CardTitle>
                                <PlusCircle className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">レッスンの実施報告を作成します</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/coach/schedule">
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">スケジュール</CardTitle>
                                <CalendarIcon className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">予定の確認・追加</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/coach/history">
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-slate-200 shadow-none hover:shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-700">レッスン履歴</CardTitle>
                                <History className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">提出済みレポートの確認</div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
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
