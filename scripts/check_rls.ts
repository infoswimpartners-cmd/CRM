
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAccess() {
    console.log("Checking access with Anon Key...");
    // Try to fetch one student status
    const { data, error } = await supabase
        .from('students')
        .select('id, status')
        .limit(1);

    if (error) {
        console.error("Direct query error:", error.message);
    } else {
        console.log("Direct query success:", data);
    }
}

checkAccess();
