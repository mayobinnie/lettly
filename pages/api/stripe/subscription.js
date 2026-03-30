import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data } = await sb.from('subscriptions').select('*').eq('user_id', userId).single()

  if (!data) {
    return res.status(200).json({ subscription: { status: 'none', plan: null, maxProperties: 1, hmoAddon: false } })
  }

  return res.status(200).json({
    subscription: {
      status: data.status,
      plan: data.plan,
      maxProperties: data.max_properties || 2,
      hmoAddon: data.hmo_addon || false,
      currentPeriodEnd: data.current_period_end,
    }
  })
}
