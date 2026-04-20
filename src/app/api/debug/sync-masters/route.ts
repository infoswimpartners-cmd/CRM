import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const results = {
        lessons: { processed: 0, errors: [] as string[] },
        memberships: { processed: 0, errors: [] as string[] }
    }

    try {
        // 1. Sync Lesson Masters
        // Fetch items missing any of the Stripe IDs (Product, Price, or Pair Price if applicable)
        const { data: lessons, error: lessonError } = await supabase
            .from('lesson_masters')
            .select('*')
            .or('stripe_price_id.is.null,stripe_product_id.is.null,stripe_pair_price_id.is.null')

        if (lessonError) throw lessonError

        if (lessons) {
            for (const lesson of lessons) {
                try {
                    let productId = lesson.stripe_product_id
                    if (!productId) {
                        const product = await stripe.products.create({
                            name: lesson.name,
                            type: 'service',
                        })
                        productId = product.id
                    }

                    let priceId = lesson.stripe_price_id
                    if (!priceId) {
                        const price = await stripe.prices.create({
                            product: productId,
                            unit_amount: lesson.unit_price,
                            currency: 'jpy',
                        })
                        priceId = price.id
                    }

                    // Create Pair Price if exists and not already synced
                    let pairPriceId = lesson.stripe_pair_price_id
                    if (!pairPriceId && lesson.pair_unit_price && lesson.pair_unit_price > 0) {
                        const pp = await stripe.prices.create({
                            product: productId,
                            unit_amount: lesson.pair_unit_price,
                            currency: 'jpy',
                        })
                        pairPriceId = pp.id
                    }

                    const { error: updateError } = await supabase
                        .from('lesson_masters')
                        .update({
                            stripe_product_id: productId,
                            stripe_price_id: priceId,
                            stripe_pair_price_id: pairPriceId
                        })
                        .eq('id', lesson.id)

                    if (updateError) throw updateError
                    results.lessons.processed++
                } catch (e: any) {
                    console.error(`Failed to sync lesson ${lesson.name}:`, e)
                    results.lessons.errors.push(`${lesson.name}: ${e.message}`)
                }
            }
        }

        // 2. Sync Membership Types
        const { data: memberships, error: membershipError } = await supabase
            .from('membership_types')
            .select('*')
            .or('stripe_price_id.is.null,stripe_product_id.is.null')

        if (membershipError) throw membershipError

        if (memberships) {
            for (const membership of memberships) {
                try {
                    let productId = membership.stripe_product_id
                    if (!productId) {
                        const product = await stripe.products.create({
                            name: membership.name,
                            type: 'service',
                        })
                        productId = product.id
                    }

                    let priceId = membership.stripe_price_id
                    if (!priceId) {
                        const price = await stripe.prices.create({
                            product: productId,
                            unit_amount: membership.fee,
                            currency: 'jpy',
                            recurring: { interval: 'month' },
                        })
                        priceId = price.id
                    }

                    const { error: updateError } = await supabase
                        .from('membership_types')
                        .update({
                            stripe_product_id: productId,
                            stripe_price_id: priceId
                        })
                        .eq('id', membership.id)

                    if (updateError) throw updateError
                    results.memberships.processed++
                } catch (e: any) {
                    console.error(`Failed to sync membership ${membership.name}:`, e)
                    results.memberships.errors.push(`${membership.name}: ${e.message}`)
                }
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (error: any) {
        console.error('Sync error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
