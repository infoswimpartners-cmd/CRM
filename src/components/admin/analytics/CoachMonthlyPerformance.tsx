'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, subMonths, startOfMonth } from 'date-fns'

interface CoachMonthlyData {
    coachId: string
    coachName: string
    avatarUrl?: string | null
    monthlyRevenue: Map<string, number> // key: yyyy-MM, value: revenue
}

interface CoachMonthlyPerformanceProps {
    data: CoachMonthlyData[]
    year: number
}

export function CoachMonthlyPerformance({ data, year }: CoachMonthlyPerformanceProps) {
    const months: { key: string, label: string }[] = []

    // 指定された年度の1月〜12月をヘッダーとして表示
    for (let i = 1; i <= 12; i++) {
        const d = new Date(year, i - 1, 1)
        months.push({
            key: format(d, 'yyyy-MM'),
            label: format(d, 'M月')
        })
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">コーチ別月次売上推移</h2>
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold whitespace-nowrap px-2 text-[11px] h-10 w-[100px]">コーチ名</TableHead>
                                {months.map(m => (
                                    <TableHead key={m.key} className="text-right font-bold whitespace-nowrap px-1 text-[11px] h-10">{m.label}</TableHead>
                                ))}
                                <TableHead className="text-right font-bold bg-slate-100/50 whitespace-nowrap px-2 text-[11px] h-10">合計</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(coach => {
                                let total = 0
                                return (
                                    <TableRow key={coach.coachId} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium whitespace-nowrap px-2 py-2 text-[11px]">
                                            <div className="flex items-center gap-1.5">
                                                <Avatar className="h-5 w-5 flex-shrink-0">
                                                    <AvatarImage src={coach.avatarUrl || ''} />
                                                    <AvatarFallback className="text-[10px]">{coach.coachName[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[80px] leading-tight" title={coach.coachName}>
                                                    {coach.coachName}
                                                </span>
                                            </div>
                                        </TableCell>
                                        {months.map(m => {
                                            const revenue = coach.monthlyRevenue.get(m.key) || 0
                                            total += revenue
                                            return (
                                                <TableCell key={m.key} className="text-right py-2 px-1 whitespace-nowrap text-[11px]">
                                                    <span className={revenue > 0 ? "text-slate-900 font-medium" : "text-slate-300"}>
                                                        {revenue > 0 ? `¥${(revenue / 1000).toFixed(0)}k` : '¥0'}
                                                    </span>
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-right font-bold text-cyan-700 bg-cyan-50/30 px-2 py-2 whitespace-nowrap text-[11px]">
                                            ¥{(total / 1000).toFixed(1)}k
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    )
}
