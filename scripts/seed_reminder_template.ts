
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const main = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Environment Variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
        console.log('Ensure .env.local exists in project root.')
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Inserting lesson_reminder template...')

    const { error } = await supabase
        .from('email_templates')
        .upsert({
            key: 'lesson_reminder',
            subject: '【Swim Partners】明日のレッスン予約のリマインド',
            body: '{{name}} 様\n\nいつもSwim Partnersをご利用いただきありがとうございます。\n\n明日 {{date}} {{time}}より、{{coach_name}}とのレッスン予約がございます。\n\n当日はお気をつけてお越しください。\nお待ちしております。\n\nSwim Partners',
            variables: ['{{name}}', '{{date}}', '{{time}}', '{{coach_name}}'],
            description: 'レッスンの前日に自動送信されるリマインドメール',
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

    if (error) {
        console.error('Error inserting template:', error)
        process.exit(1)
    }

    console.log('Success! Template inserted with variables {{name}}, {{date}}, {{time}}, {{coach_name}}.')
}

main()
