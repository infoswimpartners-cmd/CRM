import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: entries, error: e1 } = await supabase.from('trio_entries').select('*');
    console.log('Entries:', JSON.stringify(entries, null, 2));
    
    const { data: students, error: e2 } = await supabase.from('students').select('id, full_name').ilike('full_name', '%テスト太郎%');
    console.log('Test Users:', JSON.stringify(students, null, 2));
}

check();
