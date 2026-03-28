import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Runs as a Vercel cron job every Monday at 8am UK time
// vercel.json already has: { "path": "/api/legislation-monitor", "schedule": "0 8 * * 1" }
// Also add CRON_SECRET to Vercel env vars for security

const MONITORED_TOPICS = [
  { id: 'rrb',       query: 'Renters Rights Act 2025 England commencement date implementation', urgencyDefault: 'HIGH' },
  { id: 'epc',       query: 'EPC minimum C energy efficiency private rented sector 2028 England Wales', urgencyDefault: 'HIGH' },
  { id: 'scotland',  query: 'Scotland private residential tenancy landlord law changes 2025 2026', urgencyDefault: 'MEDIUM' },
  { id: 'wales',     query: 'Renting Homes Wales Act Occupation Contracts landlord changes 2025 2026', urgencyDefault: 'MEDIUM' },
  { id: 'section24', query: 'Section 24 mortgage interest tax relief landlord UK 2025', urgencyDefault: 'MEDIUM' },
  { id: 'deposit',   query: 'tenancy deposit scheme rules changes UK landlord 2025', urgencyDefault: 'LOW' },
  { id: 'prs_db',    query: 'Private Rented Sector Database registration England landlord 2026', urgencyDefault: 'HIGH' },
  { id: 'awaab',     query: "Awaab's Law private rented sector implementation date 2026", urgencyDefault: 'MEDIUM' },
]

// URLs to check directly for official announcements
const GOV_SOURCES = [
  'https://www.gov.uk/government/collections/renters-reform-bill',
  'https://www.legislation.gov.uk/ukpga/2025',
]

export default async function handler(req, res) {
  // Allow GET for manual testing, require auth for automated cron
  const isManual = req.method === 'GET'
  const authHeader = req.headers.authorization
  if (!isManual && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const today = new Date().toLocaleDateString('en-GB')
  const alerts = []

  try {
    // Use Claude with web search tool to check each topic
    for (const topic of MONITORED_TOPICS) {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          tools: [{
            type: 'web_search_20250305',
            name: 'web_search',
          }],
          messages: [{
            role: 'user',
            content: `Search the web for recent UK government announcements about: "${topic.query}"
            
Focus on GOV.UK, parliamentary news, and official sources from the last 30 days.

Return a JSON object only:
{
  "status": "CHANGED" | "PENDING_CHANGE" | "NO_CHANGE",
  "summary": "one sentence describing any change or announcement found, or null",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "source": "URL of the most relevant source found, or null"
}

If nothing significant found in the last 30 days, return NO_CHANGE with null summary.
Return ONLY the JSON object, nothing else.`
          }]
        })

        // Extract text from response (may include tool use blocks)
        const textBlock = response.content.find(b => b.type === 'text')
        if (!textBlock) continue

        const raw = textBlock.text.replace(/```json|```/g, '').trim()
        let result
        try { result = JSON.parse(raw) } catch { continue }

        if (result.status === 'CHANGED' || result.status === 'PENDING_CHANGE') {
          alerts.push({
            topic: topic.query,
            topicId: topic.id,
            status: result.status,
            summary: result.summary,
            urgency: result.urgency || topic.urgencyDefault,
            source: result.source,
            checked_at: new Date().toISOString(),
            actioned: false,
          })
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1000))

      } catch (topicErr) {
        console.error(`Error checking topic ${topic.id}:`, topicErr?.message)
      }
    }

    // Save alerts to Supabase
    if (alerts.length > 0 && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )
      const { error } = await supabase
        .from('legislation_alerts')
        .insert(alerts.map(a => ({
          topic: a.topic,
          status: a.status,
          summary: a.summary,
          urgency: a.urgency,
          checked_at: a.checked_at,
          actioned: false,
        })))
      if (error) console.error('Supabase insert error:', error.message)
    }

    // Log a "checked" record even if no changes, so we know it ran
    console.log(`Legislation monitor ran: ${MONITORED_TOPICS.length} topics checked, ${alerts.length} alerts`)

    return res.status(200).json({
      checked: MONITORED_TOPICS.length,
      changes: alerts.length,
      alerts,
      checkedAt: today,
      note: alerts.length === 0 ? 'No significant changes found this week' : `${alerts.length} alert(s) saved to dashboard`,
    })

  } catch (err) {
    console.error('Legislation monitor error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}
