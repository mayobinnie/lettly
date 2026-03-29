import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// CRUD for content queue: admin only

const ADMIN_USER_ID = process.env.ADMIN_CLERK_USER_ID

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  // Only admin can access content queue
  if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
    return res.status(403).json({ error: 'Admin only' })
  }

  const supabase = getSupabase()

  if (req.method === 'GET') {
    const { status, type } = req.query
    let query = supabase.from('content_queue').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)
    const { data, error } = await query.limit(100)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ items: data || [] })
  }

  if (req.method === 'PATCH') {
    const { id, status, title, body, meta_description, slug, notes } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const update = { status }
    if (title !== undefined) update.title = title
    if (body !== undefined) update.body = body
    if (meta_description !== undefined) update.meta_description = meta_description
    if (slug !== undefined) update.slug = slug
    if (notes !== undefined) update.notes = notes
    if (status === 'approved') update.approved_at = new Date().toISOString()
    if (status === 'published') update.published_at = new Date().toISOString()
    const { error } = await supabase.from('content_queue').update(update).eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabase.from('content_queue').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
