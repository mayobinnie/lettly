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

  const props = portfolio?.properties || []
  const short = (extracted.property.shortName || extracted.property.address).toLowerCase().trim()

  const matchIdx = props.findIndex(p => {
    const pa = (p.address || '').toLowerCase()
    const ps = (p.shortName || '').toLowerCase()
    return pa.includes(short) || short.includes(ps) || ps.includes(short)
  })

  const patch = {}

  const c = extracted.compliance || {}
  if (c.gas?.due)       { patch.gasDue = c.gas.due; patch.gasDate = c.gas.date }
  if (c.eicr?.due)      { patch.eicrDue = c.eicr.due; patch.eicrDate = c.eicr.date }
  if (c.insurance) {
    if (c.insurance.insurer)      patch.insurer = c.insurance.insurer
    if (c.insurance.policyNumber) patch.policyNo = c.insurance.policyNumber
    if (c.insurance.renewal)      patch.insuranceRenewal = c.insurance.renewal
    if (c.insurance.type)         patch.insuranceType = c.insurance.type
  }
  if (c.epc) {
    if (c.epc.rating)  patch.epcRating = c.epc.rating
    if (c.epc.expiry)  patch.epcExpiry = c.epc.expiry
    if (c.epc.score)   patch.epcScore  = c.epc.score
  }

  const t = extracted.tenancy || {}
  if (t.tenantName)    patch.tenantName    = t.tenantName
  if (t.tenantPhone)   patch.tenantPhone   = t.tenantPhone
  if (t.tenantEmail)   patch.tenantEmail   = t.tenantEmail
  if (t.rent)          patch.rent          = t.rent
  if (t.depositAmount) patch.depositAmount = t.depositAmount
  if (t.depositScheme) patch.depositScheme = t.depositScheme
  if (t.startDate)     patch.tenancyStart  = t.startDate

  const f = extracted.finance || {}
  if (f.lender)         patch.lender         = f.lender
  if (f.mortgage)       patch.mortgage       = f.mortgage
  if (f.rate)           patch.rate           = f.rate
  if (f.fixedEnd)       patch.fixedEnd       = f.fixedEnd
  if (f.purchasePrice)  patch.purchasePrice  = f.purchasePrice
  if (f.monthlyPayment) patch.monthlyPayment = f.monthlyPayment

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
      { severity: 'red',   text: 'Section 21 abolished - you will need a legal reason to end any tenancy.' },
      { severity: 'red',   text: 'All tenancies become periodic - tenants can leave on 2 months notice at any time.' },
      { severity: 'red',   text: 'PRS Database registration mandatory before serving any notice to quit.' },
      { severity: 'amber', text: "Section 8 grounds strengthened - court-ready documentation essential." },
      { severity: 'amber', text: "Awaab's Law: damp/mould investigations required within 14 days of report." },
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
      { text: 'Gas Safety Certificate: annual check by Gas Safe registered engineer - must be provided to tenant within 28 days.' },
      { text: 'EICR: electrical installation check every 5 years - must be satisfactory grade.' },
      { text: 'Smoke alarms: on every floor, tested on first day of tenancy.' },
      { text: 'CO alarms: required in every room with a fixed combustion appliance.' },
      { text: 'Legionella: risk assessment required - not annual test, just documented risk assessment.' },
    ],
    upcoming: [
      { severity: 'amber', text: "Awaab's Law from 2026: damp and mould reports must be investigated within 14 days." },
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
