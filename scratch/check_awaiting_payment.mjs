import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: stu } = await supabase
    .from('students')
    .select('full_name')
    .eq('id', 'f3e67f5c-4001-492c-8af0-7545e6e6fcda')
    
  console.log('Awaiting payment student:', stu)
}
run()
