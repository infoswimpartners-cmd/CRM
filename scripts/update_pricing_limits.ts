
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function updateLimits() {
    console.log("Updating lesson limits...");

    // Update 2-times plans to limit = 2
    const { error: err1 } = await supabaseAdmin
        .from('membership_types')
        .update({ monthly_lesson_limit: 2 })
        .ilike('name', '%月2回%');

    if (err1) console.error('Error updating 2-times limit:', err1);
    else console.log('Updated "月2回" plans to limit = 2');

    // Update 4-times plans to limit = 4 (just to be sure)
    const { error: err2 } = await supabaseAdmin
        .from('membership_types')
        .update({ monthly_lesson_limit: 4 })
        .ilike('name', '%月4回%');

    if (err2) console.error('Error updating 4-times limit:', err2);
    else console.log('Updated "月4回" plans to limit = 4');

    // Re-check
    const { data: plans } = await supabaseAdmin
        .from('membership_types')
        .select('name, fee, monthly_lesson_limit')
        .order('fee', { ascending: true });

    console.log('--- Updated Plans ---');
    plans?.forEach(p => {
        const limit = p.monthly_lesson_limit || 1;
        const unitPrice = Math.floor((p.fee || 0) / limit);
        console.log(`${p.name}: Limit ${limit}, Fee ${p.fee}, Unit Price ${unitPrice}`);
    });
}

updateLimits();
