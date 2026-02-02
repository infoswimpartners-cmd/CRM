
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const studentId = '4718c96d-fca9-46c6-b47d-21c52d1058aa'

async function updateStudent() {
    console.log(`Updating ${studentId} membership_started_at to 2026-02-01...`)

    const { error } = await supabase
        .from('students')
        .update({ membership_started_at: '2026-02-01 00:00:00+09' }) // JST midnight
        .eq('id', studentId)

    if (error) {
        console.error('Update Error:', error)
    } else {
        console.log('Update Success!')
    }
}

updateStudent()
