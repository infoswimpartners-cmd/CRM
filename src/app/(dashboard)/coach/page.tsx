import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusCircle, History, User, Calendar as CalendarIcon } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import { CoachRewardCard } from '@/components/dashboard/CoachRewardCard'
import { startOfMonth, subMonths, endOfMonth } from 'date-fns'

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

    // 1. Calculate Reward Rate (Server-Side)
    const today = new Date()
    const threeMonthsAgo = startOfMonth(subMonths(today, 3))
    const lastMonthEnd = endOfMonth(subMonths(today, 1))

    const { count } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id)
        .gte('lesson_date', threeMonthsAgo.toISOString())
        .lte('lesson_date', lastMonthEnd.toISOString())

    const average = (count || 0) / 3
    let rate = 0.50
    const isAdmin = profile?.role === 'admin'

    if (isAdmin) {
        rate = 1.0 // Admin always 100%
    } else {
        if (average >= 30) rate = 0.70
        else if (average >= 25) rate = 0.65
        else if (average >= 20) rate = 0.60
        else if (average >= 15) rate = 0.55
    }

    // 2. Fetch Recent Lessons with Data for Reward Calc
    const { data: recentLessons } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(5)

    // Helper to calc reward per lesson
    const calculateLessonReward = (lesson: any) => {
        const master = lesson.lesson_masters
        if (!master) return 0

        if (master.is_trial) {
            return 4500
        }

        // Membership Reward override
        // Note: The type definition for join is tricky, relying on runtime structure
        const membershipRewardPrice = lesson.students?.membership_types?.reward_master?.unit_price
        const basePrice = membershipRewardPrice ?? master.unit_price

        return Math.floor(basePrice * rate)
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-6 rounded-lg border shadow-sm">
                <Avatar className="h-20 w-20 border-2 border-primary/10">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xl bg-primary/5 text-primary">
                        {profile?.full_name?.slice(0, 1) || 'C'}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-center md:text-left gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        こんにちは、{profile?.full_name || 'コーチ'}さん
                        {profile?.coach_number && (
                            <Badge variant="secondary" className="ml-2">
                                {profile.coach_number}
                            </Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground">
                        今日のレッスン報告やスケジュールの確認を行いましょう
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <CoachRewardCard />

                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5 text-blue-600" />
                            新規レポート作成
                        </CardTitle>
                        <CardDescription>レッスンの実施報告を作成します</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full" size="lg">
                            <Link href="/coach/report">レポート作成</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-green-600" />
                            スケジュール
                        </CardTitle>
                        <CardDescription>予定の確認・追加</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full bg-green-600 hover:bg-green-700" size="lg">
                            <Link href="/coach/schedule">カレンダーを見る</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            最近の履歴
                        </CardTitle>
                        <CardDescription>最近提出したレッスン報告（報酬額）</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentLessons && recentLessons.length > 0 ? (
                            <div className="space-y-4">
                                {recentLessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm">{lesson.student_name}</p>
                                            <p className="text-xs text-gray-500">{new Date(lesson.lesson_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-sm text-blue-600">
                                                ¥{calculateLessonReward(lesson).toLocaleString()}
                                            </p>
                                            {/* Show badge if Trial or Special? Optional */}
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            プロフィール
                        </CardTitle>
                        <CardDescription>登録情報の確認・変更</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" asChild className="w-full">
                            <Link href="/coach/profile">設定へ移動</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
