import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Activity } from "lucide-react"

interface SalesSummaryProps {
    totalSales: number
    lessonCount: number
    totalProfit: number
    diffSales: number
    diffProfit: number
    diffCount: number
}

function DiffBadge({ value, unit = "%" }: { value: number, unit?: string }) {
    if (value === 0) return <span className="text-gray-500 font-medium">±0{unit}</span>

    const isPositive = value > 0
    const ColorIcon = isPositive ? TrendingUp : TrendingUp // Could use TrendingDown for negative if desired
    const colorClass = isPositive ? "text-green-600" : "text-red-600"

    return (
        <span className={`${colorClass} font-medium flex items-center mr-1`}>
            <ColorIcon className={`h-3 w-3 mr-1 ${!isPositive && "rotate-180"}`} />
            {isPositive ? "+" : ""}{value.toLocaleString()}{unit}
        </span>
    )
}

export function SalesSummary({ totalSales, lessonCount, totalProfit, diffSales, diffProfit, diffCount }: SalesSummaryProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0.5">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">総売上 (今月)</p>
                            <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                                ¥{totalSales.toLocaleString()}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                        <DiffBadge value={diffSales} />
                        <span>先月から</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0.5">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">粗利 (推定)</p>
                            <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                                ¥{totalProfit.toLocaleString()}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                        <DiffBadge value={diffProfit} />
                        <span>先月から</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-y-0.5">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">レッスン実施数</p>
                            <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                                {lessonCount} <span className="text-sm font-normal text-muted-foreground">件</span>
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-orange-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                        <DiffBadge value={diffCount} unit="" />
                        <span>先月から</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
