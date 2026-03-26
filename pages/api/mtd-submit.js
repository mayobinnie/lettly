import { getAuth } from '@clerk/nextjs/server'
import { getPortfolio } from '../../lib/supabase'

// MTD for Income Tax Self Assessment
// HMRC API endpoint (sandbox): https://test-api.service.hmrc.gov.uk
// HMRC API endpoint (production): https://api.service.hmrc.gov.uk
// 
// TO GO LIVE:
// 1. Register at developer.service.hmrc.gov.uk
// 2. Create application, request MTD ITSA scope
// 3. Complete HMRC production credentials process (2-4 weeks)
// 4. Add HMRC_CLIENT_ID and HMRC_CLIENT_SECRET to Vercel env vars
// 5. Change HMRC_API_BASE to production URL

const HMRC_API_BASE = process.env.HMRC_API_BASE || 'https://test-api.service.hmrc.gov.uk'
const HMRC_CLIENT_ID = process.env.HMRC_CLIENT_ID
const HMRC_CLIENT_SECRET = process.env.HMRC_CLIENT_SECRET

// Build quarterly summary from portfolio data
function buildQuarterlySummary(portfolio, year, quarter) {
  const props = portfolio.properties || []
  const expenses = portfolio.expenses || []

  // Quarter date ranges
  const quarterRanges = {
    1: { start: `${year}-04-06`, end: `${year}-07-05` },
    2: { start: `${year}-07-06`, end: `${year}-10-05` },
    3: { start: `${year}-10-06`, end: `${year+1}-01-05` },
    4: { start: `${year+1}-01-06`, end: `${year+1}-04-05` },
  }
  const range = quarterRanges[quarter]

  // Calculate income (rent * months in quarter = 3)
  const totalRent = props.reduce((s, p) => s + (Number(p.rent) || 0), 0)
  const quarterlyIncome = totalRent * 3

  // Filter expenses by quarter
  const quarterExpenses = expenses.filter(e => {
    if (!e.date) return false
    const parts = e.date.split('/')
    if (parts.length < 3) return false
    const d = new Date(parts[2], parts[1] - 1, parts[0])
    const start = new Date(range.start)
    const end = new Date(range.end)
    return d >= start && d <= end
  })

  // Categorise expenses per HMRC SA105 categories
  const expenseMap = {
    'Mortgage payment': 'financialCosts',
    'Insurance': 'insurance',
    'Gas certificate': 'repairsAndMaintenance',
    'EICR': 'repairsAndMaintenance',
    'Repairs and maintenance': 'repairsAndMaintenance',
    'Agent fees': 'professionalFees',
    'Letting fees': 'professionalFees',
    'Legal fees': 'professionalFees',
    'Accountant fees': 'professionalFees',
    'Utilities': 'premisesRunningCosts',
    'Council tax': 'premisesRunningCosts',
    'Ground rent': 'financialCosts',
    'Service charge': 'financialCosts',
    'Other': 'other',
  }

  const categorised = {
    premisesRunningCosts: 0,
    repairsAndMaintenance: 0,
    financialCosts: 0,
    professionalFees: 0,
    costOfServices: 0,
    insurance: 0,
    other: 0,
  }

  quarterExpenses.forEach(e => {
    const cat = expenseMap[e.category] || 'other'
    categorised[cat] += Number(e.amount) || 0
  })

  const totalExpenses = Object.values(categorised).reduce((s, v) => s + v, 0)

  return {
    fromDate: range.start,
    toDate: range.end,
    income: {
      rentIncome: parseFloat(quarterlyIncome.toFixed(2)),
      premiumsOfLeaseGrant: 0,
      otherPropertyIncome: 0,
    },
    expenses: {
      premisesRunningCosts: parseFloat(categorised.premisesRunningCosts.toFixed(2)),
      repairsAndMaintenance: parseFloat(categorised.repairsAndMaintenance.toFixed(2)),
      financialCosts: parseFloat(categorised.financialCosts.toFixed(2)),
      professionalFees: parseFloat(categorised.professionalFees.toFixed(2)),
      costOfServices: 0,
      other: parseFloat((categorised.other + categorised.insurance).toFixed(2)),
    },
    netProfit: parseFloat((quarterlyIncome - totalExpenses).toFixed(2)),
    propertyCount: props.length,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const { year, quarter, nino, action } = req.body
  if (!year || !quarter) return res.status(400).json({ error: 'Year and quarter required' })

  try {
    const portfolio = await getPortfolio(userId)
    const summary = buildQuarterlySummary(portfolio, year, quarter)

    // If action is 'preview' - just return the summary without submitting
    if (action === 'preview') {
      return res.status(200).json({ success: true, summary, status: 'preview' })
    }

    // If HMRC credentials not configured - return ready-to-submit data
    if (!HMRC_CLIENT_ID || !HMRC_CLIENT_SECRET) {
      return res.status(200).json({
        success: true,
        summary,
        status: 'not_connected',
        message: 'HMRC connection not yet configured. Your summary data is ready. Add HMRC_CLIENT_ID and HMRC_CLIENT_SECRET to connect.',
      })
    }

    // TODO: Live HMRC submission via OAuth2
    // This requires: 1) User to authorise via HMRC OAuth2 flow
    //                2) Exchange code for access token
    //                3) POST to /individuals/self-assessment/uk-properties/uk/{nino}/{taxYear}/period
    // Full implementation pending HMRC production credentials

    return res.status(200).json({
      success: true,
      summary,
      status: 'ready',
      message: 'Summary prepared. HMRC submission ready once credentials are configured.',
    })

  } catch (err) {
    console.error('MTD error:', err?.message)
    return res.status(500).json({ error: err?.message })
  }
}
