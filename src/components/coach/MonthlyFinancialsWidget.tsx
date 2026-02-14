'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

type MonthlyReport = {
    monthKey: string // YYYY-MM
    sales: number
    reward: number
    count: number
    rate: number
    details: {
        date: string
        title: string
        studentName: string
        price: number
        reward: number
    }[]
}

export function MonthlyFinancialsWidget({ reports }: { reports: MonthlyReport[] }) {
    // Default open the first one (current month)
    const [openMonth, setOpenMonth] = useState<string | null>(reports[0]?.monthKey || null)

    const toggleMonth = (key: string) => {
        setOpenMonth(openMonth === key ? null : key)
    }

    return (
        <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                    <DollarSign className="h-5 w-5 text-cyan-600" />
                    月次報酬・売上履歴
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {reports.map((report) => (
                    <div key={report.monthKey} className="border border-slate-100 rounded-xl overflow-hidden">
                        <div
                            className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleMonth(report.monthKey)}
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700">
                                    {format(new Date(report.monthKey), 'yyyy年 M月', { locale: ja })}
                                </span>
                                <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                    <span>レッスン: {report.count}回</span>
                                    <span>報酬率: {(report.rate * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-indigo-600">
                                    ¥{report.reward.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {openMonth === report.monthKey && (
                            <div className="bg-white p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    {report.details.length > 0 ? report.details.map((detail, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700">{format(new Date(detail.date), 'M/d')} - {detail.title}</span>
                                                {detail.studentName && (
                                                    <span className="text-xs text-slate-500">{detail.studentName} 様</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-medium text-slate-700">¥{detail.reward.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center text-xs text-slate-400 py-2">明細はありません</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
