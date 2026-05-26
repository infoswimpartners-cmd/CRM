'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://member.swim-partners.com'

// 本番用価格IDとテスト環境用価格IDのマッピング辞書
const PRICE_ID_MAP: Record<string, string> = {
    // テスト環境ではすべてテスト用サブスクプラン（price_1TSX3TP0UQGtpYXmAfC6TLIO: TRIO会員月2回）に安全にマッピングします。
    // （テスト用の他の価格IDはrecurring（継続）ではなくone-time（一括）である可能性があり、Stripeのsubscriptionモードでエラーになるため）
    'price_1SwKVeP0UQGtpYXmSy0PGWDT': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1SwKVdP0UQGtpYXm59IYOlUQ': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1SwKVcP0UQGtpYXmhnr0o5EF': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1SwKVfP0UQGtpYXm9cgy3v1g': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1SwKVcP0UQGtpYXmJqUXBecy': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1SwKVdP0UQGtpYXmjXxiPSK6': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1TNtfKP0UQGtpYXmwzZ3Bp4s': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1T10PIP0UQGtpYXmGylnrbuW': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
    'price_1T10NRP0UQGtpYXm9a9qqBZK': 'price_1TSX3TP0UQGtpYXmAfC6TLIO',
}

/**
 * オンライン入会手続き用の Stripe Checkout セッションを作成する
 */
