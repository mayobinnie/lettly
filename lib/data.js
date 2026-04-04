export function fmt(n) {
  if (n == null || n === '') return '-'
  return '£' + Math.round(n).toLocaleString()
}

export function ltv(mortgage, value) {
  if (!mortgage || !value) return null
  return ((mortgage / value) * 100).toFixed(1)
}

export function dueSoon(dateStr) {
  if (!dateStr) return 'unknown'
  const parts = dateStr.split('/')
  if (parts.length < 3) return 'unknown'
  const due = new Date(parts[2], parts[1] - 1, parts[0])
  const diffDays = (due - Date.now()) / 86400000
  if (diffDays < 0)   return 'overdue'
  if (diffDays < 90)  return 'due-soon'
  return 'valid'
}

export function dueDays(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length < 3) return null
  const due = new Date(parts[2], parts[1] - 1, parts[0])
  return Math.round((due - Date.now()) / 86400000)
}

export function epcRating(rating) {
  if (!rating) return null
  const r = rating.toUpperCase()
  if (r === 'A' || r === 'B' || r === 'C') return 'pass'
  if (r === 'D') return 'warning'
  return 'fail'
}

export function epcColor(rating) {
  const status = epcRating(rating)
  if (status === 'pass')    return 'var(--green)'
  if (status === 'warning') return 'var(--amber)'
  if (status === 'fail')    return 'var(--red)'
  return 'var(--text-3)'
}

