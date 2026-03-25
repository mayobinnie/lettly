import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import { PORTFOLIO, fmt, ltv } from '../lib/data'

const PILL = {
  red: { bg: '#fce8e6', color: '#791F1F' },
  amber: { bg: '#fff8e1', color: '#633806' },
  green: { bg: '#e8f5e9', color: '#1e6e35' },
  blue: { bg: '#e3f2fd', color: '#0C447C' },
  brand: { bg: '#e8f5ee', color: '#1a6b4a' },
  grey: { bg: '#f2f0ec', color: '#6b6860' },
}

function Pill({ type = 'grey', children, dot }) {
  const s = PILL[type]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, padding:'2px 9px', borderRadius:20, background:s.bg, color:s.color }}>
      {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:s.color, flexShrink:0 }} />}
      {children}
    </span>
  )
}

function MetricCard({ label, value, sub, subColor }) {
  return (
    <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'13px 15px' }}>
      <div style={{ fontSize:11, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:600, fontFamily:'var(--mono)', letterSpacing:'-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize:11, marginTop:3, color: subColor || 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'15px', ...style }}>
      {children}
    </div>
  )
}

function Row({ label, value, valueColor, pill, pillType }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid var(--border)' }}>
      <span style={{ fontSize:12, color:'var(--text-2)' }}>{label}</span>
      <span>
        {pill ? <Pill type={pillType||'grey'} dot>{pill}</Pill>
          : <span style={{ fontSize:12, fontWeight:500, fontFamily:'var(--mono)', color:valueColor||'var(--text)' }}>{value}</span>}
      </span>
    </div>
  )
}

function Alert({ type = 'amber', title, children }) {
  const colors = {
    red:   { bg:'#fce8e6', border:'#E24B4A', color:'#791F1F' },
    amber: { bg:'#fff8e1', border:'#EF9F27', color:'#633806' },
    green: { bg:'#e8f5e9', border:'#639922', color:'#27500A' },
    blue:  { bg:'#e3f2fd', border:'#378ADD', color:'#0C447C' },
    brand: { bg:'#e8f5ee', border:'#2d8a60', color:'#1a6b4a' },
  }
  const c = colors[type]
  return (
    <div style={{ background:c.bg, border:`0.5px solid ${c.border}`, borderRadius:'var(--radius)', padding:'11px 14px', marginBottom:12, color:c.color, fontSize:12, lineHeight:1.6 }}>
      {title && <div style={{ fontWeight:600, marginBottom:3 }}>{title}</div>}
      {children}
    </div>
  )
}

function complianceStatus(prop) {
  const issues = prop.issues || []
  if (issues.some(i => i.toLowerCase().includes('insurance wrong') || i.toLowerCase().includes('urgent'))) return 'red'
  if (issues.length > 0) return 'amber'
  return 'green'
}

