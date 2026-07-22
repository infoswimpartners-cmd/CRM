import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: rti } = await supabase
    .from('lesson_schedules')
    .select('id, stripe_invoice_item_id, stripe_invoice_id, student_id, start_time')
    .gte('start_time', '2026-06-01T00:00:00Z')
    .lt('start_time', '2026-07-01T00:00:00Z')
    .eq('billing_status', 'ready_to_invoice')
    
  if (!rti || rti.length === 0) {
    console.log('No ready_to_invoice lessons found.')
    return
  }
  
  console.log(`Found ${rti.length} ready_to_invoice lessons.`)
  
  for (const schedule of rti) {
    console.log(`Processing schedule ${schedule.id}...`)
    
    if (schedule.stripe_invoice_item_id) {
       try {
         const item = await stripe.invoiceItems.retrieve(schedule.stripe_invoice_item_id)
         if (item.invoice) {
            // It is attached to an invoice
            const invoice = typeof item.invoice === 'string' ? await stripe.invoices.retrieve(item.invoice) : item.invoice
            if (invoice.status === 'paid') {
               console.log(`  -> Already paid in invoice ${invoice.id}. Updating DB to paid.`)
               await supabase.from('lesson_schedules').update({
                  billing_status: 'paid',
                  stripe_invoice_id: invoice.id,
                  payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id
               }).eq('id', schedule.id)
            } else {
               console.log(`  -> Invoice ${invoice.id} status is ${invoice.status}. Updating DB to ${invoice.status === 'open' ? 'awaiting_payment' : 'pending'}.`)
            }
         } else {
            console.log(`  -> Invoice item is pending! We need to create an invoice for student ${schedule.student_id}.`)
            // Find student customer id
            const { data: stu } = await supabase.from('students').select('stripe_customer_id').eq('id', schedule.student_id).single()
            if (stu?.stripe_customer_id) {
               try {
                  const inv = await stripe.invoices.create({
                     customer: stu.stripe_customer_id,
                     auto_advance: true,
                     collection_method: 'charge_automatically',
                     description: '6月分未請求レッスン分'
                  })
                  const finalized = await stripe.invoices.finalizeInvoice(inv.id)
                  const paid = await stripe.invoices.pay(finalized.id)
                  await supabase.from('lesson_schedules').update({
                     billing_status: 'paid',
                     stripe_invoice_id: paid.id,
                     payment_intent_id: typeof paid.payment_intent === 'string' ? paid.payment_intent : paid.payment_intent?.id
                  }).eq('id', schedule.id)
                  console.log(`  -> Successfully invoiced and paid!`)
               } catch(e) {
                  console.error('  -> Failed to invoice:', e.message)
               }
            } else {
               console.log('  -> No customer ID for student.')
            }
         }
       } catch (err) {
         console.error(`  -> Error retrieving invoice item: ${err.message}`)
       }
    } else {
       console.log('  -> No stripe_invoice_item_id on schedule.')
    }
  }
}
run()
