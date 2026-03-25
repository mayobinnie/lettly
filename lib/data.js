export function fmt(n) {
  if (n == null || n === '') return '—'
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

export function statusLabel(status) {
  if (status === 'valid')    return { text: 'Valid', type: 'green' }
  if (status === 'due-soon') return { text: 'Due soon', type: 'amber' }
  if (status === 'overdue')  return { text: 'Overdue', type: 'red' }
  if (status === 'unknown')  return { text: 'Unknown', type: 'grey' }
  return { text: status || 'Unknown', type: 'grey' }
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

  const t = extracted.tenancy || {}
  if (t.tenantName)    patch.tenantName = t.tenantName
  if (t.tenantPhone)   patch.tenantPhone = t.tenantPhone
  if (t.tenantEmail)   patch.tenantEmail = t.tenantEmail
  if (t.rent)          patch.rent = t.rent
  if (t.depositAmount) patch.depositAmount = t.depositAmount
  if (t.depositScheme) patch.depositScheme = t.depositScheme
  if (t.startDate)     patch.tenancyStart = t.startDate

  const f = extracted.finance || {}
  if (f.lender)         patch.lender = f.lender
  if (f.mortgage)       patch.mortgage = f.mortgage
  if (f.rate)           patch.rate = f.rate
  if (f.fixedEnd)       patch.fixedEnd = f.fixedEnd
  if (f.purchasePrice)  patch.purchasePrice = f.purchasePrice
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
