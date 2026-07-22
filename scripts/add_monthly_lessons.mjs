import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY_TEST, {
  apiVersion: '2023-10-16'
});

async function run() {
  const pricingGroup = '2026年7月新料金';
  
  // 1. Get the existing monthly membership types for the new pricing group
  const { data: memberships, error: memErr } = await supabase
    .from('membership_types')
    .select('*')
    .eq('pricing_group', pricingGroup)
    .neq('name', '単発')
    .eq('is_package', false);

  if (memErr) throw memErr;

  console.log(`Found ${memberships.length} monthly memberships.`);

  for (const m of memberships) {
    if (m.name === '単発') continue;

    console.log(`Processing membership: ${m.name}`);
    
    // Determine number of lessons from the name
    let numLessons = 1;
    if (m.name.includes('月2回')) numLessons = 2;
    else if (m.name.includes('月4回')) numLessons = 4;
    else continue; // Skip if we can't determine (e.g. not a monthly plan)

    const unitPrice = Math.floor(m.fee / numLessons);
    const pairUnitPrice = m.pair_fee ? Math.floor(m.pair_fee / numLessons) : null;
    
    const lessonName = m.name; // Use the exact same name for the lesson master

    // Check if lesson master already exists
    const { data: existingLesson } = await supabase
        .from('lesson_masters')
        .select('id')
        .eq('name', lessonName)
        .eq('pricing_group', pricingGroup)
        .single();
    
    let lessonId;

    if (existingLesson) {
        console.log(`Lesson master already exists for ${lessonName}, updating...`);
        lessonId = existingLesson.id;
        
        await supabase.from('lesson_masters').update({
            unit_price: unitPrice,
            pair_unit_price: pairUnitPrice,
            show_in_enroll: false
        }).eq('id', lessonId);
    } else {
        console.log(`Creating lesson master for ${lessonName} with unit price ${unitPrice}...`);
        
        // Create in Stripe
        const product = await stripe.products.create({ name: lessonName, type: 'service' });
        const price = await stripe.prices.create({
            product: product.id, unit_amount: unitPrice, currency: 'jpy', metadata: { type: 'normal' }
        });
        
        let pairProductId = null, pairPriceId = null;
        if (pairUnitPrice) {
            const pairProduct = await stripe.products.create({ name: `${lessonName}（ペア）`, type: 'service' });
            pairProductId = pairProduct.id;
            const pairPrice = await stripe.prices.create({
                product: pairProduct.id, unit_amount: pairUnitPrice, currency: 'jpy', metadata: { type: 'pair' }
            });
            pairPriceId = pairPrice.id;
        }

        // Insert into DB
        const { data: newLesson, error: lessErr } = await supabase.from('lesson_masters').insert({
            name: lessonName, 
            unit_price: unitPrice, 
            pair_unit_price: pairUnitPrice,
            is_trial: false, 
            pricing_group: pricingGroup, 
            show_in_enroll: false, // Hide from standalone enroll form
            stripe_product_id: product.id, 
            stripe_price_id: price.id,
            stripe_pair_product_id: pairProductId, 
            stripe_pair_price_id: pairPriceId
        }).select().single();

        if (lessErr) throw lessErr;
        lessonId = newLesson.id;
    }

    // Update the membership_type to point to this new default lesson
    console.log(`Updating membership ${m.name} to use new default lesson ${lessonId}`);
    await supabase.from('membership_types')
        .update({ default_lesson_master_id: lessonId })
        .eq('id', m.id);
        
    // Update membership_type_lessons
    // Delete existing relation for this membership (since it was pointing to "単発")
    await supabase.from('membership_type_lessons')
        .delete()
        .eq('membership_type_id', m.id);
        
    // Insert new relation
    await supabase.from('membership_type_lessons')
        .insert({
            membership_type_id: m.id,
            lesson_master_id: lessonId,
            show_in_enroll: true
        });
  }

  console.log("Monthly lessons added successfully!");
}

run().catch(console.error);
