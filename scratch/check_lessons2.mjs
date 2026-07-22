import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: schedules } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, billing_status, stripe_invoice_item_id')
    .in('id', ['ae60b2e7-5eb7-4e26-b4e4-633e3a263daf', 'fb2a2776-dd52-4e79-9e15-4e6ab56c78e1'])
    
  console.log(schedules)
}
run()
