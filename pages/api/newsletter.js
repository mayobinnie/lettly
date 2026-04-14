// Monthly newsletter draft cron - runs 1st of each month
export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lettly.co'
  const r = await fetch(`${appUrl}/api/agent-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ mode: 'newsletter', manual: false }),
  })
  const d = await r.json()
  return res.status(200).json(d)
}
