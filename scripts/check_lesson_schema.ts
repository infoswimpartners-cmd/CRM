
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkLessonSchema() {
    console.log("Checking schema for lessons and related tables...");

    // Check tables existing
    const { data: tables, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (tables) {
        console.log('Tables:', tables.map(t => t.table_name).join(', '));
    }

    // Check columns for 'classes' or 'lessons'
    const { data: lessonColumns } = await supabaseAdmin
        .from('information_schema.columns')
        .select('table_name, column_name, data_type')
        .in('table_name', ['lessons', 'classes', 'student_classes', 'student_lessons', 'student_lesson_attendance']);

    if (lessonColumns) {
        console.log('Lesson Related Columns:', lessonColumns);
    }
}

checkLessonSchema();
