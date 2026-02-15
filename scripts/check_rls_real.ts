
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data: policies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'students');
    if (error) {
        console.log('Error querying pg_policies from public schema. This is expected if its not exposed. Trying RPC or direct query if possible.');
        // Usually pg_policies is in information_schema or pg_catalog and not exposed to PostgREST easily.
    }
    console.log('Students Policies:', policies);

    // Try raw SQL if possible via a known helper or just assume we can't.
    // Actually, I'll try to check if RLS is enabled.
    try {
        const { data: tableInfo } = await supabase.rpc('get_table_info', { t_name: 'students' });
        console.log('Table Info:', tableInfo);
    } catch (e) {
        console.log('RPC failed or returned error');
    }
}
check();
