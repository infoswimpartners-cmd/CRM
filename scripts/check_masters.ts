
import { createClient } from '@/lib/supabase/server' // usage in script requires handling, using supabase-js directly simpler for script
import { createClient as createClientJS } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClientJS(supabaseUrl, supabaseKey);

async function checkMasters() {
    console.log("Checking Lesson Masters...");
    const { data: masters, error } = await supabaseAdmin
        .from('lesson_masters')
        .select('*');

    if (masters) {
        console.table(masters.map(m => ({ id: m.id, name: m.name, duration: m.duration, fee: m.fee, type: m.type })));
    } else {
        console.error(error);
    }

    console.log("\nChecking Membership Types...");
    const { data: memberships } = await supabaseAdmin
        .from('membership_types')
        .select('*');

    if (memberships) {
        console.table(memberships.map(m => ({ id: m.id, name: m.name, duration: m.duration, default_master_id: m.default_lesson_master_id })));
    }
}

checkMasters();
