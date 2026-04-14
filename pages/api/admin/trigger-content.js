import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// Admin-only content trigger - bypasses HTTP fetch to avoid internal 404
// Duplicates the core logic from agent-content.js directly

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

async function saveToQueue(supabase, items) {
  if (!items.length) return
  const { error } = await supabase.from('content_queue').insert(items)
  if (error) console.error('Queue insert error:', error.message)
}

async function callClaude(prompt) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })
  const text = response.content.find(b => b.type === 'text')?.text || ''
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const supabase = getSupabase()
  const { mode } = req.body || {}
  const drafted = []

  try {
    if (mode === 'countdown') {
      const deadline = new Date('2026-05-01')
      const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return res.status(200).json({ ok: true, message: 'RRA already in force', drafted: 0 })

      const c = await callClaude(`You are a UK property expert writing urgent social content for Lettly.

The Renters Rights Act comes into force in ${daysLeft} days (1 May 2026). Section 21 no-fault evictions are abolished.

Write TWO posts for landlords who may not be ready:

1. An Instagram post: urgent hook about ${daysLeft} days left, 3 practical things to do NOW, CTA to check compliance at lettly.co. Max 250 words. 5 relevant hashtags at end. No em dashes.

2. A Facebook post: slightly longer, more explanatory tone. Same urgency. Practical steps. No em dashes.

Return JSON only:
{
  "instagram": "...",
  "facebook": "...",
  "title": "RRA Countdown: ${daysLeft} days to go"
}`)

      if (c) {
        const items = [
          { type: 'social_instagram', status: 'draft', title: c.title + ' (Instagram)', body: c.instagram, source: 'countdown', urgency: 'HIGH' },
          { type: 'social_facebook', status: 'draft', title: c.title + ' (Facebook)', body: c.facebook, source: 'countdown', urgency: 'HIGH' },
        ]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }

    } else if (mode === 'newsletter') {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('title, meta_description, slug')
        .gte('published_at', since)
        .order('published_at', { ascending: false })
        .limit(5)

      const postList = (posts || []).map(p => `- ${p.title}: ${p.meta_description}`).join('\n') || 'General landlord compliance updates'

      const c = await callClaude(`You are writing a monthly newsletter for UK private landlords from Lettly.

Recent articles: ${postList}

Write a friendly newsletter email. No em dashes.
Return JSON only:
{
  "subject": "...",
  "preview": "...",
  "body": "full email body in plain text"
}`)

      if (c) {
        const items = [{ type: 'email_blast', status: 'draft', title: c.subject, body: c.body, meta_description: c.preview, source: 'newsletter', urgency: 'MEDIUM' }]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }

    } else if (mode === 'social_from_blog') {
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(1)

      const post = posts?.[0]
      if (!post) return res.status(200).json({ ok: true, message: 'No published posts yet', drafted: 0 })

      const c = await callClaude(`Write social media posts for this Lettly blog article:
Title: ${post.title}
Summary: ${post.meta_description}
URL: https://lettly.co/blog/${post.slug}

No em dashes. Return JSON only:
{
  "instagram": "hook + value + CTA + 5 hashtags, max 200 words",
  "linkedin": "professional, 150 words",
  "facebook": "conversational, 100 words",
  "tweet": "under 280 chars including URL"
}`)

      if (c) {
        const items = [
          { type: 'social_instagram', status: 'draft', title: 'Instagram: ' + post.title, body: c.instagram, source: 'blog_post', urgency: 'LOW' },
          { type: 'social_linkedin', status: 'draft', title: 'LinkedIn: ' + post.title, body: c.linkedin, source: 'blog_post', urgency: 'LOW' },
          { type: 'social_facebook', status: 'draft', title: 'Facebook: ' + post.title, body: c.facebook, source: 'blog_post', urgency: 'LOW' },
          { type: 'social_twitter', status: 'draft', title: 'X: ' + post.title, body: c.tweet, source: 'blog_post', urgency: 'LOW' },
        ]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }

    } else if (mode === 'seo') {
      // Trigger the actual cron via CRON_SECRET - this works from server side
      const r = await fetch('https://lettly.co/api/agent-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({ mode: 'seo', manual: true }),
      })
      const d = await r.json()
      return res.status(200).json(d)
    }

    return res.status(200).json({
      ok: true,
      drafted: drafted.length,
      message: `${drafted.length} items added to content queue`
    })

  } catch (err) {
    console.error('Trigger content error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}
