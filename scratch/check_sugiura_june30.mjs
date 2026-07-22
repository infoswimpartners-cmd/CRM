import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  // Find Sugiura
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, full_name')
    .ilike('full_name', '%杉浦%')
    
  if (!students || students.length === 0) {
    console.log('Sugiura not found')
    return
  }
  
  console.log('Found Students:', students.map(s => s.full_name))
  
  const studentIds = students.map(s => s.id)
  
  // Find June 30th lesson
  const { data: schedules } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, is_overage, billing_status, price, is_reported, billing_scheduled_at, student_id')
    .in('student_id', studentIds)
    .gte('start_time', '2026-06-29T00:00:00Z')
    .lt('start_time', '2026-07-02T00:00:00Z')
    
  console.log('Schedules around June 30th:', schedules)
}
run()
