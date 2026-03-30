import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    const chunks = []
  for await (const chunk of req) { chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk) }
  const buf = Buffer.concat(chunks)
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook error:', err.message)
    return res.status(400).json({ error: 'Webhook error: ' + err.message })
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  async function upsertSubscription(subscription) {
    const userId = subscription.metadata?.userId
    if (!userId) return

    const plan = subscription.metadata?.plan || 'starter'
    const hmoAddon = subscription.metadata?.hmoAddon === 'true'
    const maxProps = { starter: 2, standard: 5, portfolio: 10, pro: 999 }[plan] || 2

    await sb.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan,
      hmo_addon: hmoAddon,
      max_properties: maxProps,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription)
        sub.metadata = { ...sub.metadata, ...session.metadata }
        await upsertSubscription(sub)
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await upsertSubscription(event.data.object)
      break

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (userId) {
        await sb.from('subscriptions').update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription)
        const userId = sub.metadata?.userId
        if (userId) {
          await sb.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId)
        }
      }
      break
    }
  }

  return res.status(200).json({ received: true })
}
