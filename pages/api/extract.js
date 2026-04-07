import Anthropic from '@anthropic-ai/sdk'
import { getAuth } from '@clerk/nextjs/server'

// Simple rate limit: max 10 AI requests per user per minute
const rateLimitMap = new Map()
function checkRateLimit(userId) {
  const now = Date.now()
  const key = userId
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + 60000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000 }
  entry.count++
  rateLimitMap.set(key, entry)
  return entry.count <= 10
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `You are a UK property management compliance expert. READ EVERY PAGE OF THIS DOCUMENT thoroughly before extracting anything. Return ONLY a valid JSON object: no markdown, no explanation, no commentary.

═══ PROPERTY ADDRESS: READ THIS CAREFULLY ═══
The property address is WHERE THE WORK WAS DONE or WHERE THE TENANCY IS: not the landlord address, not the agent address, not the solicitor address.
- Gas cert / EICR / EPC: the address of the property inspected (printed at the top of the certificate)
- Tenancy agreement: the property being rented (not the landlord correspondence address)
- Insurance: the insured premises address (not the policyholder postal address)
- Mortgage / completion: the property being purchased or mortgaged

HOUSE NUMBER RULES (critical: read character by character):
- "3", "11" and "31" are COMPLETELY DIFFERENT properties on the same street
- Copy the house number digit-by-digit from the document. Never guess.
- Page numbers, clause numbers, reference numbers are NOT house numbers
- If a document mentions both "11 Northfield Avenue" (the property) and "3 Elm Street" (the landlord's home), the property field must be "11 Northfield Avenue"
- shortName MUST start with the house number: "11 Northfield Avenue" not "Northfield Avenue"
- If you cannot find a house number, omit the property field entirely

INVALID property names: NEVER use these as shortName:
Rental Contract, Tenancy Agreement, Lease, Document, Contract, Mortgage, Unknown, Not stated, Insurance, Gas Certificate, EICR, EPC, Report, Form, Certificate, Deed, Notice, Section, Schedule

═══ DOCUMENT-SPECIFIC EXTRACTION RULES ═══

GAS SAFETY CERTIFICATE:
- "date of inspection" = gas.date (when the engineer visited)
- "next inspection due" or "valid until" = gas.due (12 months after inspection date)
- If "due" date is not printed, calculate it: gas.date + 12 months
- Engineer name and Gas Safe registration number must both be extracted
- List every appliance inspected (boiler, hob, fire, etc)
- Result: Immediately Dangerous (ID) = Fail, At Risk (AR) = Fail, Not to Current Standard (NCS) = Advisory, all satisfactory = Pass

EICR (ELECTRICAL INSTALLATION CONDITION REPORT):
- Date of inspection = eicr.date
- Next inspection due = eicr.due (usually 5 years after inspection)
- If "due" not printed, calculate: eicr.date + 5 years
- Result must be exactly "Satisfactory" or "Unsatisfactory"
- Extract all C1, C2, C3, FI observations if listed

EPC (ENERGY PERFORMANCE CERTIFICATE):
- Current energy rating = single letter A B C D E F G: extract the CURRENT rating not the potential rating
- Valid until / expiry date = epc.expiry
- EPC reference number if shown

TENANCY AGREEMENT:
- Tenant = the person PAYING rent and LIVING there (labelled "The Tenant", "Lessee", "Contract-Holder")
- Landlord = the person RECEIVING rent (labelled "The Landlord", "Lessor", "Licensor")
- NEVER put the landlord name in tenantName. NEVER put the tenant name in landlordName.
- rent = the monthly (or weekly) amount in £ as a NUMBER only (e.g. 850, not "£850 per month")
- rentFrequency = "monthly" or "weekly"
- depositAmount = the deposit in £ as a NUMBER only
- startDate = tenancy commencement date DD/MM/YYYY
- Extract the deposit scheme name exactly as written (DPS, TDS, MyDeposits, SafeDeposits Scotland, etc)

INSURANCE POLICY:
- insurer = the insurance company name (not the broker)
- policyNumber = the policy reference number
- type = the type of insurance: output exactly one of: "Landlord", "Buildings", "Home", "Contents", "Other"
- renewal = the renewal / expiry date DD/MM/YYYY
- startDate = the policy start date DD/MM/YYYY
- premium = annual premium as a NUMBER in £
- sumInsured = total buildings sum insured as a NUMBER in £
- excess = the standard excess as a NUMBER in £
- Read EVERY PAGE for exclusions: they are often on later pages
- unoccupancyClause = exact wording of any clause about unoccupied properties

MORTGAGE OFFER / COMPLETION STATEMENT:
- mortgage = the loan amount as a NUMBER in £
- rate = interest rate as a NUMBER (e.g. 4.5 not "4.5%")
- fixedEnd = the date the fixed rate ends DD/MM/YYYY
- monthlyPayment = monthly payment amount as a NUMBER in £
- lender = the bank or building society name
- completionDate = the completion date DD/MM/YYYY

═══ NUMBER FORMATTING RULES ═══
All monetary amounts must be NUMBERS not strings:
- rent: 850 (not "£850" not "850 per month")
- depositAmount: 1200 (not "£1,200")
- mortgage: 150000 (not "£150,000")
- premium: 450 (not "£450.00")
All dates must be DD/MM/YYYY format.
If a value is not found, omit the field entirely: do not use null, 0, or "unknown".

═══ JSON STRUCTURE ═══
{
  "documentType": "gas_certificate|eicr|insurance|epc_certificate|tenancy_agreement|mortgage_offer|completion_statement|lease|section_notice|inventory|other",
  "property": {
    "address": "full address exactly as printed in document",
    "shortName": "e.g. 11 Northfield Avenue: starts with house number",
    "postcode": "postcode extracted separately for matching accuracy",
    "uprn": "if present",
    "tenure": "Freehold|Leasehold|if stated"
  },
  "compliance": {
    "gas": {
      "date": "DD/MM/YYYY",
      "due": "DD/MM/YYYY",
      "engineer": "full name",
      "gasSafeNo": "registration number",
      "appliances": ["boiler model", "gas hob", "etc"],
      "result": "Pass|Fail|Advisory",
      "defects": "any ID/AR/NCS observations"
    },
    "eicr": {
      "date": "DD/MM/YYYY",
      "due": "DD/MM/YYYY",
      "result": "Satisfactory|Unsatisfactory",
      "inspector": "name",
      "circuits": "number tested",
      "observations": "C1/C2/C3 codes"
    },
    "insurance": {
      "insurer": "company name",
      "policyNumber": "reference",
      "renewal": "DD/MM/YYYY",
      "startDate": "DD/MM/YYYY",
      "type": "Landlord|Home|Other",
      "premium": 0,
      "sumInsured": 0,
      "buildingsSum": 0,
      "liabilitySum": 0,
      "excess": 0,
      "lossOfRentCover": 0,
      "lossOfRentPeriod": "e.g. 12 months",
      "legalExpensesCover": 0,
      "emergencyCover": "yes/no and detail",
      "floodCover": "yes/no",
      "unoccupancyClause": "exact clause wording",
      "exclusions": "all exclusions listed",
      "broker": "broker name if different from insurer"
    },
    "epc": {
      "rating": "A|B|C|D|E|F|G",
      "expiry": "DD/MM/YYYY",
      "score": 0,
      "referenceNo": "if present"
    }
  },
  "tenancy": {
    "tenantName": "tenant full name(s): the person paying rent",
    "tenantPhone": "number",
    "tenantEmail": "email",
    "landlordName": "landlord full name: the person receiving rent",
    "landlordAddress": "landlord address",
    "agentName": "if applicable",
    "rent": 0,
    "rentFrequency": "monthly|weekly",
    "depositAmount": 0,
    "depositScheme": "DPS Custodial|TDS|MyDeposits|SafeDeposits Scotland|etc",
    "depositRef": "scheme reference",
    "startDate": "DD/MM/YYYY",
    "endDate": "DD/MM/YYYY",
    "breakClause": "terms if present",
    "noticeRequired": "notice period"
  },
  "finance": {
    "purchasePrice": 0,
    "mortgage": 0,
    "lender": "name",
    "rate": 0,
    "rateType": "Fixed|Variable|Tracker",
    "fixedEnd": "DD/MM/YYYY",
    "completionDate": "DD/MM/YYYY",
    "monthlyPayment": 0,
    "term": "years",
    "accountNo": "if present"
  },
  "lease": {
    "leaseLength": "e.g. 125 years",
    "startDate": "DD/MM/YYYY",
    "expiryDate": "DD/MM/YYYY",
    "yearsRemaining": 0,
    "groundRent": 0,
    "serviceCharge": 0,
    "managingAgent": "name",
    "freeholder": "name",
    "titleNumber": "e.g. HS292736"
  },
  "keyDates": [
    { "label": "what this date is", "date": "DD/MM/YYYY" }
  ],
  "summary": "One sentence: document type, property address, and single most important fact."
}

Return ONLY the JSON object. No markdown fences. No explanation. Nothing before or after the JSON.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  if (!checkRateLimit(userId)) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' })

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

  // Check file size - base64 is ~1.33x the original, so 20MB base64 = ~15MB file
  const approxBytes = (data.length * 3) / 4
  const approxMB = approxBytes / (1024 * 1024)
  if (approxMB > 28) {
    return res.status(400).json({
      success: false,
      error: `This file is ${approxMB.toFixed(0)}MB . Too large to process. Try compressing the PDF or splitting it into smaller files (max 28MB).`,
      filename
    })
  }

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
          max_tokens: 6000,
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
    if (msg.includes('Could not process') || msg.includes('invalid') || msg.includes('corrupt') || msg.includes('not valid') || msg.includes('Unable to')) {
      userMsg = 'This PDF could not be read . It may be password-protected, digitally signed, or in a format we cannot process. Try printing it to PDF and re-uploading, or use manual entry instead.'
    } else if (msg.includes('too large') || msg.includes('size') || msg.includes('maximum')) {
      userMsg = 'This file is too large to process. Try compressing the PDF or use manual entry instead.'
    } else if (msg.includes('Overloaded') || msg.includes('overloaded') || msg.includes('529')) {
      userMsg = 'AI service is busy right now. Please try again in a moment.'
    } else if (msg.includes('rate') || msg.includes('limit')) {
      userMsg = 'Too many requests. Please wait a moment and try again.'
    } else if (msg.includes('timeout') || msg.includes('timed out')) {
      userMsg = 'This document took too long to process . It may be very large. Try a smaller file or use manual entry.'
    } else if (msg) {
      userMsg = msg
    }
    res.status(500).json({ success:false, error:userMsg, filename })
  }
}

export const config = { api: { bodyParser: { sizeLimit: '40mb' } } }
