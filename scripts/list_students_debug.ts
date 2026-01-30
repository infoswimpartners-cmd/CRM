
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listStudents() {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('students')
        .select('id, full_name, membership_types(name)')
        .limit(5)

    if (data) {
        data.forEach(s => {
            // @ts-ignore
            const m = Array.isArray(s.membership_types) ? s.membership_types[0] : s.membership_types
            console.log(`${s.full_name} (${s.id}) - ${m?.name}`)
        })
    }
}

listStudents()
