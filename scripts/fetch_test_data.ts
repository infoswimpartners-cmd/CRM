
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
    const { data: coach, error } = await supabase
        .from('profiles')
        .select('id, full_name, coach_number')
        .eq('role', 'coach')
        .order('coach_number', { ascending: true }) // Get the first one that probably exists
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching coach:', error);
        return;
    }

    console.log('Coach:', coach);

    const { data: masters, error: mastersError } = await supabase.from('lesson_masters').select('id, name').eq('active', true).limit(1);

    if (mastersError) {
        console.error('Error fetching masters:', mastersError);
    } else {
        console.log('Masters:', masters);
    }
}

main();
