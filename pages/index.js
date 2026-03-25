import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { fmt, dueSoon, mergeDoc } from '../lib/data'

/* ─── helpers ──────────────────────────────────────────── */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ─── atoms ────────────────────────────────────────────── */

const PILL = {
  red:   { bg:'#fce8e6', fg:'#791F1F' },
  amber: { bg:'#fff8e1', fg:'#633806' },
  green: { bg:'#e8f5e9', fg:'#1e6e35' },
  blue:  { bg:'#e3f2fd', fg:'#0C447C' },
  brand: { bg:'#eaf4ee', fg:'#1b5e3b' },
  grey:  { bg:'#f2f0eb', fg:'#6b6860' },
}

function Pill({ type='grey', dot, children }) {
  const c = PILL[type] || PILL.grey
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background:c.bg, color:c.fg, whiteSpace:'nowrap' }}>
      {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:c.fg, flexShrink:0 }} />}
      {children}
    </span>
  )
}

function Row({ label, value, valueColor, pill, pillType }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid var(--border)' }}>
      <span style={{ fontSize:12, color:'var(--text-2)' }}>{label}</span>
      {pill
        ? <Pill type={pillType||'grey'} dot>{pill}</Pill>
        : <span style={{ fontSize:12, fontWeight:500, fontFamily:'var(--mono)', color:valueColor||'var(--text)' }}>{value||'—'}</span>
      }
    </div>
  )
}

