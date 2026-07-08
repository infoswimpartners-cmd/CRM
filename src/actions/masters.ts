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
        revalidatePath('/admin/masters', 'layout')
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
        revalidatePath('/admin/masters', 'layout')
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
    selectedLessons: { id: string, rewardPrice: number | null, showInEnroll?: boolean }[]
    description?: string | null
    rules?: string | null
    minContractMonths?: number
    lockPeriodMonths?: number
    pricingGroup?: string | null
    showInEnroll?: boolean
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
                description: data.description || null,
                rules: data.rules || null,
                min_contract_months: data.minContractMonths ?? 2,
                lock_period_months: data.lockPeriodMonths ?? 2,
                pricing_group: data.pricingGroup || null,
                show_in_enroll: data.showInEnroll ?? true,
            })
            .select()
            .single()

        if (typeError) throw typeError

        // 3. Create Relations
        if (data.selectedLessons.length > 0) {
            const relations = data.selectedLessons.map(item => ({
                membership_type_id: typeData.id,
                lesson_master_id: item.id,
                reward_price: item.rewardPrice,
                show_in_enroll: item.showInEnroll ?? true
            }))

            const { error: relationError } = await supabase
                .from('membership_type_lessons')
                .insert(relations)

            if (relationError) throw relationError
        }

        revalidatePath('/admin/masters', 'layout')
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
    pricingGroup?: string | null
    showInEnroll?: boolean
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
                pricing_group: data.pricingGroup || null,
                show_in_enroll: data.showInEnroll ?? true,
                stripe_product_id: product.id,
                stripe_price_id: price.id,
                stripe_pair_product_id: pairProductId,
                stripe_pair_price_id: pairPriceId
            })

        if (error) throw error

        revalidatePath('/admin/masters', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error('Create Lesson Master Error:', error)
        return { success: false, error: error.message || 'Failed to create lesson master' }
    }
}

