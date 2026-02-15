
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function investigation() {
    console.log('--- Detailed Lesson Master Investigation ---')

    const { data: lessons, error: lError } = await supabase
        .from('lessons')
        .select('id, student_name, lesson_master_id, lesson_date')

    if (lError) {
        console.error('Fetch lessons error:', lError)
        return
    }

    const { data: masters } = await supabase.from('lesson_masters').select('id, name')
    const masterMap = new Map(masters?.map(m => [m.id, m.name]))

    const results = lessons.map(l => ({
        id: l.id,
        student: l.student_name,
        date: l.lesson_date,
        master_id: l.lesson_master_id,
        master_name: masterMap.get(l.lesson_master_id) || null
    }))

    console.log('Lesson Master Linkage Analysis:')
    console.table(results)

    const missingIds = results.filter(r => !r.master_id).length
    const missingMasters = results.filter(r => r.master_id && !r.master_name).length

    console.log(`Lessons without lesson_master_id: ${missingIds}`)
    console.log(`Lessons with invalid/missing lesson_master record: ${missingMasters}`)
}

investigation()
