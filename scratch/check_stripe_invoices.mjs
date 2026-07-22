import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE, {
  apiVersion: '2023-10-16',
})

async function run() {
  const customerId = 'cus_TwkJGCWrDv0Sxb'
  console.log(`Fetching invoices for customer: ${customerId}`)
  
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 10
  })
  
  if (invoices.data.length === 0) {
    console.log('No invoices found.')
  } else {
    console.log('\n--- Invoices ---')
    console.table(invoices.data.map(inv => ({
      id: inv.id,
      amount: inv.total,
      status: inv.status,
      date: new Date(inv.created * 1000).toISOString(),
      paid: inv.paid,
      hosted_url: inv.hosted_invoice_url
    })))
  }
  
  const paymentIntents = await stripe.paymentIntents.list({
    customer: customerId,
    limit: 10
  })
  
  if (paymentIntents.data.length === 0) {
    console.log('No payment intents found.')
  } else {
    console.log('\n--- Payment Intents ---')
    console.table(paymentIntents.data.map(pi => ({
      id: pi.id,
      amount: pi.amount,
      status: pi.status,
      date: new Date(pi.created * 1000).toISOString(),
      description: pi.description
    })))
  }
}
run()
