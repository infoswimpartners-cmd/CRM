
import dotenv from 'dotenv';
import path from 'path';
import Stripe from 'stripe';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is missing. Please check your .env.local file.');
    process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover' as any, // Use type casting if version mismatches sdk
    typescript: true,
});

const SUBSCRIPTION_PRODUCTS = [
    { name: '月2回コース 60分', id: 'M2-60', amount: 17400 },
    { name: '月4回コース 60分', id: 'M4-60', amount: 34000 },
    { name: '月2回コース 90分', id: 'M2-90', amount: 25400 },
    { name: '月4回コース 90分', id: 'M4-90', amount: 50000 },
];

const ONE_TIME_PRODUCTS = [
    { name: '追加レッスン [会員単発 M2-60]', id: 'Ticket-M2-60', amount: 8700 },
    { name: '追加レッスン [会員単発 M4-60]', id: 'Ticket-M4-60', amount: 8500 },
    { name: '追加レッスン [会員単発 M2-90]', id: 'Ticket-M2-90', amount: 12700 },
    { name: '追加レッスン [会員単発 M4-90]', id: 'Ticket-M4-90', amount: 12500 },
    { name: '通常単発 [非会員/ビジター 60分]', id: 'Visitor-60', amount: 9000 },
    { name: '通常単発 [非会員/ビジター 90分]', id: 'Visitor-90', amount: 13000 },
];

async function seedProducts() {
    console.log('🚀 Starting Stripe Product Seeding...');

    // 1. Create Subscriptions
    console.log('\n📦 Creating Subscription Products...');
    for (const prod of SUBSCRIPTION_PRODUCTS) {
        // Check if product exists by metadata lookup or name
        // Simplest: Create Product with metadata { internal_id: prod.id }
        // If we want to be idempotent, we can search first.

        // For simplicity in this script, we'll try to find by Name first.
        const message = await createOrUpdateProduct(prod.name, prod.amount, 'recurring', prod.id);
        console.log(message);
    }

    // 2. Create One-time Products
    console.log('\n🎟️ Creating One-time Products...');
    for (const prod of ONE_TIME_PRODUCTS) {
        const message = await createOrUpdateProduct(prod.name, prod.amount, 'one_time', prod.id);
        console.log(message);
    }

    console.log('\n✅ Seeding Complete!');
}

async function createOrUpdateProduct(name: string, amount: number, type: 'recurring' | 'one_time', internalId: string) {
    // Search for product by name (Best effort idempotency)
    const search = await stripe.products.search({
        query: `name:"${name}"`,
    });

    let product = search.data[0];

    if (product) {
        // Product exists, check price
        // We won't update price to avoid complications, just log it.
        console.log(`  Existing Product Found: ${name} (${product.id})`);
    } else {
        // Create Product
        product = await stripe.products.create({
            name: name,
            metadata: { internal_id: internalId }
        });
        console.log(`  ✨ Created Product: ${name} (${product.id})`);
    }

    // Check for Price?
    // We can list prices for this product.
    const prices = await stripe.prices.list({ product: product.id, active: true });
    const existingPrice = prices.data.find(p => p.unit_amount === amount &&
        (type === 'recurring' ? p.recurring?.interval === 'month' : p.type === 'one_time')
    );

    if (existingPrice) {
        return `    -> Active Price Exists: ${existingPrice.id} (¥${amount})`;
    } else {
        // Create Price
        const priceData: Stripe.PriceCreateParams = {
            product: product.id,
            currency: 'jpy',
            unit_amount: amount,
        };

        if (type === 'recurring') {
            priceData.recurring = { interval: 'month' };
        }

        const newPrice = await stripe.prices.create(priceData);
        return `    -> ✨ Created Price: ${newPrice.id} (¥${amount})`;
    }
}

seedProducts().catch(err => {
    console.error(err);
    process.exit(1);
});
