import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'
import { lineService } from '@/lib/line'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') as string

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET')
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            secret
        )
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`)
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const { studentId, type, lessonDate, location, line_user_id, membership_type_id } = session.metadata || {}

                if (type === 'trial_fee' && studentId) {
                    const { scheduleId } = session.metadata || {}
                    console.log(`[Stripe Webhook] Processing Trial Confirmation for Student: ${studentId}, Schedule: ${scheduleId}`)

                    // 1. Update Student Status
                    const { error: dbError } = await supabaseAdmin
                        .from('students')
                        .update({ status: 'trial_confirmed' })
                        .eq('id', studentId)

                    if (dbError) {
                        console.error('[Stripe Webhook] Student Status Update Failed:', dbError)
                    } else {
                        console.log(`[Stripe Webhook] Student ${studentId} status updated to trial_confirmed`)
                    }

                    // 2. Update Lesson Schedule Status
                    if (scheduleId) {
                        const { error: schedError } = await supabaseAdmin
                            .from('lesson_schedules')
                            .update({ 
                                billing_status: 'paid',
                                payment_intent_id: session.payment_intent as string || null 
                            })
                            .eq('id', scheduleId)
                        
                        if (schedError) {
                            console.error('[Stripe Webhook] Schedule Status Update Failed:', schedError)
                        } else {
                            console.log(`[Stripe Webhook] Schedule ${scheduleId} marked as paid`)
                        }
                    }

                    // 3. Fetch Student Info for Email and LINE
                    const { data: student, error: fetchError } = await supabaseAdmin
                        .from('students')
                        .select('contact_email, full_name, line_user_id')
                        .eq('id', studentId)
                        .single()

                    let coachName = '未定';
                    if (scheduleId) {
                        const { data: sched } = await supabaseAdmin
                            .from('lesson_schedules')
                            .select('coach_id')
                            .eq('id', scheduleId)
                            .single();
                        if (sched?.coach_id) {
                            const { data: p } = await supabaseAdmin
                                .from('profiles')
                                .select('full_name')
                                .eq('id', sched.coach_id)
                                .single();
                            if (p?.full_name) {
                                coachName = p.full_name;
                            }
                        }
                    }

                    if (student && !fetchError) {
                        const formattedDate = lessonDate
                            ? new Date(lessonDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                            : '未定'
                        const lessonLocation = location || '未定'

                        // 4. お礼メール送信 (パーソナル体験専用トリガー)
                        await emailService.sendTriggerEmail(
                            'trial_payment_completed',
                            student.contact_email,
                            {
                                name: student.full_name,
                                full_name: student.full_name,
                                lesson_date: formattedDate,
                                location: lessonLocation,
                                coach_name: coachName,
                                title: '体験レッスン',
                                amount: (session.amount_total || 0).toLocaleString()
                            }
                        )

                    }
                } else if (type === 'ticket_purchase' && studentId) {
                    // --- TICKET PURCHASE LOGIC ---
                    const amount = parseInt(session.metadata?.ticketAmount || '0', 10);
                    console.log(`[Stripe Webhook] Processing Ticket Purchase for Student: ${studentId}, Amount: ${amount}`);

                    if (amount > 0) {
                        // 1. Fetch current tickets
                        const { data: student, error: fetchError } = await supabaseAdmin
                            .from('students')
                            .select('current_tickets')
                            .eq('id', studentId)
                            .single();

                        if (fetchError || !student) {
                            console.error('[Stripe Webhook] Failed to fetch student for ticket update:', fetchError);
                            throw fetchError;
                        }

                        const currentBalance = student.current_tickets || 0;
                        const newBalance = currentBalance + amount;

                        // 2. Update Student Balance
                        const { error: updateError } = await supabaseAdmin
                            .from('students')
                            .update({ current_tickets: newBalance })
                            .eq('id', studentId);

                        if (updateError) {
                            console.error('[Stripe Webhook] Failed to update ticket balance:', updateError);
                            throw updateError;
                        }

                        // 3. Record Transaction
                        try {
                            const { error: txError } = await supabaseAdmin
                                .from('ticket_transactions')
                                .insert({
                                    student_id: studentId,
                                    change_amount: amount,
                                    balance_after: newBalance,
                                    reason: 'チケット購入',
                                    related_id: session.id // Store Stripe Session ID
                                });

                            if (txError) {
                                console.error('[Stripe Webhook] Failed to insert transaction record:', txError);
                            }

                            // 4. お礼メール送信 (payment_success トリガー)
                            try {
                                const { data: stdInfo } = await supabaseAdmin.from('students').select('contact_email, full_name').eq('id', studentId).single();
                                if (stdInfo?.contact_email) {
                                    await emailService.sendTriggerEmail('payment_success', stdInfo.contact_email, {
                                        name: stdInfo.full_name,
                                        title: session.metadata?.ticket_name || 'チケット購入',
                                        amount: (session.amount_total || 0).toLocaleString() + '円'
                                    });
                                }
                            } catch (e) {
                                console.error('[Stripe Webhook] Email error:', e);
                            }

                        } catch (e) {
                            console.error('[Stripe Webhook] Transaciton insert failed (Unknown error):', e);
                        }

                        console.log(`[Stripe Webhook] Successfully added ${amount} tickets to Student ${studentId}. New Balance: ${newBalance}`);
                    }
                } else if (type === 'trio_trial' && studentId) {
                    // --- THE TRIO TRIAL PAYMENT LOGIC ---
                    const slotId = session.metadata?.slotId;
                    console.log(`[Stripe Webhook] Processing THE TRIO Trial Payment for Student: ${studentId}, Slot: ${slotId}`);

                    if (slotId) {
                        // Update payment_status in trio_entries and clear expiration
                        const { error: updateError } = await supabaseAdmin
                            .from('trio_entries')
                            .update({ 
                                payment_status: 'paid',
                                expires_at: null 
                            })
                            .eq('student_id', studentId)
                            .eq('slot_id', slotId);

                        if (updateError) {
                            console.error('[Stripe Webhook] Failed to update TRIO trial payment status:', updateError);
                            throw updateError;
                        }

                        console.log(`[Stripe Webhook] Successfully marked TRIO Trial Payment as paid for Student ${studentId}`);

                        // 2. お礼メール送信 (payment_success トリガー)
                        try {
                            const [{ data: stdInfo }, { data: slotInfo }] = await Promise.all([
                                supabaseAdmin.from('students').select('contact_email, full_name').eq('id', studentId).single(),
                                supabaseAdmin.from('trio_slots').select('start_at').eq('id', slotId).single()
                            ]);

                            if (stdInfo?.contact_email && slotInfo) {
                                const formattedDate = new Date(slotInfo.start_at).toLocaleString('ja-JP', { 
                                    timeZone: 'Asia/Tokyo',
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                await emailService.sendTriggerEmail('trio_trial_payment_completed', stdInfo.contact_email, {
                                    name: stdInfo.full_name,
                                    lesson_date: formattedDate,
                                    title: 'THE TRIO 体験レッスン',
                                    amount: (session.amount_total || 0).toLocaleString() + '円'
                                });
                            }
                        } catch (e) {
                            console.error('[Stripe Webhook] TRIO Email error:', e);
                        }
                    }
                } else if (type === 'trio_ticket_purchase' && studentId) {
                    // --- THE TRIO TICKET PURCHASE LOGIC ---
                    const amount = parseInt(session.metadata?.ticketAmount || '0', 10);
                    console.log(`[Stripe Webhook] Processing THE TRIO Ticket Purchase for Student: ${studentId}, Amount: ${amount}`);

                    if (amount > 0) {
                        // 1. Fetch current TRIO tickets
                        const { data: student, error: fetchError } = await supabaseAdmin
                            .from('students')
                            .select('trio_ticket_balance')
                            .eq('id', studentId)
                            .single();

                        if (fetchError || !student) {
                            console.error('[Stripe Webhook] Failed to fetch student for TRIO ticket update:', fetchError);
                            throw fetchError;
                        }

                        const currentBalance = student.trio_ticket_balance || 0;
                        const newBalance = currentBalance + amount;

                        // 2. Update Student Balance
                        const { error: updateError } = await supabaseAdmin
                            .from('students')
                            .update({ trio_ticket_balance: newBalance })
                            .eq('id', studentId);

                        if (updateError) {
                            console.error('[Stripe Webhook] Failed to update TRIO ticket balance:', updateError);
                            throw updateError;
                        }

                        console.log(`[Stripe Webhook] Successfully added ${amount} TRIO tickets to Student ${studentId}. New Balance: ${newBalance}`);
                    }
                } else if (type === 'membership_enrollment') {
                    const studentId = session.metadata?.studentId
                    const lineUserId = line_user_id || session.metadata?.line_user_id
                    const planId = membership_type_id || session.metadata?.membership_type_id
                    console.log(`[Stripe Webhook] Processing Membership Enrollment. studentId: ${studentId}, LINE User: ${lineUserId}, Plan: ${planId}`)

                    if ((studentId || lineUserId) && planId) {
                        // DBからプランのis_package / ticket_countを取得
                        const { data: planData } = await supabaseAdmin
                            .from('membership_types')
                            .select('is_package, ticket_count, name')
                            .eq('id', planId)
                            .maybeSingle()

                        const isPackage = planData?.is_package ?? false
                        const ticketCount = planData?.ticket_count ?? 0
                        const planDisplayName = planData?.name || (isPackage ? 'パッケージプラン（一括）入会' : 'Swim Partners 月謝プラン入会')

                        let student = null
                        if (studentId) {
                            console.log(`[Stripe Webhook] Searching student by metadata studentId: ${studentId}`)
                            const { data: fetchedStudent } = await supabaseAdmin
                                .from('students')
                                .select('*')
                                .eq('id', studentId)
                                .maybeSingle()
                            student = fetchedStudent
                        }

                        if (!student && lineUserId) {
                            console.log(`[Stripe Webhook] Student not found by studentId. Searching by lineUserId: ${lineUserId}`)
                            const { data: fetchedStudent } = await supabaseAdmin
                                .from('students')
                                .select('*')
                                .eq('line_user_id', lineUserId)
                                .maybeSingle()
                            student = fetchedStudent
                        }

                        const nowStr = new Date().toISOString()

                        const updateData: any = {
                            status: 'active',
                            membership_type_id: planId,  // 月次・パッケージ共通でDBのIDを設定
                            stripe_customer_id: session.customer as string || null,
                            stripe_subscription_id: session.subscription as string || null,
                            membership_started_at: nowStr,
                            is_bank_transfer: false
                        }

                        if (student) {
                            console.log(`[Stripe Webhook] Found existing student: ${student.id} (${student.full_name}). Updating to active...`)

                            // パッケージの場合はチケットも付与
                            if (isPackage && ticketCount > 0) {
                                const currentTickets = student.current_tickets || 0
                                const newTickets = currentTickets + ticketCount
                                updateData.current_tickets = newTickets
                                console.log(`[Stripe Webhook] Granting ${ticketCount} tickets to Student ${student.id}. ${currentTickets} → ${newTickets}`)
                            }

                            const { error: updateError } = await supabaseAdmin
                                .from('students')
                                .update(updateData)
                                .eq('id', student.id)

                            if (updateError) {
                                console.error('[Stripe Webhook] Failed to update student details:', updateError)
                                throw updateError
                            }

                            // パッケージの場合はチケットトランザクション記録
                            if (isPackage && ticketCount > 0) {
                                const currentTickets = student.current_tickets || 0
                                const newTickets = currentTickets + ticketCount
                                await supabaseAdmin
                                    .from('ticket_transactions')
                                    .insert({
                                        student_id: student.id,
                                        change_amount: ticketCount,
                                        balance_after: newTickets,
                                        reason: `パッケージ入会（${planDisplayName}）`,
                                        related_id: null
                                    })
                            }

                            if (student.contact_email) {
                                try {
                                    await emailService.sendTriggerEmail('payment_success', student.contact_email, {
                                        name: student.full_name,
                                        title: planDisplayName,
                                        amount: (session.amount_total || 0).toLocaleString() + '円'
                                    })
                                } catch (e) {
                                    console.error('[Stripe Webhook] Failed to send email:', e)
                                }
                            }
                        } else {
                            console.log(`[Stripe Webhook] Student not found for LINE User: ${lineUserId}. Creating a new student record...`)
                            const customerName = session.customer_details?.name || '新規LINEユーザー'
                            const customerEmail = session.customer_details?.email || ''
                            const customerPhone = session.customer_details?.phone || ''
                            const tempStudentNumber = 'L' + Math.floor(1000 + Math.random() * 9000).toString()

                            // パッケージの場合は初期チケット付与
                            if (isPackage && ticketCount > 0) {
                                updateData.current_tickets = ticketCount
                            }

                            const { data: newStudent, error: insertError } = await supabaseAdmin
                                .from('students')
                                .insert({
                                    full_name: customerName,
                                    contact_email: customerEmail,
                                    contact_phone: customerPhone,
                                    line_user_id: lineUserId,
                                    student_number: tempStudentNumber,
                                    ...updateData
                                })
                                .select('id')
                                .single()

                            if (insertError) {
                                console.error('[Stripe Webhook] Failed to insert new student details:', insertError)
                                throw insertError
                            }

                            // 新規作成時もチケットトランザクション記録
                            if (isPackage && ticketCount > 0 && newStudent) {
                                await supabaseAdmin
                                    .from('ticket_transactions')
                                    .insert({
                                        student_id: newStudent.id,
                                        change_amount: ticketCount,
                                        balance_after: ticketCount,
                                        reason: `パッケージ入会（${planDisplayName}）`,
                                        related_id: null
                                    })
                            }

                            if (customerEmail) {
                                try {
                                    await emailService.sendTriggerEmail('payment_success', customerEmail, {
                                        name: customerName,
                                        title: planDisplayName,
                                        amount: (session.amount_total || 0).toLocaleString() + '円'
                                    })
                                } catch (e) {
                                    console.error('[Stripe Webhook] Failed to send email to new student:', e)
                                }
                            }
                        }
                    }
                }
                break
            }
            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice
                const mainScheduleId = invoice.metadata?.schedule_id
                const paymentIntentId = typeof (invoice as any).payment_intent === 'string'
                    ? (invoice as any).payment_intent
                    : (invoice as any).payment_intent?.id

                // 1. Process Main Schedule (Legacy/Direct Invoice)
                if (mainScheduleId) {
                    console.log(`[Stripe Webhook] Invoice paid for main schedule: ${mainScheduleId}`)
                    await supabaseAdmin
                        .from('lesson_schedules')
                        .update({
                            billing_status: 'paid',
                            payment_intent_id: paymentIntentId ?? null
                        })
                        .eq('id', mainScheduleId)
                }

                // 2. Process Deferred Schedules (Consolidated Overage Billing)
                // Consolidated items (InvoiceItems) will have schedule_id in their metadata
                const lineItems = invoice.lines.data
                for (const line of lineItems) {
                    const sid = line.metadata?.schedule_id
                    if (sid && sid !== mainScheduleId) {
                        console.log(`[Stripe Webhook] Invoice paid for consolidated schedule: ${sid}`)
                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({
                                billing_status: 'paid',
                                payment_intent_id: paymentIntentId ?? null
                            })
                            .eq('id', sid)
                    }
                }

                // 3. Send Payment Success Email and LINE (Invoice Paid)
                const stripeCustomerId = invoice.customer as string
                if (stripeCustomerId) {
                    const { data: student } = await supabaseAdmin
                        .from('students')
                        .select('id, full_name, contact_email')
                        .eq('stripe_customer_id', stripeCustomerId)
                        .single()

                    if (student?.contact_email) {
                        const itemNames = invoice.lines.data
                            .map(line => line.description)
                            .filter(Boolean)
                            .join('、')
                        const lessonNames = itemNames || 'レッスン料金'

                        console.log(`[Stripe Webhook] Sending Payment Success (Invoice Paid) email/LINE to: ${student.contact_email}`)
                        await emailService.sendTriggerEmail('payment_success', student.contact_email, {
                            name: student.full_name,
                            student_name: student.full_name,
                            title: lessonNames,
                            amount: (invoice.amount_paid || 0).toLocaleString() + '円'
                        })
                    }
                }
                break
            }
            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge
                const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

                if (paymentIntentId) {
                    const { data: schedule } = await supabaseAdmin
                        .from('lesson_schedules')
                        .select('id')
                        .eq('payment_intent_id', paymentIntentId)
                        .single()

                    if (schedule) {
                        const isFull = charge.refunded // Boolean on charge object
                        // or check amount_refunded

                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({
                                billing_status: charge.refunded ? 'refunded' : 'partially_refunded',
                                refund_status: charge.refunded ? 'full' : 'partial'
                                // if partially refunded, status might just be partially_refunded?
                                // charge.refunded is true if fully refunded? No, it means "has been refunded".
                                // We should check amount_refunded vs amount.
                            })
                            .eq('id', schedule.id)

                        // Refined Logic:
                        const isFullyRefunded = charge.amount_refunded >= charge.amount
                        await supabaseAdmin
                            .from('lesson_schedules')
                            .update({
                                billing_status: isFullyRefunded ? 'refunded' : 'partially_refunded',
                                refund_status: isFullyRefunded ? 'full' : 'partial'
                            })
                            .eq('id', schedule.id)

                        console.log(`[Stripe Webhook] Refund processed for schedule ${schedule.id}. Status: ${isFullyRefunded ? 'refunded' : 'partially_refunded'}`)
                    }
                }
                break
            }
            default:
            // Unhandled event type
        }
    } catch (error) {
        console.error('[Stripe Webhook] Processing Error:', error)
        return NextResponse.json({ error: 'Webhook Processing Error' }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
