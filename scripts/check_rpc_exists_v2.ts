
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    console.log('--- Checking RPC Existence ---')
    const dummyUuid = '11111111-1111-1111-1111-111111111111'

    try {
        const { data, error } = await supabase.rpc('get_student_lesson_history_public', {
            p_student_id: dummyUuid
        })

        if (error) {
            console.log('RPC Call finished with error:', error.message)
            if (error.message.includes('Could not find the function')) {
                console.log('RESULT: FUNCTION_NOT_FOUND_IN_CACHE')
            } else {
                console.log('RESULT: FUNCTION_EXISTS_BUT_ERRORED')
            }
        } else {
            console.log('RESULT: FUNCTION_EXISTS_AND_WORKS (No data for dummy UUID)')
        }
    } catch (e: any) {
        console.log('Unexpected Exception:', e.message)
    }
}
check()
