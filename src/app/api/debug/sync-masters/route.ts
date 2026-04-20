import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const results = {
        lessons: { processed: 0, skipped: 0, errors: [] as string[] },
        memberships: { processed: 0, skipped: 0, errors: [] as string[] }
    }

    try {
        // 1. Sync Lesson Masters
        // 通常商品が未同期のもの、またはペア単価がありかつペア商品が未同期のものを取得
        const { data: lessons, error: lessonError } = await supabase
            .from('lesson_masters')
            .select('*')

        if (lessonError) throw lessonError

        if (lessons) {
            for (const lesson of lessons) {
                try {
                    // 同期が必要かどうかを判定
                    const needsNormalSync = !lesson.stripe_product_id || !lesson.stripe_price_id
                    const needsPairSync = lesson.pair_unit_price && lesson.pair_unit_price > 0 && (!lesson.stripe_pair_product_id || !lesson.stripe_pair_price_id)

                    if (!needsNormalSync && !needsPairSync) {
                        results.lessons.skipped++
                        continue // 完全に同期済み、スキップ
                    }

                    // --- 通常商品の同期 ---
                    let productId = lesson.stripe_product_id
                    let priceId = lesson.stripe_price_id

                    if (!productId) {
                        const product = await stripe.products.create({
                            name: lesson.name,
                            type: 'service',
                        })
                        productId = product.id
                    }

                    if (!priceId) {
                        const price = await stripe.prices.create({
                            product: productId,
                            unit_amount: lesson.unit_price,
                            currency: 'jpy',
                            metadata: { type: 'normal' }
                        })
                        priceId = price.id
                    }

                    // --- ペア商品の同期（別商品として作成）---
                    let pairProductId = lesson.stripe_pair_product_id
                    let pairPriceId = lesson.stripe_pair_price_id

                    if (lesson.pair_unit_price && lesson.pair_unit_price > 0) {
                        if (!pairProductId) {
                            const pairProduct = await stripe.products.create({
                                name: `${lesson.name}（ペア）`,
                                type: 'service',
                            })
                            pairProductId = pairProduct.id
                        }

                        if (!pairPriceId) {
                            const pp = await stripe.prices.create({
                                product: pairProductId,
                                unit_amount: lesson.pair_unit_price,
                                currency: 'jpy',
                                metadata: { type: 'pair' }
                            })
                            pairPriceId = pp.id
                        }
                    }

                    const { error: updateError } = await supabase
                        .from('lesson_masters')
                        .update({
                            stripe_product_id: productId,
                            stripe_price_id: priceId,
                            stripe_pair_product_id: pairProductId || null,
                            stripe_pair_price_id: pairPriceId || null
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
        // 通常商品・価格が未同期のもののみ対象
        const { data: memberships, error: membershipError } = await supabase
            .from('membership_types')
            .select('*')

        if (membershipError) throw membershipError

        if (memberships) {
            for (const membership of memberships) {
                try {
                    const needsSync = !membership.stripe_product_id || !membership.stripe_price_id

                    if (!needsSync) {
                        results.memberships.skipped++
                        continue // 完全に同期済み、スキップ
                    }

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
