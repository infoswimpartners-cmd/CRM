
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkTemplates() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('email_templates').select('*')

    if (error) console.error(error)
    else {
        console.log('Templates found:', data.length)
        console.table(data)
    }
}

checkTemplates()
