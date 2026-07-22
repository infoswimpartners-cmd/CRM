import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const lessonId = '048e4fe0-b644-4646-a8a8-1c116e58106f'
  const { data: report } = await supabase
    .from('lesson_reports')
    .select('*')
    .eq('lesson_schedule_id', lessonId)
    
  console.log('Reports for lesson:', report)
}
run()
