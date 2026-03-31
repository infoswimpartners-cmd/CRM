import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function testJoin() {
    console.log("=== Testing JOIN ===")
    const { data, error } = await supabaseAdmin
        .from('lesson_schedules')
        .select(`
            id,
            profiles (
                full_name
            )
        `)
        .limit(1)

    if (error) {
        console.error("Join Error:", error)

        // Try alternate explicit syntax
        console.log("=== Testing Alternate JOIN ===")
        const { data: altData, error: altError } = await supabaseAdmin
            .from('lesson_schedules')
            .select(`
                id,
                coach:profiles!coach_id ( full_name )
            `)
            .limit(1)

        if (altError) {
            console.error("Alt Join Error:", altError)
        } else {
            console.log("Alt Join Data:", altData)
        }
    } else {
        console.log("Join Success:", data)
    }
}

testJoin()
