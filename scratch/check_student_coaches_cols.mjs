import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: cols, error } = await supabase.from('student_coaches').select('*').limit(1)
  console.log('Error:', error)
  console.log('Columns of student_coaches:', Object.keys(cols?.[0] || {}))
}
run()
