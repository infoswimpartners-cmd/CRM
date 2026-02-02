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
        const { data: lessons, error: lessonError } = await supabase
            .from('lesson_masters')
            .select('*')
            .is('stripe_price_id', null)

        if (lessonError) throw lessonError

        if (lessons) {
            for (const lesson of lessons) {
                try {
                    const product = await stripe.products.create({
                        name: lesson.name,
                        type: 'service',
                    })

                    const price = await stripe.prices.create({
                        product: product.id,
                        unit_amount: lesson.unit_price,
                        currency: 'jpy',
                        // One-time
                    })

                    const { error: updateError } = await supabase
                        .from('lesson_masters')
                        .update({ stripe_price_id: price.id })
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
            .is('stripe_price_id', null)

        if (membershipError) throw membershipError

        if (memberships) {
            for (const membership of memberships) {
                try {
                    const product = await stripe.products.create({
                        name: membership.name,
                        type: 'service',
                    })

                    const price = await stripe.prices.create({
                        product: product.id,
                        unit_amount: membership.fee,
                        currency: 'jpy',
                        recurring: { interval: 'month' },
                    })

                    const { error: updateError } = await supabase
                        .from('membership_types')
                        .update({ stripe_price_id: price.id })
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
