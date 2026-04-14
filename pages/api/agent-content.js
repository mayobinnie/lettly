import { getAuth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// AI Content Agent
// Triggered by: cron (weekly SEO), legislation monitor (on alert), or manual POST
// Drafts: blog posts, social captions, email blasts
// All drafts go to content_queue table for human approval before publishing

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

// ─── SEO blog topics to write about weekly ───────────────────────────────────
const SEO_TOPICS = [
  { title: 'How long does a gas safety certificate last?', keyword: 'gas safety certificate landlord UK', type: 'guide' },
  { title: 'Do I need an EICR for a rented property?', keyword: 'EICR rented property requirement landlord', type: 'guide' },
  { title: 'What is Section 24 tax and how does it affect landlords?', keyword: 'section 24 tax landlord UK', type: 'explainer' },
  { title: 'Renters Rights Act 2026: complete landlord guide', keyword: 'Renters Rights Act landlord guide England', type: 'guide' },
  { title: 'How to let a property without a letting agent', keyword: 'let property without letting agent UK', type: 'guide' },
  { title: 'Landlord compliance checklist England 2026', keyword: 'landlord compliance checklist England', type: 'checklist' },
  { title: 'EPC rating requirements for rented properties 2026', keyword: 'EPC rating rented property requirements', type: 'guide' },
  { title: 'Right to Rent checks: landlord guide', keyword: 'right to rent check landlord guide', type: 'guide' },
  { title: 'Deposit protection rules for UK landlords', keyword: 'deposit protection rules UK landlord', type: 'guide' },
  { title: 'HMO licence requirements explained', keyword: 'HMO licence requirements landlord UK', type: 'guide' },
  { title: 'Section 8 notice: how to serve it correctly', keyword: 'section 8 notice landlord how to serve', type: 'guide' },
  { title: 'Tenant Fees Act 2019: what landlords can and cannot charge', keyword: 'tenant fees act landlord charges UK', type: 'explainer' },
  { title: 'How to manage a rental property in Scotland', keyword: 'manage rental property Scotland landlord', type: 'guide' },
  { title: 'Welsh landlord obligations: Occupation Contracts explained', keyword: 'occupation contract Wales landlord guide', type: 'guide' },
  { title: 'Buy-to-let yield calculator: how to work out your return', keyword: 'buy to let yield calculation landlord', type: 'tool' },
]

async function draftBlogPost(topic, triggerSummary = null) {
  const isLegislation = !!triggerSummary

  const prompt = isLegislation
    ? `You are a UK property expert writing for Lettly, a landlord management platform.

A legislation alert has been detected: ${triggerSummary}

Write a timely, authoritative blog post for UK private landlords explaining:
1. What has changed
2. What it means practically for landlords
3. What they need to do and by when
4. How Lettly helps them stay compliant

Requirements:
- Title: punchy, specific, includes the key term
- 600-900 words
- UK English
- No jargon - write for a 50-year-old landlord with 1-3 properties
- End with a CTA: "Lettly tracks all of this automatically. Try free for 14 days at lettly.co"
- No em dashes anywhere
- Structure: intro paragraph, then H2 sections, then action steps

Return JSON only:
{
  "title": "...",
  "slug": "...",
  "meta_description": "...",
  "body": "full blog post in markdown",
  "tags": ["tag1", "tag2"],
  "instagram_caption": "Instagram post (max 2200 chars, no hashtags in body, add 5 relevant hashtags at end)",
  "linkedin_post": "LinkedIn post (professional tone, 150-200 words)"
}`
    : `You are a UK property expert writing for Lettly, a landlord management platform.

Write a comprehensive SEO blog post targeting the keyword: "${topic.keyword}"

Title: "${topic.title}"
Type: ${topic.type}

Requirements:
- 800-1200 words
- UK English, authoritative but accessible
- Written for UK private landlords aged 45-65 with 1-5 properties
- Naturally includes the target keyword 3-5 times
- Includes practical examples with real figures (e.g. typical costs, timescales)
- Structure: compelling intro, H2 subheadings, practical action steps
- End with: "Lettly helps landlords stay compliant automatically. Try free at lettly.co"
- No em dashes anywhere

Return JSON only:
{
  "title": "${topic.title}",
  "slug": "...",
  "meta_description": "155 chars max, includes keyword",
  "body": "full blog post in markdown",
  "tags": ["tag1", "tag2", "tag3"],
  "instagram_caption": "Instagram post (hook + value + CTA, max 300 words, 5 hashtags at end)",
  "linkedin_post": "LinkedIn post (data-led, professional, 150-200 words)"
}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }]
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock) return null

  const raw = textBlock.text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}


// ─── RRA Countdown post generator ─────────────────────────────────────────────
async function draftCountdownPost(daysLeft) {
  const prompt = `You are a UK property expert writing urgent social content for Lettly.

The Renters' Rights Act comes into force in ${daysLeft} days (1 May 2026). Section 21 no-fault evictions are abolished.

Write TWO posts for landlords who may not be ready:

1. An Instagram post: urgent hook about ${daysLeft} days left, 3 practical things to do NOW, CTA to check compliance at lettly.co. Max 250 words. 5 relevant hashtags at end. No em dashes.

2. A Facebook post: slightly longer, more explanatory tone. Same urgency. Practical steps. No em dashes.

Return JSON only:
{
  "instagram": "...",
  "facebook": "...",
  "title": "RRA Countdown: ${daysLeft} days to go"
}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content.find(b => b.type === 'text')?.text || ''
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch { return null }
}

// ─── Newsletter digest generator ──────────────────────────────────────────────
async function draftNewsletter(supabase) {
  // Get recent blog posts from last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, meta_description, slug, published_at')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(5)

  const postList = (posts || []).map(p => `- ${p.title}: ${p.meta_description}`).join('\n')

  const prompt = `You are writing a monthly newsletter for UK private landlords from Lettly.

Recent articles published this month:
${postList || 'General landlord compliance updates'}

Write a friendly, practical newsletter email:
- Subject line (compelling, under 60 chars)
- Preview text (under 90 chars)
- Hero headline
- 2-3 paragraph intro covering key themes this month
- Brief mentions of each article with link placeholders
- 1 practical landlord tip
- CTA to visit lettly.co
- Tone: knowledgeable peer, not corporate
- No em dashes

Return JSON only:
{
  "subject": "...",
  "preview": "...",
  "hero_headline": "...",
  "body": "full email body in plain text",
  "tip": "one practical landlord tip"
}`

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

// ─── Social posts from published blog ─────────────────────────────────────────
async function draftSocialFromBlog(supabase) {
  // Get most recently published post that doesn't have social content yet
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(3)

  if (!posts?.length) return []

  const post = posts[0]
  const prompt = `You are writing social media content for Lettly about this blog post:

Title: ${post.title}
Summary: ${post.meta_description}
URL: https://lettly.co/blog/${post.slug}

Write:
1. Instagram post: strong hook, key takeaway, CTA with URL. Max 200 words. 5 hashtags. No em dashes.
2. LinkedIn post: professional, data or insight led, 150 words. No em dashes.
3. Facebook post: conversational, practical, 100 words. No em dashes.
4. Tweet/X: under 280 chars including URL.

Return JSON only:
{
  "instagram": "...",
  "linkedin": "...",
  "facebook": "...",
  "tweet": "..."
}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content.find(b => b.type === 'text')?.text || ''
  try {
    const c = JSON.parse(text.replace(/```json|```/g, '').trim())
    return [
      { type: 'social_instagram', title: 'Instagram: ' + post.title, body: c.instagram, source: 'blog_post', urgency: 'LOW' },
      { type: 'social_linkedin', title: 'LinkedIn: ' + post.title, body: c.linkedin, source: 'blog_post', urgency: 'LOW' },
      { type: 'social_facebook', title: 'Facebook: ' + post.title, body: c.facebook, source: 'blog_post', urgency: 'LOW' },
      { type: 'social_twitter', title: 'X/Twitter: ' + post.title, body: c.tweet, source: 'blog_post', urgency: 'LOW' },
    ]
  } catch { return [] }
}

async function saveToQueue(supabase, items) {
  if (!items.length) return
  const { error } = await supabase.from('content_queue').insert(items)
  if (error) console.error('Queue insert error:', error.message)
}

export default async function handler(req, res) {
  // Auth check - require CRON_SECRET for all access
  const authHeader = req.headers.authorization
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  
  // Allow admin manual trigger with valid Clerk session
  const { userId } = getAuth(req)
  const ADMIN_USER_ID = process.env.ADMIN_CLERK_USER_ID
  const isAdmin = userId && ADMIN_USER_ID && userId === ADMIN_USER_ID

  if (!isCron && !isAdmin) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const supabase = getSupabase()
  const mode = req.body?.mode || 'seo' // 'seo' | 'legislation' | 'topic'
  const drafted = []
  const errors = []

  try {
    if (mode === 'legislation') {
      // Triggered by legislation monitor: draft from alert
      const { alertSummary, alertTopic, alertId } = req.body || {}
      if (!alertSummary) return res.status(400).json({ error: 'alertSummary required' })

      const content = await draftBlogPost(null, alertSummary)
      if (content) {
        const items = [
          {
            type: 'blog_post',
            status: 'draft',
            title: content.title,
            slug: content.slug,
            body: content.body,
            meta_description: content.meta_description,
            tags: content.tags,
            source: 'legislation_alert',
            source_id: alertId,
            urgency: 'HIGH',
            notes: `Auto-drafted from legislation alert: ${alertTopic}`
          },
          {
            type: 'social_instagram',
            status: 'draft',
            title: 'Instagram: ' + content.title,
            body: content.instagram_caption,
            source: 'legislation_alert',
            source_id: alertId,
            urgency: 'HIGH',
          },
          {
            type: 'social_linkedin',
            status: 'draft',
            title: 'LinkedIn: ' + content.title,
            body: content.linkedin_post,
            source: 'legislation_alert',
            source_id: alertId,
            urgency: 'HIGH',
          }
        ]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }

    } else if (mode === 'seo') {
      // Weekly SEO run: pick the next unwritten topic
      const existing = await supabase.from('content_queue')
        .select('title')
        .eq('type', 'blog_post')
        .eq('source', 'weekly_seo')

      const writtenTitles = (existing.data || []).map(r => r.title.toLowerCase())
      const remaining = SEO_TOPICS.filter(t => !writtenTitles.includes(t.title.toLowerCase()))

      // Write up to 2 topics per run
      const toWrite = remaining.slice(0, 2)

      for (const topic of toWrite) {
        try {
          const content = await draftBlogPost(topic)
          if (content) {
            const items = [
              {
                type: 'blog_post',
                status: 'draft',
                title: content.title,
                slug: content.slug,
                body: content.body,
                meta_description: content.meta_description,
                tags: content.tags,
                source: 'weekly_seo',
                urgency: 'LOW',
                notes: `SEO target: ${topic.keyword}`
              },
              {
                type: 'social_instagram',
                status: 'draft',
                title: 'Instagram: ' + content.title,
                body: content.instagram_caption,
                source: 'weekly_seo',
                urgency: 'LOW',
              },
              {
                type: 'social_linkedin',
                status: 'draft',
                title: 'LinkedIn: ' + content.title,
                body: content.linkedin_post,
                source: 'weekly_seo',
                urgency: 'LOW',
              }
            ]
            await saveToQueue(supabase, items)
            drafted.push(...items)
          }
          // Pause between topics
          await new Promise(r => setTimeout(r, 2000))
        } catch (topicErr) {
          errors.push(`${topic.title}: ${topicErr.message}`)
        }
      }

    } else if (mode === 'countdown') {
      // RRA countdown posts - run weekly until May 1st 2026
      const deadline = new Date('2026-05-01')
      const today = new Date()
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return res.status(200).json({ ok: true, message: 'RRA already in force' })

      const c = await draftCountdownPost(daysLeft)
      if (c) {
        const items = [
          { type: 'social_instagram', status: 'draft', title: c.title + ' (Instagram)', body: c.instagram, source: 'countdown', urgency: 'HIGH' },
          { type: 'social_facebook', status: 'draft', title: c.title + ' (Facebook)', body: c.facebook, source: 'countdown', urgency: 'HIGH' },
        ]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }

    } else if (mode === 'newsletter') {
      // Monthly newsletter digest
      const c = await draftNewsletter(supabase)
      if (c) {
        const items = [
          {
            type: 'email_blast',
            status: 'draft',
            title: c.subject,
            body: c.body,
            meta_description: c.preview,
            source: 'newsletter',
            urgency: 'MEDIUM',
            notes: 'Hero: ' + c.hero_headline + ' | Tip: ' + c.tip
          }
        ]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }

    } else if (mode === 'social_from_blog') {
      // Generate social posts from latest published blog post
      const items = await draftSocialFromBlog(supabase)
      if (items.length) {
        const withStatus = items.map(i => ({ ...i, status: 'draft' }))
        await saveToQueue(supabase, withStatus)
        drafted.push(...withStatus)
      }

    } else if (mode === 'topic') {
      // Manual topic: body contains { topicTitle, keyword }
      const { topicTitle, keyword } = req.body || {}
      if (!topicTitle) return res.status(400).json({ error: 'topicTitle required' })

      const content = await draftBlogPost({ title: topicTitle, keyword: keyword || topicTitle, type: 'guide' })
      if (content) {
        const items = [
          {
            type: 'blog_post',
            status: 'draft',
            title: content.title,
            slug: content.slug,
            body: content.body,
            meta_description: content.meta_description,
            tags: content.tags,
            source: 'manual',
            urgency: 'MEDIUM',
            notes: `Manual request: ${keyword || topicTitle}`
          },
          {
            type: 'social_instagram',
            status: 'draft',
            title: 'Instagram: ' + content.title,
            body: content.instagram_caption,
            source: 'manual',
            urgency: 'MEDIUM',
          },
          {
            type: 'social_linkedin',
            status: 'draft',
            title: 'LinkedIn: ' + content.title,
            body: content.linkedin_post,
            source: 'manual',
            urgency: 'MEDIUM',
          }
        ]
        await saveToQueue(supabase, items)
        drafted.push(...items)
      }
    }

    return res.status(200).json({
      ok: true,
      drafted: drafted.length,
      errors,
      message: `${drafted.length} items added to content queue`
    })

  } catch (err) {
    console.error('Agent error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}
