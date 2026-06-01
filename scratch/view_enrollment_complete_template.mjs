import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function view() {
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('key', 'enrollment_complete')
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    return
  }

  console.log('--- ENROLLMENT COMPLETE TEMPLATE ---')
  console.log('ID:', template.id)
  console.log('Subject:', template.subject)
  console.log('Body:\n', template.body)
  console.log('Auto Send Enabled:', template.is_auto_send_enabled)
  console.log('Approval Required:', template.is_approval_required)
}

view()
