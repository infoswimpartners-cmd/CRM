import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Stripe Billing Portal（カード変更・支払い情報画面）セッションURLを発行
 * - LIFFからの lineUserId パラメータ、または認証済みログインセッションに対応
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const lineUserId = searchParams.get('lineUserId')?.trim()
    const studentId = searchParams.get('studentId')?.trim()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'
    const returnUrl = `${appUrl}/member/billing`

    const supabaseAdmin = createAdminClient()
    let stripeCustomerId: string | null = null
    let studentName = ''

    // 1. lineUserId が指定されている場合（LIFF / LINE内ブラウザ経由）
    if (lineUserId && /^U[0-9a-f]{32}$/i.test(lineUserId)) {
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('id, full_name, stripe_customer_id')
            .eq('line_user_id', lineUserId)
            .maybeSingle()

        if (student?.stripe_customer_id) {
            stripeCustomerId = student.stripe_customer_id
            studentName = student.full_name
        }
    }

    // 2. studentId が指定されている場合（署名付きリンクや管理画面からの個別案内）
    if (!stripeCustomerId && studentId) {
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('id, full_name, stripe_customer_id')
            .eq('id', studentId)
            .maybeSingle()

        if (student?.stripe_customer_id) {
            stripeCustomerId = student.stripe_customer_id
            studentName = student.full_name
        }
    }

    // 3. ログイン中のセッションから取得
    if (!stripeCustomerId) {
        try {
            const supabase = await createClient()
            const { data: authData } = await supabase.auth.getUser()
            if (authData?.user?.id) {
                const { data: student } = await supabaseAdmin
                    .from('students')
                    .select('id, full_name, stripe_customer_id')
                    .eq('auth_user_id', authData.user.id)
                    .maybeSingle()

                if (student?.stripe_customer_id) {
                    stripeCustomerId = student.stripe_customer_id
                    studentName = student.full_name
                }
            }
        } catch (e) {
            // セッションなし
        }
    }

    if (!stripeCustomerId) {
        return NextResponse.json(
            { error: '該当する生徒のStripeお支払い情報が見つかりませんでした。会員ログインを行っていただくか、事務局までお問い合わせください。' },
            { status: 404 }
        )
    }

    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        })

        return NextResponse.json({
            success: true,
            url: portalSession.url,
            studentName,
        })
    } catch (err: any) {
        console.error('[API /member/stripe-portal] Error creating Stripe Portal session:', err)
        return NextResponse.json(
            { error: err.message || 'お支払い画面の発行に失敗しました。' },
            { status: 500 }
        )
    }
}
