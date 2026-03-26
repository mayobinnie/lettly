import { getPortfolio, savePortfolio } from '../../lib/supabase'

// Token = base64 of userId:propertyId (simple, no extra table needed)
function parseToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [userId, propertyId] = decoded.split(':')
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
      const portfolio = await getPortfolio(parsed.userId)
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
      const portfolio = await getPortfolio(parsed.userId)
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

      return res.status(200).json({ success: true, jobId: newJob.id })
    } catch (err) {
      console.error('Tenant report error:', err)
      return res.status(500).json({ error: 'Could not save report' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
