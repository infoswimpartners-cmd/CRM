
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function updateStudent() {
    const supabase = createAdminClient()
    const studentId = '084a8854-86be-410b-b2fc-38d05e1389c6'
    const newMembershipId = '90dcb7d5-f691-4a92-bfdc-d845e996dcc0' // Month 2 (90min)

    const { error } = await supabase
        .from('students')
        .update({ membership_type_id: newMembershipId })
        .eq('id', studentId)

    if (error) console.error(error)
    else console.log('Updated student membership to Month 4 (60min)')
}

updateStudent()
