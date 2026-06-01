import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function list() {
  const { data: templates, error: tErr } = await supabase
    .from('email_templates')
    .select('id, key, name, subject')
  
  if (tErr) {
    console.error('Error fetching templates:', tErr)
  } else {
    console.log('--- EMAIL TEMPLATES ---')
    console.table(templates)
  }

  const { data: triggers, error: trErr } = await supabase
    .from('email_triggers')
    .select('id, name, is_enabled, template_id')
  
  if (trErr) {
    console.error('Error fetching triggers:', trErr)
  } else {
    console.log('--- EMAIL TRIGGERS ---')
    console.table(triggers)
  }
}

list()
