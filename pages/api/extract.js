import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from '@clerk/nextjs/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `You are a UK property management document reader. Extract all relevant information from this document and return ONLY a valid JSON object - no markdown, no explanation, no code fences.

Use this exact structure (omit any field you cannot find - do not guess):
{
  "documentType": "gas_certificate|eicr|insurance|epc_certificate|tenancy_agreement|mortgage_offer|completion_statement|other",
  "property": {
    "address": "full property address as written",
    "shortName": "short display name e.g. 7 Tower Hill Mews"
  },
  "compliance": {
    "gas": { "date": "DD/MM/YYYY", "due": "DD/MM/YYYY", "engineer": "name", "gasSafeNo": "number" },
    "eicr": { "date": "DD/MM/YYYY", "due": "DD/MM/YYYY", "result": "Satisfactory|Unsatisfactory" },
    "insurance": { "insurer": "name", "policyNumber": "number", "renewal": "DD/MM/YYYY", "type": "Landlord|Home|Other", "premium": 0 },
    "epc": { "rating": "A|B|C|D|E|F|G", "expiry": "DD/MM/YYYY", "score": 0 }
  },
  "tenancy": {
    "tenantName": "full name", "tenantPhone": "number", "tenantEmail": "email",
    "rent": 0, "depositAmount": 0, "depositScheme": "DPS Custodial|etc",
    "startDate": "DD/MM/YYYY", "endDate": "DD/MM/YYYY"
  },
  "finance": {
    "purchasePrice": 0, "mortgage": 0, "lender": "name",
    "rate": 0, "fixedEnd": "DD/MM/YYYY", "completionDate": "DD/MM/YYYY", "monthlyPayment": 0
  },
  "summary": "One plain-English sentence describing what this document is and the key detail found."
}

Return ONLY the JSON object. Nothing else.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { filename, data, mediaType } = req.body
  if (!data) return res.status(400).json({ error: 'No file data' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ success: false, error: 'API key not configured', filename })

  const isPDF = mediaType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf')

  try {
    const content = isPDF
      ? [{ type:'document', source:{ type:'base64', media_type:'application/pdf', data } }, { type:'text', text:PROMPT }]
      : [{ type:'image',    source:{ type:'base64', media_type:mediaType||'image/jpeg', data } }, { type:'text', text:PROMPT }]

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role:'user', content }],
    })

    const raw = response.content[0].text.replace(/```json|```/g, '').trim()
    let extracted
    try { extracted = JSON.parse(raw) }
    catch { extracted = { documentType:'other', property:{ address:'Unknown', shortName:filename?.replace('.pdf','')||'Document' }, summary:raw.slice(0,200) } }

    res.status(200).json({ success:true, extracted, filename })
  } catch (err) {
    const errorMsg = err?.error?.error?.message || err?.message || 'Could not read document'
    console.error('Extract error:', err?.status, errorMsg)
    res.status(500).json({ success:false, error:errorMsg, filename })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
