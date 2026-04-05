import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

const PRICES = {
  starter:     process.env.STRIPE_PRICE_STARTER,
  standard:    process.env.STRIPE_PRICE_STANDARD,
  portfolio:   process.env.STRIPE_PRICE_PORTFOLIO,
  pro:         process.env.STRIPE_PRICE_PRO,
  agency:      process.env.STRIPE_PRICE_AGENCY,
  hmo_addon:   process.env.STRIPE_PRICE_HMO_ADDON,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { plan, addHmo, email } = req.body
  if (!plan || !PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const { data: existing } = await sb.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).single()
  let customerId = existing?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { userId },
    })
    customerId = customer.id
    await sb.from('subscriptions').upsert({ user_id: userId, stripe_customer_id: customerId, status: 'incomplete', plan })
  }

  const lineItems = [{ price: PRICES[plan], quantity: 1 }]
  if (addHmo && PRICES.hmo_addon) {
    lineItems.push({ price: PRICES.hmo_addon, quantity: 1 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lettly.co'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: lineItems,
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId, plan, hmoAddon: addHmo ? 'true' : 'false' },
    },
    success_url: appUrl + '/dashboard?subscribed=1',
    cancel_url: appUrl + '/#pricing',
    allow_promotion_codes: true,
  })

  return res.status(200).json({ url: session.url })
}