export async function updateMembershipTypeAction(data: {
    id: string
    name: string
    fee: number
    pairFee?: number
    stripeProductId?: string | null
    stripePriceId?: string | null
    stripePairProductId?: string | null
    stripePairPriceId?: string | null
    selectedLessons: { id: string, rewardPrice: number | null, unitPrice: number | null, pairUnitPrice: number | null, showInEnroll?: boolean }[]
    description?: string | null
    rules?: string | null
    minContractMonths?: number
    lockPeriodMonths?: number
    pricingGroup?: string | null
    showInEnroll?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 0. 既存レコードを取得して商品ID・価格IDの変更を検知
        const { data: existingType } = await supabase
            .from('membership_types')
            .select('stripe_product_id, stripe_price_id, stripe_pair_product_id, stripe_pair_price_id')
            .eq('id', data.id)
            .single()

        let stripeProductId = data.stripeProductId === undefined ? existingType?.stripe_product_id : (data.stripeProductId || null)
        let stripePriceId = data.stripePriceId === undefined ? existingType?.stripe_price_id : (data.stripePriceId || null)
        let stripePairProductId = data.stripePairProductId === undefined ? existingType?.stripe_pair_product_id : (data.stripePairProductId || null)
        let stripePairPriceId = data.stripePairPriceId === undefined ? existingType?.stripe_pair_price_id : (data.stripePairPriceId || null)

        // 0.5 通常プランの Stripe 同期処理
        // 手動で価格IDが変更されたかどうか（クリアも含む）
        const isPriceManualChanged = data.stripePriceId !== undefined && data.stripePriceId !== existingType?.stripe_price_id

        if (isPriceManualChanged) {
            console.log(`[Stripe Sync] Price ID manually changed to: ${stripePriceId}`)
        } else {
            // 手動変更されていない場合：商品IDが変更された、または商品IDがあるのに既存価格IDがない場合に Stripe から自動取得
            const isProductChanged = stripeProductId && (stripeProductId !== existingType?.stripe_product_id || !existingType?.stripe_price_id)
            if (isProductChanged) {
                try {
                    console.log(`[Stripe Sync] Product ID changed or Price missing. Fetching prices for product: ${stripeProductId}`)
                    const prices = await stripe.prices.list({
                        product: stripeProductId,
                        active: true,
                        limit: 10
                    })

                    if (prices.data.length > 0) {
                        const matchingPrice = prices.data.find(p => p.unit_amount === data.fee)
                        stripePriceId = matchingPrice?.id || prices.data[0].id
                        console.log(`[Stripe Sync] Found and updated Price ID: ${stripePriceId}`)
                    } else if (data.fee > 0) {
                        const newPrice = await stripe.prices.create({
                            product: stripeProductId,
                            unit_amount: data.fee,
                            currency: 'jpy',
                            recurring: { interval: 'month' }
                        })
                        stripePriceId = newPrice.id
                        console.log(`[Stripe Sync] Created new Price: ${stripePriceId}`)
                    }
                } catch (stripeErr) {
                    console.error('[Stripe Sync] Failed to sync product prices:', stripeErr)
                }
            } else {
                stripePriceId = existingType?.stripe_price_id || null
            }
        }

        // 0.6 ペアプランの Stripe 同期処理
        // 手動でペア価格IDが変更されたかどうか
        const isPairPriceManualChanged = data.stripePairPriceId !== undefined && data.stripePairPriceId !== existingType?.stripe_pair_price_id

        if (isPairPriceManualChanged) {
            console.log(`[Stripe Sync] Pair Price ID manually changed to: ${stripePairPriceId}`)
        } else {
            const isPairProductChanged = stripePairProductId && (stripePairProductId !== existingType?.stripe_pair_product_id || !existingType?.stripe_pair_price_id)
            if (isPairProductChanged) {
                try {
                    console.log(`[Stripe Sync] Pair Product ID changed or Price missing. Fetching prices for pair product: ${stripePairProductId}`)
                    const prices = await stripe.prices.list({
                        product: stripePairProductId,
                        active: true,
                        limit: 10
                    })

                    if (prices.data.length > 0) {
                        const matchingPrice = prices.data.find(p => p.unit_amount === data.pairFee)
                        stripePairPriceId = matchingPrice?.id || prices.data[0].id
                        console.log(`[Stripe Sync] Found and updated Pair Price ID: ${stripePairPriceId}`)
                    } else if (data.pairFee && data.pairFee > 0) {
                        const newPrice = await stripe.prices.create({
                            product: stripePairProductId,
                            unit_amount: data.pairFee,
                            currency: 'jpy',
                            recurring: { interval: 'month' }
                        })
                        stripePairPriceId = newPrice.id
                        console.log(`[Stripe Sync] Created new Pair Price: ${stripePairPriceId}`)
                    }
                } catch (stripeErr) {
                    console.error('[Stripe Sync] Failed to sync pair product prices:', stripeErr)
                }
            } else {
                stripePairPriceId = existingType?.stripe_pair_price_id || null
            }
        }

        // 1. 通常プランの Stripe 同期（商品IDも価格IDも全く無い場合のみ自動作成）
        if (data.fee > 0 && (!stripeProductId && !stripePriceId)) {
            if (!stripeProductId) {
                const product = await stripe.products.create({
                    name: data.name,
                    type: 'service',
                })
                stripeProductId = product.id
            }
            if (!stripePriceId) {
                const price = await stripe.prices.create({
                    product: stripeProductId,
                    unit_amount: data.fee,
                    currency: 'jpy',
                    recurring: { interval: 'month' },
                })
                stripePriceId = price.id
            }
            console.log(`[UpdateMembershipType] Created Stripe Product/Price for normal plan: ${stripeProductId} / ${stripePriceId}`)
        }

        // 2. ペア会費の Stripe 同期（ペア会費が入力され、かつ商品IDも価格IDも全く無い場合のみ自動作成）
        if (data.pairFee && data.pairFee > 0 && (!stripePairProductId && !stripePairPriceId)) {
            if (!stripePairProductId) {
                const pairProduct = await stripe.products.create({
                    name: `${data.name}（ペア）`,
                    type: 'service',
                })
                stripePairProductId = pairProduct.id
            }
            if (!stripePairPriceId) {
                const pairPrice = await stripe.prices.create({
                    product: stripePairProductId,
                    unit_amount: data.pairFee,
                    currency: 'jpy',
                    recurring: { interval: 'month' },
                })
                stripePairPriceId = pairPrice.id
            }
            console.log(`[UpdateMembershipType] Created Stripe Product/Price for pair plan: ${stripePairProductId} / ${stripePairPriceId}`)
        }

        // 3. DBの更新（membership_types テーブル）
        const { error: baseError } = await supabase
            .from('membership_types')
            .update({
                name: data.name,
                fee: data.fee,
                pair_fee: data.pairFee || null,
                stripe_product_id: stripeProductId,
                stripe_price_id: stripePriceId,
                stripe_pair_product_id: stripePairProductId,
                stripe_pair_price_id: stripePairPriceId,
                default_lesson_master_id: data.selectedLessons.length > 0 ? data.selectedLessons[0].id : null,
                description: data.description || null,
                rules: data.rules || null,
                min_contract_months: data.minContractMonths ?? 2,
                lock_period_months: data.lockPeriodMonths ?? 2,
                pricing_group: data.pricingGroup || null,
                show_in_enroll: data.showInEnroll ?? true,
            })
            .eq('id', data.id)

        if (baseError) throw baseError

        // 4. リレーションの更新（membership_type_lessons テーブル）
        const { error: deleteError } = await supabase
            .from('membership_type_lessons')
            .delete()
            .eq('membership_type_id', data.id)

        if (deleteError) throw deleteError

        if (data.selectedLessons.length > 0) {
            const relations = data.selectedLessons.map(item => ({
                membership_type_id: data.id,
                lesson_master_id: item.id,
                reward_price: item.rewardPrice,
                unit_price: item.unitPrice,
                pair_unit_price: item.pairUnitPrice,
                show_in_enroll: item.showInEnroll ?? true
            }))

            const { error: relationError } = await supabase
                .from('membership_type_lessons')
                .insert(relations)

            if (relationError) throw relationError
        }

        revalidatePath('/admin/masters', 'layout')
        revalidatePath('/admin/masters/membership-types')
        return { success: true }
    } catch (error: any) {
        console.error('Update Membership Type Action Error:', error)
        return { success: false, error: error.message || 'Failed to update membership type' }
    }
}

