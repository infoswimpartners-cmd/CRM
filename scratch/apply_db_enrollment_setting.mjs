import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function apply() {
  console.log('Applying enrollment settings to Database...')

  // 1. トリガーとテンプレートの紐付け
  const { data: triggerData, error: triggerError } = await supabase
    .from('email_triggers')
    .update({
      template_id: '99de30db-54a2-4e24-a134-b6a83a8110fe' // enrollment_complete のID
    })
    .eq('id', 'enrollment_completed')
    .select()

  if (triggerError) {
    console.error('Failed to update trigger:', triggerError)
    return
  }
  console.log('Successfully updated trigger:', triggerData)

  // 2. テンプレートの自動送信有効化・承認不要化
  const { data: templateData, error: templateError } = await supabase
    .from('email_templates')
    .update({
      is_auto_send_enabled: true,
      is_approval_required: false
    })
    .eq('id', '99de30db-54a2-4e24-a134-b6a83a8110fe')
    .select()

  if (templateError) {
    console.error('Failed to update template:', templateError)
    return
  }
  console.log('Successfully updated template:', templateData)

  console.log('DB updates completed successfully!')
}

apply()
