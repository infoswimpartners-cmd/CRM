
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function debugMonthly() {
    const supabase = createAdminClient()
    const studentId = '084a8854-86be-410b-b2fc-38d05e1389c6' // Now Monthly

    const { data: student, error } = await supabase
        .from('students')
        .select(`
          id, 
          membership_types!students_membership_type_id_fkey (
              name,
              id,
              default_lesson_master_id,
              monthly_lesson_limit,
              default_lesson:lesson_masters!default_lesson_master_id (
                  id,
                  name,
                  unit_price
              ),
              membership_type_lessons (
                  lesson_master_id,
                  lesson_masters (
                      id,
                      name,
                      unit_price
                  )
              )
          )
      `)
        .eq('id', studentId)
        .single()

    if (error) {
        console.error('Fetch Error:', error)
        return
    }

    // @ts-ignore
    const membership = Array.isArray(student.membership_types) ? student.membership_types[0] : student.membership_types

    const defaultLessonId = membership?.default_lesson_master_id
    const defaultLessonRaw = membership?.default_lesson as any
    const defaultLesson = Array.isArray(defaultLessonRaw) ? defaultLessonRaw[0] : defaultLessonRaw
    // @ts-ignore
    const linkedLessons = membership?.membership_type_lessons?.map((x: any) => {
        const lm = x.lesson_masters
        return Array.isArray(lm) ? lm[0] : lm
    }) || []

    console.log('Membership:', membership?.name)
    console.log('Default ID:', defaultLessonId)
    console.log('Default Lesson Obj:', defaultLesson)
    console.log('Linked Lessons:', linkedLessons)

    let availableLessons = [...linkedLessons]
    if (defaultLesson && !availableLessons.find(l => l.id === defaultLesson.id)) {
        availableLessons.push(defaultLesson)
    }

    console.log('Final Available Lessons:', availableLessons.map((l: any) => l.name))
}

debugMonthly()
