import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, lesson_schedule_id, date, status, student_id')
    .eq('student_id', 'a15eb3ed-4bb6-41c5-b1f4-66f8270f2807') // Sugiura
    .gte('date', '2026-06-29T00:00:00Z')
    .lt('date', '2026-07-02T00:00:00Z')
    
  console.log('Error:', error)
  console.log('Lessons for Sugiura around June 30th:', lessons)
}
run()
