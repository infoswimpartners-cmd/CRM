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
        is_default_distant_option?: boolean
        membership_types?: {
            id: string
            // Junction table data, usually fetched as an array
            membership_type_lessons?: {
                lesson_master_id: string
                reward_price: number | null
            }[]
        }
    }
    profiles?: {
        distant_reward_fee?: number
        role?: string
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

    // ADMIN EXCEPTION: If coach is admin/owner, reward = sales price
    if (lesson.profiles?.role === 'admin' || lesson.profiles?.role === 'owner') {
        return lesson.price || 0
    }

    if (!master) return 0

    let basePrice = master.unit_price

    let facilityFee = 0;
    if (typeof lesson.price === 'number' && lesson.price > master.unit_price) {
        facilityFee = lesson.price - master.unit_price;
    }

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

    // Add distant_reward_fee if applicable
    let distantFee = 0;
    if (lesson.students?.is_default_distant_option && lesson.profiles?.distant_reward_fee) {
        distantFee = lesson.profiles.distant_reward_fee;
    }

    // Calculate base reward
    let reward = 0
    if (master.is_trial) {
        // Admin Rate (100%) -> Return Full Price
        if (rate === 1.0) {
            reward = basePrice
        }
        // Special Exception Check: Use epsilon for float comparison safety
        // If rate is effectively SPECIAL_EXCEPTION_RATE (approx 0.7000001)
        else if (Math.abs(rate - SPECIAL_EXCEPTION_RATE) < 0.00000001) {
            reward = 5000
        } else {
            reward = 4500
        }
    } else {
        reward = Math.floor(basePrice * rate)
    }

    // Add 2-person simultaneous lesson bonus (+1000 JPY) 
    // Only apply for normal lessons, NOT for trial lessons.
    if (lesson.students?.is_two_person_lesson && !master.is_trial) {
        reward += 1000
    }

    return reward + facilityFee + distantFee
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

    myLessons.forEach((rawL: any) => {
        // Supabaseのarray-likeなJOIN結果をオブジェクトに正規化（コーチ側と同じ処理）
        const l: any = {
            ...rawL,
            lesson_masters: Array.isArray(rawL.lesson_masters) ? rawL.lesson_masters[0] : rawL.lesson_masters,
            students: Array.isArray(rawL.students) ? rawL.students[0] : rawL.students,
            profiles: Array.isArray(rawL.profiles) ? rawL.profiles[0] : rawL.profiles,
        }
        if (l.students && Array.isArray(l.students.membership_types)) {
            l.students = { ...l.students, membership_types: l.students.membership_types[0] }
        }

        const price = l.price || 0
        const reward = calculateLessonReward(l, rate)

        let title = l.lesson_masters?.is_trial ? '体験レッスン' : '通常レッスン';
        if (l.lesson_masters && price > l.lesson_masters.unit_price) {
            title += ' (施設利用料込)';
        }
        if (l.students?.is_default_distant_option) {
            title += ' (遠方対応)';
        }

        stats.totalSales += price
        stats.totalReward += reward
        stats.details.push({
            date: l.lesson_date,
            title: title, // Simplified title with facility fee indicator
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