export function mergeDoc(portfolio, extracted) {
  if (!extracted?.property?.address) return portfolio

  // Reject obviously invalid property names : document types, generics, unknowns
  const INVALID_NAMES = [
    'rental contract','tenancy agreement','lease','document','contract',
    'mortgage','unknown','not stated','not specified','not clearly stated',
    'terms of business','letting conditions','prescribed information',
    'property report','completion statement','title plan','title register',
    'sdlt','stamp duty','insurance','eicr','gas certificate','epc',
    'section notice','notice','report','form','certificate','deed','offer'
  ]
  const shortLower = (extracted.property.shortName || '').toLowerCase().trim()
  const addrLower = (extracted.property.address || '').toLowerCase().trim()

  // Must start with a number (house/flat number)
  const startsWithNumber = /^\d/.test(shortLower) || /^\d/.test(addrLower)
  if (!startsWithNumber) return portfolio

  // Reject if shortName matches a known bad pattern
  const isInvalid = INVALID_NAMES.some(bad =>
    shortLower === bad ||
    shortLower.startsWith(bad + ' ') ||
    shortLower.includes('contract') ||
    shortLower.includes('agreement') ||
    shortLower.includes('document') ||
    shortLower.includes('certificate') ||
    shortLower.includes('unknown') ||
    shortLower.includes('not specified') ||
    shortLower.includes('not stated')
  )
  if (isInvalid) return portfolio

  const props = portfolio?.properties || []
  const extractedAddr = (extracted.property.address || '').toLowerCase().trim()
  const extractedShort = (extracted.property.shortName || '').toLowerCase().trim()

  // Normalise address for comparison - strip punctuation, lowercase
  function normalise(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  }

  const normExtracted = normalise(extractedAddr)
  const normShort = normalise(extractedShort)

  // Extract house/flat number from address string
  function extractNumber(s) {
    const m = (s || '').match(/^(\d+[a-z]?)/i)
    return m ? m[1].toLowerCase() : null
  }

  // Score-based matching - strict on house number
  function matchScore(prop) {
    const normAddr = normalise(prop.address || '')
    const normPropShort = normalise(prop.shortName || '')

    // Extract postcodes (most reliable)
    const postcodeRe = /[a-z]{1,2}[0-9][0-9a-z]?\s*[0-9][a-z]{2}/i
    const extractedPCfromAddr = (normExtracted.match(postcodeRe) || [''])[0].replace(/\s/g,'').toLowerCase()
    // Also use the separately extracted postcode field if available
    const extractedPCfield = (extracted.property?.postcode || '').replace(/\s/g,'').toLowerCase()
    const bestExtractedPC = extractedPCfromAddr || extractedPCfield
    const propPC = (normAddr.match(postcodeRe) || [''])[0].replace(/\s/g,'').toLowerCase()

    // Exact postcode match = definitive
    if (bestExtractedPC && propPC && bestExtractedPC === propPC) return 100

    // Exact address match
    if (normAddr === normExtracted) return 95

    // House number extraction - check BOTH the full address AND shortName
    // Critical: if AI omits number from shortName, use full address number
    const extractedNum = extractNumber(normExtracted) || extractNumber(normShort)
    const propNum = extractNumber(normAddr) || extractNumber(normPropShort)

    // If extracted doc has NO house number at all, we cannot safely match by street name alone
    // This prevents "Northfield Avenue" matching "11 Northfield" when it belongs to "3 Northfield"
    if (!extractedNum) return 0

    // Different house numbers = definitive no match
    if (extractedNum && propNum && extractedNum !== propNum) return 0

    // Numbers match (or prop has no number) : now check street name
    // Short name must be contained in extracted address
    if (normPropShort && normPropShort.length > 5 && normExtracted.includes(normPropShort)) return 80

    // Extracted short contained in prop address
    if (normShort && normShort.length > 5 && normAddr.includes(normShort)) return 75

    // Substantial address overlap (first 25 chars after number) : only if numbers match
    if (extractedNum && propNum && extractedNum === propNum) {
      const extractedCore = normExtracted.replace(/^\d+[a-z]?\s+/i,'').slice(0,25)
      const propCore = normAddr.replace(/^\d+[a-z]?\s+/i,'').slice(0,25)
      if (extractedCore.length > 8 && propCore.length > 8 && extractedCore === propCore) return 85
      // Partial street name overlap with matching number
      if (extractedCore.length > 5 && propCore.length > 5 && (extractedCore.includes(propCore.slice(0,8)) || propCore.includes(extractedCore.slice(0,8)))) return 70
    }

    return 0
  }

  const scores = props.map((p, i) => ({ i, score: matchScore(p) }))
  const best = scores.reduce((a, b) => b.score > a.score ? b : a, { i: -1, score: 0 })
  // Must be a confident match : 70+ required
  // Require higher confidence when multiple properties share the same street
  // Prevents 3 Northfield Ave matching a doc intended for 31 Northfield Ave
  const competingMatches = scores.filter(s => s.score >= 70 && s.i !== best.i)
  const minScore = competingMatches.length > 0 ? 90 : 70
  const matchIdx = best.score >= minScore ? best.i : -1

  const patch = {}

  // Helper: convert DD/MM/YYYY string to Date
  function parseDate(s) {
    if (!s) return null
    const parts = s.split('/')
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1]-1, parts[0])
  }

  // Helper: add months to a DD/MM/YYYY string
  function addMonths(dateStr, months) {
    const d = parseDate(dateStr)
    if (!d) return null
    d.setMonth(d.getMonth() + months)
    return d.getDate().toString().padStart(2,'0') + '/' +
           (d.getMonth()+1).toString().padStart(2,'0') + '/' +
           d.getFullYear()
  }

  // Helper: coerce to number, return null if not valid
  function toNum(v) {
    if (v === null || v === undefined || v === '') return null
    const n = Number(String(v).replace(/[^0-9.]/g,''))
    return isNaN(n) || n === 0 ? null : n
  }

  const cx = extracted.compliance || {}

  // Gas cert: calculate due date if AI didn't extract it
  if (cx.gas) {
    const gas = cx.gas
    if (gas.date)  patch.gasDate = gas.date
    if (gas.due)   patch.gasDue  = gas.due
    else if (gas.date) {
      const calculated = addMonths(gas.date, 12)
      if (calculated) patch.gasDue = calculated
    }
    if (gas.engineer)   patch.gasEngineer  = gas.engineer
    if (gas.gasSafeNo)  patch.gasSafeNo    = gas.gasSafeNo
    if (gas.result)     patch.gasResult    = gas.result
    if (gas.appliances?.length) patch.gasAppliances = gas.appliances.join(', ')
    if (gas.defects)    patch.gasDefects   = gas.defects
  }

  // EICR: calculate due date if AI didn't extract it
  if (cx.eicr) {
    const eicr = cx.eicr
    if (eicr.date)   patch.eicrDate   = eicr.date
    if (eicr.due)    patch.eicrDue    = eicr.due
    else if (eicr.date) {
      const calculated = addMonths(eicr.date, 60) // 5 years
      if (calculated) patch.eicrDue = calculated
    }
    if (eicr.result)       patch.eicrResult       = eicr.result
    if (eicr.inspector)    patch.eicrInspector    = eicr.inspector
    if (eicr.observations) patch.eicrObservations = eicr.observations
  }
  if (cx.insurance) {
    const ins = cx.insurance
    if (ins.insurer)           patch.insurer              = ins.insurer
    if (ins.policyNumber)      patch.policyNo             = ins.policyNumber
    if (ins.renewal)           patch.insuranceRenewal     = ins.renewal
    if (ins.startDate)         patch.insuranceStart       = ins.startDate
    if (ins.type)              patch.insuranceType        = ins.type
    const prem = toNum(ins.premium)
    if (prem)                  patch.insurancePremium     = prem
    const sum = toNum(ins.sumInsured)
    if (sum)                   patch.insuranceSumInsured  = sum
    const bldg = toNum(ins.buildingsSum)
    if (bldg)                  patch.insuranceBuildings   = bldg
    const liab = toNum(ins.liabilitySum)
    if (liab)                  patch.insuranceLiability   = liab
    const exc = toNum(ins.excess)
    if (exc)                   patch.insuranceExcess      = exc
    const lor = toNum(ins.lossOfRentCover)
    if (lor)                   patch.insuranceLossOfRent  = lor
    if (ins.lossOfRentPeriod)  patch.insuranceLossOfRentPeriod = ins.lossOfRentPeriod
    if (ins.unoccupancyClause) patch.insuranceUnoccupancy = ins.unoccupancyClause
    if (ins.exclusions)        patch.insuranceExclusions  = ins.exclusions
    if (ins.cover)             patch.insuranceCover       = ins.cover
    if (ins.floodCover)        patch.insuranceFlood       = ins.floodCover
    const leg = toNum(ins.legalExpensesCover)
    if (leg)                   patch.insuranceLegal       = leg
    if (ins.emergencyCover)    patch.insuranceEmergency   = ins.emergencyCover
    if (ins.broker)            patch.insuranceBroker      = ins.broker
  }
  if (cx.epc) {
    const epc = cx.epc
    if (epc.rating)     patch.epcRating    = epc.rating.toUpperCase().trim().charAt(0)
    if (epc.expiry)     patch.epcExpiry    = epc.expiry
    const score = toNum(epc.score)
    if (score)          patch.epcScore     = score
    if (epc.referenceNo) patch.epcRef      = epc.referenceNo
  }

  const t = extracted.tenancy || {}
  if (t.tenantName) {
    const ownerName = (portfolio?.ownerName || '').toLowerCase().trim()
    const extractedTenant = (t.tenantName || '').toLowerCase().trim()
    const ownerFirstName = ownerName.split(' ')[0] || ''
    const isMisExtracted = ownerFirstName.length > 2 && extractedTenant.includes(ownerFirstName)
    if (!isMisExtracted) patch.tenantName = t.tenantName
  }
  if (t.tenantPhone)      patch.tenantPhone    = t.tenantPhone
  if (t.tenantEmail)      patch.tenantEmail    = t.tenantEmail
  const rent = toNum(t.rent)
  if (rent)               patch.rent           = rent
  if (t.rentFrequency)    patch.rentFrequency  = t.rentFrequency
  const dep = toNum(t.depositAmount)
  if (dep)                patch.depositAmount  = dep
  if (t.depositScheme)    patch.depositScheme  = t.depositScheme
  if (t.depositRef)       patch.depositRef     = t.depositRef
  if (t.startDate)        patch.tenancyStart   = t.startDate
  if (t.endDate)          patch.tenancyEnd     = t.endDate
  if (t.noticeRequired)   patch.noticeRequired = t.noticeRequired
  if (t.landlordName)     patch.landlordName   = t.landlordName

  const f = extracted.finance || {}
  if (f.lender)              patch.lender         = f.lender
  const mort = toNum(f.mortgage)
  if (mort)                  patch.mortgage       = mort
  const rate = toNum(f.rate)
  if (rate)                  patch.rate           = rate
  if (f.rateType)            patch.rateType       = f.rateType
  if (f.fixedEnd)            patch.fixedEnd       = f.fixedEnd
  const price = toNum(f.purchasePrice)
  if (price)                 patch.purchasePrice  = price
  if (f.completionDate)      patch.purchaseDate   = f.completionDate
  const mpay = toNum(f.monthlyPayment)
  if (mpay)                  patch.monthlyPayment = mpay
  if (f.term)                patch.mortgageTerm   = f.term
  if (f.accountNo)           patch.mortgageRef    = f.accountNo

  const docType = extracted.documentType

  if (matchIdx >= 0) {
    const updated = props.map((p, i) =>
      i === matchIdx
        ? { ...p, ...patch, docs: Array.from(new Set([...(p.docs || []), docType])) }
        : p
    )
    return { ...portfolio, properties: updated }
  } else {
    const newProp = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      shortName: extracted.property.shortName || extracted.property.address.split(',')[0].trim(),
      address: extracted.property.address,
      docs: [docType],
      ...patch,
    }
    return { ...portfolio, properties: [...props, newProp] }
  }
}

