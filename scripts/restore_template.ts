import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function restoreTemplate() {
    const template = {
        key: 'trial_payment_request',
        subject: '【Swim Partners】体験レッスンの日程確定と事前決済のお願い',
        body: '{{name}} 様\n\nSwim Partnersです。\n体験レッスンの日程が以下の通り確定いたしました。\n\n■ 体験レッスン日時\n{{lesson_date}}\n\nつきましては、下記URLより体験レッスン料（¥{{amount}}）の事前決済をお願いいたします。\nお支払いの完了を確認次第、予約確定となります。\n\n▼ お支払いリンク\n{{payment_link}}\n\n当日お会いできるのを楽しみにしております。',
        variables: ['name', 'payment_link', 'trial_date', 'amount'], // Note: 'trial_date' vs 'lesson_date' mismatch was there before, I should fix it? No, keeping original to be safe first. Actually verify variables.
        // Wait, step 7120 showed: variables: [ 'name', 'payment_link', 'trial_date', 'amount' ]
        // But body used {{lesson_date}}.
        // I should probably fix the mismatch while I'm at it, but let's just restore exactly first.
        description: '管理者が体験日時を確定した際に送る決済依頼メール'
    }

    const { error } = await supabase
        .from('email_templates')
        .insert(template)

    if (error) {
        console.error('Error restoring template:', error)
    } else {
        console.log('✅ Template restored successfully.')
    }
}

restoreTemplate()
