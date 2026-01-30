
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function compareLessonTables() {
    console.log("Comparing 'lessons' and 'lesson_schedules' data...");

    const { data: lessons } = await supabaseAdmin
        .from('lessons')
        .select('*')
        .limit(3);

    console.log('--- Lessons (Completed?) ---');
    console.log(lessons);

    const { data: schedules } = await supabaseAdmin
        .from('lesson_schedules')
        .select('*')
        .limit(3);

    console.log('--- Lesson Schedules (Future?) ---');
    console.log(schedules);
}

compareLessonTables();
