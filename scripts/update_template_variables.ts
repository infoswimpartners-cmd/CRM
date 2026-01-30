
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateVariables() {
    const updates = [
        {
            key: 'inquiry_received',
            variables: ['name', 'kana', 'email', 'phone', 'message', 'type', 'all_inputs']
        },
        {
            key: 'trial_payment_request',
            variables: ['name', 'payment_link', 'trial_date', 'amount']
        },
        {
            key: 'enrollment_complete',
            variables: ['name', 'plan_name', 'start_date']
        },
        {
            key: 'lesson_reminder',
            variables: ['name', 'lesson_date', 'location', 'coach_name']
        },
        {
            key: 'trial_confirmed',
            variables: ['name', 'trial_date', 'location']
        }
    ]

    for (const update of updates) {
        console.log(`Updating variables for ${update.key}...`)
        const { error } = await supabase
            .from('email_templates')
            .update({ variables: update.variables })
            .eq('key', update.key)

        if (error) {
            console.error(`Error updating ${update.key}:`, error)
        } else {
            console.log(`Success: ${update.key}`)
        }
    }
}

updateVariables()
