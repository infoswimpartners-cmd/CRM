import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const scheduleId = '048e4fe0-b644-4646-a8a8-1c116e58106f'
  const studentId = 'a15eb3ed-4bb6-41c5-b1f4-66f8270f2807'
  
  // Mark as reported
  await supabase.from('lesson_schedules').update({
     is_reported: true
  }).eq('id', scheduleId)
  
  const { data: stu } = await supabase.from('students').select('stripe_customer_id').eq('id', studentId).single()
  
  if (!stu?.stripe_customer_id) {
     console.log('No stripe customer ID for Sugiura.')
     return
  }
  
  const customerId = stu.stripe_customer_id
  
  // Create Invoice Item
  const item = await stripe.invoiceItems.create({
    customer: customerId,
    amount: 9000,
    currency: 'jpy',
    description: '追加レッスン料 (2026/06/30): 【単発】60分'
  })
  
  console.log('Created invoice item:', item.id)
  
  // Create Invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    collection_method: 'charge_automatically',
    description: '2026年6月分 未請求レッスン分'
  })
  
  // Finalize and pay
  let finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  try {
     const paid = await stripe.invoices.pay(finalized.id)
     await supabase.from('lesson_schedules').update({
        billing_status: 'paid',
        stripe_invoice_id: paid.id,
        stripe_invoice_item_id: item.id,
        payment_intent_id: typeof paid.payment_intent === 'string' ? paid.payment_intent : paid.payment_intent?.id
     }).eq('id', scheduleId)
     console.log('Invoiced and paid successfully.')
  } catch(e) {
     console.error('Payment failed:', e.message)
     await supabase.from('lesson_schedules').update({
        billing_status: 'awaiting_payment',
        stripe_invoice_id: finalized.id,
        stripe_invoice_item_id: item.id
     }).eq('id', scheduleId)
  }
}
run()
