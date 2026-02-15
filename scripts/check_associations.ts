
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data: coaches } = await supabase.from('profiles').select('id, full_name, role').ilike('full_name', '%新吉%');
    console.log('Coaches found:', coaches);

    const { data: students } = await supabase.from('students').select('id, full_name, coach_id').ilike('full_name', '%太郎%');
    console.log('Students found:', students);
}
check();
