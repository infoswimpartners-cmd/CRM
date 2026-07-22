import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

function calculateLessonReward(lesson, rate) {
    const master = lesson.lesson_masters
    const membership = lesson.students?.membership_types

    if (!master) return 0
    const expectedBasePrice = master.unit_price
    let basePrice = expectedBasePrice

    let facilityFee = 0;
    if (typeof lesson.price === 'number' && lesson.price > expectedBasePrice) {
        facilityFee = lesson.price - expectedBasePrice;
    }

    let planBaseRewardPrice = null
    if (membership?.membership_type_lessons) {
        const configs = Array.isArray(membership.membership_type_lessons)
            ? membership.membership_type_lessons
            : [membership.membership_type_lessons]

        const config = configs.find(
            (l) => l.lesson_master_id === master.id
        )
        if (config && config.reward_price !== null && config.reward_price !== undefined) {
            planBaseRewardPrice = config.reward_price
        }
    }

    let reward = 0
    if (planBaseRewardPrice !== null) {
        reward = Math.floor(planBaseRewardPrice * rate)
    } else {
        reward = Math.floor(basePrice * rate)
    }

    return reward + facilityFee
}

async function run() {
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
        id, 
        student_id, 
        student_name,
        coach_id,
        lesson_date,
        price,
        attendance_type,
        lesson_masters (
            id,
            name,
            unit_price,
            pair_unit_price,
            is_trial
        ),
        students (
            id,
            full_name,
            is_two_person_lesson,
            is_default_distant_option,
            membership_types:membership_types!students_membership_type_id_fkey (
                id,
                name,
                membership_type_lessons (
                    lesson_master_id,
                    reward_price
                )
            )
        )
    `)
    .eq('student_id', '54e8774b-5b5d-4975-8de8-bf835b06d644')
    .eq('lesson_date', '2026-06-06T00:00:00+00:00')
    .single()
    
  if (lessons) {
    const rawL = lessons
    const l = {
        ...rawL,
        lesson_masters: Array.isArray(rawL.lesson_masters) ? rawL.lesson_masters[0] : rawL.lesson_masters,
        students: Array.isArray(rawL.students) ? rawL.students[0] : rawL.students,
    }
    if (l.students && Array.isArray(l.students.membership_types)) {
        l.students = { ...l.students, membership_types: l.students.membership_types[0] }
    }
    
    const rate = 0.50
    const calculatedReward = calculateLessonReward(l, rate)
    console.log('Calculated reward for 6/6 lesson:', calculatedReward)
  }
}
run()
