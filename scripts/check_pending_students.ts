import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkRecentTrials() {
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'trial_pending')
        .order('id', { ascending: false }) // UUIDs don't sort by time well usually, but updated_at isn't always reliable if not selected. Let's use created_at or updated_at if available.
        // Actually schema has created_at.
        .order('created_at', { ascending: false })
        .limit(3)

    if (error) {
        console.error(error)
        return
    }

    console.log('Recent students in trial_pending:')
    students.forEach(s => {
        console.log(`- ${s.full_name} (${s.contact_email})`)
        console.log(`  ID: ${s.id}`)
    })
}

checkRecentTrials()
