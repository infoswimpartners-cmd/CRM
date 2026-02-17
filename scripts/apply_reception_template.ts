
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyTemplate() {
    console.log('Inserting reception_completed template...');

    const { error } = await supabase
        .from('email_templates')
        .insert({
            key: 'reception_completed',
            subject: '【Swim Partners】お申し込みを受け付けました',
            body: '{{name}} 様\n\nSwim Partnersへのお申し込みありがとうございます。\n以下の内容で受付いたしました。\n\n担当者より改めてご連絡させていただきますので、\n今しばらくお待ちください。\n\n--------------------------------------------------\nSwim Partners'
        })
        .select();

    if (error) {
        if (error.code === '23505') { // Unique violation
            console.log('Template already exists.');
        } else {
            console.error('Error inserting template:', error);
        }
    } else {
        console.log('Template inserted successfully.');
    }
}

applyTemplate();
