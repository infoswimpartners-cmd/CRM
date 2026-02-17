
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function updateCompanyInfo() {
    console.log('Updating company info...')

    const defaultInfo = [
        { key: 'company_name', value: 'SWIM PARTNERS', description: '会社名' },
        { key: 'company_address', value: '東京都', description: '会社住所' },
        { key: 'invoice_registration_number', value: '', description: 'インボイス登録番号' },
        { key: 'contact_email', value: 'info.swimpartners@gmail.com', description: '連絡先メールアドレス' },
        { key: 'company_payment_bank_name', value: '三井住友銀行', description: '振込元銀行名' }
    ]

    for (const info of defaultInfo) {
        // Only insert if not exists to avoid overwriting custom settings
        const { data: existing } = await supabase
            .from('app_configs')
            .select('key')
            .eq('key', info.key)
            .single()

        if (!existing) {
            console.log(`Inserting ${info.key}...`)
            const { error } = await supabase
                .from('app_configs')
                .insert(info)

            if (error) console.error(`Error inserting ${info.key}:`, error)
        } else {
            console.log(`Skipping ${info.key} (already exists)`)
        }
    }

    console.log('Done.')
}

updateCompanyInfo()