// ---------------------------------------------------------
// パッケージプラン専用 Actions
// ---------------------------------------------------------

export async function createPackageTypeAction(data: {
    name: string
    fee: number
    ticketCount: number
    stripeProductId: string
    selectedLessons?: { id: string, rewardPrice: number | null, showInEnroll?: boolean }[]
    description?: string | null
    rules?: string | null
    pricingGroup?: string | null
    showInEnroll?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Stripe商品IDから既存のone_time価格を検索
        const prices = await stripe.prices.list({
            product: data.stripeProductId,
            type: 'one_time',
            active: true,
            limit: 10,
        })

        let priceId: string

        if (prices.data.length > 0) {
            // 金額が一致する価格を優先して使用
            const matchingPrice = prices.data.find(p => p.unit_amount === data.fee)
            priceId = matchingPrice?.id || prices.data[0].id
            console.log(`[CreatePackage] Using existing Stripe Price: ${priceId}`)
        } else {
            // 既存のone_time価格がなければ新規作成
            const newPrice = await stripe.prices.create({
                product: data.stripeProductId,
                unit_amount: data.fee,
                currency: 'jpy',
                metadata: { type: 'package' }
            })
            priceId = newPrice.id
            console.log(`[CreatePackage] Created new Stripe Price: ${priceId}`)
        }

        // 2. DBにINSERT
        const { data: typeData, error } = await supabase
            .from('membership_types')
            .insert({
                name: data.name,
                fee: data.fee,
                stripe_product_id: data.stripeProductId,
                stripe_price_id: priceId,
                is_package: true,
                ticket_count: data.ticketCount,
                default_lesson_master_id: data.selectedLessons && data.selectedLessons.length > 0 ? data.selectedLessons[0].id : null,
                description: data.description || null,
                rules: data.rules || null,
                pricing_group: data.pricingGroup || null,
                show_in_enroll: data.showInEnroll ?? true,
            })
            .select()
            .single()

        if (error) throw error

        // 3. Create Relations
        if (data.selectedLessons && data.selectedLessons.length > 0 && typeData) {
            const relations = data.selectedLessons.map(item => ({
                membership_type_id: typeData.id,
                lesson_master_id: item.id,
                reward_price: item.rewardPrice,
                show_in_enroll: item.showInEnroll ?? true
            }))

            const { error: relationError } = await supabase
                .from('membership_type_lessons')
                .insert(relations)

            if (relationError) throw relationError
        }

        revalidatePath('/admin/masters', 'layout')
        revalidatePath('/admin/masters/membership-types')
        return { success: true }
    } catch (error: any) {
        console.error('Create Package Type Action Error:', error)
        return { success: false, error: error.message || 'Failed to create package type' }
    }
}

