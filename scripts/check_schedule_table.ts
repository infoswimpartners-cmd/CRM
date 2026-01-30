
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkTable() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('lesson_schedules').select('*').limit(1)

    if (error) console.error(error)
    else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
    } else {
        console.log('No rows found, cannot infer columns easily via JS.')
    }
}

checkTable()
