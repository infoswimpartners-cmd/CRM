import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listTemplates() {
    const { data: templates, error } = await supabase
        .from('email_templates')
        .select('key, subject')

    if (error) {
        console.error(error)
        return
    }

    console.log('Available Templates:')
    templates.forEach(t => {
        console.log(`- [${t.key}] ${t.subject}`)
    })
}

listTemplates()
