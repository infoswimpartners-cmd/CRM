import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.production.local' })

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const { data } = await supa.from('profiles').select('email, role, google_refresh_token').eq('role', 'admin')
  console.log(JSON.stringify(data, null, 2))
}
check()
