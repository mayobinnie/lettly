import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  if (req.method === 'GET') {
    // Get or create referral code for this user
    const { data: existing } = await sb.from('referrals').select('*').eq('referrer_id', userId).single()
    if (existing) {
      const { data: uses } = await sb.from('referrals').select('count').eq('referred_by', existing.code)
      return res.status(200).json({ code: existing.code, uses: uses?.[0]?.count || 0, credits: existing.credits || 0 })
    }
    // Create new code
    const code = 'LETTLY-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    const { data } = await sb.from('referrals').insert({ referrer_id: userId, code, credits: 0 }).select().single()
    return res.status(200).json({ code: data?.code, uses: 0, credits: 0 })
  }

  if (req.method === 'POST') {
    // Redeem a referral code on signup
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code required' })
    const { data: referral } = await sb.from('referrals').select('*').eq('code', code.toUpperCase()).single()
    if (!referral) return res.status(404).json({ error: 'Invalid code' })
    if (referral.referrer_id === userId) return res.status(400).json({ error: 'Cannot use your own code' })
    // Award credit to referrer
    await sb.from('referrals').update({ credits: (referral.credits || 0) + 1 }).eq('code', code.toUpperCase())
    // Mark this user as referred
    await sb.from('referrals').insert({ referrer_id: userId, referred_by: code.toUpperCase(), credits: 1 })
    return res.status(200).json({ ok: true, message: 'Referral applied - 1 free month added to your account' })
  }

  return res.status(405).end()
}
