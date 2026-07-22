import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const customerId = 'cus_TwkJGCWrDv0Sxb'
  
  // Create Invoice Items manually for the difference
  const item1 = await stripe.invoiceItems.create({
    customer: customerId,
    amount: 1500,
    currency: 'jpy',
    description: '追加レッスン料 (オプション・施設利用料差額分) (2026/06/21): 【単発】60分'
  })
  
  const item2 = await stripe.invoiceItems.create({
    customer: customerId,
    amount: 1500,
    currency: 'jpy',
    description: '追加レッスン料 (オプション・施設利用料差額分) (2026/06/28): 【単発】60分'
  })
  
  console.log('Created invoice items:', item1.id, item2.id)
  
  // Create the Invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    collection_method: 'charge_automatically',
    description: '2026年6月分 レッスン料 オプション差額分請求'
  })
  
  console.log('Created invoice:', invoice.id)
  
  // Finalize and Pay
  let finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  console.log('Finalized invoice:', finalized.id)
  
  try {
    const paid = await stripe.invoices.pay(finalized.id)
    console.log('Paid invoice:', paid.status)
    
    // Also update the price in DB so it reflects 10500
    await supabase.from('lesson_schedules').update({
      price: 10500
    }).in('id', ['ae60b2e7-5eb7-4e26-b4e4-633e3a263daf', 'fb2a2776-dd52-4e79-9e15-4e6ab56c78e1'])
    
    console.log('Updated DB to price: 10500.')
  } catch (err) {
    console.error('Payment failed:', err.message)
    await supabase.from('lesson_schedules').update({
      price: 10500
    }).in('id', ['ae60b2e7-5eb7-4e26-b4e4-633e3a263daf', 'fb2a2776-dd52-4e79-9e15-4e6ab56c78e1'])
  }
}
run()
