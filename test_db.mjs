import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: masters, error: mErr } = await supabase.from('lesson_masters').select('*').eq('is_trial', true)
  console.log('Masters:', masters)
  const { data: triggers, error: tErr } = await supabase.from('email_triggers').select('*')
  console.log('Triggers:', triggers)
}
test()
