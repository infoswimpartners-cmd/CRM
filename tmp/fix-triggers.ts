
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'

async function fixTriggers() {
    const supabase = createAdminClient()

    // First, check if reception_completed already exists
    const { data: existing } = await supabase
        .from('email_triggers')
        .select('id')
        .eq('id', 'reception_completed')
        .single()

    if (existing) {
        console.log('reception_completed trigger already exists.')
    } else {
        // Find trial_form_submitted
        const { data: oldTrigger } = await supabase
            .from('email_triggers')
            .select('*')
            .eq('id', 'trial_form_submitted')
            .single()

        if (oldTrigger) {
            console.log('Updating trial_form_submitted to reception_completed...')
            // We can't update the PK normally. We insert a new one and delete the old one.
            const { error: insErr } = await supabase
                .from('email_triggers')
                .insert({
                    ...oldTrigger,
                    id: 'reception_completed',
                    name: '体験申し込み受付完了 (自動返信)',
                })

            if (insErr) {
                console.error('Insert Error:', insErr)
            } else {
                await supabase.from('email_triggers').delete().eq('id', 'trial_form_submitted')
                console.log('Success!')
            }
        } else {
            // Need to create it if it doesn't exist
            console.log('trial_form_submitted not found. Creating reception_completed trigger...')
            const { data: template } = await supabase.from('email_templates').select('id').eq('key', 'reception_completed').single()
            if (template) {
                await supabase.from('email_triggers').insert({
                    id: 'reception_completed',
                    name: '体験申し込み受付完了 (自動返信)',
                    description: '体験申し込みフォームが送信された直後の自動返信メール。',
                    template_id: template.id,
                    is_enabled: true
                })
                console.log('Created!')
            } else {
                console.error('Template reception_completed not found.')
            }
        }
    }
}

fixTriggers()
