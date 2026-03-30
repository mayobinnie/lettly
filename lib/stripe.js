import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

// Plan definitions - match these to your Stripe product IDs after creating them
export const PLANS = {
  starter:   { name: 'Starter',   price: 8,  maxProps: 2,  stripePriceId: process.env.STRIPE_PRICE_STARTER },
  standard:  { name: 'Standard',  price: 16, maxProps: 5,  stripePriceId: process.env.STRIPE_PRICE_STANDARD },
  portfolio: { name: 'Portfolio', price: 28, maxProps: 10, stripePriceId: process.env.STRIPE_PRICE_PORTFOLIO },
  pro:       { name: 'Pro',       price: 40, maxProps: 999,stripePriceId: process.env.STRIPE_PRICE_PRO },
}

export const HMO_ADDON = {
  name: 'HMO Suite',
  price: 12.50,
  stripePriceId: process.env.STRIPE_PRICE_HMO_ADDON,
}

// How many properties is this user allowed?
export function getPlanLimits(subscription) {
  if (!subscription || subscription.status !== 'active') {
    return { maxProps: 1, hmo: false, plan: 'trial' }
  }
  const planKey = subscription.plan
  const plan = PLANS[planKey] || PLANS.starter
  return {
    maxProps: plan.maxProps,
    hmo: !!subscription.hmoAddon,
    plan: planKey,
  }
}

// Is the user in a valid paid or trial state?
export function canAccess(subscription) {
  if (!subscription) return false
  return ['active', 'trialing'].includes(subscription.status)
}
