'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com';

/**
 * THE TRIOの現在の状況（アクティブ人数、Waitlist人数）を取得
 */
export async function getTrioOnboardingStatus() {
    try {
        const supabase = await createClient();

        // 1. アクティブ会員数 (is_trio = true AND status = 'active')
        const { count: activeCount, error: activeError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('is_trio', true)
            .eq('status', 'active');

        // 2. Waitlist登録者数 (status = 'pending')
        const { count: waitlistCount, error: waitlistError } = await supabase
            .from('trio_waitlists')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (activeError || waitlistError) {
            console.error('Error fetching TRIO status:', activeError || waitlistError);
            return { activeCount: 0, waitlistCount: 0, error: '情報の取得に失敗しました' };
        }

        return {
            activeCount: activeCount || 0,
            waitlistCount: waitlistCount || 0,
            isFull: (activeCount || 0) >= 12
        };
    } catch (err: any) {
        console.error('getTrioOnboardingStatus unexpected error:', err);
        return { activeCount: 0, waitlistCount: 0, error: 'サーバーとの通信に失敗しました' };
    }
}

/**
 * Waitlistに登録
 */
export async function registerTrioWaitlist(data: { name: string; email: string; line_user_id?: string }) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('trio_waitlists')
        .insert([{
            name: data.name,
            email: data.email,
            line_user_id: data.line_user_id,
            status: 'pending'
        }]);

    if (error) {
        console.error('Waitlist registration error:', error);
        return { success: false, error: '登録に失敗しました。時間をおいて再度お試しください。' };
    }

    return { success: true };
}

/**
 * TRIO入会用Stripeセッション作成
 * 排他制御のため、作成直前に再度カウントを確認
 */
export async function createTrioEnrollmentSession(studentId?: string) {
    const supabase = await createClient();
    
    // 1. 定員チェック (排他制御)
    const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_trio', true)
        .eq('status', 'active');

    if (count && count >= 12) {
        return { success: false, error: '誠に申し訳ございません。手続きの間に定員に達してしまいました。現在キャンセル待ちのみ受け付けております。' };
    }

    try {
        // Stripe Price ID 設定 (プレースホルダ)
        // 本番では入会金+初月会費のPrice ID、または初期費用用のPrice IDを指定
        const TRIO_ENROLLMENT_PRICE_ID = process.env.STRIPE_TRIO_ENROLLMENT_PRICE_ID || 'price_placeholder_trio';

        // セッション作成
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription', // 定期支払い（月会費）
            payment_method_types: ['card'],
            line_items: [
                {
                    price: TRIO_ENROLLMENT_PRICE_ID,
                    quantity: 1,
                },
            ],
            // 入会金は初期費用としてPriceの設定に含まれるか、add_invoice_itemsで追加する想定
            success_url: `${APP_URL}/trio/dashboard?enrollment=success`,
            cancel_url: `${APP_URL}/trio/join?enrollment=cancel`,
            metadata: {
                type: 'trio_enrollment',
                studentId: studentId || ''
            },
        });

        return { success: true, url: session.url };
    } catch (error: any) {
        console.error('Stripe Enrollment Session Error:', error);
        return { success: false, error: '決済画面の生成に失敗しました。構成設定を確認してください。' };
    }
}
