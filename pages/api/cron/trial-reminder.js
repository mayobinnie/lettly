import { createClient } from '@supabase/supabase-js'
import { sendTrialReminderEmail } from '../../../lib/emails'

// Runs daily - finds users on day 10 of trial (4 days left) with no active subscription
// Trigger: curl -H "Authorization: Bearer $CRON_SECRET" https://lettly.co/api/cron/trial-reminder
// Or add to Vercel cron jobs in vercel.json

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Find portfolios created exactly 10 days ago
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setDate(dayStart.getDate() - 10)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: portfolios, error } = await sb
    .from('portfolios')
    .select('user_id, created_at, data')
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString())

  if (error) return res.status(500).json({ error: error.message })
  if (!portfolios?.length) return res.status(200).json({ sent: 0, message: 'No users on day 10 today' })

  // Skip users who already have an active subscription
  const { data: subs } = await sb
    .from('subscriptions')
    .select('user_id, status')
    .in('user_id', portfolios.map(p => p.user_id))
    .in('status', ['active', 'trialing'])

  const subscribedIds = new Set((subs || []).map(s => s.user_id))
  const toRemind = portfolios.filter(p => !subscribedIds.has(p.user_id))

  if (!toRemind.length) return res.status(200).json({ sent: 0, message: 'All day-10 users already subscribed' })

  // Get emails from Clerk API and send
  let sent = 0
  const errors = []

  for (const portfolio of toRemind) {
    try {
      // Fetch user from Clerk
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${portfolio.user_id}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
      })
      if (!clerkRes.ok) throw new Error(`Clerk ${clerkRes.status}`)
      const clerkUser = await clerkRes.json()

      const email = clerkUser.email_addresses?.[0]?.email_address
      const name = clerkUser.first_name || email?.split('@')[0] || 'there'

      if (email) {
        const result = await sendTrialReminderEmail({ email, name, daysLeft: 4 })
        if (result.ok) {
          sent++
          console.log(`Trial reminder sent to ${email}`)
        } else {
          errors.push({ email, error: result.data })
        }
      }
    } catch (e) {
      errors.push({ userId: portfolio.user_id, error: e.message })
      console.error('Trial reminder error:', e.message)
    }
  }

  return res.status(200).json({ sent, total: toRemind.length, errors: errors.length ? errors : undefined })
}
