
import { createClient } from '@supabase/supabase-js'

// Simplified trigger - uses fetch to agent-content but with correct internal URL pattern
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { mode } = req.body || {}
  if (!mode) return res.status(400).json({ error: 'mode required' })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Use Anthropic directly - avoids internal HTTP call issues
  let Anthropic
  try {
    Anthropic = (await import('@anthropic-ai/sdk')).default
  } catch(e) {
    return res.status(500).json({ error: 'Anthropic SDK not available: ' + e.message })
  }

  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function ask(prompt) {
    try {
      const r = await ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
      const text = r.content.find(b => b.type === 'text')?.text || ''
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch(e) {
      console.error('AI call failed:', e.message)
      return null
    }
  }

  async function save(items) {
    const { error } = await sb.from('content_queue').insert(
      items.map(i => ({ ...i, status: 'draft' }))
    )
    if (error) console.error('Save error:', error.message)
  }

  const drafted = []

  if (mode === 'countdown') {
    const daysLeft = Math.ceil((new Date('2026-05-01') - new Date()) / 86400000)
    if (daysLeft < 0) return res.status(200).json({ ok: true, message: 'RRA in force', drafted: 0 })

    const c = await ask('UK property expert writing for Lettly landlord platform. The Renters Rights Act (abolishes Section 21) comes into force in ' + daysLeft + ' days on 1 May 2026. Write urgent social content. No em dashes. Return JSON only: {"instagram":"hook + ' + daysLeft + ' days left + 3 action steps + lettly.co CTA + 5 hashtags, max 200 words","facebook":"same info, conversational, 150 words","title":"RRA: ' + daysLeft + ' days to go"}')

    if (c) {
      const items = [
        { type: 'social_instagram', title: c.title + ' (Instagram)', body: c.instagram, source: 'countdown', urgency: 'HIGH' },
        { type: 'social_facebook', title: c.title + ' (Facebook)', body: c.facebook, source: 'countdown', urgency: 'HIGH' },
      ]
      await save(items)
      drafted.push(...items)
    }

  } else if (mode === 'newsletter') {
    const since = new Date(Date.now() - 30*24*60*60*1000).toISOString()
    const { data: posts } = await sb.from('blog_posts').select('title,meta_description').gte('published_at', since).limit(4)
    const postList = (posts||[]).map(p => p.title).join(', ') || 'landlord compliance updates'

    const c = await ask('Write a short monthly newsletter email for UK private landlords from Lettly. Topics this month: ' + postList + '. Friendly peer tone. No em dashes. Return JSON only: {"subject":"compelling subject under 60 chars","preview":"preview text under 90 chars","body":"full email in plain text paragraphs"}')

    if (c) {
      await save([{ type: 'email_blast', title: c.subject, body: c.body, meta_description: c.preview, source: 'newsletter', urgency: 'MEDIUM' }])
      drafted.push({ type: 'email_blast' })
    }

  } else if (mode === 'social_from_blog') {
    const { data: posts } = await sb.from('blog_posts').select('*').order('published_at', { ascending: false }).limit(1)
    const post = posts?.[0]
    if (!post) return res.status(200).json({ ok: true, message: 'No posts published yet', drafted: 0 })

    const c = await ask('Write social posts for this Lettly blog article. Title: ' + post.title + '. Summary: ' + post.meta_description + '. URL: https://lettly.co/blog/' + post.slug + '. No em dashes. Return JSON only: {"instagram":"hook+value+CTA+5hashtags,max200words","linkedin":"professional150words","facebook":"conversational100words","tweet":"under280charsincludingURL"}')

    if (c) {
      const items = [
        { type: 'social_instagram', title: 'Instagram: ' + post.title, body: c.instagram, source: 'blog_post', urgency: 'LOW' },
        { type: 'social_linkedin', title: 'LinkedIn: ' + post.title, body: c.linkedin, source: 'blog_post', urgency: 'LOW' },
        { type: 'social_facebook', title: 'Facebook: ' + post.title, body: c.facebook, source: 'blog_post', urgency: 'LOW' },
      ]
      await save(items)
      drafted.push(...items)
    }

  } else if (mode === 'seo') {
    return res.status(200).json({ ok: false, message: 'SEO batch runs automatically on Wednesdays via cron' })
  }

  return res.status(200).json({ ok: true, drafted: drafted.length, message: drafted.length + ' items added to queue' })
}
