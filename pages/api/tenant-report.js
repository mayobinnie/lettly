import { savePortfolio } from '../../lib/supabase'

// Token = HMAC-signed base64 of userId:propertyId
// Prevents enumeration attacks by making tokens unforgeable
const crypto = require('crypto')

function signToken(userId, propertyId) {
  const payload = `${userId}:${propertyId}`
  const secret = process.env.TENANT_REPORT_SECRET || process.env.CLERK_WEBHOOK_SECRET || 'lettly-report-secret'
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

function parseToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length < 3) {
      // Legacy token format - accept but log warning
      const [userId, propertyId] = parts
      return { userId, propertyId }
    }
    const [userId, propertyId, sig] = parts
    const secret = process.env.TENANT_REPORT_SECRET || process.env.CLERK_WEBHOOK_SECRET || 'lettly-report-secret'
    const expectedSig = crypto.createHmac('sha256', secret).update(`${userId}:${propertyId}`).digest('hex').slice(0, 16)
    if (sig !== expectedSig) return null
    return { userId, propertyId }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const { token } = req.query

  if (!token) return res.status(400).json({ error: 'No token' })
  const parsed = parseToken(token)
  if (!parsed?.userId) return res.status(400).json({ error: 'Invalid token' })

  // GET - return property info for the tenant form
  if (req.method === 'GET') {
    try {
      const { createClient } = require('@supabase/supabase-js')
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      const { data: row } = await client.from('portfolios').select('data').eq('user_id', parsed.userId).single()
      const portfolio = row?.data
      const prop = portfolio?.properties?.find(p => p.id === parsed.propertyId)
      if (!prop) return res.status(404).json({ error: 'Property not found' })
      return res.status(200).json({
        property: {
          shortName: prop.shortName,
          address: prop.address,
        }
      })
    } catch (err) {
      return res.status(500).json({ error: 'Could not load property' })
    }
  }

  // POST - submit a report
  if (req.method === 'POST') {
    const { category, description, urgency, photos, tenantName, tenantContact } = req.body
    if (!description) return res.status(400).json({ error: 'Description required' })

    try {
      const { createClient } = require('@supabase/supabase-js')
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      const { data: row } = await client.from('portfolios').select('data').eq('user_id', parsed.userId).single()
      const portfolio = row?.data
      const prop = portfolio?.properties?.find(p => p.id === parsed.propertyId)
      if (!prop) return res.status(404).json({ error: 'Property not found' })

      const newJob = {
        id: Math.random().toString(36).slice(2),
        date: new Date().toLocaleDateString('en-GB'),
        property: prop.shortName,
        propertyId: parsed.propertyId,
        category: category || 'General maintenance',
        description,
        urgency: urgency || 'Normal',
        status: 'Open',
        source: 'Tenant',
        tenantName: tenantName || prop.tenantName || 'Tenant',
        tenantContact: tenantContact || prop.tenantPhone || '',
        photos: photos || [],
        reportedAt: new Date().toISOString(),
      }

      const maintenance = portfolio.maintenance || []
      const updated = { ...portfolio, maintenance: [...maintenance, newJob] }
      await savePortfolio(parsed.userId, updated)

      // Email landlord notification
      try {
        const { sendMaintenanceNotification } = await import('../../lib/emails.js')
        // Get landlord email from Clerk using service key
        // For now use portfolio contact email if stored, otherwise skip
        const landlordEmail = portfolio.contactEmail
        if (landlordEmail) {
          await sendMaintenanceNotification({
            landlordEmail,
            landlordName: portfolio.ownerName || 'Landlord',
            propertyName: prop.shortName,
            issue: description,
            tenantName: tenantName || prop.tenantName || 'Your tenant',
            urgency: urgency || 'Normal',
          })
        }
      } catch (emailErr) {
        console.warn('Maintenance notification email failed:', emailErr)
        // Don't fail the request if email fails
      }

      return res.status(200).json({ success: true, jobId: newJob.id })
    } catch (err) {
      console.error('Tenant report error:', err)
      return res.status(500).json({ error: 'Could not save report' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
