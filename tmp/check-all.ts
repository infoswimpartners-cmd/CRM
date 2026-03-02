
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'

async function checkTriggers() {
    const supabase = createAdminClient()
    const { data: triggers, error } = await supabase
        .from('email_triggers')
        .select('*')

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Triggers:', triggers)
    }

    const { data: templates, error: tErr } = await supabase
        .from('email_templates')
        .select('id, key')

    if (tErr) {
        console.error('Template Error:', tErr)
    } else {
        console.log('Templates:', templates)
    }
}

checkTriggers()