function Overview({ onTab }) {
  const s = PORTFOLIO.summary
  return (
    <div className="fade-up">
      <Alert type="red" title="2 actions needed now">
        11 Northfield insurance is a home policy on a tenanted property — call LV= 0330 678 5111 ·
        3 Northfield CO/smoke alarms recorded NA — confirm with tenant
      </Alert>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        <MetricCard label="Portfolio value" value="£630k" sub="5 BTL properties" />
        <MetricCard label="Net equity" value={fmt(s.totalEquity)} sub="54% avg LTV" />
        <MetricCard label="Monthly income" value={fmt(s.monthlyRent)} sub={`Net ${fmt(s.monthlyNet)}/mo`} subColor="var(--green)" />
        <MetricCard label="Legislation risk" value="Medium" sub="Renters' Rights Bill" subColor="var(--amber)" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Compliance status</div>
          {[
            ['11 Northfield — Insurance', 'red', 'Wrong policy type'],
            ['3 Northfield — CO/smoke alarms', 'red', 'Unconfirmed'],
            ['7 Towerhill — EICR', 'red', 'Book by May 2026'],
            ['11 Northfield — Gas', 'amber', 'Due Jun 2026'],
            ['3 Northfield — Gas', 'amber', 'Due Jun 2026'],
            ['7 Towerhill — Gas + insurance', 'amber', 'Both expire Jun 2026'],
            ['11 Northfield — EICR', 'green', 'Valid to Jul 2029'],
            ['31 Northfield + 602 Hotham', 'grey', 'New — arrange all'],
          ].map(([label, type, text], i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom: i < 7 ? '0.5px solid var(--border)' : 'none' }}>
              <span style={{ fontSize:12, color:'var(--text-2)' }}>{label}</span>
              <Pill type={type} dot>{text}</Pill>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Remortgage strategy</div>
          <Row label="602 Hotham — fixed until" value="31/07/2028" />
          <Row label="602 Hotham — ERC if Sep 2026" value="£1,972" valueColor="var(--red)" />
          <Row label="602 Hotham — capital available" value="£16,125" valueColor="var(--green)" />
          <Row label="31 Northfield — capital available" value="£33,750" valueColor="var(--green)" />
          <Row label="Total recyclable (Sep 2026)" value="~£47,900" valueColor="var(--brand)" />
          <div style={{ marginTop:10, padding:10, background:'var(--surface2)', borderRadius:'var(--radius-sm)', fontSize:11, color:'var(--text-2)', lineHeight:1.6 }}>
            Recommendation: wait until Aug 2028 on Hotham to save £1,972 ERC unless capital urgently needed.
          </div>
          <button onClick={() => onTab('ai')} style={{ marginTop:10, width:'100%', padding:'8px', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', fontSize:12, cursor:'pointer', color:'var(--text-2)' }}>
            Ask Lettly AI for remortgage advice ↗
          </button>
        </Card>
      </div>
    </div>
  )
}

function Properties() {
  return (
    <div className="fade-up">
      {PORTFOLIO.properties.map(p => {
        const net = p.monthlyRent - p.monthlyPayment - p.monthlyCosts
        const eq = p.currentValue - p.mortgage
        const ltvVal = ltv(p.mortgage, p.currentValue)
        const gy = (p.monthlyRent * 12 / p.currentValue * 100).toFixed(1)
        const cs = complianceStatus(p)
        return (
          <div key={p.id} style={{ border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:15, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>
                  {p.name}
                  <span style={{ fontSize:11, fontWeight:400, color:'var(--text-3)', marginLeft:8 }}>{p.address}</span>
                </div>
                <div style={{ display:'flex', gap:5, marginTop:5 }}>
                  <Pill type={p.ownership === 'Ltd Co' ? 'blue' : 'brand'}>{p.ownership}</Pill>
                  <Pill type={p.status === 'Let' ? 'green' : 'amber'}>{p.status}</Pill>
                  {p.issues?.length > 0 && <Pill type={cs} dot>{p.issues.length} action{p.issues.length > 1 ? 's' : ''}</Pill>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:20, fontWeight:600, fontFamily:'var(--mono)' }}>{fmt(eq)}</div>
                <div style={{ fontSize:10, color:'var(--text-3)' }}>equity · {ltvVal}% LTV</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {[
                ['Value', fmt(p.currentValue)],
                ['Mortgage', fmt(p.mortgage)],
                ['Rent/mo', fmt(p.monthlyRent), 'var(--green)'],
                ['Net/mo', fmt(net), net > 0 ? 'var(--green)' : 'var(--red)'],
                ['Bought', p.yearBought],
                ['Gain', fmt(p.gain), 'var(--green)'],
                ['Gross yield', `${gy}%`],
                ['EPC', p.epcRating || 'Unknown', 'var(--text-3)'],
              ].map(([l, v, c], i) => (
                <div key={i} style={{ background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:'8px 10px' }}>
                  <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:500, fontFamily:'var(--mono)', color: c || 'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
            {p.issues?.length > 0 && (
              <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                {p.issues.map((issue, i) => (
                  <span key={i} style={{ fontSize:10, background:'var(--surface2)', color:'var(--text-2)', padding:'2px 8px', borderRadius:4 }}>{issue}</span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Legislation({ onAsk }) {
  return (
    <div className="fade-up">
      <Alert type="amber" title="Renters' Rights Bill — Royal Assent expected 2025, in force Oct 2026">
        Section 21 abolished. PRS Database registration mandatory. All 5 of your tenancies are affected.
      </Alert>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {PORTFOLIO.legislation.map(leg => (
          <div key={leg.id} style={{ border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{leg.name}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{leg.status} · {leg.effectDate}</div>
              </div>
              <Pill type={leg.impact === 'high' ? 'red' : leg.impact === 'medium' ? 'amber' : 'green'}>
                {leg.impact === 'high' ? 'High impact' : leg.impact === 'medium' ? 'Medium' : 'Ongoing'}
              </Pill>
            </div>
            {leg.items.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom: i < leg.items.length-1 ? '0.5px solid var(--border)' : 'none', fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>
                <div style={{ width:12, height:12, borderRadius:3, background: item.severity === 'red' ? '#fce8e6' : item.severity === 'amber' ? '#fff8e1' : '#e8f5e9', flexShrink:0, marginTop:2 }} />
                <span>{item.text}</span>
              </div>
            ))}
            <button onClick={() => onAsk(`How does ${leg.name} affect my portfolio specifically?`)} style={{ marginTop:10, width:'100%', padding:'7px', background:'none', border:'0.5px solid var(--border-strong)', borderRadius:'var(--radius-sm)', fontSize:11, cursor:'pointer', color:'var(--text-2)' }}>
              Ask Lettly AI for detailed impact ↗
            </button>
          </div>
        ))}
        <div style={{ border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:14 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>PRS Database — landlord registration</div>
          <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, marginBottom:10 }}>
            Mandatory under the Renters' Rights Bill. Cannot serve any valid possession notice without being registered. Lettly will track your registration status automatically.
          </div>
          <Pill type="red" dot>Not yet open — register when portal launches</Pill>
        </div>
        <div style={{ border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:14 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>EPC roadmap — your properties</div>
          {PORTFOLIO.properties.map(p => (
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'0.5px solid var(--border)', fontSize:12 }}>
              <span style={{ color:'var(--text-2)' }}>{p.name}</span>
              <Pill type="grey">Rating unknown — check</Pill>
            </div>
          ))}
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:8 }}>All EPC ratings unknown. Critical to check before 2028 deadline.</div>
        </div>
      </div>
    </div>
  )
}

function Contacts() {
  return (
    <div className="fade-up">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {PORTFOLIO.contacts.map((c, i) => (
          <div key={i} style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:14 }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-3)', marginBottom:4 }}>{c.role}</div>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>
              {c.name}
              {c.company && <span style={{ fontSize:11, fontWeight:400, color:'var(--text-3)', marginLeft:6 }}>{c.company}</span>}
            </div>
            {c.tel && <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:2 }}>{c.tel}</div>}
            {c.email && <div style={{ fontSize:12, color:'var(--brand)', marginBottom:2 }}>{c.email}</div>}
            {c.note && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>{c.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function AIAssistant({ initialQuestion }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:"I'm Lettly AI — I know your full portfolio, confirmed mortgage terms, compliance deadlines, and the Renters' Rights Bill impact on your properties. Ask me anything." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef(null)
  const didInitRef = useRef(false)

  const quickQ = [
    "How does the Renters' Rights Bill affect my 5 properties?",
    'Should I remortgage 602 Hotham in 2026 or wait until 2028?',
    'Build me a 6-month compliance action plan',
    'Which properties have EPC risk and what would I need to do?',
    'What happens to my tenancies when Section 21 is abolished?',
    'Is my 11 Northfield insurance valid for a tenanted property?',
  ]

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (initialQuestion && !didInitRef.current) {
      didInitRef.current = true
      setTimeout(() => send(initialQuestion), 100)
    }
  }, [initialQuestion])

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
        body: JSON.stringify({ messages: newMsgs.slice(1) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role:'assistant', content: data.content || 'Sorry, could not respond.' }])
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content:'Connection error — please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="fade-up">
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
        {quickQ.map((q, i) => (
          <button key={i} onClick={() => send(q)} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:20, padding:'4px 12px', fontSize:11, color:'var(--text-2)', cursor:'pointer' }}>
            {q}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', height:480 }}>
        <div ref={msgsRef} style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10, background:'var(--surface2)', borderRadius:'12px 12px 0 0', border:'0.5px solid var(--border)', borderBottom:'none' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ maxWidth:'88%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && <div style={{ fontSize:10, color:'var(--brand)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:600 }}>Lettly AI</div>}
              <div style={{
                padding:'9px 13px',
                borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                background: m.role === 'user' ? 'var(--brand)' : 'var(--surface)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                border: m.role === 'assistant' ? '0.5px solid var(--border)' : 'none',
                fontSize:12, lineHeight:1.65, whiteSpace:'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf:'flex-start' }}>
              <div style={{ fontSize:10, color:'var(--brand)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:600 }}>Lettly AI</div>
              <div style={{ padding:'9px 13px', borderRadius:'10px 10px 10px 2px', background:'var(--surface)', border:'0.5px solid var(--border)', fontSize:12, color:'var(--text-3)' }} className="pulsing">Thinking…</div>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, background:'var(--surface)', border:'0.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', padding:9 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }} placeholder="Ask Lettly about your portfolio or legislation..." rows={1}
            style={{ flex:1, background:'var(--surface2)', border:'0.5px solid var(--border)', borderRadius:7, padding:'8px 11px', fontFamily:'var(--font)', fontSize:12, color:'var(--text)', resize:'none', outline:'none' }} />
          <button onClick={() => send()} disabled={loading||!input.trim()} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:7, padding:'8px 16px', fontFamily:'var(--font)', fontSize:12, fontWeight:500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id:'overview', label:'Overview' },
  { id:'properties', label:'Properties' },
  { id:'legislation', label:'Legislation' },
  { id:'contacts', label:'Contacts' },
  { id:'ai', label:'Lettly AI' },
]

export default function Lettly() {
  const [tab, setTab] = useState('overview')
  const [aiQuestion, setAiQuestion] = useState(null)

  function goAI(q) { setAiQuestion(q); setTab('ai') }

  return (
    <>
      <Head>
        <title>Lettly — AI-powered landlord portfolio management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Lettly — AI-powered property portfolio management for UK landlords. Compliance tracking, mortgage strategy, Renters' Rights Bill monitoring." />
      </Head>

      <div style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, background:'var(--brand)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontSize:12, fontWeight:700, letterSpacing:'-0.5px' }}>L</span>
          </div>
          <span style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.4px', color:'var(--text)' }}>
            Lettly
          </span>
          <span style={{ fontSize:10, color:'var(--text-3)', background:'var(--brand-light)', color:'var(--brand)', padding:'2px 7px', borderRadius:20, fontWeight:500 }}>beta</span>
        </div>

        <div style={{ display:'flex', gap:1, background:'var(--surface2)', padding:3, borderRadius:9 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? 'var(--surface)' : 'none',
              border: tab === t.id ? '0.5px solid var(--border)' : 'none',
              padding:'5px 12px', borderRadius:7,
              fontFamily:'var(--font)', fontSize:12,
              color: tab === t.id ? 'var(--text)' : 'var(--text-2)',
              fontWeight: tab === t.id ? 500 : 400,
              cursor:'pointer', whiteSpace:'nowrap',
              boxShadow: tab === t.id ? 'var(--shadow)' : 'none',
            }}>
              {t.label}
              {t.id === 'legislation' && <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#E24B4A', marginLeft:4, verticalAlign:'middle' }} />}
            </button>
          ))}
        </div>

        <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)' }}>lettly.co</div>
      </div>

      <div style={{ padding:'20px', maxWidth:1060, margin:'0 auto' }}>
        {tab === 'overview'    && <Overview onTab={goAI} />}
        {tab === 'properties'  && <Properties />}
        {tab === 'legislation' && <Legislation onAsk={goAI} />}
        {tab === 'contacts'    && <Contacts />}
        {tab === 'ai'          && <AIAssistant initialQuestion={aiQuestion} />}
      </div>
    </>
  )
}