// UK Legislation data
export const LEGISLATION = [
  {
    id: 'rrb',
    name: "Renters' Rights Bill",
    status: 'Passing - Royal Assent 2025',
    effectDate: 'Oct 2026 (est.)',
    impact: 'critical',
    summary: "The biggest change to UK tenancy law in 30 years. Abolishes no-fault evictions and converts all tenancies to periodic.",
    current: [
      { text: 'Section 21 "no-fault" eviction notices are currently valid - landlords can end tenancies without giving a reason.' },
      { text: 'Fixed-term ASTs allow landlords certainty over tenancy length.' },
      { text: 'Section 8 grounds for possession exist but are rarely used.' },
    ],
    upcoming: [
      { severity: 'red',   text: 'Section 21 abolished from 1 May 2026 - you will need a legal reason to end any tenancy.' },
      { severity: 'red',   text: 'All tenancies become periodic - tenants can leave with 2 months notice at any time.' },
      { severity: 'red',   text: 'PRS Database registration mandatory before serving any notice to quit.' },
      { severity: 'amber', text: "Section 8 grounds strengthened - court-ready documentation essential." },
      { severity: 'amber', text: "Awaab's Law extended to private rented sector (from 2026): damp/mould reports investigated within 14 days." },
      { severity: 'amber', text: "Decent Homes Standard extended to private rented sector." },
      { severity: 'green', text: 'Pets: landlords cannot unreasonably refuse pets - update tenancy agreements.' },
    ],
    actions: [
      'Register on the PRS Database once launched (2025)',
      'Switch to periodic-friendly tenancy agreements now',
      'Document all maintenance requests carefully - Section 8 will require evidence',
      "Ensure properties meet Decent Homes Standard before Oct 2026",
    ],
  },
  {
    id: 'epc',
    name: 'EPC Minimum C Requirement',
    status: 'Planned - 2028',
    effectDate: '2028 new lets / 2030 all',
    impact: 'high',
    summary: "All rental properties must have an Energy Performance Certificate rating of C or above - D and E-rated properties cannot be re-let.",
    current: [
      { text: 'Minimum EPC rating is E - properties rated F or G cannot legally be let.' },
      { text: 'EPC certificates are valid for 10 years from issue date.' },
      { text: 'Landlords must provide a valid EPC to tenants at start of tenancy.' },
    ],
    upcoming: [
      { severity: 'red',   text: 'From 2028: new tenancies require EPC C or above.' },
      { severity: 'red',   text: 'From 2030: ALL tenancies require EPC C or above - even existing ones.' },
      { severity: 'amber', text: 'Properties currently rated D will need upgrades - typical cost £3,000–£10,000.' },
      { severity: 'amber', text: 'Properties rated E will need significant works - insulation, heating, windows.' },
      { severity: 'green', text: 'Exemptions may apply for listed buildings and where upgrade cost exceeds £10,000.' },
    ],
    actions: [
      'Get an EPC for every property if you don\'t have a current one',
      'For D-rated properties: add loft insulation, cavity wall insulation, upgrade boiler',
      'For E-rated properties: budget £5,000–£15,000 per property for upgrades',
      'Check for government grant schemes - ECO4 and Great British Insulation Scheme available',
    ],
  },
  {
    id: 'hmo',
    name: 'HMO Licensing',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'high',
    summary: 'Houses in Multiple Occupation (HMOs) require a mandatory licence if 5 or more people from 2 or more households share facilities. Many councils also operate selective or additional licensing requiring all private landlords to hold a licence.',
    current: [
      { text: 'Mandatory HMO licence required: 5+ people, 2+ households sharing kitchen or bathroom.' },
      { text: 'Selective licensing: many councils require all landlords to hold a licence regardless of size - check your local council.' },
      { text: 'Additional licensing: councils can designate areas where smaller HMOs (3-4 people) also require a licence.' },
      { text: 'Letting without a required licence: criminal offence, unlimited fine, rent repayment order for up to 12 months rent.' },
      { text: 'HMO properties must meet additional fire safety, room size and facility standards.' },
    ],
    upcoming: [
      { severity: 'amber', text: 'More councils are expanding selective licensing schemes - check annually.' },
    ],
    actions: [
      'Check if your property meets the HMO definition (5+ people, 2+ households)',
      'Check your local council website for selective or additional licensing schemes',
      'Apply for HMO licence before letting if required - typically £500-£1,500 per property',
      'Ensure HMO properties meet minimum room sizes and fire safety requirements',
    ],
  },
  {
    id: 'tenant_fees',
    name: 'Tenant Fees Act 2019',
    status: 'In force since June 2019',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: 'Landlords and agents are banned from charging tenants most fees. Only a limited list of permitted payments is allowed. Breaches can result in fines and rent repayment orders.',
    current: [
      { text: 'Banned: referencing fees, admin fees, credit check fees, guarantor fees, viewing fees, application fees, inventory fees, check-out fees.' },
      { text: 'Permitted: rent, tenancy deposit (max 5 weeks rent), holding deposit (max 1 week rent), tenant-requested tenancy changes, early termination (landlord losses only), late payment interest (capped at 3% above Bank of England base rate), key replacement.' },
      { text: 'Breach: landlord must repay the prohibited payment within 28 days or it becomes a civil offence.' },
      { text: 'Cannot serve Section 21 while a prohibited payment has not been repaid.' },
    ],
    upcoming: [
      { severity: 'green', text: 'No planned changes to the Tenant Fees Act.' },
    ],
    actions: [
      'Review any charges you make to tenants against the permitted payments list',
      'Remove any prohibited fees immediately - repay if already charged',
      'Ensure any holding deposit is correctly documented and returned within 15 days if tenancy does not proceed',
      'Cap late payment charges at 3% above Bank of England base rate',
    ],
  },
  {
    id: 'fitness_hab',
    name: 'Homes (Fitness for Human Habitation) Act 2018',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: 'All rented properties in England must be fit for human habitation at the start and throughout the tenancy. Tenants can take landlords to court if properties are unfit.',
    current: [
      { text: 'Property must be fit for human habitation - assessed against 29 hazard categories under the Housing Health and Safety Rating System (HHSRS).' },
      { text: 'Hazard categories include: damp and mould, excess cold, structural collapse, fire, electrical hazards, entry by intruders, pests, and sanitation.' },
      { text: 'Tenants can take legal action directly in county court - no need to go through the council.' },
      { text: 'Remedy required within a reasonable time of notification - typically 14-28 days for non-urgent, immediately for serious hazards.' },
    ],
    upcoming: [
      { severity: 'amber', text: "Awaab's Law (from 2026): 14-day maximum response to damp and mould reports in private rented sector." },
    ],
    actions: [
      'Inspect properties before each new tenancy for HHSRS hazards',
      'Maintain a record of all reported defects and actions taken',
      'Respond to repair requests in writing with a timeline',
      'Budget for responsive maintenance - unfit property claims can result in significant damages',
    ],
  },
  {
    id: 's24',
    name: 'Section 24 - Mortgage Interest Tax',
    status: 'In force since 2020',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: "Personal landlords can no longer deduct mortgage interest from rental income - only a 20% tax credit applies. Ltd companies are unaffected.",
    current: [
      { text: 'Personal landlords: only 20% basic rate tax credit on mortgage interest - higher/additional rate taxpayers pay significantly more.' },
      { text: 'Ltd Company landlords: full mortgage interest deduction as a business expense.' },
      { text: 'This can make personally-owned properties loss-making on paper even when cash-flow positive.' },
    ],
    upcoming: [
      { severity: 'green', text: 'No further changes planned - but review annually with your accountant.' },
      { severity: 'amber', text: 'Incorporation (moving to Ltd Co) can save significant tax but has SDLT and CGT costs.' },
    ],
    actions: [
      'Check if you\'re a higher or additional rate taxpayer - if so, review urgently',
      'Model the difference between personal and Ltd Co ownership',
      'Speak to a tax accountant before making any changes',
      'Consider Ltd Co for any new purchases - no SDLT or CGT on new acquisitions',
    ],
  },
  {
    id: 'deposit',
    name: 'Deposit Protection Rules',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: "All deposits must be protected in a government-approved scheme within 30 days and prescribed information served on tenants.",
    current: [
      { text: 'Deposit must be protected in TDS, DPS, or MyDeposits within 30 days of receipt.' },
      { text: 'Prescribed information must be served on tenants within 30 days.' },
      { text: 'Maximum deposit is 5 weeks rent (or 6 weeks if rent over £50,000/year).' },
      { text: 'Failure to protect: penalty of 1–3x the deposit amount, cannot serve Section 21.' },
    ],
    upcoming: [
      { severity: 'amber', text: 'After Renters Rights Bill: failure to protect will block any possession claim.' },
    ],
    actions: [
      'Check all deposits are currently protected - log scheme and reference',
      'Ensure prescribed information has been served and signed',
      'Check protection within 30 days on any new tenancies',
    ],
  },
  {
    id: 'safety',
    name: 'Safety Compliance',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: "Gas, electrical, smoke and CO alarm compliance is legally required. Failure is a criminal offence.",
    current: [
      { text: 'Gas Safety Certificate: annual check by Gas Safe registered engineer. Give to new tenants before they move in. Give renewed certificate to existing tenants within 28 days of the check. Keep for 2 years. Failure to comply is a criminal offence.' },
      { text: 'EICR: electrical installation check every 5 years - must be satisfactory grade.' },
      { text: 'Smoke alarms: working alarm on every floor. Tested on the first day of tenancy and must remain in good repair throughout.' },
      { text: 'CO alarms (from Oct 2022): required in every room with any fixed combustion appliance (gas, oil, solid fuel). Also required in any sleeping room with a solid fuel appliance.' },
      { text: 'Legionella: risk assessment required - not annual test, just documented risk assessment.' },
    ],
    upcoming: [
      { severity: 'amber', text: "Awaab's Law (from 2026 for private rented sector): damp and mould reports must be investigated within 14 days." },
      { severity: 'green', text: 'Smart meter installation: government target but not mandatory for landlords yet.' },
    ],
    actions: [
      'Book gas cert renewals 4–6 weeks before expiry date',
      'EICR: book 3 months before 5-year anniversary',
      'Keep copies of all certificates - required for any possession proceedings',
      'Document all tenant repair reports in writing',
    ],
  },
]

