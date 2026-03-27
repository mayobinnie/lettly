import { savePortfolio } from '../../lib/supabase'

// Called by navigator.sendBeacon on page unload
// Ensures data is saved even when user logs out or closes tab
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { userId, data } = JSON.parse(req.body)
    if (!userId || !data) return res.status(400).end()
    await savePortfolio(userId, data)
    return res.status(200).end()
  } catch (err) {
    console.error('Beacon save error:', err?.message)
    return res.status(500).end()
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }
