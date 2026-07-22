import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const membershipTypeId = '253598b8-7e11-463c-af47-5d19097b3589' // 25m完泳パッケージプラン【全12回】
  const lessonMasterId = '008909bb-a046-408c-8e8a-610a4b11285e'     // 25m完泳パッケージプランレッスン

  // Check if mapping exists
  const { data: existing } = await supabase
    .from('membership_type_lessons')
    .select('id')
    .eq('membership_type_id', membershipTypeId)
    .eq('lesson_master_id', lessonMasterId)

  if (existing && existing.length > 0) {
    console.log('Updating existing mapping...')
    const { data, error } = await supabase
      .from('membership_type_lessons')
      .update({ reward_price: 9000 })
      .eq('id', existing[0].id)
    console.log('Update result error:', error)
  } else {
    console.log('Inserting new mapping...')
    const { data, error } = await supabase
      .from('membership_type_lessons')
      .insert({
        membership_type_id: membershipTypeId,
        lesson_master_id: lessonMasterId,
        reward_price: 9000
      })
    console.log('Insert result error:', error)
  }

  console.log('Successfully updated membership_type_lessons configuration.')
}
run()