// Scotland-specific legislation
export const LEGISLATION_SCOTLAND = [
  {
    id: 'prt',
    name: 'Private Residential Tenancy',
    status: 'In force since Dec 2017',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: 'Scotland replaced assured shorthold tenancies with Private Residential Tenancies (PRTs) in 2017. All Scottish tenancies are now open-ended with no fixed term. No-fault evictions have been abolished in Scotland for years.',
    current: [
      { text: 'All tenancies are Private Residential Tenancies - no fixed terms, no end dates.' },
      { text: 'No-fault evictions have been abolished since 2017. You need a legal ground to end any tenancy.' },
      { text: 'There are 18 grounds for repossession. Notice periods vary from 28 to 84 days depending on grounds and tenancy length.' },
      { text: 'Rent increases limited to once per 12 months with 3 months notice to tenant.' },
    ],
    upcoming: [
      { severity: 'amber', text: 'Rent control: local authorities can designate Rent Pressure Zones capping increases.' },
      { severity: 'green', text: 'No equivalent of the Renters Rights Act needed - Scotland already has these protections.' },
    ],
    actions: [
      'Ensure all tenancies use the correct PRT agreement - not an English AST',
      'Register with your local council as a landlord (mandatory since 2006)',
      'Keep records of all rent increase notices - 3 months notice required',
      'Familiarise yourself with all 18 repossession grounds before serving any notice',
    ],
  },
  {
    id: 'landlord_reg_scot',
    name: 'Landlord Registration (Scotland)',
    status: 'In force since 2006',
    effectDate: 'Already mandatory',
    impact: 'ongoing',
    summary: 'All private landlords in Scotland must register with their local council. Letting without registration is a criminal offence with fines up to £50,000.',
    current: [
      { text: 'Mandatory registration with local council - renewed every 3 years.' },
      { text: 'Letting agents must also be registered under the Letting Agent Registration scheme.' },
      { text: 'Failure to register: fine up to £50,000 and criminal record.' },
      { text: 'Check register at landlordregistrationscotland.gov.uk' },
    ],
    upcoming: [
      { severity: 'green', text: 'No planned changes - scheme is well established.' },
    ],
    actions: [
      'Register at landlordregistrationscotland.gov.uk if not already done',
      'Renew registration every 3 years',
      'Ensure all properties are listed under your registration',
    ],
  },
  {
    id: 'repairing_standard',
    name: 'Repairing Standard',
    status: 'In force - strengthened 2024',
    effectDate: 'Already applies',
    impact: 'high',
    summary: 'Scottish landlords must ensure properties meet the Repairing Standard at the start and throughout the tenancy. This covers structure, water, heating, electrics, fixtures and carbon monoxide detectors.',
    current: [
      { text: 'Property must be wind and watertight with structure in reasonable condition.' },
      { text: 'Installations for water, gas, electricity and heating must be in good working order.' },
      { text: 'Kitchen facilities and bathroom must be adequate.' },
      { text: 'Carbon monoxide detectors required. Interlinked smoke and heat alarms required.' },
    ],
    upcoming: [
      { severity: 'amber', text: 'EPC minimum C likely to apply to Scotland on similar timeline to England and Wales.' },
    ],
    actions: [
      'Carry out a Repairing Standard check before any new tenancy begins',
      'Ensure interlinked smoke alarms, heat detectors and CO alarms are installed',
      'Keep records of all maintenance - tenants can refer cases to the First-tier Tribunal',
    ],
  },
  {
    id: 'deposit_scot',
    name: 'Deposit Protection (Scotland)',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: 'Deposits must be protected in one of three approved schemes: SafeDeposits Scotland, Letting Protection Service Scotland, or mydeposits Scotland.',
    current: [
      { text: 'Deposit must be lodged with an approved scheme within 30 working days.' },
      { text: 'Tenant must receive prescribed information within 30 working days.' },
      { text: 'Maximum deposit is 2 months rent.' },
      { text: 'Approved schemes: SafeDeposits Scotland, LPS Scotland, mydeposits Scotland.' },
    ],
    upcoming: [
      { severity: 'green', text: 'No planned changes.' },
    ],
    actions: [
      'Protect deposits in a Scottish-approved scheme (not an English scheme)',
      'Note: maximum is 2 months rent in Scotland vs 5 weeks in England',
      'Serve prescribed information within 30 working days',
    ],
  },
]