export async function updatePackageTypeAction(data: {
    id: string
    name: string
    fee: number
    ticketCount: number
    stripeProductId: string
    stripePriceId?: string | null
    selectedLessons?: { id: string, rewardPrice: number | null, unitPrice: number | null, pairUnitPrice: number | null, showInEnroll?: boolean }[]
    description?: string | null
    rules?: string | null
    pricingGroup?: string | null
    showInEnroll?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 0. 既存レコードを取得して商品ID・価格IDの変更を検知
        const { data: existingType } = await supabase
            .from('membership_types')
            .select('stripe_product_id, stripe_price_id')
            .eq('id', data.id)
            .single()

        let stripeProductId = data.stripeProductId || null
        let stripePriceId = data.stripePriceId === undefined ? existingType?.stripe_price_id : (data.stripePriceId || null)

        // 0.5 Stripe 同期処理
        // 手動で価格IDが変更されたかどうか（クリアも含む）
        const isPriceManualChanged = data.stripePriceId !== undefined && data.stripePriceId !== existingType?.stripe_price_id

        if (isPriceManualChanged) {
            console.log(`[Stripe Sync Package] Price ID manually changed to: ${stripePriceId}`)
        } else {
            // 手動変更されていない場合：商品IDが変更された、または商品IDがあるのに既存価格IDがない場合に Stripe から自動取得
            const isProductChanged = stripeProductId && (stripeProductId !== existingType?.stripe_product_id || !existingType?.stripe_price_id)
            if (isProductChanged) {
                try {
                    console.log(`[Stripe Sync Package] Product ID changed or Price missing. Fetching prices for: ${stripeProductId}`)
                    const prices = await stripe.prices.list({
                        product: stripeProductId,
                        type: 'one_time',
                        active: true,
                        limit: 10,
                    })

                    if (prices.data.length > 0) {
                        const matchingPrice = prices.data.find(p => p.unit_amount === data.fee)
                        stripePriceId = matchingPrice?.id || prices.data[0].id
                        console.log(`[Stripe Sync Package] Found matching/first Price ID: ${stripePriceId}`)
                    } else if (data.fee > 0) {
                        const newPrice = await stripe.prices.create({
                            product: stripeProductId,
                            unit_amount: data.fee,
                            currency: 'jpy',
                            metadata: { type: 'package' }
                        })
                        stripePriceId = newPrice.id
                        console.log(`[Stripe Sync Package] Created new Price ID: ${stripePriceId}`)
                    }
                } catch (stripeErr) {
                    console.error('[Stripe Sync Package] Failed to sync package prices:', stripeErr)
                }
            } else {
                stripePriceId = existingType?.stripe_price_id || null
            }
        }

        // 1. DBの更新（membership_types）
        const { error } = await supabase
            .from('membership_types')
            .update({
                name: data.name,
                fee: data.fee,
                stripe_product_id: stripeProductId,
                stripe_price_id: stripePriceId,
                ticket_count: data.ticketCount,
                default_lesson_master_id: data.selectedLessons && data.selectedLessons.length > 0 ? data.selectedLessons[0].id : null,
                description: data.description || null,
                rules: data.rules || null,
                pricing_group: data.pricingGroup || null,
                show_in_enroll: data.showInEnroll ?? true,
            })
            .eq('id', data.id)

        if (error) throw error

        // 2. リレーションの更新（membership_type_lessons）
        if (data.selectedLessons) {
            const { error: deleteError } = await supabase
                .from('membership_type_lessons')
                .delete()
                .eq('membership_type_id', data.id)

            if (deleteError) throw deleteError

            if (data.selectedLessons.length > 0) {
                const relations = data.selectedLessons.map(item => ({
                    membership_type_id: data.id,
                    lesson_master_id: item.id,
                    reward_price: item.rewardPrice,
                    unit_price: item.unitPrice,
                    pair_unit_price: item.pairUnitPrice,
                    show_in_enroll: item.showInEnroll ?? true
                }))

                const { error: relationError } = await supabase
                    .from('membership_type_lessons')
                    .insert(relations)

                if (relationError) throw relationError
            }
        }

        revalidatePath('/admin/masters', 'layout')
        revalidatePath('/admin/masters/membership-types')
        return { success: true }
    } catch (error: any) {
        console.error('Update Package Type Action Error:', error)
        return { success: false, error: error.message || 'Failed to update package type' }
    }
}

