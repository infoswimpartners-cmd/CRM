
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkMembershipPricing() {
    console.log("Checking Membership Pricing...");

    const { data: plans, error } = await supabaseAdmin
        .from('membership_types')
        .select('id, name, fee, monthly_lesson_limit')
        .order('fee', { ascending: true });

    if (error) {
        console.error('Error fetching plans:', error);
        return;
    }

    console.log('--- Plans ---');
    plans.forEach(p => {
        const fee = p.fee || 0;
        const limit = p.monthly_lesson_limit || 4; // Default to 4 if null/0 for calculation show
        const unitPrice = limit > 0 ? Math.floor(fee / limit) : 0;
        console.log(`Plan: ${p.name}`);
        console.log(`  Fee: ${fee.toLocaleString()} JPY`);
        console.log(`  Limit: ${p.monthly_lesson_limit} (Used for calc: ${limit})`);
        console.log(`  Unit Price (Overage): ${unitPrice.toLocaleString()} JPY`);
        console.log('---');
    });
}

checkMembershipPricing();
