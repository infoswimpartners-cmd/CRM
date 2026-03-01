const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Updating gender values...");

    // Update gender: 男 -> 男性
    const { data: d1, error: e1 } = await supabase
        .from('students')
        .update({ gender: '男性' })
        .eq('gender', '男');
    console.log("Updated 男 to 男性:", e1 || "Success");

    // Update gender: 女 -> 女性
    const { data: d2, error: e2 } = await supabase
        .from('students')
        .update({ gender: '女性' })
        .eq('gender', '女');
    console.log("Updated 女 to 女性:", e2 || "Success");

    // Update second_student_gender: 男 -> 男性
    const { data: d3, error: e3 } = await supabase
        .from('students')
        .update({ second_student_gender: '男性' })
        .eq('second_student_gender', '男');
    console.log("Updated 2nd 男 to 男性:", e3 || "Success");

    // Update second_student_gender: 女 -> 女性
    const { data: d4, error: e4 } = await supabase
        .from('students')
        .update({ second_student_gender: '女性' })
        .eq('second_student_gender', '女');
    console.log("Updated 2nd 女 to 女性:", e4 || "Success");

    console.log("Migration complete!");
}

main().catch(console.error);
