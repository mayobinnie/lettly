import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data } = await sb.from('subscriptions').select('stripe_customer_id').eq('user_id', userId).single()

  if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No subscription found' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lettly.co'
  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: appUrl + '/dashboard',
  })

  return res.status(200).json({ url: session.url })
}
