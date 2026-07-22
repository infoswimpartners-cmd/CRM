import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const customerId = 'cus_U4HPd7r6e996Qo'
  
  // 1. Fetch the June 6th lesson schedule
  const { data: schedules } = await supabase
    .from('lesson_schedules')
    .select('*')
    .eq('student_id', 'a1e15c53-b1a6-481c-81b1-6dcf05cf5a2e')
    .gte('start_time', '2026-06-06T00:00:00Z')
    .lt('start_time', '2026-06-07T00:00:00Z')
    
  if (!schedules || schedules.length === 0) {
    console.log('June 6th lesson not found.')
    return
  }
  
  const schedule = schedules[0]
  console.log('Found schedule:', schedule.id, 'Price:', schedule.price)
  
  if (schedule.billing_status === 'paid') {
     console.log('Already paid.')
     return
  }

  // Create Invoice Item
  const item = await stripe.invoiceItems.create({
    customer: customerId,
    amount: schedule.price || 9000,
    currency: 'jpy',
    description: `追加レッスン料 (2026/06/06): ${schedule.title || '【単発】60分'}`
  })
  
  console.log('Created invoice item:', item.id)
  
  // Create the Invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    collection_method: 'charge_automatically',
    description: '2026年6月分 レッスン料請求'
  })
  
  console.log('Created invoice:', invoice.id)
  
  // Finalize and Pay
  let finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  console.log('Finalized invoice:', finalized.id)
  
  try {
    const paid = await stripe.invoices.pay(finalized.id)
    console.log('Paid invoice:', paid.status)
    
    // Update DB
    await supabase.from('lesson_schedules').update({
      billing_status: 'paid',
      payment_intent_id: typeof paid.payment_intent === 'string' ? paid.payment_intent : paid.payment_intent?.id,
      stripe_invoice_item_id: item.id
    }).eq('id', schedule.id)
    
    console.log('Updated DB to paid.')
  } catch (err) {
    console.error('Payment failed:', err.message)
    // Update DB to awaiting_payment
    await supabase.from('lesson_schedules').update({
      billing_status: 'awaiting_payment',
      stripe_invoice_item_id: item.id
    }).eq('id', schedule.id)
    console.log('Updated DB to awaiting_payment.')
  }
}
run()
