import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_USER_ID = process.env.ADMIN_CLERK_USER_ID

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/(^-|-$)/g, '')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Auth: must be admin
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
    return res.status(403).json({ error: 'Admin only' })
  }

  const { itemId } = req.body || {}
  if (!itemId) return res.status(400).json({ error: 'itemId required' })

  const supabase = getSupabase()

  // 1. Fetch the content queue item
  const { data: item, error: fetchErr } = await supabase
    .from('content_queue')
    .select('*')
    .eq('id', itemId)
    .single()

  if (fetchErr || !item) {
    return res.status(404).json({ error: 'Item not found' })
  }

  if (item.type !== 'blog_post' && item.type !== 'seo_article') {
    return res.status(400).json({ error: 'Only blog posts can be published to the blog' })
  }

  // 2. Build slug - use existing or generate from title
  const slug = item.slug || slugify(item.title)

  // 3. Insert into blog_posts table
  const { error: insertErr } = await supabase
    .from('blog_posts')
    .upsert({
      slug,
      title: item.title,
      body: item.body,
      meta_description: item.meta_description || '',
      published_at: new Date().toISOString(),
      status: 'published',
      source_id: item.id,
    }, { onConflict: 'slug' })

  if (insertErr) {
    console.error('blog_posts insert error:', insertErr)
    return res.status(500).json({ error: 'Failed to insert blog post: ' + insertErr.message })
  }

  // 4. Mark the content queue item as published
  const { error: updateErr } = await supabase
    .from('content_queue')
    .update({
      status: 'published',
      slug,
      published_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (updateErr) {
    console.error('content_queue update error:', updateErr)
    // Non-fatal - blog post is live, just status badge is wrong
  }

  return res.status(200).json({ ok: true, slug })
}
