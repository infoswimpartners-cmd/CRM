'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const defaultData = [
    { name: '1月', revenue: 400000 },
    { name: '2月', revenue: 300000 },
    { name: '3月', revenue: 500000 },
    { name: '4月', revenue: 280000 },
    { name: '5月', revenue: 590000 },
    { name: '6月', revenue: 800000 },
]

interface RevenueChartProps {
    data?: { name: string; revenue: number; forecast?: number; isForecast?: boolean }[]
}

export function RevenueChart({ data = defaultData as any }: RevenueChartProps) {
    return (
        <div className="w-full h-full min-h-[300px]">
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
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="oklch(0.7 0.1 230)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="oklch(0.7 0.1 230)" stopOpacity={0} />
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
                        tickFormatter={(value) => `¥${(value / 1000).toLocaleString()}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderColor: 'oklch(0.55 0.16 230 / 0.2)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            color: 'oklch(0.25 0.04 240)'
                        }}
                        itemStyle={{ color: 'oklch(0.55 0.16 230)' }}
                        formatter={(value: any, name?: string) => {
                            const label = name === 'revenue' ? '確定売上' : '予測売上'
                            return [`¥${Number(value || 0).toLocaleString()}`, label]
                        }}
                        labelStyle={{ color: 'oklch(0.45 0.04 240)', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    {/* 実績データ */}
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="oklch(0.55 0.16 230)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        connectNulls
                    />
                    {/* 予測データ */}
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
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
