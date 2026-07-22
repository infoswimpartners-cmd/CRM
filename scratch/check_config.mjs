import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  // Check membership_type_lessons for "25m完泳パッケージプラン【全12回】"
  const { data: configs } = await supabase
    .from('membership_type_lessons')
    .select('*')
    .eq('membership_type_id', '253598b8-7e11-463c-af47-5d19097b3589')
    
  console.log('Configs for 25m完泳パッケージプラン【全12回】:', configs)
}
run()
