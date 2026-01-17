'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DollarSign } from 'lucide-react'

export type CoachFinancialData = {
    coachId: string
    coachName: string
    avatarUrl?: string | null
    role: string
    lessonCount: number
    totalSales: number
    rate: number
    totalReward: number
}

export function CoachFinancialsWidget({ data }: { data: CoachFinancialData[] }) {
    return (
        <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    コーチ別 売上・報酬一覧 (今月)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>コーチ名</TableHead>
                            <TableHead className="text-right">レッスン数</TableHead>
                            <TableHead className="text-right">総売上</TableHead>
                            <TableHead className="text-right">報酬率</TableHead>
                            <TableHead className="text-right">報酬額</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((coach) => (
                            <TableRow key={coach.coachId}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={coach.avatarUrl || ''} />
                                            <AvatarFallback>{coach.coachName[0]}</AvatarFallback>
                                        </Avatar>
                                        <span>{coach.coachName}</span>
                                        {coach.role === 'admin' && <Badge variant="secondary" className="text-[10px]">管理者</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{coach.lessonCount}回</TableCell>
                                <TableCell className="text-right">¥{coach.totalSales.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{(coach.rate * 100).toFixed(0)}%</TableCell>
                                <TableCell className="text-right font-bold text-slate-900">¥{coach.totalReward.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
