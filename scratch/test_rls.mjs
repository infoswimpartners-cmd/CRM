import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function run() {
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log('Testing anon delete/insert on student_coaches...')
  const { error: delErr } = await anonSupabase.from('student_coaches').delete().eq('student_id', 'test')
  console.log('Anon delete error:', delErr)
}
run()
