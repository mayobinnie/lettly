import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const R = '#e07b7b'
const RL = '#eca9a9'
const RDIM = 'rgba(224,123,123,0.11)'
const RBDR = 'rgba(224,123,123,0.26)'
const GREEN = '#4ade80'
const GREENDIM = 'rgba(74,222,128,0.10)'
const AMBER = '#fbbf24'
const AMBERDIM = 'rgba(251,191,36,0.10)'

const ITEMS = [
  {
    id: 'info_sheet',
    category: 'immediate',
    deadline: '2026-05-31',
    deadlineLabel: '31 May 2026',
    urgency: 'critical',
    icon: '📄',
    title: 'RRA Information Sheet',
    requirement: 'Send the official government PDF to every tenant named on each written tenancy agreement. Must be the exact PDF from GOV.UK. Cannot send a link: must send the actual document. One copy per named tenant.',
    govLink: 'https://www.gov.uk/government/publications/the-renters-rights-act-information-sheet-2026',
    penalty: 'Up to £7,000 fine per breach',
    fields: [
      { key: 'sent', label: 'Sent to all tenants', type: 'checkbox' },
      { key: 'sent_date', label: 'Date sent', type: 'date' },
      { key: 'method', label: 'How delivered', type: 'select', options: ['Email with PDF attached', 'Post with proof of delivery', 'Hand delivered', 'Via tenant portal'] },
      { key: 'proof_url', label: 'Proof of delivery (optional)', type: 'text', placeholder: 'e.g. Royal Mail tracking number or email confirmation' },
    ],
    benefit: {
      headline: 'Use this as a fresh start conversation',
      points: [
        'Send with a covering note introducing yourself and Lettly, which sets a professional tone that letting agents rarely match.',
        'Tenants who understand the new rules are less likely to dispute legitimate rent increases. The sheet explains Section 13 clearly.',
        'Sending early and with proof of delivery puts you ahead of 90% of landlords. If a dispute ever arises, your documentation is watertight.',
        'No agent involved means you control the narrative about changes. Use it to build trust directly.',
      ]
    }
  },
  {
    id: 'prior_notice_ground1',
    category: 'immediate',
    deadline: '2026-05-31',
    deadlineLabel: '31 May 2026 (recommended)',
    urgency: 'high',
    icon: '🏠',
    title: 'Prior Notice: Ground 1 and 1A',
    requirement: 'If you might ever need to move into the property (Ground 1) or sell it (Ground 1A), you must serve Prior Notice on your tenant before or at the start of the tenancy, or by 31 May 2026 for existing tenancies. Without this you cannot use these grounds.',
    penalty: 'Loss of Ground 1 and 1A possession rights permanently for that tenancy',
    fields: [
      { key: 'ground1_served', label: 'Ground 1 Prior Notice served (landlord/family moving in)', type: 'checkbox' },
      { key: 'ground1a_served', label: 'Ground 1A Prior Notice served (intend to sell)', type: 'checkbox' },
      { key: 'prior_notice_date', label: 'Date served', type: 'date' },
      { key: 'prior_notice_notes', label: 'Notes', type: 'text', placeholder: 'e.g. Served with tenancy agreement on move-in' },
    ],
    benefit: {
      headline: 'Protect your exit options now. It costs nothing',
      points: [
        'Ground 1A (sell) gives you a clean, defined route out if circumstances change: inheritance, divorce, financial pressure. Serve notice now even if you have no current plans to sell.',
        'Ground 1 (move in) protects your right to take back the property for yourself or a family member. One piece of paper served now preserves that right indefinitely.',
        'Four-month notice period under RRA is actually more predictable than Section 21 was in practice, as courts were extending S21 timelines unpredictably.',
        'Serving both notices costs nothing and gives you maximum flexibility. Not serving them removes options you cannot get back.',
      ]
    }
  },
  {
    id: 'rent_increase_process',
    category: 'ongoing',
    urgency: 'medium',
    icon: '💷',
    title: 'Rent increases: Section 13 / Form 4A only',
    requirement: 'From 1 May 2026, rent can only be increased via the Section 13 statutory process using Form 4A, with two months notice. Rent review clauses in tenancy agreements are void. Only one increase per 12 months. Cannot increase rent in first year of a tenancy.',
    penalty: 'Rent review clauses are unenforceable. Tenant can challenge any increase not served via Form 4A at the Tribunal.',
    fields: [
      { key: 'last_increase_date', label: 'Last rent increase date', type: 'date' },
      { key: 'last_increase_amount', label: 'Amount after last increase (£/mo)', type: 'text', placeholder: '850' },
      { key: 'form4a_used', label: 'Form 4A used for last increase', type: 'checkbox' },
      { key: 'next_increase_eligible', label: 'Next increase eligible from', type: 'date' },
    ],
    benefit: {
      headline: 'Section 13 is actually a stronger tool than rent review clauses',
      points: [
        'Tribunal-set rents are capped at open market value, but open market rents have risen significantly. A well-evidenced Form 4A at market rate is hard for tenants to challenge successfully.',
        'Two months notice gives tenants time to prepare, which means fewer disputes and less confrontation than a clause buried in an agreement they signed years ago.',
        'The paper trail is cleaner. Every increase is documented, dated, and served correctly, which protects you if the tenancy ever goes to court.',
        'Lettly can remind you exactly when the 12-month window opens and draft the Form 4A text ready to send.',
      ]
    }
  },
  {
    id: 'pet_requests',
    category: 'ongoing',
    urgency: 'medium',
    icon: '🐾',
    title: 'Pet requests: 28-day response rule',
    requirement: 'Landlords must respond to a written tenant pet request within 28 days. Cannot refuse without a good reason. Blanket no-pets clauses are no longer enforceable. Can require tenant to have pet damage insurance.',
    penalty: 'Fine if you fail to respond within 28 days or refuse without good reason',
    fields: [
      { key: 'pet_policy_updated', label: 'Tenancy agreement pet clause reviewed', type: 'checkbox' },
      { key: 'pet_insurance_required', label: 'Requiring pet damage insurance from tenants with pets', type: 'checkbox' },
      { key: 'open_request', label: 'Current open pet request', type: 'checkbox' },
      { key: 'request_received_date', label: 'Date request received (if open)', type: 'date' },
    ],
    benefit: {
      headline: 'Pet-friendly properties command higher rents and longer tenancies',
      points: [
        'Only 7% of private landlords currently accept pets. Accepting pets responsibly puts your property in front of a much larger, less competitive pool of tenants.',
        'You can now require tenants to hold pet damage insurance as a condition. This transfers the financial risk while you still benefit from higher demand and longer tenancies.',
        'Tenants with pets tend to stay longer, as they know how hard it is to find a pet-friendly property.',
        'Lettly tracks the 28-day response window automatically so you never miss the deadline or lose the right to refuse on valid grounds.',
      ]
    }
  },
  {
    id: 'arrears_threshold',
    category: 'ongoing',
    urgency: 'low',
    icon: '⚖️',
    title: 'Ground 8: arrears threshold now 3 months',
    requirement: 'The mandatory Ground 8 possession threshold increases from 2 to 3 months rent arrears. Arrears must exist both when notice is served and at the court hearing. Notice period increases from 2 weeks to 4 weeks.',
    penalty: 'Court will not grant possession under Ground 8 if arrears fall below 3 months before the hearing',
    fields: [
      { key: 'arrears_process_updated', label: 'Rent arrears escalation process updated', type: 'checkbox' },
      { key: 'arrears_notes', label: 'Notes', type: 'text', placeholder: 'e.g. Updated payment reminder schedule' },
    ],
    benefit: {
      headline: 'Earlier intervention means fewer arrears reaching 3 months',
      points: [
        'The shift to 3 months means landlords who intervene early at 4-6 weeks overdue will resolve most arrears before they become a legal issue, which was always the better outcome anyway.',
        'Lettly flags missed payments in the rent tracker from day one. Early visibility means you can have a conversation before it becomes a formal process.',
        'Ground 14 (persistent late payment) is still available and the threshold is lower. A pattern of late payment is now a stronger basis for action than it was.',
        'Most arrears cases that reach court do so because of poor record-keeping. Lettly logs every payment date and amount automatically, so your evidence is always ready.',
      ]
    }
  },
  {
    id: 'prs_database',
    category: 'future',
    urgency: 'watch',
    icon: '🗄️',
    title: 'PRS Landlord Database registration',
    requirement: 'Coming 2027. Both the landlord and each property must be registered on the Private Rented Sector Database. Details of the scheme are still being confirmed by government.',
    penalty: 'Unlimited fine via magistrates court. Rent Repayment Order of up to 2 years rent possible.',
    fields: [
      { key: 'prs_aware', label: 'Aware of upcoming PRS Database requirement', type: 'checkbox' },
      { key: 'prs_notes', label: 'Notes', type: 'text', placeholder: 'Track updates here' },
    ],
    benefit: {
      headline: 'Registration weeds out the landlords who make your job harder',
      points: [
        'The PRS Database is designed to remove criminal landlords from the market. Compliant landlords benefit from a better regulated sector and tenants who trust the system.',
        'Registered landlords will be easier to distinguish from rogue operators, which matters for tenant choice and your reputation.',
        'Lettly will handle database registration tracking and alerts as soon as the scheme details are confirmed.',
      ]
    }
  },
  {
    id: 'ombudsman',
    category: 'future',
    urgency: 'watch',
    icon: '🏛️',
    title: 'PRS Ombudsman registration',
    requirement: 'Coming 2027. All private landlords will be required to register with the new Private Rented Sector Ombudsman. This provides a dispute resolution service for tenants without going to court.',
    penalty: 'Fines for non-registration. Rent Repayment Order risk.',
    fields: [
      { key: 'ombudsman_aware', label: 'Aware of upcoming Ombudsman requirement', type: 'checkbox' },
    ],
    benefit: {
      headline: 'A structured disputes process protects you as much as tenants',
      points: [
        'Ombudsman decisions are binding on landlords but cheaper and faster than court. For low-value disputes this is almost always better than litigation.',
        'Being registered signals professionalism to tenants, similar to how deposit protection became a market expectation after it was mandated.',
        'The Ombudsman will only adjudicate on complaints, and landlords who maintain good records and communicate well will rarely face a complaint that goes the distance.',
      ]
    }
  },
]