export async function updateLessonMasterAction(data: {
    id: string
    name: string
    price: number
    pairPrice?: number | null
    isTrial: boolean
    stripeProductId?: string | null
    stripePriceId?: string | null
    stripePairProductId?: string | null
    stripePairPriceId?: string | null
    pricingGroup?: string | null
    showInEnroll?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    try {
        // 0. 既存レコードを取得
        const { data: existingMaster } = await supabase
            .from('lesson_masters')
            .select('stripe_product_id, stripe_price_id, stripe_pair_product_id, stripe_pair_price_id')
            .eq('id', data.id)
            .single()

        let stripeProductId = data.stripeProductId === undefined ? existingMaster?.stripe_product_id : (data.stripeProductId || null)
        let stripePriceId = data.stripePriceId === undefined ? existingMaster?.stripe_price_id : (data.stripePriceId || null)
        let stripePairProductId = data.stripePairProductId === undefined ? existingMaster?.stripe_pair_product_id : (data.stripePairProductId || null)
        let stripePairPriceId = data.stripePairPriceId === undefined ? existingMaster?.stripe_pair_price_id : (data.stripePairPriceId || null)

        // 通常レッスンの Stripe 同期
        const isPriceManualChanged = data.stripePriceId !== undefined && data.stripePriceId !== existingMaster?.stripe_price_id

        if (isPriceManualChanged) {
            console.log(`[Stripe Sync Lesson] Price ID manually changed to: ${stripePriceId}`)
        } else {
            const isProductChanged = stripeProductId && (stripeProductId !== existingMaster?.stripe_product_id || !existingMaster?.stripe_price_id)
            if (isProductChanged) {
                try {
                    console.log(`[Stripe Sync Lesson] Product ID changed. Fetching prices for: ${stripeProductId}`)
                    const prices = await stripe.prices.list({
                        product: stripeProductId,
                        active: true,
                        limit: 10,
                    })

                    if (prices.data.length > 0) {
                        const matchingPrice = prices.data.find(p => p.unit_amount === data.price)
                        stripePriceId = matchingPrice?.id || prices.data[0].id
                    } else if (data.price > 0) {
                        const newPrice = await stripe.prices.create({
                            product: stripeProductId,
                            unit_amount: data.price,
                            currency: 'jpy',
                            metadata: { type: 'normal' }
                        })
                        stripePriceId = newPrice.id
                    }
                } catch (stripeErr) {
                    console.error('[Stripe Sync Lesson] Failed to sync lesson prices:', stripeErr)
                }
            } else {
                stripePriceId = existingMaster?.stripe_price_id || null
            }
        }

        // ペアレレッスンの Stripe 同期
        const isPairPriceManualChanged = data.stripePairPriceId !== undefined && data.stripePairPriceId !== existingMaster?.stripe_pair_price_id

        if (isPairPriceManualChanged) {
            console.log(`[Stripe Sync Lesson] Pair Price ID manually changed to: ${stripePairPriceId}`)
        } else {
            const isPairProductChanged = stripePairProductId && (stripePairProductId !== existingMaster?.stripe_pair_product_id || !existingMaster?.stripe_pair_price_id)
            if (isPairProductChanged) {
                try {
                    console.log(`[Stripe Sync Lesson] Pair Product ID changed. Fetching prices for: ${stripePairProductId}`)
                    const prices = await stripe.prices.list({
                        product: stripePairProductId,
                        active: true,
                        limit: 10,
                    })

                    if (prices.data.length > 0) {
                        const matchingPrice = prices.data.find(p => p.unit_amount === data.pairPrice)
                        stripePairPriceId = matchingPrice?.id || prices.data[0].id
                    } else if (data.pairPrice && data.pairPrice > 0) {
                        const newPrice = await stripe.prices.create({
                            product: stripePairProductId,
                            unit_amount: data.pairPrice,
                            currency: 'jpy',
                            metadata: { type: 'pair' }
                        })
                        stripePairPriceId = newPrice.id
                    }
                } catch (stripeErr) {
                    console.error('[Stripe Sync Lesson] Failed to sync lesson pair prices:', stripeErr)
                }
            } else {
                stripePairPriceId = existingMaster?.stripe_pair_price_id || null
            }
        }

        // DB の更新
        const { error } = await supabase
            .from('lesson_masters')
            .update({
                name: data.name,
                unit_price: data.price,
                pair_unit_price: data.pairPrice,
                is_trial: data.isTrial,
                pricing_group: data.pricingGroup || null,
                show_in_enroll: data.showInEnroll ?? true,
                stripe_product_id: stripeProductId,
                stripe_price_id: stripePriceId,
                stripe_pair_product_id: stripePairProductId,
                stripe_pair_price_id: stripePairPriceId,
            })
            .eq('id', data.id)

        if (error) throw error

        revalidatePath('/admin/masters', 'layout')
        return { success: true }
    } catch (error: any) {
        console.error('Update Lesson Master Error:', error)
        return { success: false, error: error.message || 'Failed to update lesson master' }
    }
}
