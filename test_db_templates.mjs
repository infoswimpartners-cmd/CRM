import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: cols, error } = await supabase.rpc('get_table_columns_by_name', { tname: 'email_templates' })
  // Fallback if rpc doesn't exist:
  const { data } = await supabase.from('email_templates').select('*').limit(1)
  console.log('Template Sample:', data)
}
test()
