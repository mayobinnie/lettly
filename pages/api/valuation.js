// Land Registry Price Paid Data API - free, no key needed
// Fetches recent sold prices for comparable properties near a postcode

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { postcode, propertyType } = req.body
  if (!postcode) return res.status(400).json({ error: 'Postcode required' })

  const clean = postcode.replace(/\s/g, '').toUpperCase()
  // Use first part of postcode (outward code) for area comparables
  const outward = clean.match(/^([A-Z]{1,2}[0-9][0-9A-Z]?)/)?.[1] || clean.slice(0, 4)

  try {
    // Land Registry SPARQL endpoint - public, no auth needed
    const sparql = `
      SELECT ?paon ?street ?town ?amount ?date ?propertyType WHERE {
        ?tranx <http://landregistry.data.gov.uk/def/ppi/pricePaid> ?amount ;
               <http://landregistry.data.gov.uk/def/ppi/propertyType> ?propertyType ;
               <http://landregistry.data.gov.uk/def/ppi/transactionDate> ?date ;
               <http://landregistry.data.gov.uk/def/ppi/propertyAddress> ?addr .
        ?addr <http://landregistry.data.gov.uk/def/common/postcode> ?postcode ;
              <http://landregistry.data.gov.uk/def/common/paon> ?paon ;
              <http://landregistry.data.gov.uk/def/common/street> ?street .
        OPTIONAL { ?addr <http://landregistry.data.gov.uk/def/common/town> ?town }
        FILTER regex(?postcode, "^${outward}", "i")
        FILTER (?date > "2022-01-01"^^xsd:date)
      }
      ORDER BY DESC(?date)
      LIMIT 20
    `

    const url = 'https://landregistry.data.gov.uk/landregistry/query'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
      },
      body: `query=${encodeURIComponent(sparql)}`,
    })

    if (!response.ok) throw new Error(`Land Registry returned ${response.status}`)

    const data = await response.json()
    const results = data.results?.bindings || []

    if (results.length === 0) {
      return res.status(200).json({ comparables: [], estimate: null, source: 'land_registry', message: 'No recent sales found for this postcode area' })
    }

    // Parse results
    const comparables = results.map(r => ({
      address: `${r.paon?.value || ''} ${r.street?.value || ''}`.trim(),
      town: r.town?.value || '',
      price: Number(r.amount?.value) || 0,
      date: r.date?.value?.slice(0, 10) || '',
      type: r.propertyType?.value?.split('/').pop() || 'unknown',
    })).filter(c => c.price > 0)

    // Calculate estimate from comparables
    const prices = comparables.map(c => c.price).sort((a, b) => a - b)
    const median = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : null
    const avg = prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null
    const min = prices.length > 0 ? prices[0] : null
    const max = prices.length > 0 ? prices[prices.length - 1] : null

    // Get the HPI growth adjustment - properties sold 2022-2024 need uplifting to today
    // Using average 3.5% pa uplift across UK
    const now = new Date()
    const adjustedComparables = comparables.slice(0, 8).map(c => {
      const saleDate = new Date(c.date)
      const yearsAgo = (now - saleDate) / (1000 * 60 * 60 * 24 * 365)
      const adjustedPrice = Math.round(c.price * Math.pow(1.035, yearsAgo))
      return { ...c, adjustedPrice, yearsAgo: Math.round(yearsAgo * 10) / 10 }
    })

    const adjustedPrices = adjustedComparables.map(c => c.adjustedPrice)
    const adjustedMedian = adjustedPrices.length > 0
      ? adjustedPrices.sort((a, b) => a - b)[Math.floor(adjustedPrices.length / 2)]
      : null

    return res.status(200).json({
      comparables: adjustedComparables,
      estimate: adjustedMedian,
      rawMedian: median,
      avg,
      min,
      max,
      count: comparables.length,
      outward,
      source: 'land_registry',
      note: 'Sold prices from HM Land Registry, adjusted for estimated HPI growth to today. This is a guide only.'
    })

  } catch (err) {
    console.error('Valuation error:', err.message)
    // Return a graceful failure - don't break the UI
    return res.status(200).json({
      comparables: [],
      estimate: null,
      source: 'land_registry',
      error: 'Could not fetch Land Registry data right now. Try again later.',
    })
  }
}
