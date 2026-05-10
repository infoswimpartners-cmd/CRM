import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkTrioPrices() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('Supabase URL or Key is missing');
        return;
    }

    const supabase = createClient(url, key);

    const { data: types, error } = await supabase
        .from('membership_types')
        .select('id, name, stripe_price_id')
        .ilike('name', '%trio%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Trio Membership Types:');
    console.table(types);
}

checkTrioPrices();
