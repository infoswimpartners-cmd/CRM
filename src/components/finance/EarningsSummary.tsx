'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Wallet, CreditCard, TrendingUp } from "lucide-react"

export function EarningsSummary({
    currentMonthReward = 0,
    totalUnpaid = 0,
    lastPayment = 0
}: {
    currentMonthReward?: number
    totalUnpaid?: number
    lastPayment?: number
}) {

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0.5">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">今月の報酬額 (見込み)</p>
                            <div className="text-3xl font-bold tracking-tight text-slate-900">
                                ¥{currentMonthReward.toLocaleString()}
                            </div>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                            <Wallet className="h-6 w-6 text-cyan-700" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-cyan-600 bg-cyan-50 w-fit px-2 py-1 rounded-lg">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>+10.5%</span>
                        <span className="text-slate-500 ml-1">先月比</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0.5">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">未払い報酬総額</p>
                            <div className="text-3xl font-bold tracking-tight text-slate-900">
                                ¥{totalUnpaid.toLocaleString()}
                            </div>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <CreditCard className="h-6 w-6 text-blue-700" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-slate-500">
                        次回支払日: <span className="font-medium text-slate-900">2026/02/25</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group opacity-80 hover:opacity-100 transition-opacity">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0.5">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">前回支払額 (12月分)</p>
                            <div className="text-2xl font-bold tracking-tight text-slate-700">
                                ¥{lastPayment.toLocaleString()}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-green-600 font-medium">
                        支払完了 (2026/01/25)
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
