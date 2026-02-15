
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    const { data, error } = await supabase
        .from('students')
        .select('is_two_person_lesson')
        .limit(1);

    if (error) {
        console.error('Error checking column:', error);
    } else {
        console.log('Success: Column exists');
    }
}

checkColumn();
