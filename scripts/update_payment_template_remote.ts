
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

async function updateTemplateConfig() {
    console.log('Updating payment template config...')

    const defaultInfo = [
        { key: 'payment_slip_title', value: '支払通知書', description: '支払い通知書のタイトル' },
        { key: 'payment_slip_header_paid', value: '以下の内容で振込手続が完了いたしました。', description: '支払い完了時のヘッダー文言' },
        { key: 'payment_slip_header_processing', value: '以下の内容で支払手続きを進めております。', description: '支払い処理中のヘッダー文言' },
        { key: 'payment_slip_footer', value: 'Swim Partners Manager System', description: '支払い通知書のフッター文言' }
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

updateTemplateConfig()
