import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, full_name, stripe_customer_id, stripe_subscription_id, membership_types!students_membership_type_id_fkey(name)')
    .eq('full_name', '木村響翔')
    
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
  
  const { data: billings, error: bErr } = await supabase
    .from('billings')
    .select('*')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    
  if (bErr) {
    console.error('Error fetching billings:', bErr)
  } else {
    console.log('\n--- Billings (Recent) ---')
    console.table(billings.map(b => ({
      id: b.id,
      amount: b.amount,
      status: b.status,
      created_at: b.created_at,
      payment_date: b.payment_date,
      stripe_invoice_id: b.stripe_invoice_id,
      memo: b.memo
    })))
  }
  
  const { data: invoiceItems, error: iErr } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    
  if (iErr) {
    console.error('Error fetching invoice items:', iErr)
  } else {
    console.log('\n--- Invoice Items ---')
    console.table(invoiceItems.map(i => ({
      id: i.id,
      billing_id: i.billing_id,
      amount: i.amount,
      description: i.description,
      type: i.type,
      created_at: i.created_at
    })))
  }
}
run()
