'use client'

import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-3 py-2 font-medium whitespace-nowrap">順位</th>
                                <th className="px-3 py-2 font-medium whitespace-nowrap">生徒名</th>
                                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">回数</th>
                                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">累計支払額</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {displayData.map((customer, index) => (
                                <tr key={`customer-${customer.student.id || index}`} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-3 py-2.5 font-medium text-slate-900 w-12 whitespace-nowrap">
                                        {index + 1}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={customer.student.avatar_url || ''} />
                                                <AvatarFallback className="text-[10px]">{customer.student.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <Link href={`/customers/${customer.student.id}`} className="font-medium text-slate-700 hover:text-cyan-600 hover:underline truncate max-w-[100px]">
                                                {customer.student.full_name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">
                                        {customer.count}回
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-cyan-700 whitespace-nowrap">
                                        ¥{customer.total.toLocaleString()}
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
