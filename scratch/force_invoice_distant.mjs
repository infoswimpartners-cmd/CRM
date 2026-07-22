import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const customerId = 'cus_U4HPd7r6e996Qo'
  const studentId = 'a1e15c53-b1a6-481c-81b1-6dcf05cf5a2e'
  const lessonId = '0631fed1-d315-4467-810e-96a5d040a245' // June 6th lesson

  // 1. Create Invoice Item for 3000 yen difference
  const item = await stripe.invoiceItems.create({
    customer: customerId,
    amount: 3000,
    currency: 'jpy',
    description: '追加レッスン料 (遠方オプション費差額分) (2026/06/06): 【単発】60分'
  })
  
  console.log('Created invoice item:', item.id)
  
  // 2. Create the Invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    collection_method: 'charge_automatically',
    description: '2026年6月分 レッスン料 遠方オプション差額分請求'
  })
  
  console.log('Created invoice:', invoice.id)
  
  // 3. Finalize and Pay
  let finalized = await stripe.invoices.finalizeInvoice(invoice.id)
  console.log('Finalized invoice:', finalized.id)
  
  try {
    const paid = await stripe.invoices.pay(finalized.id)
    console.log('Paid invoice:', paid.status)
    
    // 4. Update the DB for the June 6 lesson (price = 12000)
    await supabase.from('lesson_schedules').update({
      price: 12000
    }).eq('id', lessonId)
    
  } catch (err) {
    console.error('Payment failed:', err.message)
    // Still update the DB for the June 6 lesson
    await supabase.from('lesson_schedules').update({
      price: 12000
    }).eq('id', lessonId)
  }
  
  // 5. Update the default_transport_option_fee on the student
  await supabase.from('students').update({
    default_transport_option_fee: 3000
  }).eq('id', studentId)
  
  // 6. Update future unbilled lessons for this student to 12000 yen
  const { data: futureLessons } = await supabase.from('lesson_schedules')
     .select('id, start_time')
     .eq('student_id', studentId)
     .gt('start_time', '2026-06-07T00:00:00Z')
     
  if (futureLessons && futureLessons.length > 0) {
     console.log('Updating future lessons to 12000:', futureLessons.map(l => l.start_time))
     for (const fl of futureLessons) {
       await supabase.from('lesson_schedules').update({ price: 12000 }).eq('id', fl.id)
     }
  }
}
run()
