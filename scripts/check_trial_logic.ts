
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrialLogic() {
    console.log('--- Checking Trial Lesson Logic ---');

    console.log('Checking for lessons ANY name containing "体験"...');

    // 1. Check if there are ANY lessons with '体験' in name (case insensitive)
    const { data: allTrialLessons, error: trialError } = await supabase
        .from('lesson_masters')
        .select('id, name, unit_price, active')
        .ilike('name', '%体験%');

    if (trialError) {
        console.error('Error fetching all trial lessons:', trialError);
    } else {
        console.log('All Lessons with "体験":', allTrialLessons);
    }

    console.log('Checking for ACTIVE lessons name containing "体験"...');

    // 2. Check the specific query used in the code (active = true)
    const { data: activeTrialLessons, error: activeError } = await supabase
        .from('lesson_masters')
        .select('id, name, unit_price, active')
        .ilike('name', '%体験%')
        .eq('active', true);

    if (activeError) {
        console.error('Error fetching ACTIVE trial lessons:', activeError);
    } else {
        console.log('Active "体験" Lessons (Expected in UI):', activeTrialLessons);
    }

    // 3. Check a sample student status
    console.log('Checking for a sample student with status "trial_pending"...');
    const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, status')
        .eq('status', 'trial_pending')
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error if none found

    if (studentError) {
        console.error('Error finding student:', studentError);
    } else if (student) {
        console.log(`Found trial_pending student: ${student.full_name} (${student.id})`);
    } else {
        console.log('No student with status "trial_pending" found for testing.');
    }
}

checkTrialLogic();
