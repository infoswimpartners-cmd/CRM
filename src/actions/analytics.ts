'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { startOfYear, endOfYear, format } from 'date-fns'

export async function getMonthlyRevenue(year: number) {
    const supabase = createAdminClient()

    const startDate = startOfYear(new Date(year, 0, 1)).toISOString()
    const endDate = endOfYear(new Date(year, 0, 1)).toISOString()

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthIndex = now.getMonth()

    // 1. 実績データの取得 (lessons)
    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('lesson_date, price')
        .gte('lesson_date', startDate)
        .lte('lesson_date', endDate)

    // 2. 将来の予定データの取得 (lesson_schedules)
    const { data: schedules, error: schedulesError } = await supabase
        .from('lesson_schedules')
        .select(`
            start_time, 
            price,
            lesson_masters ( unit_price )
        `)
        .gte('start_time', now.toISOString())
        .lte('start_time', endDate)

    if (lessonsError || schedulesError) {
        console.error('Error fetching data:', lessonsError || schedulesError)
        return []
    }

    // 12ヶ月分を初期化
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const isFuture = year > currentYear || (year === currentYear && i >= currentMonthIndex)
        return {
            month: i + 1,
            name: `${i + 1}月`,
            revenue: 0,
            forecast: 0,
            isForecast: isFuture
        }
    })

    // 実績データの集計
    lessons?.forEach(lesson => {
        if (!lesson.lesson_date || !lesson.price) return
        const date = new Date(lesson.lesson_date)
        const monthIndex = date.getMonth()
        monthlyData[monthIndex].revenue += lesson.price
    })

    // 予定データの集計
    schedules?.forEach(schedule => {
        if (!schedule.start_time) return
        const date = new Date(schedule.start_time)
        const monthIndex = date.getMonth()

        // @ts-ignore
        const master = Array.isArray(schedule.lesson_masters) ? schedule.lesson_masters[0] : schedule.lesson_masters
        const estimatedPrice = schedule.price || (master?.unit_price ? master.unit_price + 1500 : 8800)

        monthlyData[monthIndex].forecast += estimatedPrice
    })

    // 統合処理
    const processedData = monthlyData.map((m) => {
        if (m.isForecast) {
            return {
                ...m,
                revenue: m.revenue,
                forecast: (m.revenue || 0) + (m.forecast || 0)
            }
        }
        return m
    })

    // 最初の実績 or 予定がある月のインデックスを探す
    const firstDataIndex = processedData.findIndex(m => m.revenue > 0 || m.forecast > 0)

    // 最初の実績月以降を表示（年末まで）
    const result = processedData.filter((_, idx) => {
        if (firstDataIndex === -1) return false
        return idx >= firstDataIndex
    })

    return result
}
