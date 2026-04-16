import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const ADMIN_USER_ID = process.env.ADMIN_CLERK_USER_ID

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// SEO keyword list for weekly batch
const SEO_KEYWORDS = [
  { title: 'How to evict a tenant legally in England 2026', keyword: 'how to evict a tenant UK' },
  { title: 'Renters Rights Act 2026: What landlords must do now', keyword: 'renters rights act 2026 landlords' },
  { title: 'Section 8 notice grounds: complete guide for landlords', keyword: 'section 8 notice grounds' },
  { title: 'HMO licence requirements England: the complete guide', keyword: 'HMO licence requirements England' },
  { title: 'EPC rating C requirement 2028: what landlords need to do', keyword: 'EPC C requirement landlords 2028' },
  { title: 'Buy-to-let mortgage rates 2026: landlord guide', keyword: 'buy to let mortgage rates 2026' },
  { title: 'Section 24 tax explained: how it affects landlords', keyword: 'section 24 tax landlords' },
  { title: 'Gas safety certificate requirements for landlords', keyword: 'gas safety certificate landlord requirements' },
  { title: 'Right to Rent checks: landlord guide 2026', keyword: 'right to rent checks landlord' },
  { title: 'Deposit protection schemes compared: DPS vs TDS vs mydeposits', keyword: 'deposit protection scheme comparison UK' },
  { title: 'EICR certificate: what landlords need to know', keyword: 'EICR certificate landlord requirements' },
  { title: 'Landlord insurance: what does it cover and do you need it?', keyword: 'landlord insurance UK guide' },
  { title: 'How to manage a buy-to-let property without a letting agent', keyword: 'self managing buy to let property' },
  { title: 'Private Residential Tenancy Scotland: landlord guide', keyword: 'private residential tenancy Scotland' },
  { title: 'Rent Smart Wales: registration guide for landlords', keyword: 'rent smart wales landlord registration' },
]

// RRA countdown: days until 1 May 2026
function getDaysUntilRRA() {
  const rra = new Date('2026-05-01')
  const now = new Date()
  return Math.max(0, Math.ceil((rra - now) / (1000 * 60 * 60 * 24)))
}

async function generateWithClaude(systemPrompt, userPrompt) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  return msg.content[0]?.text || ''
}

