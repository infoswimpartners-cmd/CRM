
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkRpcColumns() {
    console.log('--- Checking RPC Return Columns ---')
    // We can't easily introspect return columns via rpc() call error if it exists,
    // but we can look at the data returned for a valid student.

    // Find a student with lessons first
    const { data: lesson } = await supabase.from('lessons').select('student_id').limit(1).single()
    if (!lesson) {
        console.log('No lessons found to test with.')
        return
    }

    const { data, error } = await supabase.rpc('get_student_lesson_history_public', {
        p_student_id: lesson.student_id
    })

    if (error) {
        console.error('RPC Error:', error.message)
        return
    }

    if (data && data.length > 0) {
        console.log('First record columns:', Object.keys(data[0]))
        if ('lesson_name' in data[0]) {
            console.log('RESULT: lesson_name EXISTS')
        } else {
            console.log('RESULT: lesson_name MISSING')
        }
    } else {
        console.log('No data returned for this student id.')
    }
}
checkRpcColumns()
