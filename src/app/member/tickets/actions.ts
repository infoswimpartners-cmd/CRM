'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function purchaseTicket(formData: FormData) {
    const amount = parseInt(formData.get('amount') as string);
    const price = parseInt(formData.get('price') as string);
    const ticketName = formData.get('name') as string;

    if (!amount || !price) {
        throw new Error('Invalid ticket data');
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    let studentId = null;
    let customerId = null;
    let email = null;

    if (user) {
        // Supabase Auth
        const { data: student } = await supabase
            .from('students')
            .select('id, stripe_customer_id, contact_email')
            .eq('auth_user_id', user.id)
            .single();
        if (student) {
            studentId = student.id;
            customerId = student.stripe_customer_id;
            email = student.contact_email;
        }
    } else if (session?.user) {
        // NextAuth (LINE)
        const lineUserId = (session.user as any).id;
        const adminClient = createAdminClient();
        const { data: student } = await adminClient
            .from('students')
            .select('id, stripe_customer_id, contact_email')
            .eq('line_user_id', lineUserId)
            .single();
        if (student) {
            studentId = student.id;
            customerId = student.stripe_customer_id;
            email = student.contact_email;
        }
    }

    if (!studentId) {
        throw new Error('Student not found');
    }

    // Create Checkout Session
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Config for checkout
    const sessionConfig: any = {
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: ticketName,
                        description: `${amount}枚セット`,
                    },
                    unit_amount: price,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${origin}/member/tickets?success=true`,
        cancel_url: `${origin}/member/tickets?canceled=true`,
        metadata: {
            studentId: studentId,
            type: 'ticket_purchase', // Vital for webhook
            ticketAmount: amount.toString(),
        },
    };

    if (customerId) {
        sessionConfig.customer = customerId;
    } else if (email) {
        sessionConfig.customer_email = email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);

    if (checkoutSession.url) {
        redirect(checkoutSession.url);
    }
}
