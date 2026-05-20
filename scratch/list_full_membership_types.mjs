import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });
import { createClient } from '@supabase/supabase-js';

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log("Membership Types Details:");
    const formatted = data.map(t => ({
        id: t.id,
        name: t.name,
        fee: t.fee,
        active: t.active,
        stripe_price_id: t.stripe_price_id,
        display_order: t.display_order
    }));
    console.table(formatted);
}
main();
