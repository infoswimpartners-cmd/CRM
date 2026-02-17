'use client'

import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'

interface CoachRanking {
    id: string
    full_name: string
    avatar_url?: string | null
    count: number
    totalSales: number
    withholdingTax: number
    totalReward: number
}

interface CoachRankingTableProps {
    data: CoachRanking[]
    title?: string
    limit?: number
}

export function CoachRankingTable({ data, title = "コーチ別売上・報酬ランキング", limit }: CoachRankingTableProps) {
    const displayData = limit ? data.slice(0, limit) : data

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-3 font-medium whitespace-nowrap">順位</th>
                                <th className="px-4 py-3 font-medium whitespace-nowrap w-full">コーチ名</th>
                                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">レッスン</th>
                                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">売上</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {displayData.map((coach, index) => (
                                <tr key={`coach-${coach.id || index}`} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 w-12 whitespace-nowrap">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={coach.avatar_url || ''} />
                                                <AvatarFallback className="text-[10px]">{coach.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <Link href={`/admin/coaches/${coach.id}`} className="font-medium text-slate-700 hover:text-cyan-600 hover:underline text-sm">
                                                {coach.full_name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                                        {coach.count}回
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                        ¥{coach.totalSales.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
