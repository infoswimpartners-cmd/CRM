'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const defaultData = [
    { name: '1月', revenue: 400000, grossProfit: 120000 },
    { name: '2月', revenue: 300000, grossProfit: 90000 },
    { name: '3月', revenue: 500000, grossProfit: 150000 },
    { name: '4月', revenue: 280000, grossProfit: 84000 },
    { name: '5月', revenue: 590000, grossProfit: 177000 },
    { name: '6月', revenue: 800000, grossProfit: 240000 },
]

interface RevenueChartProps {
    data?: { name: string; revenue: number; grossProfit?: number; forecast?: number; target?: number; isForecast?: boolean }[]
}

export function RevenueChart({ data = defaultData as any }: RevenueChartProps) {
    const [showRevenue, setShowRevenue] = useState(true)
    const [showGrossProfit, setShowGrossProfit] = useState(true)
    const [showTarget, setShowTarget] = useState(true)
    const [showForecast, setShowForecast] = useState(true)

    return (
        <div className="w-full h-full flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-6 px-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="showRevenue"
                        checked={showRevenue}
                        onCheckedChange={(checked) => setShowRevenue(checked === true)}
                    />
                    <Label
                        htmlFor="showRevenue"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-[oklch(0.55_0.16_230)]" />
                        売上実績
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="showGrossProfit"
                        checked={showGrossProfit}
                        onCheckedChange={(checked) => setShowGrossProfit(checked === true)}
                    />
                    <Label
                        htmlFor="showGrossProfit"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-[oklch(0.6_0.18_150)]" />
                        粗利実績
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="showTarget"
                        checked={showTarget}
                        onCheckedChange={(checked) => setShowTarget(checked === true)}
                    />
                    <Label
                        htmlFor="showTarget"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-[oklch(0.6_0.16_30)]" />
                        売上目標
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="showForecast"
                        checked={showForecast}
                        onCheckedChange={(checked) => setShowForecast(checked === true)}
                    />
                    <Label
                        htmlFor="showForecast"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full bg-[oklch(0.7_0.1_230)]" />
                        着地予測
                    </Label>
                </div>
            </div>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.55 0.16 230)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="oklch(0.55 0.16 230)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.6 0.18 150)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="oklch(0.6 0.18 150)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.7 0.1 230)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="oklch(0.7 0.1 230)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.6 0.16 30)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="oklch(0.6 0.16 30)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.2 0.05 240 / 0.1)" />
                        <XAxis
                            dataKey="name"
                            stroke="oklch(0.45 0.04 240)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="oklch(0.45 0.04 240)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `¥${(value / 1000).toLocaleString()}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderColor: 'oklch(0.55 0.16 230 / 0.1)',
                                borderRadius: '16px',
                                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid white'
                            }}
                            formatter={(value: any, name?: string) => {
                                const label = name === 'revenue' 
                                    ? '売上実績' 
                                    : (name === 'grossProfit' 
                                        ? '粗利実績' 
                                        : (name === 'forecast' 
                                            ? '着地予測' 
                                            : (name === 'target' ? '売上目標' : '数値')))
                                return [`¥${Number(value || 0).toLocaleString()}`, label]
                            }}
                            labelStyle={{ color: 'oklch(0.25 0.04 240)', fontWeight: 'bold', marginBottom: '8px' }}
                        />

                        {/* 売上データ */}
                        {showRevenue && (
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="oklch(0.55 0.16 230)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                connectNulls
                                animationDuration={1000}
                            />
                        )}

                        {/* 粗利データ */}
                        {showGrossProfit && (
                            <Area
                                type="monotone"
                                dataKey="grossProfit"
                                stroke="oklch(0.6 0.18 150)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                connectNulls
                                animationDuration={1000}
                            />
                        )}

                        {/* 予測データ */}
                        {showForecast && (
                            <Area
                                type="monotone"
                                dataKey="forecast"
                                stroke="oklch(0.7 0.1 230)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={1}
                                fill="url(#colorForecast)"
                                activeDot={{ r: 4 }}
                                connectNulls
                                animationDuration={1000}
                            />
                        )}

                        {/* 目標データ */}
                        {showTarget && (
                            <Area
                                type="monotone"
                                dataKey="target"
                                stroke="oklch(0.6 0.16 30)"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fillOpacity={1}
                                fill="url(#colorTarget)"
                                activeDot={{ r: 4 }}
                                connectNulls
                                animationDuration={1000}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
