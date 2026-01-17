'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const defaultData = [
    { name: 'Jan', revenue: 400000 },
    { name: 'Feb', revenue: 300000 },
    { name: 'Mar', revenue: 500000 },
    { name: 'Apr', revenue: 280000 },
    { name: 'May', revenue: 590000 },
    { name: 'Jun', revenue: 800000 },
]

interface RevenueChartProps {
    data?: { name: string; revenue: number }[]
}

export function RevenueChart({ data = defaultData }: RevenueChartProps) {
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
                        tickFormatter={(value) => `¥${value / 1000}k`}
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
                        formatter={(value: any) => [`¥${Number(value || 0).toLocaleString()}`, '売上']}
                        labelStyle={{ color: 'oklch(0.45 0.04 240)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="oklch(0.55 0.16 230)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
