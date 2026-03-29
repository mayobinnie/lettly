import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await sb.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ expenses: data || [] })
  }

  if (req.method === 'POST') {
    const { propId, category, amount, date, description, receipt } = req.body
    if (!propId || !category || !amount) return res.status(400).json({ error: 'Missing required fields' })
    const { data, error } = await sb.from('expenses').insert({
      user_id: userId, prop_id: propId, category, amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      description, receipt_url: receipt
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ expense: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await sb.from('expenses').delete().eq('id', id).eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
