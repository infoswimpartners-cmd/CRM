import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const now = new Date().toISOString()
  
  // 1. Reset June 21 to pending so overage-billing picks it up
  const { error } = await supabase
    .from('lesson_schedules')
    .update({ 
      billing_status: 'pending',
      billing_scheduled_at: now
    })
    .eq('id', 'ae60b2e7-5eb7-4e26-b4e4-633e3a263daf')
    
  if (error) {
    console.error('Update error:', error)
    return
  }
  
  console.log('Hitting overage-billing...')
  const res1 = await fetch('http://127.0.0.1:3000/api/cron/overage-billing')
  if (!res1.ok) {
     console.log('overage-billing failed via localhost, checking via APP_URL')
     const res1_alt = await fetch(process.env.NEXT_PUBLIC_APP_URL + '/api/cron/overage-billing')
     console.log('overage-billing response:', await res1_alt.json())
  } else {
     console.log('overage-billing response:', await res1.json())
  }
  
  console.log('Hitting batch-invoice...')
  const res2 = await fetch('http://127.0.0.1:3000/api/cron/batch-invoice', {
     headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
  })
  if (!res2.ok) {
     console.log('batch-invoice failed via localhost, checking via APP_URL')
     const res2_alt = await fetch(process.env.NEXT_PUBLIC_APP_URL + '/api/cron/batch-invoice', {
         headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
     })
     console.log('batch-invoice response:', await res2_alt.json())
  } else {
     console.log('batch-invoice response:', await res2.json())
  }
}
run()
