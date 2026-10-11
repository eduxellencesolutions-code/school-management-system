require('dotenv').config({ path: '.env.local' })

async function paystack() {
  const r = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'usd-check@eduxellence-test.invalid',
      amount: 500,
      currency: 'USD',
      reference: `usdcheck-ps-${Date.now()}`,
    }),
  })
  const j = await r.json()
  console.log('Paystack USD:', j.status ? 'ACCEPTED (not paid)' : `REJECTED: ${j.message}`)
}

async function flutterwave() {
  const r = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: `usdcheck-flw-${Date.now()}`,
      amount: 5,
      currency: 'USD',
      redirect_url: 'https://example.com',
      customer: { email: 'usd-check@eduxellence-test.invalid' },
    }),
  })
  const j = await r.json()
  console.log('Flutterwave USD:', j.status === 'success' ? 'ACCEPTED (not paid)' : `REJECTED: ${j.message}`)
}

paystack().then(flutterwave)