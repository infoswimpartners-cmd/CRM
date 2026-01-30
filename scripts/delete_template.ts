import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteTemplate() {
    const key = 'trial_payment_request'
    console.log(`Deleting email template: ${key}...`)

    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('key', key)

    if (error) {
        console.error('Error deleting template:', error)
    } else {
        console.log('✅ Template deleted successfully.')
    }
}

deleteTemplate()
