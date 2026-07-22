import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: schedules } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, billing_status, price, student_id, title')
    .gte('start_time', '2026-06-01T00:00:00Z')
    .lt('start_time', '2026-07-01T00:00:00Z')
    .in('billing_status', ['ready_to_invoice', 'pending', 'awaiting_approval'])
    
  console.log('Stuck June Lessons:', schedules?.length || 0)
  if (schedules) {
    const grouped = schedules.reduce((acc, curr) => {
      acc[curr.billing_status] = (acc[curr.billing_status] || 0) + 1
      return acc
    }, {})
    console.log('By Status:', grouped)
  }
}
run()
