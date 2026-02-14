'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, User } from 'lucide-react'
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import { CoachRewardDetailDialog } from './CoachRewardDetailDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Lesson {
    id: string
    lesson_date: string
    price: number
    coach_id: string
    student_name?: string
    menu_description?: string
    lesson_masters?: {
        name: string
        unit_price: number
        is_trial: boolean
    }
    students?: {
        membership_types?: {
            reward_master?: {
                unit_price: number
            }
        }
    }
}

interface Coach {
    id: string
    full_name: string | null
    email: string
    coach_number?: string | null
    avatar_url?: string | null
    role?: string // 'admin' | 'coach'
}

interface CoachRewardTableProps {
    coaches: Coach[]
    lessons: Lesson[] // Should contain lessons from at least 3 months ago
    targetDate?: Date
}

type Rank = 'Owner' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Standard'

export function CoachRewardTable({ coaches, lessons, targetDate }: CoachRewardTableProps) {
    const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    const dateBase = targetDate || new Date()
    const currentMonthStart = startOfMonth(dateBase)
    const currentMonthEnd = endOfMonth(dateBase)

    // For Rank: 3 months ago start to last month end
    const rankCalcStart = startOfMonth(subMonths(dateBase, 3))
    const rankCalcEnd = endOfMonth(subMonths(dateBase, 1))

    const calculateCoachStats = (coach: Coach) => {
        const coachId = coach.id

        // 1. Calculate Rank (SKIP if Admin)
        let rank: Rank = 'Standard'
        let rate = 0.50

        if (coach.role === 'admin') {
            rank = 'Owner'
            rate = 1.0
        } else {
            const pastLessons = lessons.filter(l =>
                l.coach_id === coachId &&
                isWithinInterval(new Date(l.lesson_date), { start: rankCalcStart, end: rankCalcEnd })
            )
            // Simple average: total past lessons / 3
            const average = pastLessons.length / 3

            if (average >= 30) {
                rank = 'Platinum'
                rate = 0.70
            } else if (average >= 25) {
                rank = 'Gold'
                rate = 0.65
            } else if (average >= 20) {
                rank = 'Silver'
                rate = 0.60
            } else if (average >= 15) {
                rank = 'Bronze'
                rate = 0.55
            }
        }

        // 2. Calculate Current Month Stats
        const currentLessons = lessons.filter(l =>
            l.coach_id === coachId &&
            isWithinInterval(new Date(l.lesson_date), { start: currentMonthStart, end: currentMonthEnd })
        )

        let totalSales = 0
        let totalReward = 0
        let normalCount = 0
        let trialCount = 0
        let normalAmount = 0
        let trialAmount = 0

        currentLessons.forEach(l => {
            totalSales += l.price

            const master = l.lesson_masters
            const membershipRewardMaster = l.students?.membership_types?.reward_master

            if (master) {
                if (master.is_trial) {
                    // Trial Lesson: Fixed 4,500 JPY
                    totalReward += 4500
                    trialCount++
                    trialAmount += 4500
                } else {
                    // Determine base price: Membership Reward Master > Lesson Master Price
                    const basePrice = membershipRewardMaster?.unit_price ?? master.unit_price

                    const amount = basePrice * rate
                    totalReward += amount
                    normalCount++
                    normalAmount += amount
                }
            } else {
                // Fallback using price if master not joined
            }
        })

        const grossReward = Math.floor(totalReward)
        // Admin has NO tax deduction
        const taxAmount = coach.role === 'admin' ? 0 : Math.floor(grossReward * 0.1021)
        const netReward = grossReward - taxAmount
        const profit = totalSales - grossReward

        return {
            rank,
            rate,
            totalSales,
            grossReward,
            taxAmount,
            netReward,
            profit,
            lessonCount: currentLessons.length,
            normalCount,
            trialCount,
            normalAmount,
            trialAmount,
            currentLessons
        }
    }

    const rows = coaches.map(coach => {
        const stats = calculateCoachStats(coach)
        return {
            ...coach,
            ...stats
        }
    }).sort((a, b) => b.totalSales - a.totalSales) // Sort by sales desc

    const getRankColor = (r: Rank) => {
        switch (r) {
            case 'Owner': return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'Platinum': return 'bg-slate-800 text-slate-300 border-slate-700'
            case 'Gold': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'Silver': return 'bg-slate-100 text-slate-700 border-slate-200'
            case 'Bronze': return 'bg-orange-100 text-orange-800 border-orange-200'
            default: return 'bg-blue-50 text-blue-700 border-blue-200'
        }
    }

    const selectedCoachData = selectedCoachId ? rows.find(r => r.id === selectedCoachId) : null

    return (
        <Card>
            <CardHeader>
                <CardTitle>コーチ別売上・報酬一覧 (今月)</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>コーチ名</TableHead>
                            <TableHead>ランク</TableHead>
                            <TableHead className="text-right">レッスン数</TableHead>
                            <TableHead className="text-right">売上高</TableHead>
                            <TableHead className="text-right">報酬 (税込)</TableHead>
                            <TableHead className="text-right">源泉徴収</TableHead>
                            <TableHead className="text-right">振込額</TableHead>
                            <TableHead className="text-right text-muted-foreground">粗利</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={row.avatar_url || ''} />
                                            <AvatarFallback className="bg-slate-100"><User className="h-4 w-4 text-slate-400" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-700">{row.full_name || '未設定'}</span>
                                                {row.coach_number && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-slate-50 text-slate-500 border-slate-200 font-normal">
                                                        {row.coach_number}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{row.email}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={getRankColor(row.rank)}>
                                        {
                                            {
                                                'Owner': 'オーナー',
                                                'Platinum': 'プラチナ',
                                                'Gold': 'ゴールド',
                                                'Silver': 'シルバー',
                                                'Bronze': 'ブロンズ',
                                                'Standard': 'スタンダード'
                                            }[row.rank] || row.rank
                                        } {(row.rate * 100).toFixed(0)}%
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">{row.lessonCount}件</TableCell>
                                <TableCell className="text-right font-medium">¥{row.totalSales.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-slate-600">¥{row.grossReward.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-red-500 text-xs">-¥{row.taxAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-bold">¥{row.netReward.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">¥{row.profit.toLocaleString()}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedCoachId(row.id)
                                            setIsDetailOpen(true)
                                        }}
                                    >
                                        <Search className="h-4 w-4" />
                                        <span className="sr-only">詳細</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                                    データがありません
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {selectedCoachData && (
                    <CoachRewardDetailDialog
                        open={isDetailOpen}
                        onOpenChange={setIsDetailOpen}
                        coach={selectedCoachData}
                        stats={selectedCoachData}
                        lessons={selectedCoachData.currentLessons}
                    />
                )}
            </CardContent>
        </Card>
    )
}
