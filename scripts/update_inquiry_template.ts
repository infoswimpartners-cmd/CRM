
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateTemplate() {
    const key = 'inquiry_received'
    const subject = '【Swim Partners】お問い合わせありがとうございます。'
    const body = `{{name}} 様

この度はお問い合わせいただき、誠にありがとうございます。
Swim Partners 事務局でございます。

以下の内容でお問い合わせを受け付けました。

========================================
{{all_inputs}}
========================================

確認次第、担当者よりご連絡いたします。
今しばらくお待ちくださいませ。

--------------------------------------------------
Swim Partners
Web: https://swim-partners.com
Email: info@swim-partners.com
--------------------------------------------------`

    const { error } = await supabase
        .from('email_templates')
        .update({ subject, body })
        .eq('key', key)

    if (error) {
        console.error('Failed to update template:', error)
    } else {
        console.log('Template updated successfully!')
    }
}

updateTemplate()
