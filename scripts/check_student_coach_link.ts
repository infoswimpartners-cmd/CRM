
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoachLinks() {
    console.log('--- Checking Coach-Student Links ---');

    // 1. Get all students and counts by coach_id
    const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, coach_id, status');

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    const unassigned: any[] = [];
    const byCoach: { [key: string]: any[] } = {};

    students.forEach((s: any) => {
        if (!s.coach_id) {
            unassigned.push(s);
        } else {
            if (!byCoach[s.coach_id]) byCoach[s.coach_id] = [];
            byCoach[s.coach_id].push(s);
        }
    });

    console.log(`Total Students: ${students.length}`);
    console.log(`Unassigned (No Coach): ${unassigned.length}`);
    if (unassigned.length > 0) {
        console.log('Sample Unassigned:', unassigned.slice(0, 3).map((s: any) => s.full_name));
    }

    console.log('\n--- Assigned Students by Coach ID ---');
    for (const [coachId, assigned] of Object.entries(byCoach)) {
        // Try to fetch coach name
        const { data: coach } = await supabase.from('profiles').select('full_name').eq('id', coachId).single();
        const coachName = coach ? coach.full_name : coachId;
        console.log(`Coach: ${coachName} (${coachId}): ${assigned.length} students`);
        // console.log('  Students:', assigned.map((s: any) => s.full_name).join(', '));
    }
}

checkCoachLinks();
