import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from '@clerk/nextjs/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `You are a UK property management compliance expert. READ EVERY PAGE OF THIS DOCUMENT thoroughly. Extract ALL information relevant to property management and return ONLY a valid JSON object.

CRITICAL RULES:
- READ ALL PAGES — do not stop at page 1. Every page may contain critical compliance data, dates, or obligations.
- The property address is the ADDRESS BEING LET OR MANAGED — not the landlord's address, not the solicitor's, not an agent's office
- For completion statements, mortgage offers, tenancy agreements: property = the one being purchased/mortgaged/let
- For gas certs, EICRs, EPCs: property = where the work was carried out
- For insurance: property = the insured premises (not the policyholder's correspondence address)
- shortName MUST start with house number: "11 Northfield Avenue" not "Northfield Avenue"
- address MUST include full address with house number, street, town, postcode
- Extract EVERY date, certificate number, reference, name, amount — do not skip anything
- For compliance docs: extract engineer/inspector name, registration numbers, test results, observations, and any defects noted
- For tenancy agreements: extract ALL tenant names, ALL clauses about obligations, break clauses, permitted use
- For insurance: extract ALL covered risks, exclusions, excess amounts, and any special conditions
- For leases: extract lease length, ground rent, service charge, review dates, landlord covenants, tenant covenants
- Do not guess. Omit fields you cannot find. But look hard — the data is there across multiple pages.

Use this exact structure (omit any field you cannot find — but search ALL pages before omitting):
{
  "documentType": "gas_certificate|eicr|insurance|epc_certificate|tenancy_agreement|mortgage_offer|completion_statement|lease|section_notice|inventory|other",
  "property": {
    "address": "full property address as written in the document",
    "shortName": "short display name e.g. 11 Northfield Avenue",
    "uprn": "if present",
    "tenure": "Freehold|Leasehold|if stated"
  },
  "compliance": {
    "gas": {
      "date": "DD/MM/YYYY", "due": "DD/MM/YYYY", "engineer": "name",
      "gasSafeNo": "number", "appliances": ["list of appliances inspected"],
      "result": "Pass|Fail|Advisory", "defects": "any defects or advisories noted"
    },
    "eicr": {
      "date": "DD/MM/YYYY", "due": "DD/MM/YYYY",
      "result": "Satisfactory|Unsatisfactory", "inspector": "name",
      "circuits": "number of circuits tested", "observations": "C1/C2/C3 codes if listed"
    },
    "insurance": {
      "insurer": "name", "policyNumber": "number", "renewal": "DD/MM/YYYY",
      "type": "Landlord|Home|Other", "premium": 0,
      "cover": "buildings|contents|liability — list what is covered",
      "excess": 0, "sumInsured": 0, "exclusions": "any notable exclusions"
    },
    "epc": {
      "rating": "A|B|C|D|E|F|G", "expiry": "DD/MM/YYYY",
      "score": 0, "referenceNo": "if present",
      "recommendations": "key improvement recommendations if listed"
    }
  },
  "tenancy": {
    "tenantName": "full name(s) of all tenants",
    "tenantPhone": "number", "tenantEmail": "email",
    "landlordName": "full name", "landlordAddress": "address",
    "agentName": "if applicable",
    "rent": 0, "rentFrequency": "monthly|weekly",
    "depositAmount": 0, "depositScheme": "DPS Custodial|TDS|MyDeposits|etc",
    "depositRef": "scheme reference number",
    "startDate": "DD/MM/YYYY", "endDate": "DD/MM/YYYY",
    "breakClause": "terms if present",
    "noticeRequired": "weeks/months notice required",
    "permittedOccupants": "if specified",
    "keyObligations": "any critical tenant/landlord obligations noted"
  },
  "finance": {
    "purchasePrice": 0, "mortgage": 0, "lender": "name",
    "rate": 0, "rateType": "Fixed|Variable|Tracker",
    "fixedEnd": "DD/MM/YYYY", "completionDate": "DD/MM/YYYY",
    "monthlyPayment": 0, "term": "years",
    "ltv": 0, "accountNo": "if present"
  },
  "lease": {
    "leaseLength": "e.g. 125 years", "startDate": "DD/MM/YYYY",
    "expiryDate": "DD/MM/YYYY", "yearsRemaining": 0,
    "groundRent": 0, "groundRentReviewDate": "DD/MM/YYYY",
    "serviceCharge": 0, "managingAgent": "name",
    "freeholder": "name", "titleNumber": "e.g. HS292736"
  },
  "actions": [
    "List any action items, obligations, or deadlines found anywhere in the document"
  ],
  "keyDates": [
    { "label": "description of date", "date": "DD/MM/YYYY" }
  ],
  "rawNotes": "Any other important information found in the document that does not fit above fields",
  "summary": "2-3 sentences: what this document is, the property it relates to, and the most critical compliance/financial details found."
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
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{ role:'user', content }],
        })
        break
      } catch (retryErr) {
        if ((retryErr?.status === 529 || retryErr?.status === 529) && attempt < 2) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
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
