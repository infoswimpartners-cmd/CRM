import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function find() {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, contact_email, line_user_id')
    .ilike('full_name', '%太郎%')
  
  if (error) {
    console.error('Error finding:', error)
    return
  }

  console.log('Found Students:', students)
}

find()
