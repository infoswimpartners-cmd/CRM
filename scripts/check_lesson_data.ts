
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkData() {
    console.log('--- Lessons Data Check ---')

    const { count: total, error: err1 } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })

    const { count: withId, error: err2 } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .not('student_id', 'is', null)

    const { count: withoutId, error: err3 } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .is('student_id', null)

    console.log(`Total Lessons: ${total}`)
    console.log(`Lessons with student_id: ${withId}`)
    console.log(`Lessons without student_id: ${withoutId}`)

    if (withoutId && withoutId > 0) {
        const { data: samples } = await supabase
            .from('lessons')
            .select('id, student_name, coach_id, lesson_date')
            .is('student_id', null)
            .limit(5)
        console.log('Samples without student_id:', samples)
    }
}

checkData()