function Metric({ label, value, sub, subGreen }) {
  return (
    <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
      <div style={{ fontSize:11, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:600, fontFamily:'var(--mono)', letterSpacing:'-0.5px', color:'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, marginTop:3, color: subGreen ? 'var(--green)' : 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

/* ─── doc type helpers ─────────────────────────────────── */

const DOC_META = {
  gas_certificate:     { label:'Gas certificate',      icon:'🔥', color:'#fff8e1', textColor:'#633806' },
  eicr:                { label:'EICR',                  icon:'⚡', color:'#e3f2fd', textColor:'#0C447C' },
  insurance:           { label:'Insurance',             icon:'🛡️', color:'#f3e8ff', textColor:'#6b21a8' },
  tenancy_agreement:   { label:'Tenancy agreement',     icon:'📄', color:'#eaf4ee', textColor:'#1b5e3b' },
  mortgage_offer:      { label:'Mortgage offer',        icon:'🏦', color:'#fce8e6', textColor:'#791F1F' },
  completion_statement:{ label:'Completion statement',  icon:'🏠', color:'#e8f5e9', textColor:'#1e6e35' },
  other:               { label:'Document',              icon:'📋', color:'#f2f0eb', textColor:'#6b6860' },
}

function DocBadge({ type }) {
  const m = DOC_META[type] || DOC_META.other
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background:m.color, color:m.textColor }}>
      <span style={{ fontSize:12 }}>{m.icon}</span>{m.label}
    </span>
  )
}

/* ─── DropZone ─────────────────────────────────────────── */

function DropZone({ onFiles, compact }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setOver(false)
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    if (files.length) onFiles(files)
  }

  if (compact) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        style={{ border:`1.5px dashed ${over ? 'var(--brand)' : 'var(--border-strong)'}`, borderRadius:12, padding:'18px 20px', textAlign:'center', cursor:'pointer', background: over ? 'var(--brand-subtle)' : 'transparent', transition:'all 0.2s', display:'flex', alignItems:'center', gap:12 }}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,image/*" style={{ display:'none' }} onChange={e => { onFiles(Array.from(e.target.files)); e.target.value='' }} />
        <div style={{ width:34, height:34, borderRadius:8, background: over ? 'var(--brand)' : 'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s' }}>
          <UploadIcon color={over ? '#fff' : 'var(--brand)'} size={16} />
        </div>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>Drop more documents</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>PDF or image · gas, EICR, insurance, tenancy</div>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
      style={{
        border:`2px dashed ${over ? 'var(--brand)' : 'rgba(0,0,0,0.14)'}`,
        borderRadius:24, padding:'60px 40px 52px', textAlign:'center',
        background: over ? 'var(--brand-subtle)' : 'var(--surface)',
        cursor:'pointer', transition:'all 0.25s ease',
        boxShadow: over ? '0 0 0 6px rgba(27,94,59,0.06)' : 'var(--shadow-sm)',
      }}
    >
      <input ref={inputRef} type="file" multiple accept=".pdf,image/*" style={{ display:'none' }}
        onChange={e => { onFiles(Array.from(e.target.files)); e.target.value='' }} />

      <div className={over ? '' : 'floating'} style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 24px', background: over ? 'var(--brand)' : 'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.25s' }}>
        <UploadIcon color={over ? '#fff' : 'var(--brand)'} size={34} />
      </div>

      <div style={{ fontFamily:'var(--display)', fontSize:28, fontWeight:400, color:'var(--text)', marginBottom:10, lineHeight:1.2 }}>
        {over ? 'Release to analyse' : (<>Drop your documents here</>)}
      </div>
      <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.75, marginBottom:30 }}>
        Lettly reads your certificates, agreements and mortgage offers<br/>and builds your portfolio automatically.
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:28 }}>
        {Object.values(DOC_META).filter(d => d.label !== 'Document').map(d => (
          <span key={d.label} style={{ fontSize:11, padding:'5px 13px', borderRadius:20, background:d.color, color:d.textColor, display:'inline-flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:13 }}>{d.icon}</span>{d.label}
          </span>
        ))}
      </div>

      <div style={{ fontSize:12, color:'var(--text-3)' }}>PDF or image files · your data never leaves your account</div>
    </div>
  )
}

function UploadIcon({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

/* ─── Queue item ───────────────────────────────────────── */

function QueueItem({ item }) {
  const isDone  = item.status === 'done'
  const isError = item.status === 'error'
  const isWorking = item.status === 'reading' || item.status === 'extracting'
  const ext = item.result?.extracted

  return (
    <div className="scale-in" style={{ display:'flex', gap:14, alignItems:'flex-start', background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:14, padding:'13px 16px', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background: isDone ? 'var(--brand-light)' : isError ? 'var(--red-bg)' : 'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s' }}>
        {isDone  && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
        {isError && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        {isWorking && <div style={{ width:20, height:20, borderRadius:'50%', border:'2.5px solid var(--brand)', borderTopColor:'transparent', animation:'spin 0.75s linear infinite' }} />}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom: isDone && ext ? 6 : 0 }}>
          <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{item.name}</div>
          <Pill type={isDone ? 'green' : isError ? 'red' : item.status === 'extracting' ? 'amber' : 'grey'}>
            {isDone ? 'Extracted ✓' : isError ? 'Error' : item.status === 'extracting' ? 'Analysing…' : 'Reading…'}
          </Pill>
        </div>

        {isDone && ext && (
          <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>
            {ext.summary}
            {ext.property?.shortName && (
              <span style={{ marginLeft:8, color:'var(--brand)', fontWeight:500 }}>· {ext.property.shortName}</span>
            )}
          </div>
        )}

        {isDone && ext?.documentType && (
          <div style={{ marginTop:7 }}>
            <DocBadge type={ext.documentType} />
          </div>
        )}

        {isError && (
          <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>Could not read this document. Try a clearer PDF or scan.</div>
        )}
      </div>
    </div>
  )
}

/* ─── Overview ─────────────────────────────────────────── */

function Overview({ portfolio, onAddDocs }) {
  const props = portfolio.properties || []
  const totalRent = props.reduce((s, p) => s + (p.rent || 0), 0)
  const totalMortgage = props.reduce((s, p) => s + (p.monthlyPayment || 0), 0)
  const netMonthly = totalRent - totalMortgage

  const urgentIssues = []
  const upcomingIssues = []

  props.forEach(p => {
    const gas  = dueSoon(p.gasDue)
    const eicr = dueSoon(p.eicrDue)
    const ins  = dueSoon(p.insuranceRenewal)
    if (p.insuranceType?.toLowerCase() === 'home') urgentIssues.push(`${p.shortName} — Insurance is a HOME policy, not landlord. Call insurer.`)
    if (gas === 'overdue')   urgentIssues.push(`${p.shortName} — Gas certificate is overdue`)
    if (eicr === 'overdue')  urgentIssues.push(`${p.shortName} — EICR is overdue`)
    if (gas === 'due-soon')  upcomingIssues.push({ text:`${p.shortName} — Gas cert due ${p.gasDue}`, date:p.gasDue })
    if (eicr === 'due-soon') upcomingIssues.push({ text:`${p.shortName} — EICR due ${p.eicrDue}`, date:p.eicrDue })
    if (ins === 'due-soon')  upcomingIssues.push({ text:`${p.shortName} — Insurance renews ${p.insuranceRenewal}`, date:p.insuranceRenewal })
  })

  return (
    <div className="fade-up">
      {urgentIssues.length > 0 && (
        <div style={{ background:'#fce8e6', border:'0.5px solid #E24B4A', borderRadius:12, padding:'13px 16px', marginBottom:16, color:'#791F1F', fontSize:12, lineHeight:1.8 }}>
          <div style={{ fontWeight:600, marginBottom:5 }}>⚠️ {urgentIssues.length} urgent action{urgentIssues.length > 1 ? 's' : ''} needed</div>
          {urgentIssues.map((x,i) => <div key={i}>· {x}</div>)}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
        <Metric label="Properties" value={props.length} sub={props.length === 0 ? 'None added yet' : `${props.length} in portfolio`} />
        <Metric label="Monthly rent" value={totalRent ? fmt(totalRent) : '—'} sub={netMonthly > 0 ? `Net ~${fmt(netMonthly)}/mo` : 'Add tenancy docs'} subGreen={netMonthly > 0} />
        <Metric label="Actions needed" value={urgentIssues.length + upcomingIssues.length} sub={urgentIssues.length > 0 ? `${urgentIssues.length} urgent` : 'None urgent'} />
      </div>

      {props.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 24px', background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:16 }}>
          <div style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:400, color:'var(--text-2)', marginBottom:10 }}>No properties yet</div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:22 }}>Drop your property documents to build your portfolio automatically.</div>
          <button onClick={onAddDocs} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'10px 22px', fontSize:12, fontWeight:500, cursor:'pointer' }}>
            + Add documents
          </button>
        </div>
      ) : (
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:16, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Compliance timeline</div>
          {upcomingIssues.length === 0 && urgentIssues.length === 0 && (
            <div style={{ fontSize:12, color:'var(--text-3)', padding:'10px 0' }}>No upcoming compliance issues found in your documents.</div>
          )}
          {upcomingIssues.map((iss, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i < upcomingIssues.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <span style={{ fontSize:12, color:'var(--text-2)' }}>{iss.text}</span>
              <Pill type="amber" dot>Due soon</Pill>
            </div>
          ))}
        </div>
      )}

      {/* Legislation reminder */}
      <div style={{ background:'var(--brand-subtle)', border:'0.5px solid rgba(27,94,59,0.15)', borderRadius:12, padding:'14px 16px', marginTop:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--brand)', marginBottom:6 }}>Renters' Rights Bill — Oct 2026</div>
        <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
          Section 21 no-fault evictions will be abolished. All tenancies become periodic. PRS Database registration required before serving any notice. Ask the AI for a personalised impact assessment.
        </div>
      </div>
    </div>
  )
}

