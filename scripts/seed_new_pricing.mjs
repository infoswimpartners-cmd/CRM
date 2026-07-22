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
  
  // 1. レッスンマスタ（体験・単発）の作成
  const lessons = [
    { name: '初回体験レッスン', unit_price: 6000, pair_unit_price: 9000, is_trial: true },
    { name: '単発（60分）', unit_price: 10000, pair_unit_price: 15000, is_trial: false },
    { name: '単発（90分）', unit_price: 14000, pair_unit_price: 21000, is_trial: false },
    { name: '単発（120分）', unit_price: 18000, pair_unit_price: 27000, is_trial: false },
  ];

  const createdLessons = {}; // name -> id

  for (const l of lessons) {
    console.log(`Creating lesson: ${l.name}`);
    const product = await stripe.products.create({ name: l.name, type: 'service' });
    const price = await stripe.prices.create({
      product: product.id, unit_amount: l.unit_price, currency: 'jpy', metadata: { type: 'normal' }
    });
    
    let pairProductId = null, pairPriceId = null;
    if (l.pair_unit_price) {
      const pairProduct = await stripe.products.create({ name: `${l.name}（ペア）`, type: 'service' });
      pairProductId = pairProduct.id;
      const pairPrice = await stripe.prices.create({
        product: pairProduct.id, unit_amount: l.pair_unit_price, currency: 'jpy', metadata: { type: 'pair' }
      });
      pairPriceId = pairPrice.id;
    }

    const { data, error } = await supabase.from('lesson_masters').insert({
      name: l.name, unit_price: l.unit_price, pair_unit_price: l.pair_unit_price,
      is_trial: l.is_trial, pricing_group: pricingGroup, show_in_enroll: true,
      stripe_product_id: product.id, stripe_price_id: price.id,
      stripe_pair_product_id: pairProductId, stripe_pair_price_id: pairPriceId
    }).select().single();
    
    if (error) throw error;
    createdLessons[l.name] = data.id;
  }

  // 2. 会員区分（月次プラン）の作成
  const memberships = [
    { name: '月2回プラン（60分）', fee: 19000, pair_fee: 28500, lesson_name: '単発（60分）' },
    { name: '月4回プラン（60分）', fee: 36000, pair_fee: 54000, lesson_name: '単発（60分）' },
    { name: '月2回プラン（90分）', fee: 27000, pair_fee: 40500, lesson_name: '単発（90分）' },
    { name: '月4回プラン（90分）', fee: 52000, pair_fee: 78000, lesson_name: '単発（90分）' },
    { name: '月2回プラン（120分）', fee: 35000, pair_fee: 52500, lesson_name: '単発（120分）' },
    { name: '月4回プラン（120分）', fee: 68000, pair_fee: 102000, lesson_name: '単発（120分）' },
  ];

  for (const m of memberships) {
    console.log(`Creating membership: ${m.name}`);
    const product = await stripe.products.create({ name: m.name, type: 'service' });
    const price = await stripe.prices.create({
      product: product.id, unit_amount: m.fee, currency: 'jpy', recurring: { interval: 'month' }
    });
    
    let pairProductId = null, pairPriceId = null;
    if (m.pair_fee) {
      const pairProduct = await stripe.products.create({ name: `${m.name}（ペア）`, type: 'service' });
      pairProductId = pairProduct.id;
      const pairPrice = await stripe.prices.create({
        product: pairProduct.id, unit_amount: m.pair_fee, currency: 'jpy', recurring: { interval: 'month' }
      });
      pairPriceId = pairPrice.id;
    }

    const { data, error } = await supabase.from('membership_types').insert({
      name: m.name, fee: m.fee, pair_fee: m.pair_fee,
      pricing_group: pricingGroup, show_in_enroll: true,
      default_lesson_master_id: createdLessons[m.lesson_name],
      stripe_product_id: product.id, stripe_price_id: price.id,
      stripe_pair_product_id: pairProductId, stripe_pair_price_id: pairPriceId,
      min_contract_months: 2, lock_period_months: 2
    }).select().single();

    if (error) throw error;

    // リレーション作成
    await supabase.from('membership_type_lessons').insert({
      membership_type_id: data.id,
      lesson_master_id: createdLessons[m.lesson_name],
      show_in_enroll: true
    });
  }

  // 3. 特別な「単発」プラン（月額0円で、単発レッスンを購入するためのベースプラン）
  // ユーザーのテーブルにある「単発」は料金がかかるが、システム上は「単発プラン」として月額0円の membership_type が必要
  // すでに古いものが隠れているので、新しいものを作る
  console.log(`Creating base membership: 単発`);
  const singleProduct = await stripe.products.create({ name: '単発', type: 'service' });
  const singlePrice = await stripe.prices.create({
    product: singleProduct.id, unit_amount: 0, currency: 'jpy', recurring: { interval: 'month' }
  });
  const { data: singleBase, error: singleBaseErr } = await supabase.from('membership_types').insert({
      name: '単発', fee: 0, pricing_group: pricingGroup, show_in_enroll: true,
      stripe_product_id: singleProduct.id, stripe_price_id: singlePrice.id,
      min_contract_months: 0, lock_period_months: 0
  }).select().single();
  if (singleBaseErr) throw singleBaseErr;

  console.log("Migration script complete!");
}

run().catch(console.error);
