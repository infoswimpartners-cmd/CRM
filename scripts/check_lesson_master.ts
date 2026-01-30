
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLessonMaster() {
    const { data, error } = await supabase
        .from('lesson_masters')
        .select('*')
        .eq('is_trial', true);

    if (error) {
        console.error('Error fetching lesson master:', error);
    } else {
        console.log('Trial Lesson Masters found:', data);
    }
}

checkLessonMaster();