export async function createEnrollmentCheckoutSession(planId: string, lineUserId: string, email?: string, phone?: string) {
    const supabase = createAdminClient()

    try {
        if (!planId) {
            return { success: false, error: 'プランIDが指定されていません。' }
        }
        if (!lineUserId) {
            return { success: false, error: 'LINEユーザーIDが取得できませんでした。LINEアプリから再度お試しください。' }
        }

        let priceId = ''
        let planName = ''
        let plan: any = null
        const isPackage = planId === 'package-25m'

        if (isPackage) {
            // 25m完泳パッケージの一括決済用価格ID（Stripe上の定義に合わせて設定）
            priceId = 'price_1SwKVfP0UQGtpYXm9cgy3v1g'
            planName = '25m完泳パッケージ（全12回）'
        } else {
            // Supabaseからプランを取得
            const { data: fetchedPlan, error: planError } = await supabase
                .from('membership_types')
                .select('*')
                .eq('id', planId)
                .single()

            if (planError || !fetchedPlan) {
                console.error('Plan fetch error:', planError)
                return { success: false, error: '選択されたプランが見つかりませんでした。' }
            }

            plan = fetchedPlan
            priceId = plan.stripe_price_id
            planName = plan.name
        }

        // --- 本人確認による自動LINE連携 ---
        let targetStudentId = ''
        if (email && phone) {
            const formattedPhone = phone.replace(/[-]/g, '').trim() // ハイフンを除去

            // 入力されたメールアドレス（大文字小文字無視）で生徒を検索
            const { data: studentsByEmail } = await supabase
                .from('students')
                .select('id, contact_phone, line_user_id')
                .ilike('contact_email', email.trim())

            if (studentsByEmail && studentsByEmail.length > 0) {
                // 電話番号も一致する生徒を検索
                const matchStudent = studentsByEmail.find(s => {
                    const dbPhone = (s.contact_phone || '').replace(/[-]/g, '').trim()
                    return dbPhone === formattedPhone || dbPhone.endsWith(formattedPhone) || formattedPhone.endsWith(dbPhone)
                })

                if (matchStudent) {
                    console.log(`[Stripe Checkout] Student identified via verification: ${matchStudent.id}`)
                    targetStudentId = matchStudent.id

                    // 現在のLINE IDと異なる場合はその場で自動連携
                    if (matchStudent.line_user_id !== lineUserId) {
                        console.log(`[Stripe Checkout] Auto-linking LINE ID ${lineUserId} to Student ${matchStudent.id}`)
                        const { error: linkError } = await supabase
                            .from('students')
                            .update({ line_user_id: lineUserId })
                            .eq('id', matchStudent.id)

                        if (linkError) {
                            console.error('[Stripe Checkout] Auto-link LINE ID failed:', linkError)
                        }
                    }
                }
            }

            if (!targetStudentId) {
                return { success: false, error: 'ご入力いただいた情報（メールアドレス・電話番号）に一致する体験お申し込みデータが見つかりませんでした。内容をご確認の上、正しい登録情報を入力してください。' }
            }
        }

        // 既存の生徒情報を取得 (本人確認で特定されたIDがある場合はそれを使用、なければLINE IDから検索)
        let student = null
        const selectFields = 'id, stripe_customer_id, contact_email, full_name, apply_pair_pricing, is_two_person_lesson, apply_pair_membership_fee'
        if (targetStudentId) {
            const { data: fetchedStudent } = await supabase
                .from('students')
                .select(selectFields)
                .eq('id', targetStudentId)
                .single()
            student = fetchedStudent
        } else {
            const { data: fetchedStudent } = await supabase
                .from('students')
                .select(selectFields)
                .eq('line_user_id', lineUserId)
                .maybeSingle() // LINEが未連携の場合はnullを返す
            student = fetchedStudent
        }

        // ペア月謝会費の自動判定と適用
        if (student && plan && !isPackage) {
            const isPairStudent = !!student.apply_pair_pricing || !!student.is_two_person_lesson
            const applyPairFee = isPairStudent && (student.apply_pair_membership_fee !== false)
            
            if (applyPairFee && plan.stripe_pair_price_id) {
                priceId = plan.stripe_pair_price_id
                planName = `${plan.name}（ペア）`
                console.log(`[Stripe Checkout] Applying Pair Price ID: ${priceId} for student ${student.id}`)
            }
        }

        if (!priceId) {
            return { success: false, error: 'このプランはStripeと連携されていません。' }
        }

        // 環境に応じた価格IDのマッピング（テスト環境で本番用価格IDを差し替える）
        let targetPriceId = priceId
        const isTestMode = process.env.NODE_ENV !== 'production'
        
        if (isTestMode) {
            if (PRICE_ID_MAP[targetPriceId]) {
                console.log(`[Stripe Checkout] Mapping Live Price -> Test Price: ${targetPriceId} -> ${PRICE_ID_MAP[targetPriceId]}`)
                targetPriceId = PRICE_ID_MAP[targetPriceId]
            }
        }

        // Stripe Checkout Session パラメータ
        const sessionConfig: any = {
            mode: isPackage ? 'payment' : 'subscription',
            payment_method_types: ['card'],
            success_url: `${APP_URL}/enroll/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/enroll?cancel=true`,
            metadata: {
                type: 'membership_enrollment',
                line_user_id: lineUserId,
                membership_type_id: isPackage ? 'package-25m' : planId,
                studentId: student?.id || '',
            },
        }

        // 既存の Stripe Customer ID があれば再利用
        if (student?.stripe_customer_id) {
            sessionConfig.customer = student.stripe_customer_id
        } else if (student?.contact_email) {
            // なければメールアドレスをプレフィル
            sessionConfig.customer_email = student.contact_email
        } else if (email) {
            // またはフォームで入力されたメールアドレスを利用
            sessionConfig.customer_email = email.trim()
        }

        // line_items の追加
        sessionConfig.line_items = [
            {
                price: targetPriceId,
                quantity: 1,
            },
        ]

        // サブスクリプションの場合は subscription_data にもメタデータを格納
        if (!isPackage) {
            // 日本時間の翌月1日0:00のUNIXタイムスタンプを算出
            const now = new Date()
            // サーバーのタイムゾーンに影響されないよう、JST（UTC+9）ベースで計算
            const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000))
            let nextYear = jstNow.getUTCFullYear()
            let nextMonth = jstNow.getUTCMonth() + 2; // getUTCMonthは0-11のため、当月は+1、翌月は+2
            if (nextMonth > 12) {
                nextMonth = 1
                nextYear += 1
            }
            
            // JSTの翌月1日0:00:00は、UTCでは前日（当月末日）の15:00:00
            const utcNextMonthFirst = Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0)
            const jstNextMonthFirstUnix = Math.floor((utcNextMonthFirst - (9 * 60 * 60 * 1000)) / 1000)

            sessionConfig.subscription_data = {
                billing_cycle_anchor: jstNextMonthFirstUnix,
                proration_behavior: 'none', // 日割り計算をスキップして翌月1日から全額引き落とし
                metadata: {
                    type: 'membership_enrollment',
                    line_user_id: lineUserId,
                    membership_type_id: planId,
                    studentId: student?.id || '',
                },
            }
        }

        console.log(`[Stripe Checkout] Creating session: mode=${sessionConfig.mode}, plan=${planName}, priceId=${targetPriceId}`)
        const session = await stripe.checkout.sessions.create(sessionConfig)

        return { success: true, url: session.url }
    } catch (error: any) {
        console.error('Create Enrollment Checkout Session Error:', error)
        return { success: false, error: error.message || '決済画面の作成に失敗しました。' }
    }
}
