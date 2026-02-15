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
        full_name?: string
        is_two_person_lesson?: boolean
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

export function calculateCoachRate(coachId: string, allLessons: LessonData[], referenceDate: Date, overrideRate?: number | null): number {
    if (overrideRate) return overrideRate;

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


export const SPECIAL_EXCEPTION_RATE = 0.7000001

export function calculateLessonReward(lesson: LessonData, rate: number): number {
    // @ts-ignore
    const master = lesson.lesson_masters
    // @ts-ignore
    const membership = lesson.students?.membership_types

    if (!master) return 0

    let basePrice = master.unit_price

    // Check for custom reward price in membership configuration
    if (membership?.membership_type_lessons) {
        // Handle both array (joined) and object (if single object returned, though usually array)
        const configs = Array.isArray(membership.membership_type_lessons)
            ? membership.membership_type_lessons
            : [membership.membership_type_lessons]

        const config = configs.find(
            (l: any) => l.lesson_master_id === master.id
        )
        if (config && config.reward_price !== null && config.reward_price !== undefined) {
            basePrice = config.reward_price
        }
    }

    // If 2-person simultaneous lesson, add +1000 JPY
    // Check if student has the flag
    if (lesson.students?.is_two_person_lesson) {
        // Only apply for normal lessons (usually). 
        // Request says "2人同時レッスンの場合はコーチの報酬をプラス1000円にします". 
        // It doesn't specify if it applies to trial or not, but usually trial is fixed reward.
        // However, "通常の報酬に加えて1000円上乗せ" implies base reward + 1000.
        // If trial reward is 4500, +1000 = 5500?
        // Let's assume it applies to ALL lessons since the setting is on the student.
        // Wait, trial lessons usually don't have a "student" record fully set up in the same way?
        // Actually they do. So let's apply +1000 to the calculated reward.

        let reward = 0
        if (master.is_trial) {
            if (rate === 1.0) {
                reward = basePrice
            } else if (Math.abs(rate - SPECIAL_EXCEPTION_RATE) < 0.00000001) {
                reward = 5000
            } else {
                reward = 4500
            }
        } else {
            reward = Math.floor(basePrice * rate)
        }

        return reward + 1000
    }

    if (master.is_trial) {
        // Admin Rate (100%) -> Return Full Price
        if (rate === 1.0) {
            return basePrice
        }

        // Special Exception Check: Use epsilon for float comparison safety
        // If rate is effectively SPECIAL_EXCEPTION_RATE (approx 0.7000001)
        if (Math.abs(rate - SPECIAL_EXCEPTION_RATE) < 0.00000001) {
            return 5000
        }
        return 4500
    }

    return Math.floor(basePrice * rate)
}

export function calculateMonthlyStats(coachId: string, monthLessons: LessonData[], rate: number) {
    const stats = {
        totalSales: 0,
        totalReward: 0,
        lessonCount: 0,
        details: [] as { date: string, title: string, studentName: string, price: number, reward: number }[]
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
            studentName: l.students?.full_name || '',
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
    monthsToLookBack: number = 12,
    coachCreatedAt?: string,
    overrideRate?: number | null
) {
    const today = new Date()
    const history = []
    const registrationDate = coachCreatedAt ? startOfMonth(new Date(coachCreatedAt)) : null

    for (let i = 0; i < monthsToLookBack; i++) {
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)

        // Skip months before registration
        if (registrationDate && monthStart < registrationDate) {
            continue
        }

        const monthEnd = endOfMonth(d)
        const monthKey = format(d, 'yyyy-MM')

        // 1. Calculate Rate applicable for THIS month (based on 3 months prior to this month)
        // Optionally apply override if provided
        const historicalRate = calculateCoachRate(coachId, allLessons, d, overrideRate)

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