const URGENCY_CONFIG = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', label: 'Act now' },
  high:     { color: AMBER,    bg: AMBERDIM,                  label: 'Before 31 May' },
  medium:   { color: RL,       bg: RDIM,                      label: 'Ongoing' },
  low:      { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)', label: 'Process update' },
  watch:    { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', label: 'Watch: 2027' },
}

function DaysLeft({ deadline }) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000)
  if (diff < 0) return <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>Deadline passed</span>
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: diff < 14 ? '#f87171' : diff < 30 ? AMBER : GREEN }}>
      {diff} days left
    </span>
  )
}

function StatusDot({ checked }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: checked ? GREEN : 'rgba(255,255,255,0.2)',
      boxShadow: checked ? '0 0 6px rgba(74,222,128,0.5)' : 'none'
    }}/>
  )
}

export default function RRAComplianceHub({ propertyId }) {
  const [selected, setSelected] = useState('info_sheet')
  const [records, setRecords] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('track')

  const item = ITEMS.find(i => i.id === selected)
  const urg = URGENCY_CONFIG[item?.urgency] || URGENCY_CONFIG.watch
  const rec = records[selected] || {}

  useEffect(() => {
    if (propertyId) loadRecords()
  }, [propertyId])

  async function loadRecords() {
    const { data } = await supabase
      .from('rra_compliance')
      .select('*')
      .eq('property_id', propertyId)
    if (data) {
      const map = {}
      data.forEach(r => { map[r.item_id] = r })
      setRecords(map)
    }
  }

  function setField(key, val) {
    setRecords(prev => ({
      ...prev,
      [selected]: { ...(prev[selected] || {}), [key]: val }
    }))
  }

  async function handleSave() {
    if (!propertyId) return
    setSaving(true)
    const payload = { ...rec, property_id: propertyId, item_id: selected, updated_at: new Date().toISOString() }
    const existing = records[selected]?.id
    if (existing) {
      await supabase.from('rra_compliance').update(payload).eq('id', existing)
    } else {
      const { data } = await supabase.from('rra_compliance').insert(payload).select().single()
      if (data) setRecords(prev => ({ ...prev, [selected]: data }))
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function isComplete(itemId) {
    const r = records[itemId] || {}
    const it = ITEMS.find(i => i.id === itemId)
    const checkboxFields = (it?.fields || []).filter(f => f.type === 'checkbox')
    return checkboxFields.length > 0 && checkboxFields.some(f => r[f.key])
  }

  const immediate = ITEMS.filter(i => i.category === 'immediate')
  const ongoing = ITEMS.filter(i => i.category === 'ongoing')
  const future = ITEMS.filter(i => i.category === 'future')

  const sideItem = (it) => {
    const complete = isComplete(it.id)
    const u = URGENCY_CONFIG[it.urgency]
    const isActive = selected === it.id
    return (
      <div key={it.id} onClick={() => setSelected(it.id)} style={{
        padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
        background: isActive ? RDIM : 'transparent',
        border: '0.5px solid ' + (isActive ? RBDR : 'transparent'),
        transition: 'all .15s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot checked={complete}/>
          <span style={{ fontSize: 13, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: isActive ? 600 : 400, flex: 1, lineHeight: 1.3 }}>{it.title}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: u.bg, color: u.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{u.label}</span>
        </div>
        {it.deadline && <div style={{ paddingLeft: 16, marginTop: 3 }}><DaysLeft deadline={it.deadline}/></div>}
      </div>
    )
  }

  const sectionLabel = (label) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '10px 12px 4px' }}>{label}</div>
  )

  return (
    <div style={{ background: 'var(--card,#161010)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>

      {/* HEADER */}
      <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--display,inherit)', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Renters Rights Act 2026</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>In force 1 May 2026. Key requirements tracked below.</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['track','Track'], ['benefit','How to benefit']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              background: tab === t ? R : 'rgba(255,255,255,0.06)',
              color: '#fff'
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 500 }}>

        {/* SIDEBAR */}
        <div style={{ width: 240, borderRight: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 8px', flexShrink: 0, overflowY: 'auto' }}>
          {sectionLabel('Act now')}
          {immediate.map(sideItem)}
          {sectionLabel('Ongoing')}
          {ongoing.map(sideItem)}
          {sectionLabel('Coming 2027')}
          {future.map(sideItem)}
        </div>

        {/* MAIN PANEL */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {item && (
            <>
              {/* Item header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--display,inherit)', fontSize: 17, fontWeight: 700 }}>{item.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: urg.bg, color: urg.color }}>{urg.label}</span>
                    {item.deadline && <DaysLeft deadline={item.deadline}/>}
                  </div>
                  {item.deadlineLabel && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Deadline: {item.deadlineLabel}</div>
                  )}
                </div>
              </div>

              {tab === 'track' ? (
                <>
                  {/* Requirement */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>What the law requires</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 }}>{item.requirement}</div>
                    {item.govLink && (
                      <a href={item.govLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: RL, textDecoration: 'underline' }}>Download from GOV.UK</a>
                    )}
                  </div>

                  {/* Penalty */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(248,113,113,0.07)', border: '0.5px solid rgba(248,113,113,0.18)', borderRadius: 8, marginBottom: 20 }}>
                    <span style={{ fontSize: 14 }}>⚠</span>
                    <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{item.penalty}</span>
                  </div>

                  {/* Form fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    {item.fields.map(f => (
                      <div key={f.key}>
                        {f.type === 'checkbox' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <div
                              onClick={() => setField(f.key, !rec[f.key])}
                              style={{
                                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                                border: '0.5px solid ' + (rec[f.key] ? GREEN : 'rgba(255,255,255,0.2)'),
                                background: rec[f.key] ? GREENDIM : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all .15s'
                              }}
                            >
                              {rec[f.key] && <span style={{ color: GREEN, fontSize: 13, lineHeight: 1 }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{f.label}</span>
                          </label>
                        ) : f.type === 'select' ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{f.label}</div>
                            <select value={rec[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', appearance: 'none' }}>
                              <option value="">Select...</option>
                              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        ) : f.type === 'date' ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{f.label}</div>
                            <input type="date" value={rec[f.key] || ''} onChange={e => setField(f.key, e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}/>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{f.label}</div>
                            <input type="text" value={rec[f.key] || ''} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder || ''} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 100, background: R, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    {saved && <span style={{ fontSize: 13, color: GREEN }}>Saved</span>}
                    <button onClick={() => setTab('benefit')} style={{ padding: '10px 20px', borderRadius: 100, background: RDIM, border: '0.5px solid ' + RBDR, color: RL, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      How to use this to your advantage →
                    </button>
                  </div>
                </>
              ) : (
                /* BENEFIT TAB */
                <>
                  <div style={{ background: 'linear-gradient(135deg,rgba(224,123,123,0.08),rgba(224,123,123,0.03))', border: '0.5px solid ' + RBDR, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: RL, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Landlord advantage</div>
                    <div style={{ fontFamily: 'var(--display,inherit)', fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{item.benefit.headline}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {item.benefit.points.map((point, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: RDIM, border: '0.5px solid ' + RBDR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: RL, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75 }}>{point}</div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setTab('track')} style={{ padding: '10px 24px', borderRadius: 100, background: R, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Mark as tracked
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