// Wales-specific legislation
export const LEGISLATION_WALES = [
  {
    id: 'renting_homes_wales',
    name: 'Renting Homes (Wales) Act',
    status: 'In force since Dec 2022',
    effectDate: 'Already applies',
    impact: 'critical',
    summary: 'Wales replaced all tenancy agreements with Occupation Contracts in December 2022. All Welsh landlords must use the correct Written Statement. English ASTs are not valid in Wales.',
    current: [
      { text: 'All tenancies are now Standard Occupation Contracts - not ASTs.' },
      { text: 'Landlords must provide a Written Statement to contract-holders.' },
      { text: 'No-fault eviction requires 6 months notice (not 2 months as in England).' },
      { text: '29 fitness standards apply throughout the tenancy.' },
      { text: 'All properties must have interlinked smoke and CO alarms.' },
    ],
    upcoming: [
      { severity: 'green', text: 'The Renters Rights Act (England) does not apply to Wales - Wales has its own framework.' },
      { severity: 'amber', text: 'Welsh Government may strengthen occupation contract rules further.' },
    ],
    actions: [
      'Use a Occupation Contract Written Statement - not an English tenancy agreement',
      'Ensure all 29 fitness standards are met before and throughout tenancy',
      'Ensure interlinked smoke alarms and CO detectors are installed',
      'Note: 6 months notice required for no-fault possession - longer than England',
    ],
  },
  {
    id: 'rent_smart_wales',
    name: 'Rent Smart Wales',
    status: 'Mandatory since 2016',
    effectDate: 'Already applies',
    impact: 'critical',
    summary: 'All landlords with properties in Wales must register with Rent Smart Wales. If you manage the property yourself you also need a licence. Failure is a criminal offence.',
    current: [
      { text: 'Registration required for all landlords with Welsh properties - renewable every 5 years.' },
      { text: 'If self-managing: landlord licence also required (includes training).' },
      { text: 'If using an agent: the agent must be licensed, not the landlord.' },
      { text: 'Failure to register: unlimited fine and criminal record.' },
    ],
    upcoming: [
      { severity: 'green', text: 'No planned changes - scheme is well established.' },
    ],
    actions: [
      'Register at rentsmart.gov.wales if not already done',
      'Obtain a landlord licence if self-managing',
      'Renew every 5 years',
      'Check your letting agent is licensed if using one',
    ],
  },
  {
    id: 'fitness_wales',
    name: 'Fitness for Human Habitation (Wales)',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'high',
    summary: 'Wales has 29 fitness standards that must be met throughout the tenancy. These cover fire safety, damp, electrical safety, structural safety, and escape routes.',
    current: [
      { text: '29 fitness standards including fire, damp, electrical, structural and escape requirements.' },
      { text: 'Landlords are responsible for fitness throughout the tenancy - not just at the start.' },
      { text: 'EICR required every 5 years.' },
      { text: 'EPC required - minimum E, upgrading to C by 2028 (England and Wales policy).' },
    ],
    upcoming: [
      { severity: 'amber', text: 'EPC minimum C from 2028 for new lets, 2030 for all lets - applies to Wales.' },
    ],
    actions: [
      'Carry out a full 29-point fitness check before letting',
      'Keep records of all checks and maintenance',
      'Book EICR every 5 years',
      'Plan EPC upgrades for any D or E rated properties before 2028',
    ],
  },
  {
    id: 'deposit_wales',
    name: 'Deposit Protection (Wales)',
    status: 'In force',
    effectDate: 'Already applies',
    impact: 'ongoing',
    summary: 'Same core rules as England. Maximum 1 months rent deposit. Must be protected within 30 days. Welsh tenants are called contract-holders under the Renting Homes Act.',
    current: [
      { text: 'Maximum deposit is 1 months rent (lower than England\'s 5 weeks).' },
      { text: 'Must be protected within 30 days in approved scheme.' },
      { text: 'Prescribed information must be served on the contract-holder.' },
      { text: 'Approved schemes: DPS, TDS, mydeposits all operate in Wales.' },
    ],
    upcoming: [
      { severity: 'green', text: 'No planned changes.' },
    ],
    actions: [
      'Note: maximum deposit in Wales is 1 months rent, lower than England',
      'Protect in an approved scheme within 30 days',
      'Serve prescribed information on contract-holder',
    ],
  },
]

