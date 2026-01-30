import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export type LessonData = {
    id: string
    lesson_date: string
    price: number
    coach_id: string
    lesson_masters?: {
        id: string
        unit_price: number
        is_trial: boolean
    }
    students?: {
        membership_types?: {
            id: string
            // Junction table data, usually fetched as an array
            membership_type_lessons?: {
                lesson_master_id: string
                reward_price: number | null
            }[]
        }
    }
}

export function calculateCoachRate(coachId: string, allLessons: LessonData[], referenceDate: Date): number {
    const rankStart = startOfMonth(subMonths(referenceDate, 3))
    const rankEnd = endOfMonth(subMonths(referenceDate, 1))

    const pastLessons = allLessons.filter(l =>
        l.coach_id === coachId &&
        new Date(l.lesson_date) >= rankStart &&
        new Date(l.lesson_date) <= rankEnd
    )

    const average = pastLessons.length / 3

    if (average >= 30) return 0.70
    else if (average >= 25) return 0.65
    else if (average >= 20) return 0.60
    else if (average >= 15) return 0.55
    else return 0.50
}

export function calculateLessonReward(lesson: LessonData, rate: number): number {
    // @ts-ignore
    const master = lesson.lesson_masters
    // @ts-ignore
    const membership = lesson.students?.membership_types

    if (!master) return 0

    if (master.is_trial) {
        return 4500
    }

    let basePrice = master.unit_price

    // Check for custom reward price in membership configuration
    if (membership?.membership_type_lessons && Array.isArray(membership.membership_type_lessons)) {
        const config = membership.membership_type_lessons.find(
            (l: any) => l.lesson_master_id === master.id
        )
        if (config && config.reward_price !== null && config.reward_price !== undefined) {
            basePrice = config.reward_price
        }
    }

    return Math.floor(basePrice * rate)
}

export function calculateMonthlyStats(coachId: string, monthLessons: LessonData[], rate: number) {
    const stats = {
        totalSales: 0,
        totalReward: 0,
        lessonCount: 0,
        details: [] as { date: string, title: string, price: number, reward: number }[]
    }

    const myLessons = monthLessons.filter(l => l.coach_id === coachId)
    stats.lessonCount = myLessons.length

    myLessons.forEach(l => {
        const price = l.price || 0
        const reward = calculateLessonReward(l, rate)

        stats.totalSales += price
        stats.totalReward += reward
        stats.details.push({
            date: l.lesson_date,
            // @ts-ignore
            title: l.lesson_masters?.is_trial ? '体験レッスン' : '通常レッスン', // Simplified title
            price: price,
            reward: reward
        })
    })

    return stats
}

// New: Calculate Historical Monthly Rewards with Correct Historical Rates
export function calculateHistoricalMonthlyRewards(
    coachId: string,
    allLessons: LessonData[],
    monthsToLookBack: number = 12
) {
    const today = new Date()
    const history = []

    for (let i = 0; i < monthsToLookBack; i++) {
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)
        const monthEnd = endOfMonth(d)
        const monthKey = format(d, 'yyyy-MM')

        // 1. Calculate Rate applicable for THIS month (based on 3 months prior to this month)
        // Note: calculateCoachRate logic uses 1-3 months prior to referenceDate.
        // So passing 'd' (current month in loop) as referenceDate is correct for "Rate applied to this month".
        const historicalRate = calculateCoachRate(coachId, allLessons, d)

        // 2. Filter lessons for this month
        const monthLessons = allLessons.filter(l => {
            const ld = new Date(l.lesson_date)
            return ld >= monthStart && ld <= monthEnd
        })

        // 3. Calculate Reward
        const stats = calculateMonthlyStats(coachId, monthLessons, historicalRate)

        history.push({
            month: monthKey,
            yearMonth: format(d, 'yyyy年M月'), // Display Label
            totalSales: stats.totalSales,
            totalReward: stats.totalReward,
            rate: historicalRate,
            lessonCount: stats.lessonCount,
            details: stats.details
        })
    }

    return history
}
