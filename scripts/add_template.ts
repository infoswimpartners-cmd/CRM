
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function addTemplate() {
    const supabase = createAdminClient()

    const template = {
        key: 'schedule_overage_billing',
        subject: '【Swim Partners】レッスン料のご請求予定について',
        body: `{{name}} 様

いつもSwim Partnersをご利用いただきありがとうございます。

以下の日程でレッスンの登録が完了しました。
{{reason}}

■ レッスン日時
{{date}} {{time}}

■ レッスン内容
{{title}}

■ 請求額
{{amount}} 円

※決済は前日12:00にStripe経由で実行されます。
（既に該当日時を過ぎている場合は、即時実行されます）

ご不明な点がございましたら、お気軽にお問い合わせください。`,
        variables: ['name', 'amount', 'date', 'time', 'title', 'reason'],
        description: 'レッスン料請求の事前通知'
    }

    const { error } = await supabase
        .from('email_templates')
        .upsert(template, { onConflict: 'key' })

    if (error) console.error('Error adding template:', error)
    else console.log('Template adde/updated successfully')
}

addTemplate()