/* ─── Properties ───────────────────────────────────────── */

function Properties({ portfolio, onAddDocs }) {
  const props = portfolio.properties || []

  if (props.length === 0) {
    return (
      <div className="fade-up" style={{ textAlign:'center', padding:'48px 24px', background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:16 }}>
        <div style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:400, color:'var(--text-2)', marginBottom:10 }}>No properties yet</div>
        <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:22 }}>Drop your property documents to add them automatically.</div>
        <button onClick={onAddDocs} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'10px 22px', fontSize:12, fontWeight:500, cursor:'pointer' }}>+ Add documents</button>
      </div>
    )
  }

  return (
    <div className="fade-up">
      {props.map(p => {
        const gasStatus  = dueSoon(p.gasDue)
        const eicrStatus = dueSoon(p.eicrDue)
        const insStatus  = dueSoon(p.insuranceRenewal)
        const gasColor   = gasStatus === 'valid' ? 'var(--green)' : gasStatus === 'due-soon' ? 'var(--amber)' : gasStatus === 'overdue' ? 'var(--red)' : 'var(--text-3)'
        const eicrColor  = eicrStatus === 'valid' ? 'var(--green)' : eicrStatus === 'due-soon' ? 'var(--amber)' : eicrStatus === 'overdue' ? 'var(--red)' : 'var(--text-3)'

        return (
          <div key={p.id} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:16, padding:20, marginBottom:14, boxShadow:'var(--shadow-sm)' }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:400, color:'var(--text)', marginBottom:3 }}>{p.shortName}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:10 }}>{p.address}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {(p.docs || []).map(d => <DocBadge key={d} type={d} />)}
                </div>
              </div>
              {p.rent && (
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                  <div style={{ fontSize:24, fontWeight:600, fontFamily:'var(--mono)', color:'var(--text)', letterSpacing:'-0.5px' }}>{fmt(p.rent)}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)' }}>per month</div>
                </div>
              )}
            </div>

            {/* Data grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              {/* Tenancy + Finance */}
              <div>
                {p.tenantName     && <Row label="Tenant"       value={p.tenantName} />}
                {p.tenantPhone    && <Row label="Phone"        value={p.tenantPhone} />}
                {p.tenancyStart   && <Row label="Start date"   value={p.tenancyStart} />}
                {p.depositAmount  && <Row label="Deposit"      value={fmt(p.depositAmount)} />}
                {p.depositScheme  && <Row label="Scheme"       value={p.depositScheme} />}
                {p.purchasePrice  && <Row label="Purchase"     value={fmt(p.purchasePrice)} />}
                {p.lender         && <Row label="Lender"       value={p.lender} />}
                {p.mortgage       && <Row label="Mortgage"     value={fmt(p.mortgage)} />}
                {p.rate           && <Row label="Rate"         value={`${p.rate}%`} />}
                {p.fixedEnd       && <Row label="Fixed until"  value={p.fixedEnd} />}
                {p.monthlyPayment && <Row label="Monthly pmt"  value={fmt(p.monthlyPayment)} />}
              </div>

              {/* Compliance */}
              <div>
                {p.gasDue         && <Row label="Gas cert due"     value={p.gasDue}              valueColor={gasColor} />}
                {p.eicrDue        && <Row label="EICR due"         value={p.eicrDue}             valueColor={eicrColor} />}
                {p.insurer        && <Row label="Insurer"          value={p.insurer} />}
                {p.policyNo       && <Row label="Policy no."       value={p.policyNo} />}
                {p.insuranceRenewal && <Row label="Ins. renewal"   value={p.insuranceRenewal}    valueColor={insStatus === 'due-soon' ? 'var(--amber)' : 'var(--text)'} />}
                {p.insuranceType && (
                  <Row label="Policy type" value={p.insuranceType}
                    valueColor={p.insuranceType?.toLowerCase() === 'home' ? 'var(--red)' : 'var(--text)'} />
                )}
                {p.insuranceType?.toLowerCase() === 'home' && (
                  <div style={{ marginTop:8, fontSize:11, color:'var(--red)', background:'var(--red-bg)', borderRadius:7, padding:'7px 10px', lineHeight:1.6 }}>
                    This is a home insurance policy — you need landlord insurance for a tenanted property.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── AI tab ───────────────────────────────────────────── */

function AITab({ portfolio }) {
  const propCount = (portfolio.properties || []).length
  const [messages, setMessages] = useState([{
    role:'assistant',
    content: propCount > 0
      ? `I can see your portfolio of ${propCount} propert${propCount === 1 ? 'y' : 'ies'}. Ask me anything about compliance, the Renters' Rights Bill, your finances, or what you should prioritise.`
      : `Welcome to Lettly AI. Drop your documents first to build your portfolio, then I can give you specific advice about your properties, compliance and legislation.`,
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const quickQ = propCount > 0 ? [
    "What are my most urgent compliance actions?",
    "How does the Renters' Rights Bill affect me?",
    "Explain my EPC risk and what I need to do",
    "Should I be in a limited company?",
  ] : [
    "What does the Renters' Rights Bill mean for landlords?",
    "What compliance certificates does a landlord need?",
    "What is Section 24 and how does it affect me?",
    "What is EPC minimum C and when does it apply?",
  ]

  async function send(text) {
    const q = (text || input).trim()
    if (!q || loading) return
    const newMsgs = [...messages, { role:'user', content:q }]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: newMsgs.slice(1), portfolio }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role:'assistant', content: data.content || 'Sorry, could not get a response.' }])
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content:'Connection error — please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="fade-up">
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
        {quickQ.map((q,i) => (
          <button key={i} onClick={() => send(q)} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:20, padding:'5px 13px', fontSize:11, color:'var(--text-2)', cursor:'pointer', transition:'border-color 0.15s' }}
            onMouseEnter={e => e.target.style.borderColor='var(--brand-mid)'}
            onMouseLeave={e => e.target.style.borderColor='var(--border)'}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', height:500 }}>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:12, background:'var(--surface2)', borderRadius:'14px 14px 0 0', border:'0.5px solid var(--border)', borderBottom:'none' }}>
          {messages.map((m,i) => (
            <div key={i} style={{ maxWidth:'88%', alignSelf: m.role==='user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ fontSize:10, color:'var(--brand)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.6px', fontWeight:600 }}>Lettly AI</div>
              )}
              <div style={{
                padding:'10px 14px',
                borderRadius: m.role==='user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role==='user' ? 'var(--brand)' : 'var(--surface)',
                color: m.role==='user' ? '#fff' : 'var(--text)',
                border: m.role==='assistant' ? '0.5px solid var(--border)' : 'none',
                fontSize:12, lineHeight:1.7, whiteSpace:'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf:'flex-start' }}>
              <div style={{ fontSize:10, color:'var(--brand)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.6px', fontWeight:600 }}>Lettly AI</div>
              <div className="pulsing" style={{ padding:'10px 14px', borderRadius:'12px 12px 12px 2px', background:'var(--surface)', border:'0.5px solid var(--border)', fontSize:12, color:'var(--text-3)' }}>Thinking…</div>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, background:'var(--surface)', border:'0.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 14px 14px', padding:10 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask about compliance, legislation or your portfolio…"
            rows={1} style={{ flex:1, background:'var(--surface2)', border:'0.5px solid var(--border)', borderRadius:8, padding:'8px 12px', fontFamily:'var(--font)', fontSize:12, color:'var(--text)', resize:'none', outline:'none' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontSize:12, fontWeight:500, cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1, transition:'opacity 0.15s' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Upload screen ────────────────────────────────────── */

function UploadScreen({ queue, onFiles, onOpenPortfolio, portfolioReady }) {
  const doneCount = queue.filter(q => q.status === 'done').length
  const anyWorking = queue.some(q => q.status === 'reading' || q.status === 'extracting')

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* Navbar */}
      <nav style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, background:'var(--brand)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontSize:16, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
          </div>
          <span style={{ fontFamily:'var(--display)', fontSize:19, fontWeight:400, color:'var(--text)' }}>Lettly</span>
          <span style={{ fontSize:10, color:'var(--brand)', background:'var(--brand-light)', padding:'2px 9px', borderRadius:20, fontWeight:500 }}>beta</span>
        </div>
        {portfolioReady && (
          <button onClick={onOpenPortfolio} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:9, padding:'9px 20px', fontSize:13, fontWeight:500, cursor:'pointer', boxShadow:'0 2px 10px rgba(27,94,59,0.2)' }}>
            View portfolio →
          </button>
        )}
      </nav>

      {/* Content */}
      <div style={{ flex:1, maxWidth:700, width:'100%', margin:'0 auto', padding:'64px 24px 48px' }}>
        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <div style={{ fontFamily:'var(--display)', fontSize:46, fontWeight:300, lineHeight:1.15, color:'var(--text)', marginBottom:16 }}>
            Your property portfolio,<br/>
            <em style={{ fontStyle:'italic', color:'var(--brand)' }}>understood instantly.</em>
          </div>
          <div style={{ fontSize:15, color:'var(--text-2)', lineHeight:1.8, maxWidth:500, margin:'0 auto' }}>
            Drop your certificates, agreements and mortgage offers.<br/>
            Lettly extracts everything and keeps you compliant.
          </div>
        </div>

        {/* Drop zone */}
        <DropZone onFiles={onFiles} />

        {/* Processing queue */}
        {queue.length > 0 && (
          <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:9 }}>
            {queue.map(item => <QueueItem key={item.id} item={item} />)}
          </div>
        )}

        {/* CTA once done */}
        {portfolioReady && !anyWorking && (
          <div className="fade-up" style={{ textAlign:'center', marginTop:32 }}>
            <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:16 }}>
              {doneCount} document{doneCount !== 1 ? 's' : ''} extracted successfully
            </div>
            <button onClick={onOpenPortfolio} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:12, padding:'15px 40px', fontSize:15, fontWeight:500, cursor:'pointer', boxShadow:'0 6px 20px rgba(27,94,59,0.25)', transition:'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.target.style.transform='translateY(-1px)'; e.target.style.boxShadow='0 8px 24px rgba(27,94,59,0.3)' }}
              onMouseLeave={e => { e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 6px 20px rgba(27,94,59,0.25)' }}>
              Open my portfolio →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Dashboard ────────────────────────────────────────── */

const TABS = [
  { id:'overview',   label:'Overview' },
  { id:'properties', label:'Properties' },
  { id:'ai',         label:'Lettly AI' },
]

function Dashboard({ portfolio, onAddDocs }) {
  const [tab, setTab] = useState('overview')
  const [showUpload, setShowUpload] = useState(false)
  const [queue, setQueue] = useState([])

  async function handleDashFiles(files) {
    setShowUpload(false)
    // Re-use the parent's file handler — passed via prop below
    onAddDocs(files)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* Sticky navbar */}
      <nav style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, background:'var(--brand)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontSize:15, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
          </div>
          <span style={{ fontFamily:'var(--display)', fontSize:18, fontWeight:400, color:'var(--text)' }}>Lettly</span>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:1, background:'var(--surface2)', padding:3, borderRadius:10 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab===t.id ? 'var(--surface)' : 'transparent',
              border: tab===t.id ? '0.5px solid var(--border)' : 'none',
              padding:'5px 16px', borderRadius:7, fontFamily:'var(--font)', fontSize:12,
              color: tab===t.id ? 'var(--text)' : 'var(--text-2)',
              fontWeight: tab===t.id ? 500 : 400, cursor:'pointer',
              boxShadow: tab===t.id ? 'var(--shadow-sm)' : 'none',
            }}>
              {t.label}
              {t.id === 'ai' && <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'var(--brand)', marginLeft:5, verticalAlign:'middle' }} />}
            </button>
          ))}
        </div>

        <button onClick={() => setShowUpload(v => !v)} style={{ background:'none', border:'0.5px solid var(--border-strong)', borderRadius:8, padding:'6px 14px', fontSize:12, color:'var(--text-2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add documents
        </button>
      </nav>

      {/* Inline upload panel */}
      {showUpload && (
        <div className="fade-in" style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'16px 24px' }}>
          <div style={{ maxWidth:700, margin:'0 auto' }}>
            <DropZone onFiles={onAddDocs} compact />
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth:1060, margin:'0 auto', padding:'24px 20px' }}>
        {tab === 'overview'   && <Overview   portfolio={portfolio} onAddDocs={() => setShowUpload(true)} />}
        {tab === 'properties' && <Properties portfolio={portfolio} onAddDocs={() => setShowUpload(true)} />}
        {tab === 'ai'         && <AITab      portfolio={portfolio} />}
      </div>
    </div>
  )
}

/* ─── Root ─────────────────────────────────────────────── */

export default function Lettly() {
  const [view,      setView]      = useState('upload')
  const [portfolio, setPortfolio] = useState({ properties:[] })
  const [queue,     setQueue]     = useState([])

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lettly_v2')
      if (saved) {
        const data = JSON.parse(saved)
        if (data?.properties?.length > 0) {
          setPortfolio(data)
          setView('dashboard')
        }
      }
    } catch {}
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (portfolio.properties?.length > 0) {
      try { localStorage.setItem('lettly_v2', JSON.stringify(portfolio)) } catch {}
    }
  }, [portfolio])

  async function handleFiles(files) {
    const valid = files.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'))
    if (!valid.length) return

    for (const file of valid) {
      const id = Math.random().toString(36).slice(2)
      setQueue(q => [...q, { id, name:file.name, status:'reading' }])

      try {
        const b64 = await fileToBase64(file)
        setQueue(q => q.map(x => x.id === id ? { ...x, status:'extracting' } : x))

        const res = await fetch('/api/extract', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ filename:file.name, data:b64, mediaType:file.type }),
        })
        const result = await res.json()

        setQueue(q => q.map(x => x.id === id ? { ...x, status: result.success ? 'done' : 'error', result } : x))

        if (result.success && result.extracted) {
          setPortfolio(prev => mergeDoc(prev, result.extracted))
        }
      } catch {
        setQueue(q => q.map(x => x.id === id ? { ...x, status:'error' } : x))
      }
    }
  }

  const hasExtracted = portfolio.properties?.length > 0 || queue.some(q => q.status === 'done')

  return (
    <>
      <Head>
        <title>Lettly — AI property portfolio management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Drop your property documents — Lettly extracts everything and keeps you compliant." />
      </Head>

      {view === 'dashboard' ? (
        <Dashboard portfolio={portfolio} onAddDocs={handleFiles} />
      ) : (
        <UploadScreen
          queue={queue}
          onFiles={handleFiles}
          onOpenPortfolio={() => setView('dashboard')}
          portfolioReady={hasExtracted}
        />
      )}
    </>
  )
}
