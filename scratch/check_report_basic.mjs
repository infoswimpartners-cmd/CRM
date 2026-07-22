import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: reports, error } = await supabase
    .from('lesson_reports')
    .select('id, lesson_schedule_id')
    .limit(5)
    
  console.log('Error:', error)
  console.log('Sample Reports:', reports)
}
run()
