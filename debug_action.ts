import { config } from 'dotenv'
config({ path: '.env.local' })
import { getStudentsForCoachPublicAction } from './src/actions/report'

async function debug() {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get a coach ID first
    const { data: coaches } = await supabaseAdmin.from('profiles').select('id, full_name').eq('role', 'coach').limit(2)

    if (coaches && coaches.length > 0) {
        const coachId = coaches[0].id
        console.log(`Testing with Coach ID: ${coachId} (${coaches[0].full_name})`)

        const res = await getStudentsForCoachPublicAction(coachId)
        console.log('Result:', JSON.stringify(res, null, 2))
    }
}

debug()
