import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    // lessons columns
    const { data: lessons, error: lErr } = await supabase.from('lessons').select('*').limit(1)
    if (lErr) console.error(lErr)
    else console.log('lessons columns:', Object.keys(lessons[0] || {}))

    // lesson_schedules columns
    const { data: schedules, error: sErr } = await supabase.from('lesson_schedules').select('*').limit(1)
    if (sErr) console.error(sErr)
    else console.log('lesson_schedules columns:', Object.keys(schedules[0] || {}))
}
main()
