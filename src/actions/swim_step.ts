'use server';

import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { SWIM_STEP_PLANS } from '@/types/swim_step';
import type { 
  SwimStepSlotSelection, 
  SwimStepBookingPayload 
} from '@/types/swim_step';

/**
 * スイムステップのStripe Checkout Session作成処理
 */
export async function createSwimStepCheckoutSession(payload: SwimStepBookingPayload) {
  try {
    const plan = SWIM_STEP_PLANS[payload.planType];
    if (!plan) {
      return { success: false, error: '無効な参加プランが選択されました。' };
    }

    if (!payload.termsAgreed) {
      return { success: false, error: '利用規約・キャンセルポリシーへの同意が必要です。' };
    }

    if (payload.selectedSlots.length !== plan.slotsCount) {
      return {
        success: false,
        error: `選択されたチケット（${plan.name}）では、希望日程・クラスを${plan.slotsCount}枠選択してください。（現在${payload.selectedSlots.length}枠選択されています）`,
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://member.swim-partners.com';

    // 1. Supabaseへ仮申込レコードを保存（DBが一時的にエラーでも決済自体はStripe metadataで続行可能）
    let bookingId: string | null = null;
    try {
      const supabaseAdmin = createAdminClient();
      const { data: booking, error: insertError } = await supabaseAdmin
        .from('swim_step_bookings')
        .insert({
          line_user_id: payload.lineUserId || null,
          line_display_name: payload.lineDisplayName || null,
          parent_name: payload.parentName,
          parent_kana: payload.parentKana,
          phone: payload.phone,
          email: payload.email,
          child_name: payload.childName,
          child_kana: payload.childKana,
          child_age: payload.childAge,
          birth_date: payload.birthDate || null,
          plan_type: payload.planType,
          amount: plan.price,
          payment_status: 'pending',
          selected_slots: payload.selectedSlots,
          swimming_experience: payload.swimmingExperience || null,
          terms_agreed: payload.termsAgreed,
          status: 'confirmed',
        })
        .select('id')
        .single();

      if (!insertError && booking) {
        bookingId = booking.id;
      } else if (insertError) {
        console.warn('[SwimStep] DB Insert Warning (will use Stripe metadata):', insertError.message);
      }
    } catch (dbErr) {
      console.warn('[SwimStep] DB Connection skipped/failed, proceeding with Stripe session:', dbErr);
    }

    // 選択日程のサマリーテキスト（Stripe明細およびWebhook用）
    const slotsSummary = payload.selectedSlots
      .map((s) => `${s.dateLabel} ${s.className}`)
      .join(' / ');

    // 2. Stripe Checkout Sessionの作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: payload.email,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            unit_amount: plan.price,
            product_data: {
              name: `スイムステップ: ${plan.name}`,
              description: `城東小学校プール 10月限定クラス | お子様: ${payload.childName} 様 | 選択枠: ${slotsSummary}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/swim-step/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/swim-step`,
      metadata: {
        type: 'swim_step',
        bookingId: bookingId || '',
        lineUserId: payload.lineUserId || '',
        lineDisplayName: payload.lineDisplayName || '',
        parentName: payload.parentName,
        parentKana: payload.parentKana,
        childName: payload.childName,
        childKana: payload.childKana,
        childAge: payload.childAge,
        phone: payload.phone,
        email: payload.email,
        planType: payload.planType,
        planName: plan.name,
        amount: plan.price.toString(),
        selectedSlotsJson: JSON.stringify(payload.selectedSlots),
        swimmingExperience: (payload.swimmingExperience || '').slice(0, 450), // Stripeメタデータ文字数制限対策
      },
    });

    // 3. 発行されたStripe Session IDをDBに更新
    if (bookingId) {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin
          .from('swim_step_bookings')
          .update({ stripe_session_id: session.id })
          .eq('id', bookingId);
      } catch (e) {
        console.error('[SwimStep] Failed to update stripe_session_id in DB:', e);
      }
    }

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (error: any) {
    console.error('[SwimStep] Create Checkout Session Error:', error);
    return {
      success: false,
      error: error.message || '決済画面の生成中にエラーが発生しました。',
    };
  }
}
