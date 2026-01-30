
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

async function checkLatestStudent() {
    console.log('Fetching latest student...')

    const { data, error } = await supabase
        .from('students')
        .select('id, full_name, contact_email, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching student:', error)
        return
    }

    console.log('Latest Student Found:')
    console.log('Name:', data.full_name)
    console.log('Email:', data.contact_email)
    console.log('Created At:', data.created_at)
    console.log('--- NOTES ---')
    console.log(data.notes)
    console.log('-------------')
}

checkLatestStudent()
