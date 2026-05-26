'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'

export async function updateLessonMasterOrder(items: { id: string, display_order: number }[]) {
    const supabase = await createClient()

    try {
        for (const item of items) {
            const { error } = await supabase
                .from('lesson_masters')
                .update({ display_order: item.display_order })
                .eq('id', item.id)

            if (error) throw error
        }
        revalidatePath('/admin/masters')
        return { success: true }
    } catch (error) {
        console.error('Failed to update lesson master order:', error)
        return { success: false, error: 'Failed to update order' }
    }
}

export async function updateMembershipTypeOrder(items: { id: string, display_order: number }[]) {
    const supabase = await createClient()

    try {
        for (const item of items) {
            const { error } = await supabase
                .from('membership_types')
                .update({ display_order: item.display_order })
                .eq('id', item.id)

            if (error) throw error
        }
        revalidatePath('/admin/masters')
        revalidatePath('/admin/masters/membership-types')
        return { success: true }
    } catch (error) {
        console.error('Failed to update membership type order:', error)
        return { success: false, error: 'Failed to update order' }
    }
}

// ---------------------------------------------------------
// NEW: Actions with Stripe Integration
// ---------------------------------------------------------

export async function createMembershipTypeAction(data: {
    name: string
    fee: number
    pairFee?: number
    selectedLessons: { id: string, rewardPrice: number | null }[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Create Stripe Product & Price (Recurring)
        const product = await stripe.products.create({
            name: data.name,
            type: 'service',
        })

        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: data.fee,
            currency: 'jpy',
            recurring: { interval: 'month' },
        })

        // ペア受講の会費設定がある場合、Stripeにペア用商品を自動登録
        let pairProductId = null
        let pairPriceId = null
        if (data.pairFee && data.pairFee > 0) {
            const pairProduct = await stripe.products.create({
                name: `${data.name}（ペア）`,
                type: 'service',
            })
            pairProductId = pairProduct.id

            const pairPrice = await stripe.prices.create({
                product: pairProduct.id,
                unit_amount: data.pairFee,
                currency: 'jpy',
                recurring: { interval: 'month' },
            })
            pairPriceId = pairPrice.id
        }

        // 2. Insert into DB
        const { data: typeData, error: typeError } = await supabase
            .from('membership_types')
            .insert({
                name: data.name,
                fee: data.fee,
                pair_fee: data.pairFee || null,
                stripe_product_id: product.id,
                stripe_price_id: price.id,
                stripe_pair_product_id: pairProductId,
                stripe_pair_price_id: pairPriceId,
                default_lesson_master_id: data.selectedLessons.length > 0 ? data.selectedLessons[0].id : null,
                reward_master_id: null,
            })
            .select()
            .single()

        if (typeError) throw typeError

        // 3. Create Relations
        if (data.selectedLessons.length > 0) {
            const relations = data.selectedLessons.map(item => ({
                membership_type_id: typeData.id,
                lesson_master_id: item.id,
                reward_price: item.rewardPrice
            }))

            const { error: relationError } = await supabase
                .from('membership_type_lessons')
                .insert(relations)

            if (relationError) throw relationError
        }

        revalidatePath('/admin/masters')
        revalidatePath('/admin/masters/membership-types')
        return { success: true }
    } catch (error: any) {
        console.error('Create Membership Type Error:', error)
        return { success: false, error: error.message || 'Failed to create membership type' }
    }
}

export async function createLessonMasterAction(data: {
    name: string
    price: number
    pairPrice?: number
    isTrial: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Create Stripe Product & Price (One-time)
        const product = await stripe.products.create({
            name: data.name,
            type: 'service',
        })

        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: data.price,
            currency: 'jpy',
            metadata: { type: 'normal' }
        })

        // ペア料金は別商品として作成（名称に「（ペア）」を追加）
        let pairProductId = null
        let pairPriceId = null
        if (data.pairPrice && data.pairPrice > 0) {
            const pairProduct = await stripe.products.create({
                name: `${data.name}（ペア）`,
                type: 'service',
            })
            pairProductId = pairProduct.id

            const pairPrice = await stripe.prices.create({
                product: pairProduct.id,
                unit_amount: data.pairPrice,
                currency: 'jpy',
                metadata: { type: 'pair' }
            })
            pairPriceId = pairPrice.id
        }

        // 2. Insert into DB
        const { error } = await supabase
            .from('lesson_masters')
            .insert({
                name: data.name,
                unit_price: data.price,
                pair_unit_price: data.pairPrice || null,
                is_trial: data.isTrial,
                stripe_product_id: product.id,
                stripe_price_id: price.id,
                stripe_pair_product_id: pairProductId,
                stripe_pair_price_id: pairPriceId
            })

        if (error) throw error

        revalidatePath('/admin/masters')
        return { success: true }
    } catch (error: any) {
        console.error('Create Lesson Master Error:', error)
        return { success: false, error: error.message || 'Failed to create lesson master' }
    }
}
