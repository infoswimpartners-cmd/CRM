
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    // Querying information_schema.columns directly
    const { data, error } = await supabase.from('pg_attribute')
        .select('attname')
        .eq('attrelid', 'students' as any)
        .gt('attnum', 0);

    // Actually, better to query columns if exposed, but usually not.
    // I'll just select one row and see keys.
    const { data: oneRow } = await supabase.from('students').select('*').limit(1);
    if (oneRow && oneRow[0]) {
        console.log('Columns in students table:', Object.keys(oneRow[0]));
    } else {
        console.log('No rows in students table to check columns.');
    }
}
check();
