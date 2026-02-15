
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkFunction() {
    console.log('--- RPC Function Check ---')
    // Check if the function exists in pg_proc
    const { data, error } = await supabase.rpc('check_function_exists', {
        fn_name: 'get_student_lesson_history_public'
    }).catch(async () => {
        // If check_function_exists doesn't exist, use raw query if possible or just try to list functions
        return await supabase.from('pg_proc').select('proname').eq('proname', 'get_student_lesson_history_public')
    })

    const { data: functions, error: fnError } = await supabase
        .from('pg_description')
        .select('*')
        .limit(1) // Just a dummy check to see if we can access system tables

    // Let's try to just run a simple select on pg_proc via a temporary dummy RPC if allowed, 
    // but usually we don't have that.
    // Instead, let's try to call it with a random UUID to see the error type change.
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const { error: callError } = await supabase.rpc('get_student_lesson_history_public', { p_student_id: dummyUuid })

    console.log('Call Error:', callError)
    if (callError?.message?.includes('Could not find')) {
        console.log('Function explicitly NOT FOUND in schema cache.')
    } else {
        console.log('Function might exist but failed with:', callError?.message)
    }
}
checkFunction()
