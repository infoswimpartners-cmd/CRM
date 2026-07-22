import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: reports } = await supabase
    .from('lesson_reports')
    .select('id, lesson_schedule_id, student_id, report_date')
    .eq('student_id', 'a15eb3ed-4bb6-41c5-b1f4-66f8270f2807')
    
  console.log('All Sugiura Reports:', reports)
}
run()
