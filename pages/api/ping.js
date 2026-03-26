import { getPortfolio } from '../../lib/supabase'

// Lightweight ping to keep Supabase free tier active
// Runs daily via Vercel cron - prevents 7-day inactivity pause
export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  try {
    // Tiny no-op query - just checks the connection is alive
    await getPortfolio('__ping__')
    return res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
