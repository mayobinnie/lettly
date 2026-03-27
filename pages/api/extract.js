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

  // Rate limit: 20 extractions per user per day
  // Uses a simple in-memory store (resets on server restart - good enough for serverless)
  const today = new Date().toISOString().split('T')[0]
  const rateKey = `${userId}_${today}`
  if (!global._extractCounts) global._extractCounts = {}
  const count = global._extractCounts[rateKey] || 0
  if (count >= 20) {
    return res.status(429).json({
      success: false,
      error: 'Daily limit reached. You can extract up to 20 documents per day. This resets at midnight.',
      filename,
    })
  }
  global._extractCounts[rateKey] = count + 1
  // Clean up old keys to prevent memory leak
  Object.keys(global._extractCounts).forEach(k => { if (!k.includes(today)) delete global._extractCounts[k] })

  const { filename, data, mediaType } = req.body
  if (!data) return res.status(400).json({ error: 'No file data' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ success: false, error: 'API key not configured', filename })

  // Normalise media type - mediaType from client takes priority
  // PDF.js converts PDFs to JPEG before sending, so mediaType may be image/jpeg even for .pdf files
  const fname = filename?.toLowerCase() || ''
  
  // Trust the mediaType sent by client first (PDF.js may have converted PDF -> JPEG)
  let safeMediaType = mediaType
  if (!safeMediaType || safeMediaType === 'application/octet-stream') {
    // Fallback to filename detection
    if (fname.endsWith('.pdf')) safeMediaType = 'application/pdf'
    else if (fname.endsWith('.png')) safeMediaType = 'image/png'
    else if (fname.endsWith('.webp')) safeMediaType = 'image/webp'
    else if (fname.endsWith('.gif')) safeMediaType = 'image/gif'
    else safeMediaType = 'image/jpeg'
  }

  // isPDF only if the actual data is a PDF (not a converted image)
  const isPDF = safeMediaType === 'application/pdf'

  try {
    const content = isPDF
      ? [{ type:'document', source:{ type:'base64', media_type:'application/pdf', data } }, { type:'text', text:PROMPT }]
      : [{ type:'image',    source:{ type:'base64', media_type:safeMediaType, data } }, { type:'text', text:PROMPT }]

    // Retry up to 3 times on overload (529) or rate limit (529/529)
    let response
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 2048,
          messages: [{ role:'user', content }],
        })
        break
      } catch (retryErr) {
        if ((retryErr?.status === 529 || retryErr?.status === 529) && attempt < 2) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }
        throw retryErr
      }
    }

    const raw = response.content[0].text.replace(/```json|```/g, '').trim()
    let extracted
    try { extracted = JSON.parse(raw) }
    catch { extracted = { documentType:'other', property:{ address:'Unknown', shortName:filename?.replace('.pdf','')||'Document' }, summary:raw.slice(0,200) } }

    res.status(200).json({ success:true, extracted, filename })
  } catch (err) {
    const msg = err?.error?.error?.message || err?.message || ''
    console.error('Extract error:', err?.status, msg)
    // Give user a helpful message
    let userMsg = 'Could not read this document.'
    if (msg.includes('Could not process') || msg.includes('invalid') || msg.includes('corrupt') || msg.includes('not valid')) {
      userMsg = 'This file could not be read. Try re-saving it as a PDF and uploading again.'
    } else if (msg.includes('too large') || msg.includes('size')) {
      userMsg = 'This file is too large. Try compressing the PDF and uploading again.'
    } else if (msg.includes('Overloaded') || msg.includes('overloaded') || msg.includes('529')) {
      userMsg = 'AI service is busy right now. Please try again in a moment.'
    } else if (msg.includes('rate') || msg.includes('limit')) {
      userMsg = 'Too many requests. Please wait a moment and try again.'
    } else if (msg) {
      userMsg = msg
    }
    res.status(500).json({ success:false, error:userMsg, filename })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
