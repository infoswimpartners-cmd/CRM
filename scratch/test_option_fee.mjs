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

    let distantFee = 0;
    if (lesson.students?.is_default_distant_option && lesson.profiles?.distant_reward_fee) {
        distantFee = lesson.profiles.distant_reward_fee;
    }

    let coachOptionFee = 0;
    if (lesson.students?.student_coaches) {
        const coachRelations = Array.isArray(lesson.students.student_coaches)
            ? lesson.students.student_coaches
            : [lesson.students.student_coaches]
        const match = coachRelations.find((sc) => sc.coach_id === lesson.coach_id)
        if (match && match.option_reward_fee) {
            coachOptionFee = match.option_reward_fee
        }
    }

    let reward = 0
    if (planBaseRewardPrice !== null) {
        reward = Math.floor(planBaseRewardPrice * rate)
    } else {
        reward = Math.floor(basePrice * rate)
    }

    return reward + facilityFee + distantFee + coachOptionFee
}

async function run() {
  const studentId = '54e8774b-5b5d-4975-8de8-bf835b06d644' // 和田 啓
  const coachId = 'b9a7fd5f-fd5e-437e-9fe2-eb1540cb9d31'   // 西村 アリサ

  // 1. Set option_reward_fee = 1000 for test
  console.log('Setting option_reward_fee = 1000 in student_coaches...')
  await supabase
    .from('student_coaches')
    .update({ option_reward_fee: 1000, option_reward_note: '遠方手当' })
    .eq('student_id', studentId)
    .eq('coach_id', coachId)

  // 2. Fetch lesson with student_coaches included
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
        profiles (
            distant_reward_fee
        ),
        students (
            id,
            full_name,
            is_two_person_lesson,
            is_default_distant_option,
            student_coaches ( coach_id, option_reward_fee, option_reward_note ),
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
    .eq('student_id', studentId)
    .eq('lesson_date', '2026-06-06T00:00:00+00:00')
    .single()
    
  if (lessons) {
    const rawL = lessons
    const l = {
        ...rawL,
        lesson_masters: Array.isArray(rawL.lesson_masters) ? rawL.lesson_masters[0] : rawL.lesson_masters,
        students: Array.isArray(rawL.students) ? rawL.students[0] : rawL.students,
        profiles: Array.isArray(rawL.profiles) ? rawL.profiles[0] : rawL.profiles,
    }
    if (l.students && Array.isArray(l.students.membership_types)) {
        l.students = { ...l.students, membership_types: l.students.membership_types[0] }
    }
    
    const rate = 0.50
    const calculatedReward = calculateLessonReward(l, rate)
    console.log('Calculated reward WITH 1000 yen option fee:', calculatedReward)
  }

  // Reset test option fee to 0
  await supabase
    .from('student_coaches')
    .update({ option_reward_fee: 0, option_reward_note: null })
    .eq('student_id', studentId)
    .eq('coach_id', coachId)
  console.log('Reset test option fee to 0.')
}
run()
