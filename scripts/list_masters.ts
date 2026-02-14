
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data: masters, error } = await supabase
        .from('lesson_masters')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching lesson masters:', error);
        return;
    }

    if (masters.length > 0) {
        console.log('First master keys:', Object.keys(masters[0]));
        console.log('First master sample:', masters[0]);
    }

    console.log('Lesson Masters:');
    masters.forEach((m) => {
        // @ts-ignore
        console.log(`- ID: ${m.id}, Name: ${m.name}, Trial: ${m.is_trial}, Fee: ${m.fee}, Price: ${m.price}`);
    });
}

main();
