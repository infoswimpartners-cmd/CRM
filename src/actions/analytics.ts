'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { startOfYear, endOfYear, format } from 'date-fns'

export async function getMonthlyRevenue(year: number) {
    const supabase = createAdminClient()

    const startDate = startOfYear(new Date(year, 0, 1)).toISOString()
    const endDate = endOfYear(new Date(year, 0, 1)).toISOString()

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('lesson_date, price')
        .gte('lesson_date', startDate)
        .lte('lesson_date', endDate)
        .order('lesson_date', { ascending: true })

    if (error) {
        console.error('Error fetching revenue data:', error)
        return []
    }

    // Initialize 12 months with 0
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        return {
            month: i + 1,
            name: `${i + 1}月`,
            revenue: 0
        }
    })

    // Aggregate
    lessons?.forEach(lesson => {
        if (!lesson.lesson_date || !lesson.price) return
        const date = new Date(lesson.lesson_date)
        const monthIndex = date.getMonth() // 0-11
        monthlyData[monthIndex].revenue += lesson.price
    })

    // Filter to only show up to current month? 
    // Or show all 12 months (even if 0)?
    // Usually showing all 12 months for "This Year" is fine, or up to current month.
    // Let's show all 12 months so the graph scale is fixed to the year.

    return monthlyData
}
