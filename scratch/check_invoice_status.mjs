import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const invoice = await stripe.invoices.retrieve('in_1TpIjrP0UQGtpYXmJELUj7ei')
  console.log('Invoice status:', invoice.status)
  
  if (invoice.status === 'paid') {
     await supabase.from('lesson_schedules').update({
        billing_status: 'paid'
     }).in('id', ['ae60b2e7-5eb7-4e26-b4e4-633e3a263daf', 'fb2a2776-dd52-4e79-9e15-4e6ab56c78e1'])
     console.log('Fixed DB to paid')
  }
}
run()
