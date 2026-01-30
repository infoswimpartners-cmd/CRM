
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkLessonTables() {
    console.log("Checking specific lesson tables...");

    const tablesToCheck = ['lesson_schedules', 'lessons', 'classes', 'student_tickets', 'student_lessons', 'lesson_masters', 'membership_types'];

    for (const table of tablesToCheck) {
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            console.log(`Table '${table}': Error - ${error.message}`);
        } else {
            console.log(`Table '${table}': Exists`);
            if (data && data.length > 0) {
                console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
            } else {
                console.log(`  Columns: (Empty table, cannot infer columns)`);
            }
        }
    }
}

checkLessonTables();
