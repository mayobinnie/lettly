import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useUser, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { fmt, dueSoon, mergeDoc } from '../lib/data'

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

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
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid var(--border)', gap:8 }}>
      <span style={{ fontSize:12, color:'var(--text-2)', flexShrink:0 }}>{label}</span>
      {pill
        ? <Pill type={pillType||'grey'} dot>{pill}</Pill>
        : <span style={{ fontSize:12, fontWeight:500, fontFamily:'var(--mono)', color:valueColor||'var(--text)', textAlign:'right' }}>{value||'—'}</span>
      }
    </div>
  )
}

function Metric({ label, value, sub, subGreen }) {
  return (
    <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
      <div style={{ fontSize:11, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:600, fontFamily:'var(--mono)', letterSpacing:'-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize:11, marginTop:3, color: subGreen ? 'var(--green)' : 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

const DOC_META = {
  gas_certificate:      { label:'Gas cert',    icon:'🔥', bg:'#fff8e1', fg:'#633806' },
  eicr:                 { label:'EICR',        icon:'⚡', bg:'#e3f2fd', fg:'#0C447C' },
  insurance:            { label:'Insurance',   icon:'🛡️', bg:'#f3e8ff', fg:'#6b21a8' },
  tenancy_agreement:    { label:'Tenancy',     icon:'📄', bg:'#eaf4ee', fg:'#1b5e3b' },
  mortgage_offer:       { label:'Mortgage',    icon:'🏦', bg:'#fce8e6', fg:'#791F1F' },
  completion_statement: { label:'Completion',  icon:'🏠', bg:'#e8f5e9', fg:'#1e6e35' },
  other:                { label:'Document',    icon:'📋', bg:'#f2f0eb', fg:'#6b6860' },
}

function DocBadge({ type }) {
  const m = DOC_META[type] || DOC_META.other
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, background:m.bg, color:m.fg }}>
      <span style={{ fontSize:12 }}>{m.icon}</span>{m.label}
    </span>
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

function DropZone({ onFiles, compact }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault(); setOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'))
    if (files.length) onFiles(files)
  }

  if (compact) {
    return (
      <div onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}} onDrop={handleDrop} onClick={()=>inputRef.current.click()}
        style={{ border:`1.5px dashed ${over?'var(--brand)':'var(--border-strong)'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', background:over?'var(--brand-subtle)':'transparent', transition:'all 0.2s', display:'flex', alignItems:'center', gap:12 }}>
        <input ref={inputRef} type="file" multiple accept=".pdf,image/*" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}} />
        <div style={{ width:32, height:32, borderRadius:8, background:over?'var(--brand)':'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <UploadIcon color={over?'#fff':'var(--brand)'} size={15} />
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>Drop more documents</div>
          <div style={{ fontSize:11, color:'var(--text-3)' }}>PDF or image · gas cert, EICR, insurance, tenancy</div>
        </div>
      </div>
    )
  }

  return (
    <div onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}} onDrop={handleDrop} onClick={()=>inputRef.current.click()}
      style={{ border:`2px dashed ${over?'var(--brand)':'rgba(0,0,0,0.14)'}`, borderRadius:20, padding:'clamp(32px,5vw,52px) clamp(20px,4vw,40px)', textAlign:'center', background:over?'var(--brand-subtle)':'var(--surface)', cursor:'pointer', transition:'all 0.25s ease' }}>
      <input ref={inputRef} type="file" multiple accept=".pdf,image/*" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}} />
      <div className={over?'':'floating'} style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 18px', background:over?'var(--brand)':'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.25s' }}>
        <UploadIcon color={over?'#fff':'var(--brand)'} size={28} />
      </div>
      <div style={{ fontFamily:'var(--display)', fontSize:'clamp(18px,3vw,24px)', fontWeight:400, color:'var(--text)', marginBottom:8, lineHeight:1.2 }}>
        {over ? 'Release to analyse' : 'Drop your documents here'}
      </div>
      <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.75, marginBottom:22 }}>
        Lettly reads your certificates, agreements and mortgage offers<br/>and builds your portfolio automatically.
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:18 }}>
        {Object.values(DOC_META).filter(d=>d.label!=='Document').map(d => (
          <span key={d.label} style={{ fontSize:11, padding:'4px 11px', borderRadius:20, background:d.bg, color:d.fg, display:'inline-flex', alignItems:'center', gap:4 }}>
            <span style={{fontSize:12}}>{d.icon}</span>{d.label}
          </span>
        ))}
      </div>
      <div style={{ fontSize:11, color:'var(--text-3)' }}>PDF or image files · your data stays private</div>
    </div>
  )
}

function QueueItem({ item }) {
  const isDone = item.status==='done', isError = item.status==='error'
  const isWorking = item.status==='reading'||item.status==='extracting'
  const ext = item.result?.extracted
  return (
    <div className="scale-in" style={{ display:'flex', gap:12, alignItems:'flex-start', background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ width:38, height:38, borderRadius:9, flexShrink:0, background:isDone?'var(--brand-light)':isError?'var(--red-bg)':'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {isDone  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
        {isError && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        {isWorking && <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid var(--brand)', borderTopColor:'transparent', animation:'spin 0.75s linear infinite' }}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:isDone&&ext?5:0, flexWrap:'wrap' }}>
          <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{item.name}</div>
          <Pill type={isDone?'green':isError?'red':item.status==='extracting'?'amber':'grey'}>
            {isDone?'Extracted ✓':isError?'Error':item.status==='extracting'?'Analysing…':'Reading…'}
          </Pill>
        </div>
        {isDone && ext && <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>{ext.summary}{ext.property?.shortName && <span style={{ marginLeft:6, color:'var(--brand)', fontWeight:500 }}>· {ext.property.shortName}</span>}</div>}
        {isDone && ext?.documentType && <div style={{ marginTop:6 }}><DocBadge type={ext.documentType}/></div>}
        {isError && <div style={{ fontSize:11, color:'var(--red)', marginTop:3 }}>{item.result?.error || 'Could not read this file.'}</div>}
      </div>
    </div>
  )
}

function Overview({ portfolio, onAddDocs, onFiles }) {
  const props = portfolio.properties || []
  const totalRent = props.reduce((s,p)=>s+(p.rent||0),0)
  const totalPayment = props.reduce((s,p)=>s+(p.monthlyPayment||0),0)
  const net = totalRent - totalPayment
  const urgent=[], upcoming=[]
  props.forEach(p => {
    const gas=dueSoon(p.gasDue), eicr=dueSoon(p.eicrDue), ins=dueSoon(p.insuranceRenewal)
    if (p.insuranceType?.toLowerCase()==='home') urgent.push(`${p.shortName} — Insurance is a HOME policy, not landlord`)
    if (gas==='overdue')   urgent.push(`${p.shortName} — Gas certificate overdue`)
    if (eicr==='overdue')  urgent.push(`${p.shortName} — EICR overdue`)
    if (gas==='due-soon')  upcoming.push(`${p.shortName} — Gas cert due ${p.gasDue}`)
    if (eicr==='due-soon') upcoming.push(`${p.shortName} — EICR due ${p.eicrDue}`)
    if (ins==='due-soon')  upcoming.push(`${p.shortName} — Insurance renews ${p.insuranceRenewal}`)
  })
  return (
    <div className="fade-up">
      {urgent.length>0 && (
        <div style={{ background:'#fce8e6', border:'0.5px solid #E24B4A', borderRadius:12, padding:'12px 14px', marginBottom:14, color:'#791F1F', fontSize:12, lineHeight:1.8 }}>
          <div style={{ fontWeight:600, marginBottom:4 }}>⚠️ {urgent.length} urgent action{urgent.length>1?'s':''}</div>
          {urgent.map((x,i)=><div key={i}>· {x}</div>)}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        <Metric label="Properties" value={props.length} sub={props.length===0?'Drop docs to add':'In your portfolio'} />
        <Metric label="Monthly rent" value={totalRent?fmt(totalRent):'—'} sub={net>0?`Net ${fmt(net)}/mo`:'Add tenancy docs'} subGreen={net>0} />
        <Metric label="Actions" value={urgent.length+upcoming.length} sub={urgent.length>0?`${urgent.length} urgent`:'Nothing urgent'} />
      </div>
      {props.length===0 ? (
<DropZone onFiles={onAddDocs} />
      ) : (
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:14, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Upcoming compliance</div>
          {upcoming.length===0 && urgent.length===0
            ? <div style={{ fontSize:12, color:'var(--text-3)', padding:'6px 0' }}>No upcoming issues found.</div>
            : upcoming.map((t,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<upcoming.length-1?'0.5px solid var(--border)':'none', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'var(--text-2)' }}>{t}</span>
                <Pill type="amber" dot>Due soon</Pill>
              </div>
            ))
          }
        </div>
      )}
      <div style={{ background:'var(--brand-subtle)', border:'0.5px solid rgba(27,94,59,0.15)', borderRadius:12, padding:'12px 14px', marginTop:12 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--brand)', marginBottom:4 }}>Renters&#39; Rights Bill — Oct 2026</div>
        <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>Section 21 no-fault evictions will be abolished. All tenancies become periodic. PRS Database registration required before serving any notice.</div>
      </div>
    </div>
  )
}

function Properties({ portfolio, onAddDocs }) {
  const props = portfolio.properties||[]
  if (props.length===0) return (
    <div className="fade-up" style={{ textAlign:'center', padding:'40px 20px', background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:14 }}>
      <div style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:300, color:'var(--text-2)', marginBottom:8 }}>No properties yet</div>
      <div style={{ fontSize:13, color:'var(--text-3)', marginBottom:18 }}>Drop your documents to add properties automatically.</div>
      <button onClick={onAddDocs} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'10px 22px', fontSize:13, fontWeight:500, cursor:'pointer' }}>+ Drop documents</button>
    </div>
  )
  return (
    <div className="fade-up">
      {props.map(p => {
        const gasC=dueSoon(p.gasDue), eicrC=dueSoon(p.eicrDue), insC=dueSoon(p.insuranceRenewal)
        const col=s=>s==='valid'?'var(--green)':s==='due-soon'?'var(--amber)':s==='overdue'?'var(--red)':'var(--text-3)'
        return (
          <div key={p.id} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:14, padding:16, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14, gap:12 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:'var(--display)', fontSize:'clamp(17px,3vw,20px)', fontWeight:400, color:'var(--text)', marginBottom:3 }}>{p.shortName}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>{p.address}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>{(p.docs||[]).map(d=><DocBadge key={d} type={d}/>)}</div>
              </div>
              {p.rent && (
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'clamp(18px,3vw,22px)', fontWeight:600, fontFamily:'var(--mono)', letterSpacing:'-0.5px' }}>{fmt(p.rent)}</div>
                  <div style={{ fontSize:10, color:'var(--text-3)' }}>per month</div>
                </div>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                {p.tenantName     && <Row label="Tenant"      value={p.tenantName} />}
                {p.tenantPhone    && <Row label="Phone"       value={p.tenantPhone} />}
                {p.tenancyStart   && <Row label="Start"       value={p.tenancyStart} />}
                {p.depositAmount  && <Row label="Deposit"     value={fmt(p.depositAmount)} />}
                {p.lender         && <Row label="Lender"      value={p.lender} />}
                {p.mortgage       && <Row label="Mortgage"    value={fmt(p.mortgage)} />}
                {p.rate           && <Row label="Rate"        value={`${p.rate}%`} />}
                {p.monthlyPayment && <Row label="Monthly"     value={fmt(p.monthlyPayment)} />}
                {p.purchasePrice  && <Row label="Purchased"   value={fmt(p.purchasePrice)} />}
              </div>
              <div>
                {p.gasDue           && <Row label="Gas due"    value={p.gasDue}  valueColor={col(gasC)} />}
                {p.eicrDue          && <Row label="EICR due"   value={p.eicrDue} valueColor={col(eicrC)} />}
                {p.insurer          && <Row label="Insurer"    value={p.insurer} />}
                {p.insuranceRenewal && <Row label="Ins. renew" value={p.insuranceRenewal} valueColor={col(insC)} />}
                {p.insuranceType    && <Row label="Policy type" value={p.insuranceType} valueColor={p.insuranceType?.toLowerCase()==='home'?'var(--red)':'var(--text)'} />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AITab({ portfolio }) {
  const n=(portfolio.properties||[]).length
  const [messages,setMessages]=useState([{role:'assistant',content:n>0?`I can see your portfolio of ${n} propert${n===1?'y':'ies'}. Ask me anything about compliance, legislation or your finances.`:`Welcome to Lettly AI. Drop your documents first to build your portfolio — then I can give you specific advice.`}])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const scrollRef=useRef(null)
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight},[messages])

  const quickQ=n>0?['What are my most urgent compliance actions?',"How does the Renters' Rights Bill affect me?",'Build me a 6-month action plan','Should I be in a limited company?']:["What does the Renters' Rights Bill mean?",'What compliance certificates do I need?','What is Section 24 mortgage interest relief?','What is EPC minimum C?']

  async function send(text) {
    const q=(text||input).trim(); if(!q||loading)return
    const newMsgs=[...messages,{role:'user',content:q}]
    setMessages(newMsgs);setInput('');setLoading(true)
    try {
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:newMsgs.slice(1),portfolio})})
      const data=await res.json()
      setMessages(prev=>[...prev,{role:'assistant',content:data.content||'Sorry, could not get a response.'}])
    } catch { setMessages(prev=>[...prev,{role:'assistant',content:'Connection error — please try again.'}]) }
    setLoading(false)
  }

  return (
    <div className="fade-up">
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {quickQ.map((q,i)=>(
          <button key={i} onClick={()=>send(q)} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:20, padding:'5px 12px', fontSize:11, color:'var(--text-2)', cursor:'pointer' }}>{q}</button>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', height:'min(500px, 60vh)' }}>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10, background:'var(--surface2)', borderRadius:'12px 12px 0 0', border:'0.5px solid var(--border)', borderBottom:'none' }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ maxWidth:'88%', alignSelf:m.role==='user'?'flex-end':'flex-start' }}>
              {m.role==='assistant'&&<div style={{ fontSize:10, color:'var(--brand)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.6px', fontWeight:600 }}>Lettly AI</div>}
              <div style={{ padding:'9px 13px', borderRadius:m.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px', background:m.role==='user'?'var(--brand)':'var(--surface)', color:m.role==='user'?'#fff':'var(--text)', border:m.role==='assistant'?'0.5px solid var(--border)':'none', fontSize:12, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
          {loading&&<div style={{ alignSelf:'flex-start' }}><div style={{ fontSize:10, color:'var(--brand)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.6px', fontWeight:600 }}>Lettly AI</div><div className="pulsing" style={{ padding:'9px 13px', borderRadius:'12px 12px 12px 2px', background:'var(--surface)', border:'0.5px solid var(--border)', fontSize:12, color:'var(--text-3)' }}>Thinking…</div></div>}
        </div>
        <div style={{ display:'flex', gap:8, background:'var(--surface)', border:'0.5px solid var(--border)', borderTop:'none', borderRadius:'0 0 12px 12px', padding:8 }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask about compliance, legislation or your portfolio…" rows={1}
            style={{ flex:1, background:'var(--surface2)', border:'0.5px solid var(--border)', borderRadius:8, padding:'8px 11px', fontFamily:'var(--font)', fontSize:12, color:'var(--text)', resize:'none', outline:'none' }} />
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:500, cursor:(loading||!input.trim())?'not-allowed':'pointer', opacity:(loading||!input.trim())?0.5:1, whiteSpace:'nowrap' }}>Send</button>
        </div>
      </div>
    </div>
  )
}

const TABS=[{id:'overview',label:'Overview'},{id:'properties',label:'Properties'},{id:'ai',label:'Lettly AI'}]

export default function Dashboard() {
  const {isLoaded,isSignedIn,user}=useUser()
  const router=useRouter()
  const [tab,setTab]=useState('overview')
  const [portfolio,setPortfolio]=useState({properties:[]})
  const [queue,setQueue]=useState([])
  const [showDrop,setShowDrop]=useState(false)

  useEffect(()=>{if(isLoaded&&!isSignedIn)router.replace('/')},[isLoaded,isSignedIn,router])

  const storageKey=user?`lettly_${user.id}`:null
  useEffect(()=>{ if(!storageKey)return; try{const s=localStorage.getItem(storageKey);if(s)setPortfolio(JSON.parse(s))}catch{} },[storageKey])
  useEffect(()=>{ if(!storageKey)return; try{localStorage.setItem(storageKey,JSON.stringify(portfolio))}catch{} },[portfolio,storageKey])

  async function handleFiles(files) {
    setShowDrop(false)
    const valid=files.filter(f=>f.type==='application/pdf'||f.type.startsWith('image/'))
    if(!valid.length)return
    for(const file of valid){
      const id=Math.random().toString(36).slice(2)
      setQueue(q=>[...q,{id,name:file.name,status:'reading'}])
      try {
        const b64=await fileToBase64(file)
        setQueue(q=>q.map(x=>x.id===id?{...x,status:'extracting'}:x))
        const res=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,data:b64,mediaType:file.type})})
        const result=await res.json()
        setQueue(q=>q.map(x=>x.id===id?{...x,status:result.success?'done':'error',result}:x))
        if(result.success&&result.extracted)setPortfolio(prev=>mergeDoc(prev,result.extracted))
      } catch { setQueue(q=>q.map(x=>x.id===id?{...x,status:'error'}:x)) }
    }
  }

  if(!isLoaded||!isSignedIn) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'2.5px solid var(--brand)', borderTopColor:'transparent', animation:'spin 0.75s linear infinite' }}/>
    </div>
  )

  const firstName=user?.firstName||'there'

  return (
    <>
      <Head><title>Dashboard — Lettly</title></Head>
      <style>{`
        .dash-content { max-width: 1060px; margin: 0 auto; padding: 24px 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 14px; }
        .prop-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) {
          .metrics-grid { grid-template-columns: 1fr; }
          .prop-data-grid { grid-template-columns: 1fr; }
          .tab-label { display: none; }
          .tab-label-short { display: inline !important; }
          .dash-content { padding: 16px; }
        }
      `}</style>
      <div 
        style={{ minHeight:'100vh', background:'var(--bg)' }}
        onDragOver={e => { e.preventDefault(); setShowDrop(true) }}
        onDrop={e => {
          e.preventDefault()
          const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'))
          if (files.length) handleFiles(files)
        }}
      >
        <nav style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:54, position:'sticky', top:0, zIndex:100, gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <div style={{ width:30, height:30, background:'var(--brand)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:14, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:17, fontWeight:400, color:'var(--text)' }}>Lettly</span>
          </div>

          <div style={{ display:'flex', gap:1, background:'var(--surface2)', padding:3, borderRadius:9, overflow:'hidden' }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?'var(--surface)':'transparent', border:tab===t.id?'0.5px solid var(--border)':'none', padding:'5px 12px', borderRadius:7, fontFamily:'var(--font)', fontSize:12, color:tab===t.id?'var(--text)':'var(--text-2)', fontWeight:tab===t.id?500:400, cursor:'pointer', whiteSpace:'nowrap' }}>
                {t.label}
                {t.id==='ai'&&<span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'var(--brand)', marginLeft:4, verticalAlign:'middle' }}/>}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button onClick={()=>setShowDrop(v=>!v)} style={{ background:'none', border:'0.5px solid var(--border-strong)', borderRadius:7, padding:'6px 10px', fontSize:12, color:'var(--text-2)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add docs</span>
            </button>
            <UserButton afterSignOutUrl="/" appearance={{ variables:{ colorPrimary:'#1b5e3b' } }} />
          </div>
        </nav>

        {showDrop&&(
          <div className="fade-in" style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'14px 16px' }}>
            <div style={{ maxWidth:700, margin:'0 auto' }}><DropZone onFiles={handleFiles} compact /></div>
          </div>
        )}

        {queue.length>0&&(
          <div style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'10px 16px' }}>
            <div style={{ maxWidth:700, margin:'0 auto', display:'flex', flexDirection:'column', gap:7 }}>
              {queue.map(item=><QueueItem key={item.id} item={item}/>)}
            </div>
          </div>
        )}

        <div className="dash-content">
          {tab==='overview'&&(
            <div style={{ marginBottom:18 }}>
              <h1 style={{ fontFamily:'var(--display)', fontSize:'clamp(22px,4vw,28px)', fontWeight:300, color:'var(--text)', marginBottom:3 }}>
                Good {getGreeting()}, {firstName}
              </h1>
              <p style={{ fontSize:13, color:'var(--text-3)' }}>
                {(portfolio.properties||[]).length===0?'Drop your documents below to build your portfolio.':`${(portfolio.properties||[]).length} propert${(portfolio.properties||[]).length===1?'y':'ies'} in your portfolio.`}
              </p>
            </div>
          )}
          {tab==='overview'   && <Overview   portfolio={portfolio} onAddDocs={handleFiles} />}
          {tab==='properties' && <Properties portfolio={portfolio} onAddDocs={()=>setShowDrop(true)} />}
          {tab==='ai'         && <AITab      portfolio={portfolio} />}
        </div>
      </div>
    </>
  )
}

function getGreeting() {
  const h=new Date().getHours()
  return h<12?'morning':h<18?'afternoon':'evening'
}
