
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data: students } = await supabase.from('students').select('id, full_name')
    const { data: lessons } = await supabase.from('lessons').select('student_id')

    const counts = students?.map(s => ({
        name: s.full_name,
        id: s.id,
        count: lessons?.filter(l => l.student_id === s.id).length || 0
    })) || []

    console.log('Student Lesson Counts:', JSON.stringify(counts, null, 2))
}
check()
