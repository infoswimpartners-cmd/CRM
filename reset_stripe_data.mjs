import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function resetStudentStripeData(studentIdOrNumber) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('Supabase URL or Key is missing');
        return;
    }

    const supabase = createClient(url, key);

    // 生徒番号またはIDで検索
    let query = supabase.from('students').select('id, full_name, stripe_customer_id');
    if (studentIdOrNumber.length > 20) {
        query = query.eq('id', studentIdOrNumber);
    } else {
        query = query.eq('student_number', studentIdOrNumber);
    }

    const { data: student, error: fetchError } = await query.single();

    if (fetchError || !student) {
        console.error('Student not found:', studentIdOrNumber);
        return;
    }

    console.log(`Resetting Stripe data for: ${student.full_name} (Current ID: ${student.stripe_customer_id})`);

    const { error: updateError } = await supabase
        .from('students')
        .update({
            stripe_customer_id: null,
            stripe_subscription_id: null,
            next_membership_type_id: null,
            next_next_membership_type_id: null
        })
        .eq('id', student.id);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Successfully reset Stripe data. You can now register a new card in TEST mode.');
    }
}

// コマンドライン引数から生徒IDまたは番号を取得
const target = process.argv[2];
if (!target) {
    console.log('Usage: node reset_stripe_data.mjs <student_id_or_number>');
} else {
    resetStudentStripeData(target);
}
