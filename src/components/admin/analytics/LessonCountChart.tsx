'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface LessonCountChartProps {
    data: { name: string; count: number }[]
}

export function LessonCountChart({ data }: LessonCountChartProps) {
    // 各月の前月比（割合）を算出
    const enhancedData = data.map((item, index) => {
        if (index === 0) {
            return { ...item, ratioText: '' } // 1月は前月データがないため表示なし
        }
        
        const prevCount = data[index - 1].count
        if (prevCount === 0) {
            return { 
                ...item, 
                ratioText: item.count > 0 ? '前月比: 新規発生' : '前月比: 0%' 
            }
        }
        
        // 割合の計算 (当月 ÷ 前月 × 100)
        const ratio = (item.count / prevCount) * 100
        
        return { 
            ...item, 
            ratioText: `前月比: ${ratio.toFixed(1)}%` 
        }
    })

    return (
        <div className="w-full h-full flex flex-col gap-4">
            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={enhancedData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: -10,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.65 0.2 210)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="oklch(0.65 0.2 210)" stopOpacity={0} />
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
                            tickFormatter={(value) => `${value}本`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderColor: 'oklch(0.65 0.2 210 / 0.1)',
                                borderRadius: '16px',
                                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid white'
                            }}
                            formatter={(value: any, name: any, props: any) => {
                                const payload = props.payload
                                const ratioSuffix = payload.ratioText ? ` (${payload.ratioText})` : ''
                                return [`${value} 本${ratioSuffix}`, 'レッスン実施本数']
                            }}
                            labelStyle={{ color: 'oklch(0.25 0.04 240)', fontWeight: 'bold', marginBottom: '8px' }}
                        />
                        
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="oklch(0.65 0.2 210)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
