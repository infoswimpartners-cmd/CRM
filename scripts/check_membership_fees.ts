
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkFees() {
    const supabase = createAdminClient()
    const { data } = await supabase.from('membership_types').select('*')
    console.table(data)
}

checkFees()