// UK regional annual house price growth rates (5yr avg based on HPI data)
// Keyed by postcode prefix
export const POSTCODE_GROWTH = {
  // London
  E:5.2,EC:4.8,N:5.1,NW:5.3,SE:4.9,SW:5.0,W:5.4,WC:4.7,
  // South East
  GU:4.1,RG:4.3,SL:4.0,HP:4.2,MK:4.5,LU:4.4,AL:4.6,SG:4.3,
  CM:4.2,SS:4.0,CO:3.9,IP:3.8,NR:3.7,
  // South West
  BS:4.1,BA:3.9,TA:3.6,EX:3.8,TQ:3.7,PL:3.5,TR:3.8,
  BH:4.0,DT:3.8,SP:3.9,SO:4.0,PO:3.9,RH:4.3,BN:4.1,TN:4.0,CT:3.8,ME:3.9,
  // Midlands
  CV:3.8,B:3.7,WS:3.6,WV:3.5,DY:3.5,ST:3.4,TF:3.6,SY:3.5,
  LE:3.9,NN:3.8,PE:3.7,CB:4.2,OX:4.4,SN:3.9,GL:3.8,WR:3.7,HR:3.5,
  NG:3.8,DE:3.7,SK:3.6,
  // North West
  M:3.5,L:3.3,WA:3.4,WN:3.3,BL:3.2,OL:3.1,HX:3.3,HD:3.2,
  BB:3.1,PR:3.3,FY:3.1,LA:3.2,CA:3.0,
  // Yorkshire
  LS:3.7,BD:3.4,HG:3.5,YO:3.6,HU:3.3,DN:3.2,S:3.4,
  // North East
  NE:3.0,SR:2.9,DH:2.9,DL:3.0,TS:2.8,
  // East Midlands / East
  LN:3.5,
  // Scotland
  EH:4.2,G:3.8,AB:3.1,DD:3.3,KY:3.4,FK:3.5,PH:3.2,PA:3.1,
  IV:2.8,KW:2.5,HS:2.3,ZE:2.2,KA:3.2,DG:2.9,TD:3.1,ML:3.3,
  // Wales
  CF:3.6,SA:3.4,NP:3.5,LL:3.2,SY:3.3,LD:2.9,HR:3.2,
}

export function getGrowthRate(address) {
  if (!address) return 3.5 // UK average fallback
  const clean = address.toUpperCase().replace(/[^A-Z0-9 ]/g, '')
  const words = clean.split(' ')
  // Try to find postcode - usually last two words
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i]
    // Check 2-char prefix
    const prefix2 = w.slice(0, 2).replace(/[0-9]/g, '')
    const prefix1 = w.slice(0, 1)
    if (POSTCODE_GROWTH[prefix2]) return POSTCODE_GROWTH[prefix2]
    if (POSTCODE_GROWTH[prefix1]) return POSTCODE_GROWTH[prefix1]
  }
  return 3.5
}

export function projectValue(currentValue, annualGrowthPct, years) {
  const rate = annualGrowthPct / 100
  return Array.from({length: years + 1}, (_, i) => 
    Math.round(currentValue * Math.pow(1 + rate, i))
  )
}
