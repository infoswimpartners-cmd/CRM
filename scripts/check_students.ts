
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
    const coachId = 'dd83f35d-8946-414c-ad97-7436a3be9065';
    console.log('Checking students for coach:', coachId);
    const { data, error } = await supabase.rpc('get_students_for_coach_public', { p_coach_id: coachId });
    if (error) {
        console.error('Error fetching students:', error);
    } else {
        console.log('Students:', data);
    }
}

main();
