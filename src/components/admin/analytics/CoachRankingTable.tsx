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
        <div className="flex flex-col h-full">
            <div className="p-4 md:p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
                <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Rankings</div>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-separate border-spacing-0 min-w-[300px]">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-3 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-10 md:w-16">Rank</th>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Coach</th>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Lessons</th>
                            <th className="px-3 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayData.map((coach, index) => (
                            <tr key={`coach-${coach.id || index}`} className="group hover:bg-slate-50/70 transition-colors cursor-default">
                                <td className="px-3 py-3 md:px-6 md:py-4">
                                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black mx-auto ${index === 0 ? 'bg-amber-100 text-amber-600 shadow-sm shadow-amber-200' :
                                        index === 1 ? 'bg-slate-200 text-slate-600' :
                                            index === 2 ? 'bg-orange-100 text-orange-600' :
                                                'text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-3 py-3 md:px-6 md:py-4">
                                    <Link href={`/admin/coaches/${coach.id}`} className="text-xs md:text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                                        {coach.full_name}
                                    </Link>
                                </td>
                                <td className="px-3 py-3 md:px-6 md:py-4 text-right">
                                    <span className="text-xs md:text-sm font-semibold text-slate-500">{coach.count}</span>
                                    <span className="text-[9px] md:text-[10px] text-slate-400 ml-0.5 md:ml-1">回</span>
                                </td>
                                <td className="px-3 py-3 md:px-6 md:py-4 text-right">
                                    <span className="text-xs md:text-sm font-extrabold text-slate-900 leading-none whitespace-nowrap">
                                        ¥{coach.totalSales.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
