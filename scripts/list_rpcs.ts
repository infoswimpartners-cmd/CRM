
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function listFunctions() {
    console.log('--- Listing Available Functions (via known RPCs or common names) ---')

    // We can't query pg_proc directly via rpc unless we have a helper.
    // Let's try to call some known ones to see if they exist.
    const knowns = [
        'get_students_for_coach_public',
        'submit_lesson_report_public',
        'get_student_lesson_history_public'
    ]

    for (const name of knowns) {
        const { error } = await supabase.rpc(name, {})
        if (error && error.message.includes('Could not find')) {
            console.log(`[NOT FOUND] ${name}`)
        } else {
            console.log(`[EXISTS or Mismatched Args] ${name} (Error: ${error?.message})`)
        }
    }
}
listFunctions()
