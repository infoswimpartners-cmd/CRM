import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})

async function run() {
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, full_name, stripe_customer_id, stripe_subscription_id, membership_types!students_membership_type_id_fkey(name)')
    .eq('full_name', '峯崎市楓')
    
  if (sErr) {
    console.error('Error fetching student:', sErr)
    return
  }
  
  if (!students || students.length === 0) {
    console.log('Student not found')
    return
  }
  
  const student = students[0]
  console.log('--- Student Info ---')
  console.log(`ID: ${student.id}`)
  console.log(`Name: ${student.full_name}`)
  console.log(`Plan: ${student.membership_types?.name}`)
  console.log(`Stripe Customer ID: ${student.stripe_customer_id}`)
  console.log(`Stripe Sub ID: ${student.stripe_subscription_id}`)
  
  if (student.stripe_customer_id) {
    console.log('\nFetching invoices from Stripe...')
    const invoices = await stripe.invoices.list({
      customer: student.stripe_customer_id,
      limit: 10
    })
    
    if (invoices.data.length === 0) {
      console.log('No invoices found in Stripe.')
    } else {
      console.log('\n--- Stripe Invoices ---')
      console.table(invoices.data.map(inv => ({
        id: inv.id,
        amount: inv.total,
        status: inv.status,
        date: new Date(inv.created * 1000).toISOString(),
        paid: inv.paid,
        hosted_url: inv.hosted_invoice_url
      })))
    }
  }

  // Check recent lesson schedules and their billing status
  const { data: schedules } = await supabase
    .from('lesson_schedules')
    .select('id, start_time, is_overage, billing_status, price, lesson_masters(name)')
    .eq('student_id', student.id)
    .gte('start_time', '2026-06-01T00:00:00Z')
    .order('start_time')
    
  console.log('\n--- Recent Lessons (from June 2026) ---')
  if (schedules && schedules.length > 0) {
    console.table(schedules.map(s => ({
      time: new Date(s.start_time).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      lesson: s.lesson_masters?.name,
      overage: s.is_overage,
      price: s.price,
      billing_status: s.billing_status
    })))
  } else {
    console.log('No recent lessons found.')
  }
}
run()
