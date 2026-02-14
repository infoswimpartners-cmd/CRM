
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkConfigs() {
    const { data, error } = await supabase
        .from('app_configs')
        .select('*')
        .like('key', 'company_%') // OR just select all
    // .or('key.eq.invoice_registration_number,key.eq.contact_email') // complex filter

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('App Configs:', data)
    }
}

checkConfigs()
