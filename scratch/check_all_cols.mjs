import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data } = await supabase
    .from('lesson_schedules')
    .select('*')
    .eq('id', 'ae60b2e7-5eb7-4e26-b4e4-633e3a263daf')
    
  console.log(data[0])
}
run()
