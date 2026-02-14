
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns'

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Copied from reward-system.ts to avoid import issues with relative paths in script
function calculateCoachRate(coachId: string, allLessons: any[], referenceDate: Date): number {
    const rankStart = startOfMonth(subMonths(referenceDate, 3))
    const rankEnd = endOfMonth(subMonths(referenceDate, 1))

    console.log(`Calculating rate for ${format(referenceDate, 'yyyy-MM')}: Range ${format(rankStart, 'yyyy-MM-dd')} to ${format(rankEnd, 'yyyy-MM-dd')}`)

    const pastLessons = allLessons.filter(l =>
        l.coach_id === coachId &&
        new Date(l.lesson_date) >= rankStart &&
        new Date(l.lesson_date) <= rankEnd
    )

    console.log(`Found ${pastLessons.length} lessons in rank range for Coach ${coachId}`)

    const average = pastLessons.length / 3
    console.log(`Average: ${average}`)

    if (average >= 30) return 0.70
    else if (average >= 25) return 0.65
    else if (average >= 20) return 0.60
    else if (average >= 15) return 0.55
    else return 0.50
}

function calculateLessonReward(lesson: any, rate: number): number {
    const master = lesson.lesson_masters
    const membership = lesson.students?.membership_types

    if (!master) return 0

    if (master.is_trial) {
        return 4500
    }

    let basePrice = master.unit_price

    if (membership?.membership_type_lessons) {
        const configs = Array.isArray(membership.membership_type_lessons)
            ? membership.membership_type_lessons
            : [membership.membership_type_lessons] // Check if single object

        const config = configs.find(
            (l: any) => l.lesson_master_id === master.id
        )
        if (config && config.reward_price !== null && config.reward_price !== undefined) {
            basePrice = config.reward_price
        }
    }

    return Math.floor(basePrice * rate)
}

function calculateMonthlyStats(coachId: string, monthLessons: any[], rate: number) {
    let totalSales = 0
    let totalReward = 0
    let lessonCount = 0
    const details: any[] = []

    const myLessons = monthLessons.filter(l => l.coach_id === coachId)
    lessonCount = myLessons.length

    myLessons.forEach(l => {
        const price = l.price || 0
        const reward = calculateLessonReward(l, rate)

        totalSales += price
        totalReward += reward
        details.push({
            date: l.lesson_date,
            title: l.lesson_masters?.is_trial ? '体験レッスン' : '通常レッスン',
            price: price,
            reward: reward
        })
    })

    return { totalSales, totalReward, lessonCount, details }
}

function calculateHistoricalMonthlyRewards(
    coachId: string,
    allLessons: any[],
    monthsToLookBack: number = 12,
    coachCreatedAt?: string
) {
    const today = new Date()
    const history = []

    console.log(`Coach Created At: ${coachCreatedAt}`)
    const registrationDate = coachCreatedAt ? startOfMonth(new Date(coachCreatedAt)) : null
    console.log(`Registration Date (Start of Month): ${registrationDate}`)

    for (let i = 0; i < monthsToLookBack; i++) {
        const d = subMonths(today, i)
        const monthStart = startOfMonth(d)

        if (registrationDate && monthStart < registrationDate) {
            console.log(`Skipping ${format(d, 'yyyy-MM')} before registration`)
            continue
        }

        const monthEnd = endOfMonth(d)
        const monthKey = format(d, 'yyyy-MM')

        // Fetch lessons for rate calculation (need wider range)
        const historicalRate = calculateCoachRate(coachId, allLessons, d)

        const monthLessons = allLessons.filter(l => {
            const ld = new Date(l.lesson_date)
            return ld >= monthStart && ld <= monthEnd
        })

        const stats = calculateMonthlyStats(coachId, monthLessons, historicalRate)

        history.push({
            month: monthKey,
            totalSales: stats.totalSales,
            totalReward: stats.totalReward,
            rate: historicalRate,
            lessonCount: stats.lessonCount
        })
    }
    return history
}

async function main() {
    // const coachId = '1b51677f-2efe-465d-a660-2eabb8c8f147' // 三浦蒼莉
    const coachId = '7e37b1f0-955c-4c31-86f7-657bec2366fe' // 新吉航大

    console.log(`Debug calculation for Coach: ${coachId}`)

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', coachId)
        .single()

    const coachCreatedAt = profile?.created_at
    console.log('Profile created_at:', coachCreatedAt)

    // Fetch Lessons (Simulate the page.tsx fetch)
    const twelveMonthsAgo = subMonths(new Date(), 12)
    // Fetches with explicit FK
    const { data: allLessons, error } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            students (membership_types!students_membership_type_id_fkey (id, membership_type_lessons (lesson_master_id, reward_price)))
        `)
        .gte('lesson_date', twelveMonthsAgo.toISOString())

    if (error) console.error('Error fetching lessons:', error)
    // .eq('coach_id', coachId) // In page.tsx we fetch ALL then filter in memory map. Script can just fetch.

    // In page.tsx, we filter map.
    const coachLessons = allLessons?.filter(l => l.coach_id === coachId) || []
    console.log(`Fetched ${coachLessons.length} lessons for coach (since ${twelveMonthsAgo.toISOString()})`)

    const history = calculateHistoricalMonthlyRewards(coachId, coachLessons, 12, coachCreatedAt)

    console.log('History Result:')
    console.log(JSON.stringify(history, null, 2))
}

main()
