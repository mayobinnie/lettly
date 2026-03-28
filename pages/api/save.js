import { savePortfolio } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Handles two callers:
// 1. fetch() with JSON body (dashboard auto-save)
// 2. navigator.sendBeacon on page unload : sends raw JSON string
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { userId, data } = body || {}
    if (!userId || !data) return res.status(400).json({ error: 'Missing userId or data' })

    // Direct save with full error surfacing for debugging
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url) return res.status(500).json({ error: 'NEXT_PUBLIC_SUPABASE_URL not set' })
    if (!serviceKey && !anonKey) return res.status(500).json({ error: 'No Supabase key configured' })

    const client = createClient(url, serviceKey || anonKey)
    const { error } = await client
      .from('portfolios')
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return res.status(500).json({ error: error.message, code: error.code, hint: error.hint })
    }

    return res.status(200).json({ ok: true, keyUsed: serviceKey ? 'service' : 'anon' })
  } catch (err) {
    console.error('Save handler error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }
