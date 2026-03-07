'use client'

import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface CustomerRanking {
    student: {
        id: string
        full_name: string
        avatar_url?: string | null
    }
    total: number
    count: number
}

interface CustomerRankingTableProps {
    data: CustomerRanking[]
    title?: string
    limit?: number
}

export function CustomerRankingTable({ data, title = "優良顧客ランキング (Top 10)", limit = 10 }: CustomerRankingTableProps) {
    const displayData = limit ? data.slice(0, limit) : data

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 md:p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
                <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">VIP Status</div>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-12 md:w-16">Rank</th>
                            <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Student</th>
                            <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Lessons</th>
                            <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Total Spends</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayData.map((customer, index) => (
                            <tr key={`customer-${customer.student.id || index}`} className="group hover:bg-slate-50/70 transition-colors cursor-default">
                                <td className="px-4 py-3 md:px-6 md:py-4">
                                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black mx-auto ${index === 0 ? 'bg-cyan-100 text-cyan-600 shadow-sm shadow-cyan-200' :
                                        index === 1 ? 'bg-slate-200 text-slate-600' :
                                            index === 2 ? 'bg-indigo-100 text-indigo-600' :
                                                'text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-4 py-3 md:px-6 md:py-4">
                                    <Link href={`/customers/${customer.student.id}`} className="text-xs md:text-sm font-bold text-slate-700 hover:text-cyan-600 transition-colors leading-tight">
                                        {customer.student.full_name}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                                    <span className="text-xs md:text-sm font-semibold text-slate-500">{customer.count}</span>
                                    <span className="text-[9px] md:text-[10px] text-slate-400 ml-1">回</span>
                                </td>
                                <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs md:text-sm font-extrabold text-cyan-700 leading-none">
                                            ¥{customer.total.toLocaleString()}
                                        </span>
                                        <span className="text-[8px] md:text-[9px] font-bold text-slate-300 mt-1 whitespace-nowrap">LTD SPEND</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
