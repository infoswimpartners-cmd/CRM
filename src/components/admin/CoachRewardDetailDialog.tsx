'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Lesson {
    id: string
    lesson_date: string
    price: number
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
}

interface Stats {
    rank: string
    rate: number
    grossReward: number
    taxAmount: number
    netReward: number
    normalCount: number
    trialCount: number
    normalAmount: number
    trialAmount: number
}

interface Props {
    coach: Coach
    stats: Stats
    lessons: Lesson[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CoachRewardDetailDialog({ coach, stats, lessons, open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{coach.full_name || 'コーチ'} - 報酬明細</DialogTitle>
                    <DialogDescription>
                        今月の報酬計算の詳細と対象レッスン一覧
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    <div className="border rounded-lg p-4 bg-slate-50">
                        <div className="text-sm text-muted-foreground mb-1">ランク</div>
                        <div className="font-bold text-lg flex items-center gap-2">
                            {
                                {
                                    'Owner': 'オーナー',
                                    'Platinum': 'プラチナ',
                                    'Gold': 'ゴールド',
                                    'Silver': 'シルバー',
                                    'Bronze': 'ブロンズ',
                                    'Standard': 'スタンダード'
                                }[stats.rank] || stats.rank
                            }
                            <Badge variant="outline" className="text-xs font-normal bg-white">
                                {(stats.rate * 100).toFixed(0)}%
                            </Badge>
                        </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-slate-50">
                        <div className="text-sm text-muted-foreground mb-1">総支給額 (Gross)</div>
                        <div className="font-bold text-lg">¥{stats.grossReward.toLocaleString()}</div>
                    </div>
                    <div className="border rounded-lg p-4 bg-blue-50 border-blue-100">
                        <div className="text-sm text-blue-600 mb-1">振込額 (Net)</div>
                        <div className="font-bold text-lg text-blue-700">¥{stats.netReward.toLocaleString()}</div>
                        <div className="text-xs text-red-500 mt-1">
                            - 源泉徴収: ¥{stats.taxAmount.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 text-sm mb-4">
                    <div className="flex-1 border rounded p-3">
                        <div className="font-medium mb-1">通常レッスン</div>
                        <div className="flex justify-between">
                            <span>{stats.normalCount}件</span>
                            <span className="font-bold">¥{stats.normalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex-1 border rounded p-3">
                        <div className="font-medium mb-1">体験レッスン</div>
                        <div className="flex justify-between">
                            <span>{stats.trialCount}件</span>
                            <span className="font-bold">¥{stats.trialAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 border rounded-md">
                    <ScrollArea className="h-[300px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white">
                                <TableRow>
                                    <TableHead>日時</TableHead>
                                    <TableHead>生徒名</TableHead>
                                    <TableHead>種類</TableHead>
                                    <TableHead>区分</TableHead>
                                    <TableHead className="text-right">売上</TableHead>
                                    <TableHead className="text-right">報酬額</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lessons.map((lesson) => {
                                    const isTrial = lesson.lesson_masters?.is_trial
                                    const membershipRewardMaster = lesson.students?.membership_types?.reward_master
                                    const basePrice = membershipRewardMaster?.unit_price ?? lesson.lesson_masters?.unit_price ?? 0

                                    const reward = isTrial
                                        ? 4500
                                        : basePrice * stats.rate

                                    return (
                                        <TableRow key={lesson.id}>
                                            <TableCell className="font-medium">
                                                {format(new Date(lesson.lesson_date), 'M/d(E)', { locale: ja })}
                                            </TableCell>
                                            <TableCell>{lesson.student_name}</TableCell>
                                            <TableCell>{lesson.lesson_masters?.name || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={isTrial ? "default" : "secondary"} className="text-[10px]">
                                                    {isTrial ? '体験' : '通常'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                ¥{lesson.price.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ¥{reward.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    )
}
