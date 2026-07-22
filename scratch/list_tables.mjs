import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_tables_and_columns', {})
  if (error) {
     console.log('rpc error, trying pg_meta')
     const { data: tables, error: tErr } = await supabase.from('lesson_schedules').select('*').limit(0)
     console.log('tErr:', tErr)
  }
}
run()
