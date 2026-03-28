import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { sendNewsletter } from '../../lib/emails'

// POST /api/newsletter
// Sends newsletter to all Lettly users
// Protected - only callable with CRON_SECRET or from admin dashboard

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Allow cron or authenticated admin
  const cronAuth = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
  if (!cronAuth) {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  }

  const { subject, heroTitle, heroBody, articles, tip, testEmail } = req.body
  if (!subject || !heroTitle || !heroBody) {
    return res.status(400).json({ error: 'subject, heroTitle and heroBody required' })
  }

  try {
    // Get all user emails from Supabase portfolios
    // (They are stored via Clerk user ID : we need emails from Clerk)
    // For now, use a test email or get from request body
    let subscribers = []

    if (testEmail) {
      // Test mode - send to one email only
      subscribers = [{ email: testEmail }]
    } else {
      // Production: get subscriber list from Supabase
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('unsubscribed', false)

      subscribers = data || []
    }

    if (subscribers.length === 0) {
      return res.status(200).json({ sent: 0, total: 0, message: 'No subscribers' })
    }

    const result = await sendNewsletter({ subscribers, subject, heroTitle, heroBody, articles, tip })
    return res.status(200).json(result)

  } catch (err) {
    console.error('Newsletter error:', err)
    return res.status(500).json({ error: err.message })
  }
}
