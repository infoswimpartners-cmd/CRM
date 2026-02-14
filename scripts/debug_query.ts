
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { subMonths } from 'date-fns'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    const twelveMonthsAgo = subMonths(new Date(), 12).toISOString()
    console.log(`Checking lessons since ${twelveMonthsAgo}`)

    // 1. Base Query
    console.log('\n--- Query 1: Base (id, lesson_date) ---')
    const { data: q1, error: e1 } = await supabase
        .from('lessons')
        .select('id, lesson_date')
        .gte('lesson_date', twelveMonthsAgo)
        .limit(5)
    console.log('Count:', q1?.length)
    if (e1) console.error(e1)

    // 2. With Lesson Masters
    console.log('\n--- Query 2: + lesson_masters ---')
    const { data: q2, error: e2 } = await supabase
        .from('lessons')
        .select(`
            id, lesson_date,
            lesson_masters (id, unit_price)
        `)
        .gte('lesson_date', twelveMonthsAgo)
        .limit(5)
    console.log('Count:', q2?.length)
    if (e2) console.error(e2)

    // 3. With Students
    console.log('\n--- Query 3: + students ---')
    const { data: q3, error: e3 } = await supabase
        .from('lessons')
        .select(`
            id, lesson_date,
            students (id)
        `)
        .gte('lesson_date', twelveMonthsAgo)
        .limit(5)
    console.log('Count:', q3?.length)
    if (e3) console.error(e3)

    // 4. With Students + Membership Types
    console.log('\n--- Query 4: + students.membership_types ---')
    const { data: q4, error: e4 } = await supabase
        .from('lessons')
        .select(`
            id, lesson_date,
            students (
                id,
                membership_types (id)
            )
        `)
        .gte('lesson_date', twelveMonthsAgo)
        .limit(5)
    console.log('Count:', q4?.length)
    if (e4) console.error(e4)

    // 5. Full Query (from page.tsx)
    console.log('\n--- Query 5: Full Query ---')
    const { data: q5, error: e5 } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            students (membership_types (id, membership_type_lessons (lesson_master_id, reward_price)))
        `)
        .gte('lesson_date', twelveMonthsAgo)
        .limit(5)
    console.log('Count:', q5?.length)
    if (e5) console.error(e5)
    // 6. Corrected Full Query (with explicit FK)
    console.log('\n--- Query 6: Corrected Full Query ---')
    const { data: q6, error: e6 } = await supabase
        .from('lessons')
        .select(`
            id, price, lesson_date, coach_id,
            lesson_masters (id, unit_price, is_trial),
            students (membership_types!students_membership_type_id_fkey (id, membership_type_lessons (lesson_master_id, reward_price)))
        `)
        .gte('lesson_date', twelveMonthsAgo)
        .limit(5)
    console.log('Count:', q6?.length)
    if (e6) console.error(e6)
}

main()
