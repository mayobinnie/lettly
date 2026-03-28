import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Auth check - ALWAYS verify from Clerk session, never trust request body
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { data } = body || {}
    if (!data) return res.status(400).json({ error: 'Missing data' })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!url || !serviceKey) return res.status(500).json({ error: 'Server configuration error' })

    const client = createClient(url, serviceKey)
    const { error } = await client
      .from('portfolios')
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return res.status(500).json({ error: 'Save failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Save handler error:', err?.message)
    return res.status(500).json({ error: 'Internal error' })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }
