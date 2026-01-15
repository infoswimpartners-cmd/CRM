const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key if available to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase variables");
    console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are in .env.local");
    process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("WARNING: Using ANON KEY. Insert operations might fail due to RLS if you are not logged in.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Starting seed with CommonJS script...");

    // 0. Get existing coach profiles
    const { data: coaches, error: coachError } = await supabase.from('profiles').select('id').eq('role', 'coach').limit(3);

    if (coachError) {
        console.error("Error fetching coaches:", coachError);
    }

    const coachIds = coaches ? coaches.map(c => c.id) : [];

    if (coachIds.length === 0) {
        console.warn("No coaches found. Using NULL for coach_id where possible.");
        console.warn("Note: Ensure you have manually created users with 'coach' role in profiles table first if you want valid relationships.");
    } else {
        console.log(`Found ${coachIds.length} coaches.`);
    }

    // 1. Lesson Masters
    const masters = [
        { name: 'クロール初級', unit_price: 5000, active: true },
        { name: '平泳ぎ強化', unit_price: 6000, active: true },
        { name: 'バタフライ入門', unit_price: 7000, active: true }
    ];

    const createdMasters = [];
    for (const m of masters) {
        // Use upsert or checking existence to avoid duplicates might be better, but simple insert is fine for dummy data
        const { data, error } = await supabase.from('lesson_masters').insert(m).select().single();
        if (error) {
            console.error("Error inserting master:", m.name, error.message);
        } else {
            console.log("Inserted Master:", data.name);
            createdMasters.push(data);
        }
    }

    // 2. Students
    const students = [
        { full_name: '山田 太郎', full_name_kana: 'ヤマダ タロウ', birth_date: '2010-01-01', gender: 'male', notes: 'ダミーデータ1' },
        { full_name: '鈴木 花子', full_name_kana: 'スズキ ハナコ', birth_date: '2012-05-05', gender: 'female', notes: 'ダミーデータ2' },
        { full_name: '佐藤 健', full_name_kana: 'サトウ タケル', birth_date: '2011-11-11', gender: 'male', notes: 'ダミーデータ3' }
    ];

    const createdStudents = [];
    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const assignedCoachId = coachIds.length > 0 ? coachIds[i % coachIds.length] : null;
        const payload = { ...s, coach_id: assignedCoachId };

        const { data, error } = await supabase.from('students').insert(payload).select().single();
        if (error) {
            console.error("Error inserting student:", s.full_name, error.message);
        } else {
            console.log("Inserted Student:", data.full_name);
            createdStudents.push(data);
        }
    }

    // 3. Counseling Sheets
    for (const s of createdStudents) {
        const { error } = await supabase.from('counseling_sheets').insert({
            student_id: s.id,
            swimming_experience: 'なし',
            goals: '25m泳げるようになりたい',
            health_conditions: '特になし'
        });
        if (error) console.error("Error inserting sheet for", s.full_name, error.message);
        else console.log("Inserted Counseling Sheet for", s.full_name);
    }

    // 4. Lessons
    if (coachIds.length > 0 && createdStudents.length > 0 && createdMasters.length > 0) {
        const lessons = [
            { date: new Date().toISOString(), location: '市民プールA', desc: 'キックの練習' },
            { date: new Date(Date.now() + 86400000).toISOString(), location: '市民プールB', desc: 'プルの練習' },
            { date: new Date(Date.now() + 172800000).toISOString(), location: 'スクールプール', desc: 'コンビネーション' }
        ];

        for (let i = 0; i < lessons.length; i++) {
            const l = lessons[i];
            const coachId = coachIds[i % coachIds.length];
            const student = createdStudents[i % createdStudents.length];
            const master = createdMasters[i % createdMasters.length];

            const { error } = await supabase.from('lessons').insert({
                coach_id: coachId,
                student_id: student.id,
                lesson_master_id: master.id,
                student_name: student.full_name,
                lesson_date: l.date,
                location: l.location,
                menu_description: l.desc,
                price: master.unit_price
            });
            if (error) console.error("Error inserting lesson:", error.message);
            else console.log("Inserted Lesson for", student.full_name);
        }
    } else {
        console.log("Skipping lesson creation due to missing dependencies (coach, student, or master)");
    }

    console.log("Seed complete.");
}

seed();
