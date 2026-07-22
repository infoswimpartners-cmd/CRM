import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: overage } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, billing_status, student_id')
    .gte('start_time', '2026-06-01T00:00:00Z')
    .lt('start_time', '2026-07-01T00:00:00Z')
    .eq('is_overage', true)
    .in('billing_status', ['pending', 'ready_to_invoice', 'awaiting_payment'])
    
  console.log('Unpaid June Overage:', overage)
}
run()
