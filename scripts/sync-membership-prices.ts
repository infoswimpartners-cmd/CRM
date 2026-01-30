
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const UPDATES = [
    { name: '月2回（60分）', fee: 17400, priceId: 'price_1SsZbBP0UQGtpYXmqRQpFexd' },
    { name: '月4回（60分）', fee: 34000, priceId: 'price_1SsZbCP0UQGtpYXm4OQmrzC7' },
    { name: '月2回（90分）', fee: 25400, priceId: 'price_1SsZbEP0UQGtpYXm1FkQkR8h' },
    { name: '月4回（90分）', fee: 50000, priceId: 'price_1SsZbFP0UQGtpYXmCsHxCGnR' }, // New
];

async function syncPrices() {
    console.log('🚀 Syncing Membership Prices...');

    for (const update of UPDATES) {
        // Try to update existing first
        const { data, error } = await supabase
            .from('membership_types')
            .update({
                fee: update.fee,
                stripe_price_id: update.priceId,
                active: true
            })
            .eq('name', update.name)
            .select();

        if (error) {
            console.error(`❌ Error updating ${update.name}:`, error.message);
            continue;
        }

        if (data && data.length > 0) {
            console.log(`✅ Updated ${update.name}`);
        } else {
            // Not found, Insert
            console.log(`⚠️ ${update.name} not found. Inserting...`);
            const { data: insertData, error: insertError } = await supabase
                .from('membership_types')
                .insert({
                    name: update.name,
                    fee: update.fee,
                    stripe_price_id: update.priceId,
                    active: true,
                    display_order: 10 // Pushing to end, user can reorder
                })
                .select();

            if (insertError) {
                console.error(`❌ Error inserting ${update.name}:`, insertError.message);
            } else {
                console.log(`✅ Inserted ${update.name}`);
            }
        }
    }
}

syncPrices();