async function saveDraft(supabase, item) {
  const { error } = await supabase.from('content_queue').insert({
    title: item.title,
    body: item.body,
    type: item.type,
    status: 'draft',
    meta_description: item.meta_description || null,
    slug: item.slug || null,
    source: item.source || 'manual',
    urgency: item.urgency || 'MEDIUM',
    notes: item.notes || null,
    created_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// ── Mode handlers ───────────────────────────────────────────

async function handleTopic(supabase, topicTitle, keyword) {
  const system = `You are an expert UK property journalist writing for private landlords. 
Write detailed, accurate, practical blog posts about UK landlord law, compliance, finance and property management.
Always write for England unless the topic is specifically Scottish or Welsh.
Use UK spellings. Never use em dashes. Use plain English.
Output format: exactly three sections separated by ---
Section 1: The full blog post body (600-900 words, use ### for subheadings)
Section 2: A meta description (150-160 characters, include the keyword naturally)
Section 3: A URL slug (lowercase, hyphens only, 4-8 words)`

  const user = `Write a comprehensive, practical blog post for UK private landlords.
Title: ${topicTitle}
Target keyword: ${keyword || topicTitle}
Include: legal requirements, practical steps, deadlines, consequences of non-compliance.
Be specific. Use real dates, penalties and examples where possible.`

  const raw = await generateWithClaude(system, user)
  const parts = raw.split('---').map(p => p.trim())

  await saveDraft(supabase, {
    title: topicTitle,
    body: parts[0] || raw,
    meta_description: parts[1] || '',
    slug: parts[2] ? slugify(parts[2]) : slugify(topicTitle),
    type: 'blog_post',
    source: 'manual_topic',
    urgency: 'MEDIUM',
  })
  return { drafted: 1 }
}

async function handleSEO(supabase) {
  // Pick 2 random keywords from the list that haven't been drafted recently
  const { data: recent } = await supabase
    .from('content_queue')
    .select('title')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const recentTitles = new Set((recent || []).map(r => r.title))
  const available = SEO_KEYWORDS.filter(k => !recentTitles.has(k.title))
  const picks = available.sort(() => Math.random() - 0.5).slice(0, 2)
  if (!picks.length) return { drafted: 0, message: 'No new keywords available this week' }

  for (const pick of picks) {
    await handleTopic(supabase, pick.title, pick.keyword)
  }
  return { drafted: picks.length }
}

async function handleCountdown(supabase) {
  const days = getDaysUntilRRA()
  const rraDate = '1 May 2026'

  const posts = []

  // Blog post
  const blogSystem = `You are an expert UK landlord law journalist. Write clear, urgent, practical content for private landlords about the Renters Rights Act 2026. Use UK spellings. Never use em dashes.`
  const blogUser = `Write a blog post about the Renters Rights Act 2026 with a countdown angle.
Days until it comes into force: ${days} days (${rraDate}).
Cover: what Section 21 abolition means, new periodic tenancies, PRS database registration, Section 8 changes, what landlords must do before the deadline.
Format: 500-700 words. Use ### subheadings. Be urgent but practical.`

  const blogBody = await generateWithClaude(blogSystem, blogUser)
  posts.push({
    title: `Renters Rights Act 2026: ${days} days to go - your landlord checklist`,
    body: blogBody,
    type: 'blog_post',
    meta_description: `${days} days until the Renters Rights Act comes into force on ${rraDate}. Section 21 is abolished. Here is your complete landlord action checklist.`,
    slug: slugify('renters-rights-act-2026-countdown-' + days + '-days'),
    source: 'rra_countdown',
    urgency: days <= 30 ? 'HIGH' : 'MEDIUM',
  })

  // Instagram post
  const igUser = `Write an Instagram post for UK landlords about the Renters Rights Act countdown.
Days until enforcement: ${days} days.
Tone: urgent but informative. Use emojis. 3-5 short paragraphs. End with a call to action to visit lettly.co.
Include relevant hashtags at the end.`

  const igBody = await generateWithClaude(blogSystem, igUser)
  posts.push({
    title: `RRA countdown Instagram: ${days} days`,
    body: igBody,
    type: 'social_instagram',
    source: 'rra_countdown',
    urgency: days <= 30 ? 'HIGH' : 'MEDIUM',
  })

  // LinkedIn post
  const liUser = `Write a LinkedIn post for UK landlords about the Renters Rights Act.
Days until enforcement: ${days} days.
Tone: professional, informative. 150-250 words. Include key action points. End with a question to drive engagement.`

  const liBody = await generateWithClaude(blogSystem, liUser)
  posts.push({
    title: `RRA countdown LinkedIn: ${days} days`,
    body: liBody,
    type: 'social_linkedin',
    source: 'rra_countdown',
    urgency: days <= 30 ? 'HIGH' : 'MEDIUM',
  })

  // Facebook post
  const fbUser = `Write a Facebook post for UK landlords about the Renters Rights Act countdown.
Days until enforcement: ${days} days.
Tone: friendly, accessible, peer-to-peer. 100-150 words. Practical tips. Link mention to lettly.co at the end.`

  const fbBody = await generateWithClaude(blogSystem, fbUser)
  posts.push({
    title: `RRA countdown Facebook: ${days} days`,
    body: fbBody,
    type: 'social_facebook',
    source: 'rra_countdown',
    urgency: days <= 30 ? 'HIGH' : 'MEDIUM',
  })

  for (const post of posts) {
    await saveDraft(supabase, post)
  }
  return { drafted: posts.length }
}

async function handleNewsletter(supabase) {
  // Fetch the latest published blog posts to reference
  const { data: latestPosts } = await supabase
    .from('content_queue')
    .select('title, meta_description')
    .eq('type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  const postSummaries = (latestPosts || []).map(p => `- ${p.title}: ${p.meta_description || ''}`).join('\n')
  const days = getDaysUntilRRA()

  const system = `You are writing a monthly email newsletter for UK private landlords from Lettly (lettly.co). 
Tone: professional but friendly, peer-to-peer. UK spellings. Never use em dashes. Plain English.`

  const user = `Write a monthly landlord newsletter for ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.
Days until Renters Rights Act: ${days}.
Recent blog posts to reference:
${postSummaries || 'No recent posts yet.'}

Structure:
1. Opening (2-3 sentences, friendly greeting)
2. This month in landlord news (3-4 bullet points of current landlord legislation/market news)
3. RRA countdown section (practical reminder with ${days} days)
4. Lettly tip of the month (one practical property management tip)
5. Sign off

Keep to 400-500 words. Subject line on first line prefixed with SUBJECT: `

  const raw = await generateWithClaude(system, user)
  const lines = raw.split('\n')
  const subjectLine = lines.find(l => l.startsWith('SUBJECT:'))?.replace('SUBJECT:', '').trim() || `Landlord update - ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
  const body = lines.filter(l => !l.startsWith('SUBJECT:')).join('\n').trim()

  await saveDraft(supabase, {
    title: subjectLine,
    body,
    type: 'email_blast',
    source: 'monthly_newsletter',
    urgency: 'LOW',
    notes: `Newsletter for ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
  })
  return { drafted: 1 }
}

async function handleSocialFromBlog(supabase) {
  // Get the latest published blog post
  const { data: posts } = await supabase
    .from('content_queue')
    .select('title, body, meta_description, slug')
    .eq('type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)

  const post = posts?.[0]
  if (!post) return { drafted: 0, message: 'No published blog posts to generate socials from' }

  const system = `You are a social media manager for Lettly (lettly.co), a UK landlord property management platform. 
Tone matches each platform. UK spellings. Never use em dashes.`

  const socialPosts = [
    {
      type: 'social_instagram',
      user: `Write an Instagram post based on this blog post:
Title: ${post.title}
Summary: ${post.meta_description || ''}
Content excerpt: ${post.body?.slice(0, 500) || ''}

Tone: informative, engaging. 100-150 words + hashtags. Use emojis. End with "Read the full guide at lettly.co/blog"`,
    },
    {
      type: 'social_linkedin',
      user: `Write a LinkedIn post based on this blog post:
Title: ${post.title}
Summary: ${post.meta_description || ''}

Tone: professional. 150-200 words. Key insight from the article. End with a question. Mention lettly.co`,
    },
    {
      type: 'social_facebook',
      user: `Write a Facebook post based on this blog post:
Title: ${post.title}
Summary: ${post.meta_description || ''}

Tone: friendly, conversational. 80-120 words. Relatable to small landlords. Link to lettly.co/blog/${post.slug || ''}`,
    },
  ]

  for (const sp of socialPosts) {
    const body = await generateWithClaude(system, sp.user)
    await saveDraft(supabase, {
      title: `${post.title} - ${sp.type.replace('social_', '')} post`,
      body,
      type: sp.type,
      source: 'social_from_blog',
      urgency: 'LOW',
      notes: `Generated from: ${post.title}`,
    })
  }
  return { drafted: socialPosts.length }
}

// ── Main handler ─────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Auth check - must be admin or cron secret
  const cronSecret = req.headers['x-cron-secret']
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET

  if (!isValidCron) {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorised' })
    if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
      return res.status(403).json({ error: 'Admin only' })
    }
  }

  const supabase = getSupabase()
  const { mode, topicTitle, keyword, manual } = req.body || {}

  try {
    let result

    switch (mode) {
      case 'topic':
        if (!topicTitle) return res.status(400).json({ error: 'topicTitle required for topic mode' })
        result = await handleTopic(supabase, topicTitle, keyword)
        break
      case 'seo':
        result = await handleSEO(supabase)
        break
      case 'countdown':
        result = await handleCountdown(supabase)
        break
      case 'newsletter':
        result = await handleNewsletter(supabase)
        break
      case 'social_from_blog':
        result = await handleSocialFromBlog(supabase)
        break
      default:
        return res.status(400).json({ error: `Unknown mode: ${mode}` })
    }

    return res.status(200).json({
      ok: true,
      mode,
      ...result,
      message: result.message || `Done - ${result.drafted} draft${result.drafted !== 1 ? 's' : ''} added to content queue`,
    })
  } catch (err) {
    console.error('trigger-content error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
