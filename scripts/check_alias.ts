import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
    const { data, error } = await supabaseAdmin
        .from('lesson_schedules')
        .select(`
            id,
            status:billing_status,
            profiles(full_name)
        `)
        .limit(1)

    console.log("Error:", error)
    if (data) console.log("Data:", data)
}
check()
