import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'

async function checkConfig() {
    const supabase = createAdminClient()
    const { data: templates, error: tErr } = await supabase
        .from('email_templates')
        .select('key, is_approval_required, is_auto_send_enabled')
        .in('key', ['reception_completed', 'inquiry_received', 'trial_form_submitted_admin'])

    if (tErr) {
        console.error('Template Error:', tErr)
    } else {
        console.log('Templates:', templates)
    }

    const { data: triggers, error: trigErr } = await supabase
        .from('email_triggers')
        .select('id, is_enabled, template_id')
        .in('id', ['reception_completed', 'inquiry_received', 'trial_form_submitted_admin'])

    if (trigErr) {
        console.error('Trigger Error:', trigErr)
    } else {
        console.log('Triggers:', triggers)
    }
}

checkConfig()
