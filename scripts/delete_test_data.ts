
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function deleteTestStudent() {
    const supabase = createAdminClient()
    const id = 'aa635bed-f705-4c0c-a628-2ad4d439fcc0' // ID from webhook response

    const { error } = await supabase.from('students').delete().eq('id', id)

    if (error) console.error('Delete Error:', error)
    else console.log('Test student deleted.')

    // Also delete by email just in case ID was wrong but email matched
    await supabase.from('students').delete().eq('contact_email', 'shinshin980312kodai@gmail.com')
}

deleteTestStudent()
