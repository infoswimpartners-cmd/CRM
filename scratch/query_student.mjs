import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, status, membership_started_at, membership_types!students_membership_type_id_fkey(name)')
    .eq('status', 'active')
    .is('membership_started_at', null)
    
  if (error) console.error(error)
  else console.table(data.map(d => ({
    name: d.full_name,
    status: d.status,
    started_at: d.membership_started_at,
    plan: d.membership_types?.name
  })))
}
run()
