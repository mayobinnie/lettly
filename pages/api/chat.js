import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from '@clerk/nextjs/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(portfolio) {
  const props = portfolio?.properties || []

  let prompt = `You are Lettly AI - an expert UK property portfolio assistant with deep knowledge of UK landlord law, the Renters' Rights Bill, EPC requirements, Section 24 tax changes, and buy-to-let finance.

`

  if (props.length === 0) {
    prompt += `The user has not yet added any properties. Encourage them to drop documents to build their portfolio.\n\n`
  } else {
    prompt += `PORTFOLIO: ${props.length} propert${props.length === 1 ? 'y' : 'ies'}.\n\n`
    props.forEach((p, i) => {
      prompt += `PROPERTY ${i + 1}: ${p.shortName || p.address}\n`
      prompt += `  Address: ${p.address}\n`
      if (p.rent)             prompt += `  Rent: £${p.rent}/mo\n`
      if (p.mortgage)         prompt += `  Mortgage: £${p.mortgage}${p.lender ? ` (${p.lender})` : ''}\n`
      if (p.rate)             prompt += `  Rate: ${p.rate}%${p.fixedEnd ? ` fixed to ${p.fixedEnd}` : ''}\n`
      if (p.monthlyPayment)   prompt += `  Monthly payment: £${p.monthlyPayment}\n`
      if (p.purchasePrice)    prompt += `  Purchase price: £${p.purchasePrice}\n`
      if (p.tenantName)       prompt += `  Tenant: ${p.tenantName}${p.tenantPhone ? ` (${p.tenantPhone})` : ''}\n`
      if (p.depositAmount)    prompt += `  Deposit: £${p.depositAmount}${p.depositScheme ? ` - ${p.depositScheme}` : ''}\n`
      if (p.gasDue)           prompt += `  Gas cert due: ${p.gasDue}\n`
      if (p.eicrDue)          prompt += `  EICR due: ${p.eicrDue}\n`
      if (p.insurer)          prompt += `  Insurance: ${p.insurer}${p.policyNo ? ` (${p.policyNo})` : ''}${p.insuranceRenewal ? ` renews ${p.insuranceRenewal}` : ''}${p.insuranceType ? ` - ${p.insuranceType} policy` : ''}\n`
      prompt += '\n'
    })
  }

  prompt += `KEY LEGISLATION:
- Renters' Rights Bill: Section 21 (no-fault eviction) abolished from Oct 2026. All ASTs become periodic. PRS Database registration mandatory before serving any notice. Decent Homes Standard + Awaab's Law extended to PRS.
- EPC minimum C: Required for new tenancies from 2028, all tenancies from 2030. Properties rated D/E cannot be re-let without works.
- Section 24: Personal property owners get 20% basic rate mortgage interest credit only. Ltd Co gets full deduction.
- Deposit rules: Must be protected in approved scheme within 30 days. Prescribed information must be served.

Be concise, use actual figures from the portfolio where relevant, and clearly flag urgent compliance issues.`

  return prompt
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { messages, portfolio } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' })

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(portfolio),
      messages,
    })
    res.status(200).json({ content: response.content[0].text })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'AI request failed' })
  }
}
