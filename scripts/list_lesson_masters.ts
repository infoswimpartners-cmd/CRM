
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listLessons() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('lesson_masters')
        .select('id, name, unit_price')
        .order('name')

    if (error) console.error(error)
    else console.table(data)
}

listLessons()
