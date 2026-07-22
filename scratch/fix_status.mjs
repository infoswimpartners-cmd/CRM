import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const invoice = await stripe.invoices.retrieve('in_1TpJ7DP0UQGtpYXmj9vcv0Z1')
  if (invoice.status === 'paid') {
     await supabase.from('lesson_schedules').update({
        billing_status: 'paid'
     }).eq('id', '0631fed1-d315-4467-810e-96a5d040a245')
     console.log('Fixed DB to paid')
  } else {
     console.log('Invoice status:', invoice.status)
  }
}
run()
