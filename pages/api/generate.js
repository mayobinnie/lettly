import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from '@clerk/nextjs/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { type, property, portfolio, extra } = req.body

  const prompts = {
    section8: `You are a UK landlord legal assistant. Draft a formal Section 8 Notice to Quit for the following property. Use clear, professional language. Include all required legal grounds. Format with proper headings.

Property: ${property?.address}
Tenant: ${property?.tenantName}
Rent: £${property?.rent}/month
Tenancy started: ${property?.tenancyStart}
Grounds: ${extra?.grounds || 'Ground 8 - Rent arrears of at least 2 months'}
Arrears amount: ${extra?.arrears || 'Not specified'}

Draft the full Section 8 Notice.`,

    inspection: `You are a UK property manager. Draft a professional property inspection report for:

Property: ${property?.address}
Tenant: ${property?.tenantName}
Inspection date: ${extra?.date || new Date().toLocaleDateString('en-GB')}
Inspector: ${extra?.inspector || 'Landlord'}
Condition notes: ${extra?.notes || 'General inspection'}

Create a structured inspection report with sections for: exterior, interior room by room, garden/outdoor, utilities, safety equipment, and summary. Include a condition rating scale.`,

    letter_rent_increase: `Draft a professional rent increase letter for a UK landlord to tenant.

Property: ${property?.address}
Tenant: ${property?.tenantName}
Current rent: £${property?.rent}/month
New rent: £${extra?.newRent}/month
Effective date: ${extra?.effectiveDate}

The letter should be polite, professional, reference the relevant notice period, and comply with the Renters Rights Bill periodic tenancy rules.`,

    letter_entry: `Draft a professional right of entry notice for a UK landlord.

Property: ${property?.address}
Tenant: ${property?.tenantName}
Proposed visit date: ${extra?.visitDate}
Reason: ${extra?.reason || 'Annual inspection'}

The letter should give correct notice (minimum 24 hours), be professional and courteous.`,

    section24_report: `You are a UK tax advisor specialising in property. Calculate the Section 24 mortgage interest tax impact for:

Portfolio properties (personal ownership):
${(portfolio?.properties || []).filter(p => p.ownership === 'Personal').map(p => `- ${p.shortName}: Mortgage £${p.mortgage}, Rate ${p.rate}%, Monthly payment £${p.monthlyPayment}, Rent £${p.rent}`).join('\n')}

Taxpayer rate: ${extra?.taxRate || '40'}% (higher rate)

Show:
1. Annual mortgage interest total
2. Old system: full deduction saving
3. New Section 24 system: 20% credit only
4. Extra tax paid per year
5. Equivalent monthly cost
6. Ltd Company comparison
7. Specific advice for this portfolio

Be specific with numbers.`
  }

  const prompt = prompts[type]
  if (!prompt) return res.status(400).json({ error: 'Unknown document type' })

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    res.status(200).json({ content: response.content[0].text })
  } catch (err) {
    console.error('Generate error:', err?.message)
    res.status(500).json({ error: err?.message || 'Could not generate document' })
  }
}
