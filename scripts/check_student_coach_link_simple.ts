
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoachLinksSimple() {
    console.log('--- Checking Coach-Student Links (Simple) ---');

    // 1. Get Coaches
    const { data: coaches, error: coachError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['coach', 'admin', 'owner'])
        .limit(5);

    if (coachError) {
        console.error('Error fetching coaches:', coachError);
        return;
    }

    console.log(`Found ${coaches.length} coaches (showing top 5)`);

    for (const coach of coaches) {
        // Count students for this coach
        const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', coach.id);

        console.log(`Coach ${coach.full_name} (${coach.id}): ${count} students`);
    }

    // Check for unassigned students
    const { count: unassignedCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .is('coach_id', null);

    console.log(`Unassigned Students: ${unassignedCount}`);
}

checkCoachLinksSimple();
