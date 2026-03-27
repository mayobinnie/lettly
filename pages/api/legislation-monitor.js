import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// This runs as a Vercel cron job every Monday at 8am
// Add to vercel.json: { "crons": [{ "path": "/api/legislation-monitor", "schedule": "0 8 * * 1" }] }

const MONITORED_TOPICS = [
  'Renters Rights Act 2025 England implementation updates',
  'EPC minimum C requirement 2028 England Wales updates',
  'Scottish Private Residential Tenancy law changes',
  'Renting Homes Wales Act updates',
  'UK landlord legislation changes',
  'Section 24 mortgage interest tax UK landlord',
]

export default async function handler(req, res) {
  // Verify this is called by Vercel cron (or manually by admin)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const today = new Date().toLocaleDateString('en-GB')
    const prompt = `You are a UK property law monitor. Today is ${today}.

Review the following UK landlord legislation topics and identify any significant changes, announcements, or developments that have occurred in the past 7 days:

${MONITORED_TOPICS.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For each topic, respond with:
- Status: CHANGED, PENDING_CHANGE, or NO_CHANGE
- Summary: one sentence if changed, otherwise skip
- Urgency: HIGH, MEDIUM, or LOW if changed

Format as JSON array:
[{"topic": "...", "status": "...", "summary": "...", "urgency": "...", "date": "${today}"}]

Base your response on your knowledge up to your training cutoff. If you are uncertain about recent changes, mark as NO_CHANGE.
Return ONLY the JSON array.`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].text.replace(/```json|```/g, '').trim()
    let updates = []
    try { updates = JSON.parse(raw) } catch { updates = [] }

    const changed = updates.filter(u => u.status === 'CHANGED' || u.status === 'PENDING_CHANGE')

    // Save to Supabase if changes found
    if (changed.length > 0 && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      await supabase.from('legislation_alerts').insert(
        changed.map(u => ({
          topic: u.topic,
          status: u.status,
          summary: u.summary,
          urgency: u.urgency,
          checked_at: new Date().toISOString(),
          actioned: false,
        }))
      )
    }

    return res.status(200).json({
      checked: updates.length,
      changes: changed.length,
      alerts: changed,
      checkedAt: today,
    })
  } catch (err) {
    console.error('Legislation monitor error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}
