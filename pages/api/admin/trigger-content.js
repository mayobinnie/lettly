import { getAuth } from '@clerk/nextjs/server'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const body = req.body
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lettly.co'

  try {
    const r = await fetch(`${appUrl}/api/agent-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ ...body, manual: true }),
    })
    const d = await r.json()
    return res.status(r.status).json(d)
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
