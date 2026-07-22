import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: schedules } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, billing_status, is_overage, billing_scheduled_at, student_id')
    .gte('start_time', '2026-06-01T00:00:00Z')
    .lt('start_time', '2026-07-01T00:00:00Z')
    .eq('billing_status', 'pending')
    .limit(5)
    
  console.log('Pending June:', schedules)
  
  const { data: rti } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, billing_status, stripe_invoice_item_id, stripe_invoice_id')
    .gte('start_time', '2026-06-01T00:00:00Z')
    .lt('start_time', '2026-07-01T00:00:00Z')
    .eq('billing_status', 'ready_to_invoice')
    .limit(5)
  console.log('RTI June:', rti)
}
run()
