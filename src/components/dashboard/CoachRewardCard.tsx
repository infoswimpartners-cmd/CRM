'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { Loader2, Coins, TrendingUp, Award } from 'lucide-react'

interface Lesson {
    id: string
    lesson_date: string
    lesson_master_id: string
    lesson_masters?: {
        unit_price: number
        is_trial: boolean
    }
}

type Rank = 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Standard'

export function CoachRewardCard() {
    const [loading, setLoading] = useState(true)
    const [rank, setRank] = useState<Rank>('Standard')
    const [rewardRate, setRewardRate] = useState(0.5)
    const [avgLessonCount, setAvgLessonCount] = useState(0)
    const [currentMonthReward, setCurrentMonthReward] = useState(0)
    const [currentMonthCount, setCurrentMonthCount] = useState({ normal: 0, trial: 0 })
    const [breakdown, setBreakdown] = useState({
        normalAmount: 0,
        trialAmount: 0,
        grossReward: 0,
        taxAmount: 0
    })

    useEffect(() => {
        const calculateRewards = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            // 1. Calculate Rank (Last 3 months average)
            // Range: Start of 3 months ago to End of last month
            const today = new Date()
            const threeMonthsAgo = startOfMonth(subMonths(today, 3))
            const lastMonthEnd = endOfMonth(subMonths(today, 1))

            // Fetch lessons for rank calculation
            const { data: pastLessons } = await supabase
                .from('lessons')
                .select('id, lesson_date')
                .eq('coach_id', user.id)
                .gte('lesson_date', threeMonthsAgo.toISOString())
                .lte('lesson_date', lastMonthEnd.toISOString())

            let totalPastLessons = 0
            if (pastLessons) {
                totalPastLessons = pastLessons.length
            }
            // Average over 3 months
            const average = totalPastLessons / 3
            setAvgLessonCount(average)

            // Determine Rank
            let currentRank: Rank = 'Standard'
            let rate = 0.50

            if (average >= 30) {
                currentRank = 'Platinum'
                rate = 0.70
            } else if (average >= 25) {
                currentRank = 'Gold'
                rate = 0.65
            } else if (average >= 20) {
                currentRank = 'Silver'
                rate = 0.60
            } else if (average >= 15) {
                currentRank = 'Bronze'
                rate = 0.55
            }

            setRank(currentRank)
            setRewardRate(rate)

            // 2. Calculate Current Month Reward
            const currentMonthStart = startOfMonth(today)
            const currentMonthEnd = endOfMonth(today)

            // Fetch current month lessons with master data
            const { data: currentLessons } = await supabase
                .from('lessons')
                .select(`
                    id, 
                    lesson_date, 
                    lesson_master_id,
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
                .eq('coach_id', user.id)
                .gte('lesson_date', currentMonthStart.toISOString())
                .lte('lesson_date', currentMonthEnd.toISOString()) as { data: any[] | null }

            let totalReward = 0
            let normalCount = 0
            let trialCount = 0
            let normalAmount = 0
            let trialAmount = 0

            if (currentLessons) {
                currentLessons.forEach(lesson => {
                    const master = lesson.lesson_masters
                    // Check if student has a membership with a specific reward master
                    const membershipRewardMaster = lesson.students?.membership_types?.reward_master

                    if (!master) return

                    if (master.is_trial) {
                        // Trial Lesson: Fixed 4,500 JPY
                        const amount = 4500
                        totalReward += amount
                        trialAmount += amount
                        trialCount++
                    } else {
                        // Determine base price: Membership Reward Master > Lesson Master Price
                        const basePrice = membershipRewardMaster?.unit_price ?? master.unit_price

                        // Normal Lesson: Base Price * Rank Rate
                        const amount = basePrice * rate
                        totalReward += amount
                        normalAmount += amount
                        normalCount++
                    }
                })
            }

            // 3. Calculate Tax (10.21%)
            const grossReward = Math.floor(totalReward)
            const taxAmount = Math.floor(grossReward * 0.1021)
            const netReward = grossReward - taxAmount

            setCurrentMonthReward(netReward)
            setCurrentMonthCount({ normal: normalCount, trial: trialCount })
            setBreakdown({
                normalAmount: Math.floor(normalAmount),
                trialAmount: Math.floor(trialAmount),
                grossReward: grossReward,
                taxAmount: taxAmount
            })
            setLoading(false)
        }

        calculateRewards()
    }, [])

    const getRankColor = (r: Rank) => {
        switch (r) {
            case 'Platinum': return 'text-slate-300 bg-slate-800' // Platinum
            case 'Gold': return 'text-yellow-600 bg-yellow-100'
            case 'Silver': return 'text-slate-600 bg-slate-100'
            case 'Bronze': return 'text-orange-700 bg-orange-100'
            default: return 'text-blue-600 bg-blue-100'
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-gradient-to-br from-white to-gray-50 border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">今月の振込予定額</CardTitle>
                <Coins className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="text-2xl font-bold">¥{currentMonthReward.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mb-2">(税込支給額)</p>

                        <div className="mt-2 space-y-1 text-xs text-muted-foreground border-t pt-2 border-dashed">
                            <div className="flex justify-between font-medium text-slate-700">
                                <span>総支給額</span>
                                <span>¥{breakdown.grossReward?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                                <span>源泉徴収税 (10.21%)</span>
                                <span>-¥{breakdown.taxAmount?.toLocaleString()}</span>
                            </div>
                            <div className="my-1 border-t border-dashed opacity-50"></div>
                            <div className="flex justify-between">
                                <span>通常 ({currentMonthCount.normal}件)</span>
                                <span>¥{breakdown.normalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>体験 ({currentMonthCount.trial}件)</span>
                                <span>¥{breakdown.trialAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                現在のランク
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getRankColor(rank)}`}>
                                {rank} ({rewardRate * 100}%)
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>直近3ヶ月平均</span>
                            <span className="font-medium">{avgLessonCount.toFixed(1)}レッスン / 月</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
