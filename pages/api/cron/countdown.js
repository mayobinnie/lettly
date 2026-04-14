// Weekly RRA countdown cron - runs every Tuesday until May 1st 2026
export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end()

  const deadline = new Date('2026-05-01')
  const today = new Date()
  const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) return res.status(200).json({ ok: true, message: 'RRA already in force' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lettly.co'
  const r = await fetch(`${appUrl}/api/agent-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ mode: 'countdown', manual: false }),
  })
  const d = await r.json()
  return res.status(200).json(d)
}
