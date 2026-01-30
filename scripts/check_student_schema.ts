
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkSchema() {
    const supabase = createAdminClient()
    // No direct API to check schema types via js client easily without iterating or causing error.
    // Instead, insert a dummy record without membership_type_id and see error.

    const { error } = await supabase
        .from('students')
        .insert({ full_name: 'TEST_SCHEMA_CHECK', contact_email: 'test@example.com' })
        .select()

    if (error) {
        console.log('Insert Failed:', error.message)
        console.log('Details:', error.details)
    } else {
        console.log('Insert Success! membership_type_id is likely optional.')
        // cleanup
        await supabase.from('students').delete().eq('full_name', 'TEST_SCHEMA_CHECK')
    }
}

checkSchema()
