import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, TrendingUp, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { CoachMonthlyPerformance } from '@/components/admin/analytics/CoachMonthlyPerformance'
import { AnalyticsFilters } from '@/components/admin/analytics/AnalyticsFilters'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ coach_id?: string, year?: string }> }) {
    const { coach_id: selectedCoachId, year: selectedYearStr } = await searchParams
    const supabase = await createClient()

    const currentYear = new Date().getFullYear()
    const selectedYear = selectedYearStr ? parseInt(selectedYearStr) : currentYear

    // 対象年度の期間
    const yearStart = new Date(selectedYear, 0, 1)
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59)

    // 対象期間・対象コーチのレッスンデータ取得（LTV計算用）
    let lessonsQuery = supabase
        .from('lessons')
        .select('price, coach_id, lesson_date, student_id')
        .gte('lesson_date', yearStart.toISOString())
        .lte('lesson_date', yearEnd.toISOString())

    if (selectedCoachId) {
        lessonsQuery = lessonsQuery.eq('coach_id', selectedCoachId)
    }
    const { data: allLessons } = await lessonsQuery

    // ---- 新LTV計算式 ----
    // 総売上額：対象期間内の購入金額合計
    const totalRevenue = allLessons?.reduce((sum, l) => sum + (l.price || 0), 0) || 0
    // 総注文件数（決済回数）：取引データの全件数
    const totalOrders = allLessons?.length || 0
    // 累計ユニーク顧客数：購入した顧客の頭数（重複除去）
    const uniqueStudentIds = new Set(allLessons?.map(l => l.student_id).filter(Boolean))
    const uniqueCustomerCount = uniqueStudentIds.size

    // A: 平均購買単価 = 総売上額 ÷ 総注文件数
    const avgOrderValue = totalOrders > 0 ? Math.floor(totalRevenue / totalOrders) : 0
    // B: 平均購買回数 = 総注文件数 ÷ 累計ユニーク顧客数
    const avgPurchaseFrequency = uniqueCustomerCount > 0 ? totalOrders / uniqueCustomerCount : 0
    // LTV = A × B
    const ltv = Math.floor(avgOrderValue * avgPurchaseFrequency)
    // ----------------------

    // 利用可能な年度一覧（全データから取得）
    const { data: allLessonsForYears } = await supabase
        .from('lessons')
        .select('lesson_date')

    const availableYearsSet = new Set<number>()
    availableYearsSet.add(currentYear)
    allLessonsForYears?.forEach(l => {
        availableYearsSet.add(new Date(l.lesson_date).getFullYear())
    })
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a)

    // 月次売上グラフ用データ（対象年度）
    const monthlyRevenueMap = new Map<number, number>()
    for (let m = 1; m <= 12; m++) {
        monthlyRevenueMap.set(m, 0)
    }
    allLessons?.forEach(l => {
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

    // コーチ別月次売上推移データ（シリアライズ可能な Record 形式）
    let coachLessonsQuery = supabase
        .from('lessons')
        .select(`
            price,
            lesson_date,
            coach_id,
            profiles (
                id,
                full_name,
                avatar_url
            )
        `)
        .gte('lesson_date', yearStart.toISOString())
        .lte('lesson_date', yearEnd.toISOString())

    if (selectedCoachId) {
        coachLessonsQuery = coachLessonsQuery.eq('coach_id', selectedCoachId)
    }
    const { data: coachLessonsData } = await coachLessonsQuery

    // coachId ごとにレッスンをグループ化
    const coachLessonsMap = new Map<string, any[]>()
    coachLessonsData?.forEach(lesson => {
        if (!lesson.coach_id) return
        const existing = coachLessonsMap.get(lesson.coach_id) || []
        existing.push(lesson)
        coachLessonsMap.set(lesson.coach_id, existing)
    })

    // シリアライズ可能なコーチ月次データ（Map → Record<string, number>）
    const coachMonthlyData = Array.from(coachLessonsMap.entries()).map(([coachId, lessons]) => {
        const profile = Array.isArray(lessons[0].profiles) ? lessons[0].profiles[0] : lessons[0].profiles
        const monthlyRevenue: Record<string, number> = {}
        lessons.forEach(l => {
            const key = format(new Date(l.lesson_date), 'yyyy-MM')
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (l.price || 0)
        })
        return {
            coachId,
            coachName: profile?.full_name || '不明',
            avatarUrl: profile?.avatar_url ?? null,
            monthlyRevenue
        }
    })

    // コーチ一覧（フィルター用）
    const { data: filterCoaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['coach', 'admin', 'owner'])
        .order('full_name')

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

            {/* フィルターパネル（プルダウン） */}
            <AnalyticsFilters
                coaches={filterCoaches || []}
                selectedCoachId={selectedCoachId}
                selectedYear={selectedYear}
                availableYears={availableYears}
            />

            {/* KPI カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">{selectedYear}年 総売上</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            対象期間合計 / {totalOrders.toLocaleString()}件
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">LTV（顧客生涯価値）</CardTitle>
                        <TrendingUp className="h-4 w-4 text-cyan-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-600">¥{ltv.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                            <div>平均購買単価(A)：¥{avgOrderValue.toLocaleString()}</div>
                            <div>平均購買回数(B)：{avgPurchaseFrequency.toFixed(2)}回</div>
                            <div className="text-slate-400 text-[9px]">LTV = A × B（{selectedYear}年データ）</div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">ユニーク顧客数</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uniqueCustomerCount}名</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {selectedYear}年 購入顧客（延べ{totalOrders}件）
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 月次売上グラフ */}
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

            {/* コーチ別月次売上推移 */}
            <CoachMonthlyPerformance data={coachMonthlyData} year={selectedYear} />
        </div>
    )
}
