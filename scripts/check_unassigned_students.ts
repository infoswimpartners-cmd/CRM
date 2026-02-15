
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnassigned() {
    console.log('--- Checking Unassigned Students ---');

    const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .is('coach_id', null);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Students with NO coach_id: ${count}`);
    }

    // Also check total students
    const { count: total } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

    console.log(`Total Students: ${total}`);
}

checkUnassigned();
