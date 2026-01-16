import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { LessonHistoryRow } from '@/components/coach/LessonHistoryRow'

export default async function CoachHistoryPage({
    searchParams,
}: {
    searchParams: { month?: string }
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Determine date range for filtering
    const currentDate = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null
    const monthParam = searchParams.month

    if (monthParam) {
        // format: yyyy-MM
        const [year, month] = monthParam.split('-').map(Number)
        if (!isNaN(year) && !isNaN(month)) {
            const date = new Date(year, month - 1)
            startDate = startOfMonth(date)
            endDate = endOfMonth(date)
        }
    }

    // Build query
    let query = supabase
        .from('lessons')
        .select('*')
        .eq('coach_id', user.id)
        .order('lesson_date', { ascending: false })

    if (startDate && endDate) {
        query = query
            .gte('lesson_date', startDate.toISOString())
            .lte('lesson_date', endDate.toISOString())
    }

    const { data: lessons } = await query

    // Calculate months for navigation links
    const thisMonth = format(currentDate, 'yyyy-MM')
    const lastMonth = format(subMonths(currentDate, 1), 'yyyy-MM')
    const twoMonthsAgo = format(subMonths(currentDate, 2), 'yyyy-MM')

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/coach">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">レッスン履歴</h1>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                    variant={!monthParam ? "default" : "outline"}
                    asChild
                >
                    <Link href="/coach/history">全期間</Link>
                </Button>
                <Button
                    variant={monthParam === thisMonth ? "default" : "outline"}
                    asChild
                >
                    <Link href={`/coach/history?month=${thisMonth}`}>今月</Link>
                </Button>
                <Button
                    variant={monthParam === lastMonth ? "default" : "outline"}
                    asChild
                >
                    <Link href={`/coach/history?month=${lastMonth}`}>先月</Link>
                </Button>
                <Button
                    variant={monthParam === twoMonthsAgo ? "default" : "outline"}
                    asChild
                >
                    <Link href={`/coach/history?month=${twoMonthsAgo}`}>先々月</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {monthParam ? `${format(new Date(monthParam), 'yyyy年M月', { locale: ja })}のレッスン` : '全期間のレッスン'}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {lessons?.length || 0}件
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {lessons && lessons.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">日時</TableHead>
                                        <TableHead>生徒名</TableHead>
                                        <TableHead className="hidden md:table-cell">場所</TableHead>
                                        <TableHead className="hidden md:table-cell">内容</TableHead>
                                        <TableHead className="text-right">金額</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lessons.map((lesson) => (
                                        <LessonHistoryRow key={lesson.id} lesson={lesson} />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            該当するレッスン履歴はありません。
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
