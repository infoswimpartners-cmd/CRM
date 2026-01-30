
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkColumns() {
    const supabase = createAdminClient()
    // Fetch one student to inspect keys
    const { data } = await supabase.from('students').select('*').limit(1)
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
    } else {
        console.log('No students found to check columns.')
    }
}

checkColumns()
