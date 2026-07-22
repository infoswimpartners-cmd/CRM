import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  await supabase.from('lesson_schedules').update({
     billing_status: 'paid'
  }).eq('id', '048e4fe0-b644-4646-a8a8-1c116e58106f')
  console.log('Fixed DB to paid')
}
run()
