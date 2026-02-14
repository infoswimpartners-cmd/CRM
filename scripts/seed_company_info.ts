
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

async function seedCompanyInfo() {
    const configs = [
        {
            key: 'company_name',
            value: 'SWIM PARTNERS',
            description: 'Updated via Seed Script'
        },
        {
            key: 'company_address',
            value: '〒150-0021 東京都渋谷区恵比寿西２丁目４−８ ウィンド恵比寿ビル 8F',
            description: 'Updated via Seed Script'
        },
        {
            key: 'contact_email',
            value: 'support@swimpartners.jp',
            description: 'Updated via Seed Script'
        },
        {
            key: 'invoice_registration_number',
            value: '', // Optional
            description: 'Updated via Seed Script'
        }
    ]

    const { error } = await supabase
        .from('app_configs')
        .upsert(configs, { onConflict: 'key' })

    if (error) {
        console.error('Error seeding configs:', error)
    } else {
        console.log('Successfully seeded company info')
    }
}

seedCompanyInfo()
