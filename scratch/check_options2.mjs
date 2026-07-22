import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: options, error } = await supabase
    .from('lesson_schedule_options')
    .select('*, option:options(*)')
    .in('lesson_schedule_id', ['ae60b2e7-5eb7-4e26-b4e4-633e3a263daf', 'fb2a2776-dd52-4e79-9e15-4e6ab56c78e1'])
    
  console.log('Error:', error)
  console.log('Options:', options)
}
run()
