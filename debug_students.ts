import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
    // Get a coach ID first
    const { data: coaches } = await supabaseAdmin.from('profiles').select('id, full_name').eq('role', 'coach').limit(2)
    console.log('Coaches:', coaches)

    if (coaches && coaches.length > 0) {
        const coachId = coaches[0].id
        console.log(`Testing with Coach ID: ${coachId} (${coaches[0].full_name})`)

        const { data: junctionData, error: junctionError } = await supabaseAdmin
            .from('student_coaches')
            .select(`
                students (
                    id, 
                    full_name
                )
            `)
            .eq('coach_id', coachId)

        console.log('Junction Error:', junctionError)
        console.log('Junction Data:', JSON.stringify(junctionData, null, 2))
    }
}

debug()
