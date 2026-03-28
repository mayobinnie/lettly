import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Server configuration error' })

  try {
    const client = createClient(url, serviceKey)
    const { data, error } = await client
      .from('portfolios')
      .select('data')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Load failed' })
    }

    return res.status(200).json({ data: data?.data || null })
  } catch (err) {
    console.error('Data load error:', err?.message)
    return res.status(500).json({ error: 'Internal error' })
  }
}
