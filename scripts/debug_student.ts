
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function debugStudent() {
    console.log('Fetching first student...')
    const { data, error } = await supabase
        .from('students')
        .select(`
        id, 
        full_name,
        membership_type_id,
        membership_types!students_membership_type_id_fkey (
            name,
            id,
            default_lesson_master_id,
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
        .eq('id', '4b19b076-b424-4fbf-91d0-b24de6d8cd71')

    if (error) console.error('Query Error:', error)

    // @ts-ignore
    const student = data && data.length > 0 ? data[0] : null

    if (student) {
        // @ts-ignore
        const s = student
        console.log('Student:', s.full_name, s.id)
        // @ts-ignore
        const m = Array.isArray(s.membership_types) ? s.membership_types[0] : s.membership_types
        console.log('Membership:', m?.name)
        const defaultLessonRaw = m?.default_lesson as any
        const defaultLesson = Array.isArray(defaultLessonRaw) ? defaultLessonRaw[0] : defaultLessonRaw
        console.log('Default Lesson:', defaultLesson ? defaultLesson.name : 'None')

        const lessons = m?.membership_type_lessons
        console.log('Linked Lessons Count:', lessons?.length)
    } else {
        console.log('No student found')
    }
}

debugStudent()
