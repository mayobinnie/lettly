import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useUser, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { fmt, dueSoon, dueDays, epcColor, mergeDoc, LEGISLATION, LEGISLATION_SCOTLAND, LEGISLATION_WALES, getGrowthRate, projectValue } from '../lib/data'
import { getPortfolio, savePortfolio } from '../lib/supabase'
import { detectNation, NATION_LABELS, getChecklist } from '../lib/nations'

// Load PDF.js once and cache it
async function loadPDFJS() {
  if (window.pdfjsLib) return window.pdfjsLib
  await new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  return window.pdfjsLib
}

// Convert first page of PDF to JPEG for reliable extraction
async function pdfToJpeg(file) {
  try {
    const pdfjsLib = await loadPDFJS()
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    const jpeg = canvas.toDataURL('image/jpeg', 0.92)
    return { data: jpeg.split(',')[1], mediaType: 'image/jpeg', pages: pdf.numPages }
  } catch (e) {
    console.warn('PDF.js render failed, sending raw:', e)
    return null
  }
}

// Convert file to base64, handling HEIC and PDF rendering
async function fileToBase64(file) {
  const fname = file.name.toLowerCase()
  const ftype = file.type.toLowerCase()

  // HEIC/HEIF: convert to JPEG first
  if (ftype === 'image/heic' || ftype === 'image/heif' || fname.endsWith('.heic') || fname.endsWith('.heif')) {
    try {
      if (!window.heic2any) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const blob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
      const converted = new File([blob], fname.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' })
      const result = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res({ data: r.result.split(',')[1], mediaType: 'image/jpeg' })
        r.onerror = rej
        r.readAsDataURL(converted)
      })
      return result
    } catch (e) {
      console.warn('HEIC conversion failed:', e)
    }
  }

  // PDF: render first page to JPEG for reliable extraction
  if (ftype === 'application/pdf' || fname.endsWith('.pdf')) {
    const rendered = await pdfToJpeg(file)
    if (rendered) return rendered
    // Fallback: send raw PDF bytes
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res({ data: r.result.split(',')[1], mediaType: 'application/pdf' })
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  // All other images: send directly
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res({ data: r.result.split(',')[1], mediaType: ftype || 'image/jpeg' })
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

/* ---- atoms ---- */
const PILL={red:{bg:'#fce8e6',fg:'#791F1F'},amber:{bg:'#fff8e1',fg:'#633806'},green:{bg:'#e8f5e9',fg:'#1e6e35'},blue:{bg:'#e3f2fd',fg:'#0C447C'},brand:{bg:'#eaf4ee',fg:'#1b5e3b'},grey:{bg:'#f2f0eb',fg:'#6b6860'}}
function Pill({type='grey',dot,children}){const c=PILL[type]||PILL.grey;return<span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:c.bg,color:c.fg,whiteSpace:'nowrap'}}>{dot&&<span style={{width:5,height:5,borderRadius:'50%',background:c.fg,flexShrink:0}}/>}{children}</span>}
function Row({label,value,valueColor,pill,pillType}){return<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid var(--border)',gap:8}}><span style={{fontSize:12,color:'var(--text-2)',flexShrink:0}}>{label}</span>{pill?<Pill type={pillType||'grey'} dot>{pill}</Pill>:<span style={{fontSize:12,fontWeight:500,fontFamily:'var(--mono)',color:valueColor||'var(--text)',textAlign:'right'}}>{value||'-'}</span>}</div>}
function Metric({label,value,sub,subGreen,subRed}){return<div style={{background:'var(--surface2)',borderRadius:'var(--radius)',padding:'14px 16px'}}><div style={{fontSize:11,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{label}</div><div style={{fontSize:20,fontWeight:600,fontFamily:'var(--mono)',letterSpacing:'-0.5px'}}>{value}</div>{sub&&<div style={{fontSize:11,marginTop:3,color:subGreen?'var(--green)':subRed?'var(--red)':'var(--text-3)'}}>{sub}</div>}</div>}
function Input({label,value,onChange,type='text',placeholder='',hint}){return<div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label><input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}/>{hint&&<div style={{fontSize:11,color:'var(--text-3)',marginTop:4}}>{hint}</div>}</div>}
function Select({label,value,onChange,options}){return<div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label><select value={value||''} onChange={e=>onChange(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select></div>}

const DOC_META={gas_certificate:{label:'Gas cert',icon:'🔥',bg:'#fff8e1',fg:'#633806'},eicr:{label:'EICR',icon:'⚡',bg:'#e3f2fd',fg:'#0C447C'},insurance:{label:'Insurance',icon:'🛡️',bg:'#f3e8ff',fg:'#6b21a8'},epc_certificate:{label:'EPC',icon:'🌿',bg:'#e8f5e9',fg:'#1e6e35'},tenancy_agreement:{label:'Tenancy',icon:'📄',bg:'#eaf4ee',fg:'#1b5e3b'},mortgage_offer:{label:'Mortgage',icon:'🏦',bg:'#fce8e6',fg:'#791F1F'},completion_statement:{label:'Completion',icon:'🏠',bg:'#e8f5e9',fg:'#1e6e35'},other:{label:'Document',icon:'📋',bg:'#f2f0eb',fg:'#6b6860'}}
function DocBadge({type}){const m=DOC_META[type]||DOC_META.other;return<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:m.bg,color:m.fg}}><span style={{fontSize:12}}>{m.icon}</span>{m.label}</span>}

function UpIcon({color,size}){return<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
function DropZone({onFiles,compact}){
  const[over,setOver]=useState(false)
  const ref=useRef(null)
  function drop(e){e.preventDefault();e.stopPropagation();setOver(false);const f=Array.from(e.dataTransfer.files);if(f.length)onFiles(f)}
  function dragOver(e){e.preventDefault();setOver(true)}
  function dragLeave(e){if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}
  function pickFile(){ref.current.click()}
  const input=<input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.tiff,.gif,image/*,application/pdf" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}}/>
  if(compact){
    return(
      <div onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop} onClick={pickFile}
        style={{border:'1.5px dashed '+(over?'var(--brand)':'var(--border-strong)'),borderRadius:12,padding:'12px 16px',cursor:'pointer',background:over?'var(--brand-subtle)':'var(--surface)',display:'flex',alignItems:'center',gap:12,transition:'all 0.15s'}}>
        {input}
        <div style={{width:30,height:30,borderRadius:8,background:over?'var(--brand)':'var(--brand-light)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <UpIcon color={over?'#fff':'var(--brand)'} size={14}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>Drop or click to add documents</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>PDF, JPEG, HEIC — gas cert, EICR, EPC, insurance, tenancy</div>
        </div>
        <div style={{fontSize:11,color:'var(--brand)',fontWeight:500,flexShrink:0,whiteSpace:'nowrap'}}>{over?'Release to upload':'Browse'}</div>
      </div>
    )
  }
  return(
    <div onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop} onClick={pickFile}
      style={{border:'2px dashed '+(over?'var(--brand)':'rgba(0,0,0,0.14)'),borderRadius:20,padding:'clamp(32px,5vw,48px) clamp(20px,4vw,40px)',textAlign:'center',background:over?'var(--brand-subtle)':'var(--surface)',cursor:'pointer',transition:'all 0.25s'}}>
      {input}
      <div className={over?'':'floating'} style={{width:64,height:64,borderRadius:'50%',margin:'0 auto 16px',background:over?'var(--brand)':'var(--brand-light)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <UpIcon color={over?'#fff':'var(--brand)'} size={28}/>
      </div>
      <div style={{fontFamily:'var(--display)',fontSize:'clamp(18px,3vw,24px)',fontWeight:400,marginBottom:8}}>{over?'Release to analyse':'Drop your documents here'}</div>
      <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.75,marginBottom:18}}>PDF, JPEG, PNG, HEIC and more — gas certs, EICRs, EPCs, insurance, tenancy agreements</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginBottom:14}}>
        {Object.values(DOC_META).filter(d=>d.label!=='Document').map(d=>(
          <span key={d.label} style={{fontSize:11,padding:'4px 11px',borderRadius:20,background:d.bg,color:d.fg,display:'inline-flex',alignItems:'center',gap:4}}>
            <span style={{fontSize:12}}>{d.icon}</span>{d.label}
          </span>
        ))}
      </div>
      <div style={{fontSize:11,color:'var(--text-3)'}}>PDF, JPEG, PNG, HEIC, WebP — your data stays private</div>
    </div>
  )
}


function QueueItem({item,onRetry}){const done=item.status==='done',err=item.status==='error',working=item.status==='reading'||item.status==='extracting';const ext=item.result?.extracted
return<div className="scale-in" style={{display:'flex',gap:12,alignItems:'flex-start',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px'}}><div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:done?'var(--brand-light)':err?'var(--red-bg)':'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center'}}>{done&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}{err&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}{working&&<div style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/>}</div><div style={{flex:1,minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:done&&ext?5:0}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{item.name}</div><Pill type={done?'green':err?'red':item.status==='extracting'?'amber':'grey'}>{done?'Extracted':err?'Error':item.status==='extracting'?'Analysing':'Reading'}</Pill></div>{done&&ext&&<div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6}}>{ext.summary}{ext.property?.shortName&&<span style={{marginLeft:6,color:'var(--brand)',fontWeight:500}}>- {ext.property.shortName}</span>}</div>}{done&&ext?.documentType&&<div style={{marginTop:6}}><DocBadge type={ext.documentType}/></div>}{err&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:3,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'var(--red)'}}>{item.result?.error||'Could not read this file.'}</span>
          {onRetry&&<button onClick={()=>onRetry(item)} style={{fontSize:10,color:'var(--brand)',background:'var(--brand-light)',border:'none',borderRadius:5,padding:'2px 8px',cursor:'pointer',whiteSpace:'nowrap'}}>Try again</button>}
        </div>}</div></div>}

/* ---- Onboarding Wizard ---- */
function OnboardingWizard({onComplete,firstName}){
  const[step,setStep]=useState(0)
  const[answers,setAnswers]=useState({experience:'',howGot:'',nation:''})

  // Steps for new/some experience users
  const stepsNew=[
    { q:`Welcome to Lettly, ${firstName||'there'}.`, sub:'A few quick questions to set things up for you.', isIntro:true },
    { q:'Have you been a landlord before?', key:'experience', options:[
        {value:'new',label:'No - this is my first property',icon:'🏠'},
        {value:'some',label:'Yes - some experience',icon:'📋'},
        {value:'experienced',label:'Yes - I manage multiple properties',icon:'🏢'},
    ]},
    { q:'How did you come to have this property?', key:'howGot', options:[
        {value:'inherited',label:'I inherited it',icon:'🏛️'},
        {value:'purchased',label:'I purchased it as a buy-to-let',icon:'💷'},
        {value:'converted',label:'I moved out and am letting my home',icon:'🔑'},
        {value:'other',label:'Other',icon:'📝'},
    ]},
    { q:'Where is the property located?', key:'nation', sub:'Legislation differs between England, Scotland and Wales.',
      options:[
        {value:'England',label:'England',icon:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
        {value:'Scotland',label:'Scotland',icon:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
        {value:'Wales',label:'Wales',icon:'🏴󠁧󠁢󠁷󠁬󠁳󠁿'},
        {value:'mixed',label:'Mix of nations',icon:'🇬🇧'},
    ]},
  ]
  // Shorter steps for experienced landlords
  const stepsExp=[
    { q:`Welcome back to Lettly, ${firstName||'there'}.`, sub:'Quick setup - just three questions.', isIntro:true },
    { q:'How many properties do you currently manage?', key:'portfolioSize', sub:'This helps us show the right plan for your portfolio.', options:[
        {value:'1-5',   label:'1 to 5 properties',  icon:'🏠'},
        {value:'5-10',  label:'5 to 10 properties',  icon:'🏘️'},
        {value:'10-20', label:'10 to 20 properties', icon:'🏢'},
        {value:'20+',   label:'More than 20',        icon:'🏙️'},
    ]},
    { q:'Where are your properties located?', key:'nation', sub:'We show the right legislation for each nation.',
      options:[
        {value:'England', label:'Mainly England',  icon:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
        {value:'Scotland',label:'Mainly Scotland', icon:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
        {value:'Wales',   label:'Mainly Wales',    icon:'🏴󠁧󠁢󠁷󠁬󠁳󠁿'},
        {value:'mixed',   label:'Mix of nations',  icon:'🇬🇧'},
    ]},
  ]

  const[isExp,setIsExp]=useState(false)
  const steps=isExp?stepsExp:stepsNew

  function choose(key,value){
    // After first question - switch to short path if experienced
    if(key==='experience'&&value==='experienced'){setIsExp(true)}
    // If portfolioSize answered, also mark as experienced
    const extra=key==='portfolioSize'?{experience:'experienced'}:{}
    const updated={...answers,...extra,[key]:value}
    setAnswers(updated)
    const nextSteps=key==='experience'&&value==='experienced'?stepsExp:steps
    if(step<nextSteps.length-1){setStep(s=>s+1)}
    else{onComplete(updated)}
  }

  const current=steps[Math.min(step,steps.length-1)]

  return<div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{maxWidth:480,width:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:40}}>
        <div style={{width:36,height:36,background:'var(--brand)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:18,fontWeight:700,fontFamily:'var(--display)',fontStyle:'italic'}}>L</span></div>
        <span style={{fontFamily:'var(--display)',fontSize:20,fontWeight:400}}>Lettly</span>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:32}}>
        {steps.slice(1).map((_,i)=><div key={i} style={{width:i<step?28:6,height:6,borderRadius:3,background:i<step?'var(--brand)':'var(--border-strong)',transition:'all 0.3s'}}/>)}
      </div>
      <div className="fade-up">
        <h2 style={{fontFamily:'var(--display)',fontSize:'clamp(22px,4vw,30px)',fontWeight:300,color:'var(--text)',marginBottom:8,lineHeight:1.2}}>{current.q}</h2>
        {current.sub&&<p style={{fontSize:14,color:'var(--text-2)',marginBottom:28,lineHeight:1.6}}>{current.sub}</p>}
        {current.isIntro
          ?<button onClick={()=>setStep(1)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:12,padding:'14px 32px',fontSize:15,fontWeight:500,cursor:'pointer',marginTop:16}}>Get started</button>
          :<div style={{display:'flex',flexDirection:'column',gap:10}}>
            {current.options.map(o=><button key={o.value} onClick={()=>choose(current.key,o.value)}
              style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:'14px 18px',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--brand)';e.currentTarget.style.background='var(--brand-subtle)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface)'}}>
              <span style={{fontSize:24,flexShrink:0}}>{o.icon}</span>
              <span style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{o.label}</span>
            </button>)}
          </div>
        }
      </div>
    </div>
  </div>
}

/* ---- First-time Landlord Checklist ---- */
function FirstTimeLandlordChecklist({nation,checkedItems,onToggle}){
  const[open,setOpen]=useState('before_let')
  const checklist=getChecklist(nation||'England')
  const allItems=Object.values(checklist).flatMap(s=>s.items)
  const required=allItems.filter(i=>i.required)
  const done=required.filter(i=>checkedItems[i.id])
  const pct=required.length>0?Math.round((done.length/required.length)*100):0
  const nl=NATION_LABELS[nation||'England']||NATION_LABELS.England

  return<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:12,flexWrap:'wrap'}}>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <span style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>First-time landlord checklist</span>
          <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:nl.bg,color:nl.color,fontWeight:500}}>{nation||'England'}</span>
        </div>
        <div style={{fontSize:12,color:'var(--text-3)'}}>{done.length} of {required.length} required steps completed</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:80,height:6,borderRadius:3,background:'var(--surface2)',overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:pct===100?'var(--green)':'var(--brand)',borderRadius:3,transition:'width 0.3s'}}/>
        </div>
        <span style={{fontSize:12,fontWeight:500,color:pct===100?'var(--green)':'var(--brand)',minWidth:32}}>{pct}%</span>
      </div>
    </div>

    {pct===100&&<div style={{background:'var(--green-bg)',border:'0.5px solid var(--green)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--green)',marginBottom:12,fontWeight:500}}>
      All required steps complete. You are legally set up as a landlord in {nation||'England'}.
    </div>}

    {/* Section tabs */}
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
      {Object.entries(checklist).map(([key,section])=>{
        const sItems=section.items.filter(i=>i.required)
        const sDone=sItems.filter(i=>checkedItems[i.id]).length
        return<button key={key} onClick={()=>setOpen(key)} style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:open===key?'var(--brand)':'var(--border)',background:open===key?'var(--brand-light)':'var(--surface)',color:open===key?'var(--brand)':'var(--text-2)'}}>
          {section.icon} {section.title} <span style={{opacity:0.7}}>({sDone}/{sItems.length})</span>
        </button>
      })}
    </div>

    {/* Checklist items */}
    {open&&checklist[open]&&<div>
      {checklist[open].items.map((item,i)=><div key={item.id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 0',borderBottom:i<checklist[open].items.length-1?'0.5px solid var(--border)':'none',cursor:'pointer'}} onClick={()=>onToggle(item.id)}>
        <div style={{width:18,height:18,borderRadius:5,border:border:'1.5px dashed '+(checkedItems[item.id]?'var(--brand)':'var(--border-strong)'),background:checkedItems[item.id]?'var(--brand)':'transparent',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
          {checkedItems[item.id]&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:checkedItems[item.id]?'var(--text-3)':'var(--text)',lineHeight:1.6,textDecoration:checkedItems[item.id]?'line-through':'none'}}>{item.label}</div>
          {!item.required&&<span style={{fontSize:10,color:'var(--text-3)'}}>Optional</span>}
        </div>
      </div>)}
    </div>}
  </div>
}

/* ---- Property Form ---- */
const EMPTY_PROP={shortName:'',address:'',nation:'',ownership:'Personal',purchasePrice:'',currentValue:'',mortgage:'',lender:'',rate:'',fixedEnd:'',monthlyPayment:'',ercRate:'',rent:'',tenantName:'',tenantPhone:'',tenantEmail:'',tenancyStart:'',tenancyEnd:'',depositAmount:'',depositScheme:'',gasDue:'',eicrDue:'',epcRating:'',epcExpiry:'',insurer:'',policyNo:'',insuranceRenewal:'',insuranceType:'',notes:''}
function PropertyForm({initial,onSave,onDelete,onClose}){
  const[p,setP]=useState({...EMPTY_PROP,...initial})
  const set=(k,v)=>setP(prev=>({...prev,[k]:v}))
  const[tab,setTab]=useState('basics')

  // Auto-detect nation from address/postcode
  function handleAddressChange(v){
    set('address',v)
    const words=v.split(' ')
    const lastWord=words[words.length-1]
    const secondLast=words[words.length-2]||''
    const postcode=`${secondLast} ${lastWord}`.trim()
    if(postcode.length>=3){const n=detectNation(postcode);if(n)set('nation',n)}
  }

  function handleSave(){
    if(!p.shortName.trim())return alert('Please enter a property name')
    const finalNation=p.nation||detectNation(p.address)||'England'
    onSave({...p,nation:finalNation,id:p.id||Math.random().toString(36).slice(2),docs:p.docs||[]})
    onClose()
  }

  const nl=p.nation?NATION_LABELS[p.nation]:null

  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div style={{background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:680,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 -8px 40px rgba(0,0,0,0.12)'}}>
      <div style={{padding:'18px 20px 0',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:400}}>{p.id?'Edit property':'Add property'}</div>
            {nl&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:nl.bg,color:nl.color,fontWeight:500}}>{p.nation}</span>}
          </div>
          <button onClick={onClose} style={{background:'var(--surface2)',border:'none',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:16,color:'var(--text-2)',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
        </div>
        <div style={{display:'flex',gap:4}}>{['basics','finance','tenant','compliance'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'6px 14px',borderRadius:'8px 8px 0 0',fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderBottom:'none',background:tab===t?'var(--bg)':'transparent',borderColor:tab===t?'var(--border)':'transparent',color:tab===t?'var(--text)':'var(--text-3)'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px',background:'var(--bg)',borderTop:'0.5px solid var(--border)'}}>
        {tab==='basics'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <div style={{gridColumn:'1/-1'}}><Input label="Property name *" value={p.shortName} onChange={v=>set('shortName',v)} placeholder="e.g. 11 Northfield Avenue"/></div>
            <div style={{gridColumn:'1/-1'}}><Input label="Full address including postcode" value={p.address} onChange={handleAddressChange} placeholder="Full address - postcode auto-detects nation"/></div>
          </div>
          {/* Nation selector */}
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.4px'}}>Nation</label>
            <div style={{display:'flex',gap:8}}>
              {['England','Scotland','Wales'].map(n=>{const nl=NATION_LABELS[n];return<button key={n} onClick={()=>set('nation',n)} style={{padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:p.nation===n?nl.color:'var(--border)',background:p.nation===n?nl.bg:'var(--surface)',color:p.nation===n?nl.color:'var(--text-2)'}}>{n}</button>})}
            </div>
            {p.nation&&<div style={{fontSize:11,color:'var(--text-3)',marginTop:6}}>
              {p.nation==='Scotland'&&'Scottish law applies - Private Residential Tenancy (not AST). Mandatory landlord registration required.'}
              {p.nation==='Wales'&&'Welsh law applies - Occupation Contract (not AST). Rent Smart Wales registration required.'}
              {p.nation==='England'&&'English law applies - Renters Rights Act from 1 May 2026. PRS Database registration coming.'}
            </div>}
          </div>
          <Select label="Ownership" value={p.ownership} onChange={v=>set('ownership',v)} options={['Personal','Ltd Company','Joint']}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <Input label="Purchase price" value={p.purchasePrice} onChange={v=>set('purchasePrice',v)} placeholder="e.g. 95000" type="number"/>
            <Input label="Current value (est.)" value={p.currentValue} onChange={v=>set('currentValue',v)} placeholder="e.g. 150000" type="number"/>
          </div>
          {p.currentValue&&p.purchasePrice&&<div style={{fontSize:12,color:'var(--green)',marginBottom:14}}>Estimated gain: {fmt(Number(p.currentValue)-Number(p.purchasePrice))}</div>}
          <Input label="Notes" value={p.notes} onChange={v=>set('notes',v)} placeholder="Anything to remember"/>
        </>}
        {tab==='finance'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <Input label="Mortgage balance" value={p.mortgage} onChange={v=>set('mortgage',v)} placeholder="e.g. 75000" type="number"/>
            <Input label="Lender" value={p.lender} onChange={v=>set('lender',v)} placeholder="e.g. Godiva"/>
            <Input label="Interest rate (%)" value={p.rate} onChange={v=>set('rate',v)} placeholder="e.g. 5.24" type="number"/>
            <Input label="Fixed rate end" value={p.fixedEnd} onChange={v=>set('fixedEnd',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Monthly payment" value={p.monthlyPayment} onChange={v=>set('monthlyPayment',v)} placeholder="e.g. 340" type="number"/>
            <Input label="ERC rate (%)" value={p.ercRate} onChange={v=>set('ercRate',v)} placeholder="e.g. 2.5" hint="Early repayment charge"/>
            <Input label="Monthly rent" value={p.rent} onChange={v=>set('rent',v)} placeholder="e.g. 850" type="number"/>
          </div>
          {(p.rent||p.monthlyPayment)&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:14,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Financial summary</div>
            {p.rent&&p.monthlyPayment&&<Row label="Monthly net" value={fmt(Number(p.rent)-Number(p.monthlyPayment))} valueColor={Number(p.rent)>Number(p.monthlyPayment)?'var(--green)':'var(--red)'}/>}
            {p.rent&&p.currentValue&&<Row label="Gross yield" value={`${((Number(p.rent)*12/Number(p.currentValue))*100).toFixed(1)}%`}/>}
            {p.mortgage&&p.currentValue&&<Row label="LTV" value={`${((Number(p.mortgage)/Number(p.currentValue))*100).toFixed(1)}%`}/>}
            {p.currentValue&&p.mortgage&&<Row label="Equity" value={fmt(Number(p.currentValue)-Number(p.mortgage))} valueColor="var(--green)"/>}
          </div>}
        </>}
        {tab==='tenant'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <Input label="Tenant name" value={p.tenantName} onChange={v=>set('tenantName',v)} placeholder="Full name"/>
            <Input label="Tenant phone" value={p.tenantPhone} onChange={v=>set('tenantPhone',v)} placeholder="07700 000000"/>
            <Input label="Tenant email" value={p.tenantEmail} onChange={v=>set('tenantEmail',v)} placeholder="tenant@email.com"/>
            <Input label="Monthly rent" value={p.rent} onChange={v=>set('rent',v)} placeholder="e.g. 850" type="number"/>
            <Input label="Tenancy start" value={p.tenancyStart} onChange={v=>set('tenancyStart',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Tenancy end" value={p.tenancyEnd} onChange={v=>set('tenancyEnd',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Deposit amount" value={p.depositAmount} onChange={v=>set('depositAmount',v)} placeholder="e.g. 850" type="number"/>
            <Select label="Deposit scheme" value={p.depositScheme} onChange={v=>set('depositScheme',v)} options={p.nation==='Scotland'?['','SafeDeposits Scotland','LPS Scotland','mydeposits Scotland']:['','DPS Custodial','DPS Insured','TDS Custodial','TDS Insured','mydeposits']}/>
          </div>
          <div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#633806',lineHeight:1.6}}>
            {p.nation==='Wales'?'Wales: maximum deposit is 1 months rent. Must be protected in approved scheme within 30 days.':p.nation==='Scotland'?'Scotland: maximum deposit is 2 months rent. Must be lodged within 30 working days.':'England: maximum deposit is 5 weeks rent. Must be protected within 30 days.'}
          </div>
        </>}
        {tab==='compliance'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <Input label="Gas cert date" value={p.gasDate} onChange={v=>set('gasDate',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Gas cert due" value={p.gasDue} onChange={v=>set('gasDue',v)} placeholder="DD/MM/YYYY"/>
            <Input label="EICR date" value={p.eicrDate} onChange={v=>set('eicrDate',v)} placeholder="DD/MM/YYYY"/>
            <Input label="EICR due" value={p.eicrDue} onChange={v=>set('eicrDue',v)} placeholder="DD/MM/YYYY"/>
            <Select label="EPC rating" value={p.epcRating} onChange={v=>set('epcRating',v)} options={['','A','B','C','D','E','F','G']}/>
            <Input label="EPC expiry" value={p.epcExpiry} onChange={v=>set('epcExpiry',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Insurer" value={p.insurer} onChange={v=>set('insurer',v)} placeholder="e.g. LV="/>
            <Input label="Policy number" value={p.policyNo} onChange={v=>set('policyNo',v)} placeholder="Policy number"/>
            <Input label="Renewal date" value={p.insuranceRenewal} onChange={v=>set('insuranceRenewal',v)} placeholder="DD/MM/YYYY"/>
            <Select label="Policy type" value={p.insuranceType} onChange={v=>set('insuranceType',v)} options={['','Landlord','Home','Other']}/>
          </div>
          {p.nation==='Scotland'&&<div style={{background:'#e0ecf8',border:'0.5px solid #005EB8',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#003090',lineHeight:1.6,marginTop:4}}>Scotland: Repairing Standard applies - property must meet requirements at start and throughout tenancy. Interlinked smoke and CO alarms required.</div>}
          {p.nation==='Wales'&&<div style={{background:'#fce8ec',border:'0.5px solid #C8102E',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#8b0000',lineHeight:1.6,marginTop:4}}>Wales: 29 fitness standards apply under the Renting Homes (Wales) Act. All must be met throughout the tenancy.</div>}
          {p.insuranceType?.toLowerCase()==='home'&&<div style={{background:'var(--red-bg)',border:'0.5px solid var(--red)',borderRadius:9,padding:'10px 13px',fontSize:12,color:'var(--red)',lineHeight:1.6,marginTop:8}}>Home insurance is not valid for a tenanted property - you need landlord insurance.</div>}
        </>}
      </div>
      <div style={{padding:'14px 20px',background:'var(--surface)',borderTop:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div>{p.id&&<button onClick={()=>{if(confirm('Delete this property?')){onDelete(p.id);onClose()}}} style={{fontSize:12,color:'var(--red)',background:'none',border:'none',cursor:'pointer'}}>Delete property</button>}</div>
        <div style={{display:'flex',gap:8}}><button onClick={onClose} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 18px',fontSize:13,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button><button onClick={handleSave} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 24px',fontSize:13,fontWeight:500,cursor:'pointer'}}>Save property</button></div>
      </div>
    </div>
  </div>
}



function NationBreakdown({props}){
  const nations={}
  props.forEach(p=>{ nations[p.nation||'England']=(nations[p.nation||'England']||0)+1 })
  if(Object.keys(nations).length<=1) return null
  return<div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
    {Object.entries(nations).map(([n,count])=>{
      const nl=NATION_LABELS[n]||NATION_LABELS.England
      return<span key={n} style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:nl.bg,color:nl.color,fontWeight:500}}>{n}: {count} propert{count===1?'y':'ies'}</span>
    })}
  </div>
}

function PricingNudge({portfolioSize}){
  if(!portfolioSize) return null
  const sizeMap={'1-5':'Starter','5-10':'Standard','10-20':'Portfolio','20+':'Portfolio'}
  const priceMap={'1-5':'£8','5-10':'£16','10-20':'£28','20+':'£40'}
  const plan=sizeMap[portfolioSize]||'Portfolio'
  const price=priceMap[portfolioSize]||'£28'
  return<div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.15)',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
    <div><div style={{fontSize:13,fontWeight:500,color:'var(--brand)',marginBottom:2}}>Based on your portfolio size, the {plan} plan looks right for you</div><div style={{fontSize:12,color:'var(--text-2)'}}>{price}/month - all features included - 14-day free trial</div></div>
    <a href="/#pricing" style={{fontSize:12,fontWeight:500,color:'var(--brand)',background:'var(--brand-light)',border:'none',borderRadius:7,padding:'7px 14px',textDecoration:'none',whiteSpace:'nowrap'}}>View plans</a>
  </div>
}

/* ---- Overview ---- */
function PortfolioChart({props, years}){
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(()=>{
    if(!ref.current || !props.length) return
    if(typeof window === 'undefined') return

    const buildChart = () => {
      if(chartRef.current){ chartRef.current.destroy(); chartRef.current=null }
      const labels = Array.from({length:years+1},(_,i)=> i===0?'Now':i===1?'1yr':i===5&&years>=5?'5yr':i===10&&years>=10?'10yr':(new Date().getFullYear()+i).toString())
      const colors = ['#1b5e3b','#2d8a5e','#378add','#9b59b6','#e67e22','#e74c3c','#16a085']

      const datasets = props.filter(p=>p.currentValue).map((p,i)=>{
        const rate = getGrowthRate(p.address)
        const values = projectValue(Number(p.currentValue), rate, years)
        return {
          label: p.shortName,
          data: values,
          borderColor: colors[i % colors.length],
          backgroundColor: colors[i % colors.length]+'15',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      })

      if(props.filter(p=>p.currentValue).length > 1){
        const totalByYear = Array.from({length:years+1},(_,yr)=>
          props.filter(p=>p.currentValue).reduce((s,p)=>{
            const rate = getGrowthRate(p.address)
            return s + projectValue(Number(p.currentValue), rate, years)[yr]
          },0)
        )
        datasets.unshift({
          label:'Portfolio total',
          data: totalByYear,
          borderColor:'#1b5e3b',
          backgroundColor:'#1b5e3b20',
          borderWidth:3,
          fill:true,
          tension:0.4,
          pointRadius:0,
        })
      }

      chartRef.current = new window.Chart(ref.current, {
        type:'line',
        data:{ labels, datasets },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          interaction:{ mode:'index', intersect:false },
          plugins:{
            legend:{ display:true, position:'bottom', labels:{ boxWidth:10, font:{size:11}, color:'#888', padding:16 }},
            tooltip:{
              callbacks:{
                label: ctx => ' '+ctx.dataset.label+': £'+Math.round(ctx.parsed.y).toLocaleString('en-GB')
              }
            }
          },
          scales:{
            x:{ grid:{ color:'#f0ede8' }, ticks:{ font:{size:11}, color:'#888' }},
            y:{
              grid:{ color:'#f0ede8' },
              ticks:{ font:{size:11}, color:'#888',
                callback: v => '£'+(v>=1000000?(v/1000000).toFixed(1)+'m':(v/1000).toFixed(0)+'k')
              }
            }
          }
        }
      })
    }

    if(window.Chart){ buildChart() }
    else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = buildChart
      document.head.appendChild(script)
    }
    return () => { if(chartRef.current){ chartRef.current.destroy(); chartRef.current=null }}
  }, [props.map(p=>p.id+p.currentValue+p.address).join(',')+years])

  if(!props.filter(p=>p.currentValue).length) return null
  return <div style={{position:'relative',height:300}}><canvas ref={ref}/></div>
}

function YearByYearTable({props, years}){
  if(!props.filter(p=>p.currentValue).length) return null

  const yearLabels = Array.from({length:years+1},(_,i)=>i===0?'Now':`Year ${i}`)
  const totalNow = props.filter(p=>p.currentValue).reduce((s,p)=>s+Number(p.currentValue),0)
  const totalMortgageNow = props.filter(p=>p.mortgage).reduce((s,p)=>s+Number(p.mortgage),0)

  // Build year-by-year for each property and portfolio total
  const rows = props.filter(p=>p.currentValue).map(p=>{
    const rate = getGrowthRate(p.address)
    const values = projectValue(Number(p.currentValue), rate, years)
    return { name:p.shortName, rate, values, mortgage:Number(p.mortgage)||0, address:p.address }
  })

  // Portfolio totals per year
  const totals = Array.from({length:years+1},(_,yr)=>rows.reduce((s,r)=>s+r.values[yr],0))
  // Equity totals (assuming mortgage reduces by ~1.5% of balance per year as rough estimate)
  const equityTotals = Array.from({length:years+1},(_,yr)=>
    totals[yr] - rows.reduce((s,r)=>s+Math.max(0,r.mortgage*Math.pow(0.985,yr)),0)
  )

  // Show milestone years
  const milestones = years===1?[0,1]:years===5?[0,1,2,3,4,5]:[0,1,2,3,5,7,10]

  return <div style={{overflowX:'auto',marginTop:16}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:500}}>
      <thead>
        <tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--surface2)'}}>
          <th style={{textAlign:'left',padding:'8px 10px',color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>Year</th>
          {rows.map(r=><th key={r.name} style={{textAlign:'right',padding:'8px 10px',color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>{r.name}</th>)}
          {rows.length>1&&<th style={{textAlign:'right',padding:'8px 10px',color:'var(--brand)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>Total</th>}
          {rows.length>1&&<th style={{textAlign:'right',padding:'8px 10px',color:'#1e6e35',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>Est. Equity</th>}
        </tr>
      </thead>
      <tbody>
        {milestones.filter(yr=>yr<=years).map((yr,i)=>{
          const isNow = yr===0
          return <tr key={yr} style={{borderBottom:'0.5px solid var(--border)',background:isNow?'var(--surface2)':'transparent'}}>
            <td style={{padding:'9px 10px',fontWeight:isNow?600:400,color:isNow?'var(--text)':'var(--text-2)'}}>
              {isNow?'Now':`Year ${yr} (${new Date().getFullYear()+yr})`}
            </td>
            {rows.map(r=>{
              const gain = r.values[yr] - r.values[0]
              return <td key={r.name} style={{padding:'9px 10px',textAlign:'right',fontFamily:'var(--mono)'}}>
                <div style={{fontWeight:500,color:isNow?'var(--text)':'var(--text)'}}>{fmt(r.values[yr])}</div>
                {!isNow&&<div style={{fontSize:10,color:'var(--green)'}}>+{fmt(gain)}</div>}
              </td>
            })}
            {rows.length>1&&<td style={{padding:'9px 10px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:isNow?'var(--text)':'var(--brand)'}}>
              <div>{fmt(totals[yr])}</div>
              {!isNow&&<div style={{fontSize:10,color:'var(--green)'}}>+{fmt(totals[yr]-totals[0])}</div>}
            </td>}
            {rows.length>1&&<td style={{padding:'9px 10px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:600,color:isNow?'var(--text)':'#1e6e35'}}>
              <div>{fmt(Math.max(0,equityTotals[yr]))}</div>
              {!isNow&&equityTotals[yr]>equityTotals[0]&&<div style={{fontSize:10,color:'var(--green)'}}>+{fmt(equityTotals[yr]-equityTotals[0])}</div>}
            </td>}
          </tr>
        })}
      </tbody>
    </table>
    <div style={{fontSize:10,color:'var(--text-3)',marginTop:8,lineHeight:1.5}}>
      Growth rates: {rows.map(r=>r.name+' '+r.rate+'%').join(' · ')} · Based on UK HPI regional 5yr averages · Mortgage balance estimated · Not financial advice
    </div>
  </div>
}

function GrowthCards({props}){
  return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginBottom:14}}>
    {props.filter(p=>p.currentValue).map(p=>{
      const rate = getGrowthRate(p.address)
      const val = Number(p.currentValue)
      const in1 = projectValue(val,rate,1)[1]
      const in5 = projectValue(val,rate,5)[5]
      const in10 = projectValue(val,rate,10)[10]
      return <div key={p.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:14}}>
        <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:1}}>{p.shortName}</div>
        <div style={{fontSize:11,color:'var(--text-3)',marginBottom:10}}>{rate}% avg annual · {p.nation||'England'}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5}}>
          {[['Now',val,null],['1yr',in1,in1-val],['5yr',in5,in5-val],['10yr',in10,in10-val]].map(([label,v,gain])=>(
            <div key={label} style={{background:label==='Now'?'var(--surface2)':'var(--brand-subtle)',borderRadius:7,padding:'8px 7px',border:label==='Now'?'none':'0.5px solid rgba(27,94,59,0.1)'}}>
              <div style={{fontSize:10,color:'var(--text-3)',marginBottom:2}}>{label}</div>
              <div style={{fontSize:11,fontWeight:600,fontFamily:'var(--mono)',color:label==='Now'?'var(--text)':'var(--brand)'}}>{fmt(v)}</div>
              {gain&&<div style={{fontSize:9,color:'var(--green)',marginTop:1}}>+{fmt(gain)}</div>}
            </div>
          ))}
        </div>
      </div>
    })}
  </div>
}


function GrowthChartWidget({props}){
  const[chartYears,setChartYears]=useState(10)
  return<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <div>
        <div style={{fontSize:13,fontWeight:500}}>Projected portfolio growth</div>
        <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>UK HPI regional averages by postcode · Not financial advice</div>
      </div>
      <div style={{display:'flex',gap:4}}>
        {[1,5,10].map(y=>(
          <button key={y} onClick={()=>setChartYears(y)}
            style={{padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'0.5px solid',
              borderColor:chartYears===y?'var(--brand)':'var(--border)',
              background:chartYears===y?'var(--brand-light)':'var(--surface)',
              color:chartYears===y?'var(--brand)':'var(--text-2)'}}>
            {y}yr
          </button>
        ))}
      </div>
    </div>
    <PortfolioChart props={props} years={chartYears}/>
    <YearByYearTable props={props} years={chartYears}/>
  </div>
}

function PortfolioScore({props,checklist,urgent}){
  // Calculate a portfolio health score out of 100
  const scores = []
  // Compliance score
  const complianceItems = ['gasDue','eicrDue','insuranceRenewal']
  const complianceScore = props.length > 0
    ? props.reduce((s,p) => {
        let ps = 0
        if(p.gasDue && dueSoon(p.gasDue) !== 'overdue') ps += 33
        if(p.eicrDue && dueSoon(p.eicrDue) !== 'overdue') ps += 33
        if(p.insurer && p.insuranceType?.toLowerCase() !== 'home') ps += 34
        return s + ps
      }, 0) / props.length
    : 0
  scores.push({label:'Compliance', score:Math.round(complianceScore), color:'#1e6e35'})

  // Financial health
  const totalRent = props.reduce((s,p)=>s+(Number(p.rent)||0),0)
  const totalPayment = props.reduce((s,p)=>s+(Number(p.monthlyPayment)||0),0)
  const coverage = totalPayment > 0 ? totalRent / totalPayment : 0
  const finScore = coverage >= 1.5 ? 100 : coverage >= 1.25 ? 75 : coverage >= 1.0 ? 50 : 25
  scores.push({label:'Financial health', score:finScore, color:'#0C447C'})

  // Data completeness
  const fields = ['shortName','address','rent','currentValue','mortgage','tenantName','gasDue','eicrDue','epcRating','insurer']
  const dataScore = props.length > 0
    ? Math.round(props.reduce((s,p) => s + fields.filter(f=>p[f]).length/fields.length*100, 0) / props.length)
    : 0
  scores.push({label:'Data completeness', score:dataScore, color:'#633806'})

  const overall = scores.length > 0 ? Math.round(scores.reduce((s,x)=>s+x.score,0)/scores.length) : 0

  return <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:500}}>Portfolio health score</div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:overall>=75?'var(--green-bg)':overall>=50?'#fff8e1':'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:14,fontWeight:700,color:overall>=75?'var(--green)':overall>=50?'#633806':'var(--red)'}}>{overall}</span>
        </div>
        <span style={{fontSize:12,color:'var(--text-3)'}}>/100</span>
      </div>
    </div>
    {scores.map(s=>(
      <div key={s.label} style={{marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-2)',marginBottom:4}}>
          <span>{s.label}</span><span style={{fontWeight:500}}>{s.score}%</span>
        </div>
        <div style={{height:5,borderRadius:3,background:'var(--surface2)',overflow:'hidden'}}>
          <div style={{width:s.score+'%',height:'100%',background:s.color,borderRadius:3,transition:'width 0.6s ease'}}/>
        </div>
      </div>
    ))}
    {props.length===0&&<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0'}}>Add properties to see your score</div>}
  </div>
}

function Overview({portfolio,onAddDocs,user,onToggleCheck}){
  const props=portfolio.properties||[]
  const totalRent=props.reduce((s,p)=>s+(Number(p.rent)||0),0)
  const totalPayment=props.reduce((s,p)=>s+(Number(p.monthlyPayment)||0),0)
  const totalValue=props.reduce((s,p)=>s+(Number(p.currentValue)||0),0)
  const totalMortgage=props.reduce((s,p)=>s+(Number(p.mortgage)||0),0)
  const totalEquity=totalValue-totalMortgage
  const net=totalRent-totalPayment
  const grossYield=totalValue>0?((totalRent*12/totalValue)*100).toFixed(1):null
  const urgent=[],upcoming=[]
  props.forEach(p=>{
    const gas=dueSoon(p.gasDue),eicr=dueSoon(p.eicrDue),ins=dueSoon(p.insuranceRenewal)
    if(p.insuranceType?.toLowerCase()==='home')urgent.push(`${p.shortName} - Insurance is HOME policy`)
    if(gas==='overdue')urgent.push(`${p.shortName} - Gas certificate overdue`)
    if(eicr==='overdue')urgent.push(`${p.shortName} - EICR overdue`)
    if(p.epcRating&&['D','E','F','G'].includes(p.epcRating?.toUpperCase()))urgent.push(`${p.shortName} - EPC ${p.epcRating} needs upgrading by 2028`)
    if(gas==='due-soon')upcoming.push({text:`${p.shortName} - Gas cert due ${p.gasDue}`,days:dueDays(p.gasDue)})
    if(eicr==='due-soon')upcoming.push({text:`${p.shortName} - EICR due ${p.eicrDue}`,days:dueDays(p.eicrDue)})
    if(ins==='due-soon')upcoming.push({text:`${p.shortName} - Insurance renews ${p.insuranceRenewal}`,days:dueDays(p.insuranceRenewal)})
  })
  upcoming.sort((a,b)=>(a.days||999)-(b.days||999))
  const[emailSent,setEmailSent]=useState(false),[sending,setSending]=useState(false)
  async function sendReminders(){setSending(true);try{await fetch('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userEmail:user.emailAddresses?.[0]?.emailAddress,userName:user.firstName,portfolio})});setEmailSent(true);setTimeout(()=>setEmailSent(false),4000)}catch{}setSending(false)}
  const checklist=portfolio.checklist||{}
  const onboarding=portfolio.onboarding||{}
  const showChecklist=onboarding&&(onboarding.experience==='new'||onboarding.experience==='some')
  const showPricingNudge=onboarding&&onboarding.experience==='experienced'&&onboarding.portfolioSize
  const checklistNation=onboarding?.nation==='mixed'?'England':onboarding?.nation||'England'

  // Projected portfolio value in 10 years
  const projectedValue = props.filter(p=>p.currentValue).reduce((s,p)=>{
    const rate = getGrowthRate(p.address)
    return s + projectValue(Number(p.currentValue), rate, 10)[10]
  }, 0)
  const projectedGain = projectedValue - totalValue

  return<div className="fade-up">
    {urgent.length>0&&<div style={{background:'#fce8e6',border:'0.5px solid #E24B4A',borderRadius:12,padding:'12px 14px',marginBottom:14,color:'#791F1F',fontSize:12,lineHeight:1.8}}><div style={{fontWeight:600,marginBottom:4}}>Warning: {urgent.length} urgent action{urgent.length>1?'s':''}</div>{urgent.map((x,i)=><div key={i}>- {x}</div>)}</div>}

    {/* Main metrics */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
      <Metric label="Portfolio value" value={totalValue?fmt(totalValue):'-'} sub={totalEquity>0?fmt(totalEquity)+' equity':''} subGreen={totalEquity>0}/>
      <Metric label="Monthly income" value={totalRent?fmt(totalRent):'-'} sub={net>0?'Net '+fmt(net)+'/mo':''} subGreen={net>0}/>
      <Metric label="Gross yield" value={grossYield?grossYield+'%':'-'} sub={grossYield?(Number(grossYield)>=5?'Above 5% target':'Below 5% target'):''} subGreen={Number(grossYield)>=5}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
      <Metric label="Properties" value={props.length} sub={props.length===0?'Add a property':'In portfolio'}/>
      <Metric label="Total mortgage" value={totalMortgage?fmt(totalMortgage):'-'} sub={totalValue>0&&totalMortgage>0?((totalMortgage/totalValue)*100).toFixed(0)+'% LTV':''}/>
      <Metric label="Actions needed" value={urgent.length+upcoming.length} sub={urgent.length>0?urgent.length+' urgent':'Nothing urgent'} subRed={urgent.length>0}/>
    </div>

    {/* Projected value banner */}
    {projectedValue>0&&<div style={{background:'var(--brand)',borderRadius:14,padding:'16px 20px',marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,alignItems:'center'}}>
      <div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Projected value in 10 years</div>
        <div style={{fontFamily:'var(--display)',fontSize:26,fontWeight:300,color:'#fff'}}>{fmt(projectedValue)}</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2}}>Based on regional HPI growth rates</div>
      </div>
      <div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Projected gain</div>
        <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--mono)',color:'#a3f0a0'}}>{projectedGain>0?'+'+fmt(projectedGain):'-'}</div>
      </div>
      <div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Equity today</div>
        <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--mono)',color:'#fff'}}>{totalEquity>0?fmt(totalEquity):'-'}</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:2}}>{totalValue>0&&totalMortgage>0?((totalMortgage/totalValue)*100).toFixed(0)+'% LTV':''}</div>
      </div>
    </div>}

    {/* Growth chart with year toggle */}
    {props.filter(p=>p.currentValue).length>0&&<GrowthChartWidget props={props}/>}

    {/* Per-property growth cards - always show 1/5/10yr */}
    {props.filter(p=>p.currentValue).length>0&&<>
      <div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:10}}>Property growth projections</div>
      <GrowthCards props={props}/>
    </>}

    {/* Portfolio health score */}
    {props.length>0&&<PortfolioScore props={props} checklist={checklist} urgent={urgent}/>}

    {showChecklist&&<FirstTimeLandlordChecklist nation={checklistNation} checkedItems={checklist} onToggle={onToggleCheck||((id)=>{})}/>}
    {showPricingNudge&&<PricingNudge portfolioSize={onboarding?.portfolioSize}/>}

    {/* Contact email for notifications */}
    {props.length>0&&!portfolio.contactEmail&&<div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:13,fontWeight:500,color:'#633806',marginBottom:2}}>Add your email for maintenance alerts</div>
        <div style={{fontSize:12,color:'#a07030'}}>Get notified when tenants submit issues via their report link</div>
      </div>
      <button onClick={()=>{const e=prompt('Your email address for notifications:');if(e&&e.includes('@'))setPortfolio(prev=>({...prev,contactEmail:e}))}} style={{background:'#EF9F27',color:'#fff',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>Add email</button>
    </div>}

    {props.length===0
      ?<DropZone onFiles={onAddDocs}/>
      :<>
        <DropZone onFiles={onAddDocs} compact/>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:500}}>Compliance timeline</div>
          <button onClick={sendReminders} disabled={sending} style={{background:emailSent?'var(--green-bg)':'var(--brand-light)',color:emailSent?'var(--green)':'var(--brand)',border:'none',borderRadius:7,padding:'5px 12px',fontSize:11,fontWeight:500,cursor:'pointer'}}>{emailSent?'Sent!':sending?'Sending...':'Email reminders'}</button>
        </div>
        {upcoming.length===0&&urgent.length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'6px 0'}}>No upcoming compliance issues.</div>:upcoming.map((t,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<upcoming.length-1?'0.5px solid var(--border)':'none',gap:8,flexWrap:'wrap'}}><span style={{fontSize:12,color:'var(--text-2)'}}>{t.text}</span><Pill type={t.days!=null&&t.days<=30?'red':'amber'} dot>{t.days!=null&&t.days<=0?'Overdue':t.days!=null?t.days+'d':'Due soon'}</Pill></div>)}
      </div>
    </>}
  </div>
}


/* ---- Rentability Checklist ---- */
function RentabilityChecklist({prop}){
  if(!prop) return null
  const nation = prop.nation||'England'
  const checks = [
    {id:'gas',    label:'Gas Safety Certificate', status:prop.gasDue?'done':'missing',   hint:'Annual - Gas Safe registered engineer'},
    {id:'eicr',   label:'EICR (Electrical)',       status:prop.eicrDue?'done':'missing',  hint:'Every 5 years'},
    {id:'epc',    label:'EPC certificate',          status:prop.epcRating?(['A','B','C','D','E'].includes(prop.epcRating?.toUpperCase())?'done':'fail'):'missing', hint:'Minimum E (C from 2028)'},
    {id:'ins',    label:'Landlord insurance',       status:prop.insurer&&prop.insuranceType?.toLowerCase()!=='home'?'done':prop.insurer?'fail':'missing', hint:'Must be landlord policy not home insurance'},
    {id:'deposit',label:'Deposit scheme',           status:prop.depositScheme?'done':'missing', hint:'Within 30 days of receipt'},
    ...(nation==='Scotland'?[{id:'scot_reg',label:'Scottish Landlord Register',status:prop.scottishReg?'done':'missing',hint:'Mandatory - register with local council'}]:[]),
    ...(nation==='Wales'?[{id:'rent_smart',label:'Rent Smart Wales',status:prop.rentSmart?'done':'missing',hint:'Mandatory registration and licence'}]:[]),
  ]
  const done = checks.filter(ch=>ch.status==='done').length
  const total = checks.length
  const pct = Math.round(done/total*100)
  const isLettable = checks.every(ch=>ch.status==='done')

  return <div style={{background:isLettable?'var(--green-bg)':'#fce8e6',border:`0.5px solid ${isLettable?'var(--green)':'#E24B4A'}`,borderRadius:12,padding:14,marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,gap:8}}>
      <div style={{fontSize:12,fontWeight:600,color:isLettable?'var(--green)':'#791F1F'}}>
        {isLettable?'Legally lettable':'May not be legally lettable'}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:60,height:5,borderRadius:3,background:'rgba(0,0,0,0.1)',overflow:'hidden'}}>
          <div style={{width:pct+'%',height:'100%',background:isLettable?'var(--green)':'#E24B4A',borderRadius:3}}/>
        </div>
        <span style={{fontSize:11,fontWeight:500,color:isLettable?'var(--green)':'#791F1F'}}>{pct}%</span>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 12px'}}>
      {checks.map(ch=><div key={ch.id} style={{display:'flex',alignItems:'flex-start',gap:5,padding:'2px 0'}}>
        <span style={{fontSize:12,flexShrink:0,color:ch.status==='done'?'var(--green)':ch.status==='fail'?'var(--red)':'var(--amber)'}}>
          {ch.status==='done'?'✓':ch.status==='fail'?'✗':'○'}
        </span>
        <div style={{fontSize:11,color:ch.status==='done'?'var(--text-2)':'var(--text)',fontWeight:ch.status!=='done'?500:400,lineHeight:1.4}}>
          {ch.label}
          {ch.status!=='done'&&<div style={{fontSize:10,color:'var(--text-3)',fontWeight:400}}>{ch.hint}</div>}
        </div>
      </div>)}
    </div>
  </div>
}

/* ---- Properties ---- */
function Properties({portfolio,onAddDocs,onEdit,onAdd}){
  const props=portfolio.properties||[]
  const col=s=>s==='valid'?'var(--green)':s==='due-soon'?'var(--amber)':s==='overdue'?'var(--red)':'var(--text-3)'
  return<div className="fade-up">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div style={{fontSize:13,color:'var(--text-2)'}}>{props.length} propert{props.length===1?'y':'ies'}</div><button onClick={onAdd} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add property</button></div>
    <DropZone onFiles={onAddDocs} compact/>
    <div style={{marginBottom:12}}/>
    {props.length===0?null:props.map(p=>{
      const gasC=dueSoon(p.gasDue),eicrC=dueSoon(p.eicrDue),insC=dueSoon(p.insuranceRenewal)
      const epcStatus=p.epcRating?(['A','B','C'].includes(p.epcRating.toUpperCase())?'green':p.epcRating.toUpperCase()==='D'?'amber':'red'):null
      const equity=p.currentValue&&p.mortgage?Number(p.currentValue)-Number(p.mortgage):null
      const grossYield=p.rent&&p.currentValue?((Number(p.rent)*12/Number(p.currentValue))*100).toFixed(1):null
      const netYield=p.rent&&p.monthlyPayment&&p.currentValue?(((Number(p.rent)-Number(p.monthlyPayment))*12/Number(p.currentValue))*100).toFixed(1):null
      const ltv=p.mortgage&&p.currentValue?((Number(p.mortgage)/Number(p.currentValue))*100).toFixed(0):null
      const nl=p.nation?NATION_LABELS[p.nation]:null
      return<div key={p.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:12}}>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:'var(--display)',fontSize:'clamp(17px,3vw,20px)',fontWeight:400,marginBottom:3}}>{p.shortName}</div>
            <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>{p.address}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <Pill type={p.ownership==='Ltd Company'?'blue':'brand'}>{p.ownership||'Personal'}</Pill>
              {nl&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:nl.bg,color:nl.color,fontWeight:500}}>{p.nation}</span>}
              {(p.docs||[]).map(d=><DocBadge key={d} type={d}/>)}
              {p.epcRating&&<Pill type={epcStatus||'grey'}>EPC {p.epcRating}</Pill>}
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            {p.rent&&<><div style={{fontSize:'clamp(18px,3vw,22px)',fontWeight:600,fontFamily:'var(--mono)',letterSpacing:'-0.5px'}}>{fmt(Number(p.rent))}</div><div style={{fontSize:10,color:'var(--text-3)'}}>per month</div></>}
            <button onClick={()=>onEdit(p)} style={{marginTop:8,fontSize:11,color:'var(--brand)',background:'none',border:'0.5px solid var(--brand-light)',borderRadius:6,padding:'3px 10px',cursor:'pointer'}}>Edit</button>
          </div>
        </div>
        {/* Rentability checklist */}
        <RentabilityChecklist prop={p}/>
        {/* Nation-specific warnings */}
        {p.nation==='Scotland'&&!p.notes?.includes('registered')&&<div style={{background:'#e0ecf8',border:'0.5px solid #005EB8',borderRadius:9,padding:'8px 12px',fontSize:11,color:'#003090',lineHeight:1.5,marginBottom:12}}>Scottish property: ensure you are registered with your local council as a landlord. Use a Private Residential Tenancy agreement.</div>}
        {p.nation==='Wales'&&<div style={{background:'#fce8ec',border:'0.5px solid #C8102E',borderRadius:9,padding:'8px 12px',fontSize:11,color:'#8b0000',lineHeight:1.5,marginBottom:12}}>Welsh property: ensure you are registered with Rent Smart Wales. Use an Occupation Contract, not an AST.</div>}
        {(equity||grossYield||ltv)&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>{equity&&<div style={{background:'var(--brand-subtle)',borderRadius:9,padding:'10px 12px'}}><div style={{fontSize:10,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Equity</div><div style={{fontSize:15,fontWeight:600,fontFamily:'var(--mono)',color:'var(--brand)'}}>{fmt(equity)}</div></div>}{ltv&&<div style={{background:'var(--surface2)',borderRadius:9,padding:'10px 12px'}}><div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>LTV</div><div style={{fontSize:15,fontWeight:600,fontFamily:'var(--mono)'}}>{ltv}%</div></div>}{grossYield&&<div style={{background:'var(--surface2)',borderRadius:9,padding:'10px 12px'}}><div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Gross yield</div><div style={{fontSize:15,fontWeight:600,fontFamily:'var(--mono)'}}>{grossYield}%</div></div>}{netYield&&<div style={{background:'var(--green-bg)',borderRadius:9,padding:'10px 12px'}}><div style={{fontSize:10,color:'var(--green)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Net yield</div><div style={{fontSize:15,fontWeight:600,fontFamily:'var(--mono)',color:'var(--green)'}}>{netYield}%</div></div>}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>{p.tenantName&&<Row label="Tenant" value={p.tenantName}/>}{p.tenantPhone&&<Row label="Phone" value={p.tenantPhone}/>}{p.tenancyStart&&<Row label="Start" value={p.tenancyStart}/>}{p.depositAmount&&<Row label="Deposit" value={fmt(Number(p.depositAmount))}/>}{p.lender&&<Row label="Lender" value={p.lender}/>}{p.mortgage&&<Row label="Mortgage" value={fmt(Number(p.mortgage))}/>}{p.rate&&<Row label="Rate" value={`${p.rate}%`}/>}{p.fixedEnd&&<Row label="Fixed until" value={p.fixedEnd}/>}</div>
          <div>{p.gasDue&&<Row label="Gas due" value={p.gasDue} valueColor={col(gasC)}/>}{p.eicrDue&&<Row label="EICR due" value={p.eicrDue} valueColor={col(eicrC)}/>}{p.epcRating&&<Row label="EPC" value={`${p.epcRating}${p.epcExpiry?' - exp '+p.epcExpiry:''}`} valueColor={epcColor(p.epcRating)}/>}{!p.epcRating&&<Row label="EPC rating" value="Unknown - drop EPC cert" valueColor="var(--amber)"/>}{p.insurer&&<Row label="Insurer" value={p.insurer}/>}{p.insuranceRenewal&&<Row label="Ins. renew" value={p.insuranceRenewal} valueColor={col(insC)}/>}{p.notes&&<Row label="Notes" value={p.notes}/>}</div>
        </div>
        {p.insuranceType?.toLowerCase()==='home'&&<div style={{marginTop:10,fontSize:11,color:'var(--red)',background:'var(--red-bg)',borderRadius:7,padding:'7px 10px',lineHeight:1.6}}>Home insurance detected - you need a landlord policy.</div>}
        {p.epcRating&&['D','E','F','G'].includes(p.epcRating.toUpperCase())&&<div style={{marginTop:10,background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#633806',lineHeight:1.6}}>EPC {p.epcRating}: Upgrade to C needed for new lets from 2028. Cost: {p.epcRating==='D'?'£3,000-£8,000':'£5,000-£15,000'}.</div>}
      </div>
    })}
  </div>
}

/* ---- Finance ---- */
function FinanceTab({portfolio,setPortfolio}){
  const props=portfolio.properties||[]
  const expenses=portfolio.expenses||[]
  const[showForm,setShowForm]=useState(false)
  const[newExp,setNewExp]=useState({date:'',property:'',category:'',description:'',amount:''})
  const[taxRate,setTaxRate]=useState('40')
  const[s24Result,setS24Result]=useState(''),[s24Loading,setS24Loading]=useState(false)
  const[view,setView]=useState('overview') // overview | expenses | yields | s24

  const cats=['Mortgage payment','Insurance','Gas certificate','EICR','Repairs and maintenance','Agent fees','Letting fees','Legal fees','Accountant fees','Utilities','Council tax','Ground rent','Service charge','Other']

  // Core figures
  const monthlyRent=props.reduce((s,p)=>s+(Number(p.rent)||0),0)
  const annualRent=monthlyRent*12
  const monthlyMortgage=props.reduce((s,p)=>s+(Number(p.monthlyPayment)||0),0)
  const annualMortgage=monthlyMortgage*12
  const totalValue=props.reduce((s,p)=>s+(Number(p.currentValue)||0),0)
  const totalMortgage=props.reduce((s,p)=>s+(Number(p.mortgage)||0),0)
  const totalEquity=totalValue-totalMortgage
  const totalExpenses=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0)
  const monthlyExpensesAvg=totalExpenses/12
  const monthlyNet=monthlyRent-monthlyMortgage-(monthlyExpensesAvg)
  const annualNet=annualRent-annualMortgage-totalExpenses
  const portfolioLTV=totalValue>0?((totalMortgage/totalValue)*100):0
  const grossYield=totalValue>0?((annualRent/totalValue)*100):0
  const netYield=totalValue>0?((annualNet/totalValue)*100):0
  const returnOnEquity=totalEquity>0?((annualNet/totalEquity)*100):0
  const interestCoverage=annualMortgage>0?(annualRent/annualMortgage):0
  const avgLTV=props.length>0?props.filter(p=>p.currentValue&&p.mortgage).reduce((s,p)=>s+((Number(p.mortgage)/Number(p.currentValue))*100),0)/Math.max(1,props.filter(p=>p.currentValue&&p.mortgage).length):0

  // Next remortgage opportunity - properties within 6 months of fixed end
  const remortgageProps=props.filter(p=>{
    if(!p.fixedEnd)return false
    const parts=p.fixedEnd.split('/')
    if(parts.length<3)return false
    const d=new Date(parts[2],parts[1]-1,parts[0])
    const diff=(d-new Date())/(1000*60*60*24*30)
    return diff<=6&&diff>=-1
  })

  function addExpense(){
    if(!newExp.amount||!newExp.category)return
    const updated={...portfolio,expenses:[...expenses,{...newExp,id:Math.random().toString(36).slice(2)}]}
    setPortfolio(updated)
    setNewExp({date:'',property:'',category:'',description:'',amount:''})
    setShowForm(false)
  }
  function deleteExpense(id){setPortfolio({...portfolio,expenses:expenses.filter(e=>e.id!==id)})}
  const bycat={}
  expenses.forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+Number(e.amount||0)})

  async function calcSection24(){
    setS24Loading(true)
    try{
      const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'section24_report',portfolio,extra:{taxRate}})})
      const data=await res.json()
      setS24Result(data.content||'Could not calculate.')
    }catch{setS24Result('Connection error.')}
    setS24Loading(false)
  }

  const MetricCard=({label,value,sub,subGreen,subRed,large,highlight,warn})=>(
    <div style={{background:highlight?'var(--brand-subtle)':warn?'var(--red-bg)':'var(--surface2)',borderRadius:12,padding:'14px 16px',border:highlight?'0.5px solid rgba(27,94,59,0.2)':warn?'0.5px solid var(--red)':'none'}}>
      <div style={{fontSize:11,color:highlight?'var(--brand)':warn?'var(--red)':'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{label}</div>
      <div style={{fontSize:large?26:20,fontWeight:600,fontFamily:'var(--mono)',letterSpacing:'-0.5px',color:highlight?'var(--brand)':warn?'var(--red)':'var(--text)'}}>{value}</div>
      {sub&&<div style={{fontSize:11,marginTop:3,color:subGreen?'var(--green)':subRed?'var(--red)':'var(--text-3)'}}>{sub}</div>}
    </div>
  )

  return<div className="fade-up">
    {/* Sub-nav */}
    <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
      {[['overview','Overview'],['expenses','Income & Expenses'],['yields','Yield Analysis'],['s24','Section 24']].map(([id,label])=>(
        <button key={id} onClick={()=>setView(id)} style={{padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:view===id?'var(--brand)':'var(--border)',background:view===id?'var(--brand-light)':'var(--surface)',color:view===id?'var(--brand)':'var(--text-2)'}}>
          {label}
        </button>
      ))}
    </div>

    {view==='overview'&&<>
      {/* Monthly headline */}
      <div style={{background:'var(--brand)',borderRadius:14,padding:'20px 24px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {[
          {label:'Monthly rent',value:monthlyRent?fmt(monthlyRent):'-',sub:annualRent?fmt(annualRent)+'/yr':''},
          {label:'Monthly mortgage',value:monthlyMortgage?fmt(monthlyMortgage):'-',sub:annualMortgage?fmt(annualMortgage)+'/yr':''},
          {label:'Monthly net',value:monthlyNet?fmt(monthlyNet):'-',sub:annualNet?fmt(annualNet)+'/yr':'',pos:monthlyNet>0},
        ].map(m=>(
          <div key={m.label}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--mono)',color:m.pos?'#a3f0a0':'#fff'}}>{m.value}</div>
            {m.sub&&<div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:2}}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Portfolio health metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
        <MetricCard label="Portfolio value" value={totalValue?fmt(totalValue):'-'} sub={totalEquity>0?fmt(totalEquity)+' equity':''} subGreen={totalEquity>0} highlight={totalEquity>0}/>
        <MetricCard label="Total mortgage" value={totalMortgage?fmt(totalMortgage):'-'} sub={portfolioLTV>0?portfolioLTV.toFixed(1)+'% LTV':''}/>
        <MetricCard label="Total equity" value={totalEquity>0?fmt(totalEquity):'-'} sub={totalEquity>0?'Across '+props.length+' propert'+(props.length===1?'y':'ies'):''} subGreen={totalEquity>0} highlight={totalEquity>0}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
        <MetricCard label="Gross yield" value={grossYield>0?grossYield.toFixed(2)+'%':'-'} sub={grossYield>0?(grossYield>=5?'Above 5% target':'Below 5% target'):''} subGreen={grossYield>=5} subRed={grossYield>0&&grossYield<5}/>
        <MetricCard label="Net yield" value={netYield?netYield.toFixed(2)+'%':'-'} sub={netYield>0?(netYield>=3?'Healthy':'Low net yield'):''} subGreen={netYield>=3} subRed={netYield>0&&netYield<3}/>
        <MetricCard label="Return on equity" value={returnOnEquity?returnOnEquity.toFixed(1)+'%':'-'} sub="Annual net profit / equity" highlight={returnOnEquity>8}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        <MetricCard label="Interest coverage" value={interestCoverage?interestCoverage.toFixed(2)+'x':'-'} sub={interestCoverage>0?(interestCoverage>=1.5?'Healthy buffer':'Tight - under 1.5x'):''} subGreen={interestCoverage>=1.5} subRed={interestCoverage>0&&interestCoverage<1.25} warn={interestCoverage>0&&interestCoverage<1.25}/>
        <MetricCard label="Annual expenses" value={totalExpenses?fmt(totalExpenses):'-'} sub={totalExpenses>0?fmt(totalExpenses/12)+'/mo avg':''}/>
        <MetricCard label="Portfolio LTV" value={portfolioLTV>0?portfolioLTV.toFixed(1)+'%':'-'} sub={portfolioLTV>0?(portfolioLTV<=75?'Under 75% - remortgage headroom':'Over 75% - limited headroom'):''} subGreen={portfolioLTV>0&&portfolioLTV<=75} warn={portfolioLTV>80}/>
      </div>

      {/* Per-property summary */}
      {props.length>0&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Property breakdown</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:640}}>
            <thead><tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--surface2)'}}>
              {['Property','Rent/mo','Mortgage/mo','Net/mo','Value','Mortgage','Equity','LTV','Gross yield'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'8px 10px',fontSize:10,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {props.map((p,i)=>{
                const rent=Number(p.rent)||0
                const mortgage=Number(p.monthlyPayment)||0
                const net=rent-mortgage
                const val=Number(p.currentValue)||0
                const mort=Number(p.mortgage)||0
                const equity=val-mort
                const ltv=val>0?((mort/val)*100):0
                const gy=val>0?((rent*12/val)*100):0
                return<tr key={p.id} style={{borderBottom:i<props.length-1?'0.5px solid var(--border)':'none'}}>
                  <td style={{padding:'9px 10px',fontWeight:500,whiteSpace:'nowrap'}}>{p.shortName}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{rent?fmt(rent):'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{mortgage?fmt(mortgage):'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:net>0?'var(--green)':net<0?'var(--red)':'var(--text-3)',fontWeight:500}}>{rent&&mortgage?fmt(net):'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{val?fmt(val):'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{mort?fmt(mort):'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:equity>0?'var(--green)':'var(--red)',fontWeight:500}}>{val&&mort?fmt(equity):'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:ltv>80?'var(--red)':ltv>75?'var(--amber)':'var(--green)'}}>{ltv?ltv.toFixed(0)+'%':'-'}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:gy>=5?'var(--green)':gy>0?'var(--amber)':'var(--text-3)'}}>{gy?gy.toFixed(1)+'%':'-'}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Remortgage alerts */}
      {remortgageProps.length>0&&<div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:12,color:'#633806',lineHeight:1.7}}>
        <div style={{fontWeight:600,marginBottom:4}}>Remortgage window — {remortgageProps.length} propert{remortgageProps.length===1?'y':'ies'} coming off fixed rate</div>
        {remortgageProps.map(p=><div key={p.id}>- {p.shortName}: fixed rate ends {p.fixedEnd} — book now to avoid SVR</div>)}
      </div>}
    </>}

    {view==='expenses'&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        <MetricCard label="Annual rent income" value={annualRent?fmt(annualRent):'-'} subGreen={annualRent>0}/>
        <MetricCard label="Annual expenses" value={fmt(annualMortgage+totalExpenses)} sub="Mortgage + all costs"/>
        <MetricCard label="Annual net profit" value={fmt(annualNet)} subGreen={annualNet>0} subRed={annualNet<=0} sub={annualNet>0?'Before tax':'Loss position'}/>
      </div>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:500}}>Income and expenses</div>
          <button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'5px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add expense</button>
        </div>
        {showForm&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <Input label="Date" value={newExp.date} onChange={v=>setNewExp(p=>({...p,date:v}))} placeholder="DD/MM/YYYY"/>
            <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={newExp.property} onChange={e=>setNewExp(p=>({...p,property:e.target.value}))} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">All</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}</select></div>
            <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Category</label><select value={newExp.category} onChange={e=>setNewExp(p=>({...p,category:e.target.value}))} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select</option>{cats.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select></div>
            <Input label="Amount (£)" value={newExp.amount} onChange={v=>setNewExp(p=>({...p,amount:v}))} placeholder="e.g. 120" type="number"/>
            <div style={{gridColumn:'1/-1'}}><Input label="Description" value={newExp.description} onChange={v=>setNewExp(p=>({...p,description:v}))} placeholder="Brief description"/></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button><button onClick={addExpense} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Add</button></div>
        </div>}
        {expenses.length===0
          ?<div style={{fontSize:12,color:'var(--text-3)',padding:'10px 0',textAlign:'center'}}>No expenses logged yet.</div>
          :<><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:'0.5px solid var(--border)'}}>{['Date','Property','Category','Description','Amount',''].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}</tr></thead>
            <tbody>{expenses.map(e=><tr key={e.id} style={{borderBottom:'0.5px solid var(--border)'}}><td style={{padding:'8px'}}>{e.date||'-'}</td><td style={{padding:'8px',color:'var(--text-2)'}}>{e.property||'All'}</td><td style={{padding:'8px'}}>{e.category}</td><td style={{padding:'8px',color:'var(--text-2)'}}>{e.description}</td><td style={{padding:'8px',fontFamily:'var(--mono)',fontWeight:500}}>{fmt(Number(e.amount))}</td><td style={{padding:'8px'}}><button onClick={()=>deleteExpense(e.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:14}}>x</button></td></tr>)}</tbody>
            <tfoot><tr style={{borderTop:'0.5px solid var(--border-strong)'}}><td colSpan={4} style={{padding:'8px',fontWeight:500,fontSize:12}}>Total</td><td style={{padding:'8px',fontFamily:'var(--mono)',fontWeight:600,color:'var(--red)'}}>{fmt(totalExpenses)}</td><td/></tr></tfoot>
          </table>
          {Object.keys(bycat).length>0&&<div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>{Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([cat,total])=><span key={cat} style={{fontSize:11,padding:'3px 9px',borderRadius:20,background:'var(--surface2)',color:'var(--text-2)'}}>{cat}: {fmt(total)}</span>)}</div>}
          </>
        }
      </div>
    </>}

    {view==='yields'&&<>
      <div style={{fontSize:13,color:'var(--text-2)',marginBottom:16,lineHeight:1.7}}>Yield analysis helps you identify your best and worst performing properties. Gross yield is rent vs purchase price. Net yield accounts for all costs.</div>
      {props.length===0
        ?<div style={{textAlign:'center',padding:'40px 20px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14}}><div style={{fontSize:13,color:'var(--text-3)'}}>Add properties with values and rent to see yield analysis.</div></div>
        :<div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[...props].sort((a,b)=>{
            const ya=a.rent&&a.currentValue?Number(a.rent)*12/Number(a.currentValue):0
            const yb=b.rent&&b.currentValue?Number(b.rent)*12/Number(b.currentValue):0
            return yb-ya
          }).map((p,i)=>{
            const rent=Number(p.rent)||0
            const val=Number(p.currentValue)||0
            const purchase=Number(p.purchasePrice)||0
            const mort=Number(p.mortgage)||0
            const payment=Number(p.monthlyPayment)||0
            const propExpenses=expenses.filter(e=>e.property===p.shortName).reduce((s,e)=>s+(Number(e.amount)||0),0)
            const gy=val>0?(rent*12/val*100):0
            const gyPurchase=purchase>0?(rent*12/purchase*100):0
            const ny=val>0?((rent*12-payment*12-propExpenses)/val*100):0
            const equity=val-mort
            const ltv=val>0?(mort/val*100):0
            const cashFlow=rent-payment
            return<div key={p.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
                <div style={{fontWeight:500,fontSize:14}}>{p.shortName}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {gy>0&&<span style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:gy>=5?'var(--green-bg)':gy>=3?'#fff8e1':'var(--red-bg)',color:gy>=5?'var(--green)':gy>=3?'#633806':'var(--red)',fontWeight:500}}>Gross yield: {gy.toFixed(2)}%</span>}
                  {ny?<span style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:ny>=3?'var(--green-bg)':'var(--surface2)',color:ny>=3?'var(--green)':'var(--text-3)',fontWeight:500}}>Net yield: {ny.toFixed(2)}%</span>:null}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[
                  {l:'Monthly rent',v:rent?fmt(rent):'-'},
                  {l:'Monthly cash flow',v:cashFlow?fmt(cashFlow):'-',c:cashFlow>0?'var(--green)':cashFlow<0?'var(--red)':'var(--text)'},
                  {l:'Current value',v:val?fmt(val):'-'},
                  {l:'Equity',v:equity>0?fmt(equity):'-',c:equity>0?'var(--green)':'var(--text)'},
                  {l:'LTV',v:ltv?ltv.toFixed(1)+'%':'-',c:ltv>80?'var(--red)':ltv>75?'var(--amber)':'var(--green)'},
                  {l:'Gross yield on purchase',v:gyPurchase?gyPurchase.toFixed(2)+'%':'-'},
                  {l:'Annual rent',v:rent?fmt(rent*12):'-'},
                  {l:'Annual expenses',v:propExpenses?fmt(propExpenses):'-'},
                ].map(m=><div key={m.l} style={{background:'var(--surface2)',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:3}}>{m.l}</div>
                  <div style={{fontSize:14,fontWeight:600,fontFamily:'var(--mono)',color:m.c||'var(--text)'}}>{m.v}</div>
                </div>)}
              </div>
            </div>
          })}
        </div>
      }
    </>}

    {view==='s24'&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:500}}>Section 24 tax calculator</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Extra tax cost on personal properties vs Ltd Company</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={taxRate} onChange={e=>setTaxRate(e.target.value)} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 10px',fontSize:12,fontFamily:'var(--font)',color:'var(--text)',outline:'none'}}>
            <option value="20">20% basic rate</option>
            <option value="40">40% higher rate</option>
            <option value="45">45% additional rate</option>
          </select>
          <button onClick={calcSection24} disabled={s24Loading} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>{s24Loading?'Calculating...':'Calculate'}</button>
        </div>
      </div>
      <div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#633806',lineHeight:1.7,marginBottom:12}}>
        Section 24 restricts mortgage interest relief for personally-owned properties. You can only claim 20% tax credit on mortgage interest regardless of your tax rate. This calculator shows your extra annual tax vs Ltd Company ownership.
      </div>
      {props.filter(p=>p.ownership==='Personal'&&p.mortgage).length===0
        ?<div style={{fontSize:12,color:'var(--text-3)',padding:'8px 0'}}>Add personal properties with mortgage details to use this calculator.</div>
        :<div style={{fontSize:12,color:'var(--text-2)',marginBottom:8}}>{props.filter(p=>p.ownership==='Personal').length} personal propert{props.filter(p=>p.ownership==='Personal').length===1?'y':'ies'} — {props.filter(p=>p.ownership==='Ltd Company').length} Ltd Company</div>
      }
      {s24Result&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',color:'var(--text-2)',marginTop:8}}>{s24Result}</div>}
    </div>}
  </div>
}

/* ---- Maintenance ---- */
function fileToB64m(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
async function compressImgM(file,maxW=1200){const b64=await fileToB64m(file);return new Promise(res=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,maxW/img.width);const c=document.createElement('canvas');c.width=img.width*scale;c.height=img.height*scale;c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',0.75))};img.src=b64})}

function MaintenanceTab({portfolio,setPortfolio,userId}){
  const props=portfolio.properties||[]
  const jobs=portfolio.maintenance||[]
  const[showForm,setShowForm]=useState(false)
  const[newJob,setNewJob]=useState({date:'',property:'',category:'',description:'',contractor:'',cost:'',status:'Open'})
  const[jobPhotos,setJobPhotos]=useState([])
  const[copiedLink,setCopiedLink]=useState('')
  const photoRef=useRef(null)
  const cats=['Plumbing','Electrical','Heating/Boiler','Roofing','Damp/Mould','Structural','Decoration','Garden','Security','Appliances','General maintenance']
  const statuses=['Open','In progress','Completed','Cancelled']
  const statusColor={Open:'red','In progress':'amber',Completed:'green',Cancelled:'grey'}
  const urgencyColor={Emergency:'red',Urgent:'amber',Normal:'grey'}
  async function handlePhotos(files){const compressed=await Promise.all(Array.from(files).slice(0,6).map(f=>compressImgM(f)));setJobPhotos(prev=>[...prev,...compressed].slice(0,6))}
  function addJob(){if(!newJob.description||!newJob.property)return;const updated={...portfolio,maintenance:[...jobs,{...newJob,id:Math.random().toString(36).slice(2),photos:jobPhotos}]};setPortfolio(updated);setNewJob({date:'',property:'',category:'',description:'',contractor:'',cost:'',status:'Open'});setJobPhotos([]);setShowForm(false)}
  function updateStatus(id,status){setPortfolio({...portfolio,maintenance:jobs.map(j=>j.id===id?{...j,status}:j)})}
  function deleteJob(id){setPortfolio({...portfolio,maintenance:jobs.filter(j=>j.id!==id)})}
  function getTenantLink(prop){if(!userId||!prop?.id)return null;const token=btoa(`${userId}:${prop.id}`);return`https://lettly.co/report/${token}`}
  function copyLink(prop){const link=getTenantLink(prop);if(!link)return;navigator.clipboard.writeText(link);setCopiedLink(prop.id);setTimeout(()=>setCopiedLink(''),2500)}
  const open=jobs.filter(j=>j.status==='Open'||j.status==='In progress')
  const done=jobs.filter(j=>j.status==='Completed'||j.status==='Cancelled')
  const totalCost=jobs.filter(j=>j.status==='Completed').reduce((s,j)=>s+(Number(j.cost)||0),0)
  return<div className="fade-up">
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
      <Metric label="Open jobs" value={open.length} sub={open.length>0?'Needs attention':''} subRed={open.length>0}/>
      <Metric label="Completed" value={done.filter(j=>j.status==='Completed').length} sub="Total resolved"/>
      <Metric label="Repair costs" value={totalCost?fmt(totalCost):'-'} sub="Completed jobs"/>
    </div>
    {props.length>0&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Tenant report links</div>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:12}}>Share with your tenant so they can submit issues directly to your log.</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>{props.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><span style={{fontSize:13,color:'var(--text-2)'}}>{p.shortName}</span><button onClick={()=>copyLink(p)} style={{background:copiedLink===p.id?'var(--green-bg)':'var(--brand-light)',color:copiedLink===p.id?'var(--green)':'var(--brand)',border:'none',borderRadius:7,padding:'5px 12px',fontSize:11,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>{copiedLink===p.id?'Copied!':'Copy tenant link'}</button></div>)}</div>
    </div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div style={{fontSize:13,fontWeight:500}}>Maintenance log</div><button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Log repair</button></div>
    {showForm&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={newJob.property} onChange={e=>setNewJob(p=>({...p,property:e.target.value}))} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select property</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}</select></div>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Category</label><select value={newJob.category} onChange={e=>setNewJob(p=>({...p,category:e.target.value}))} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select category</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div style={{gridColumn:'1/-1'}}><Input label="Description *" value={newJob.description} onChange={v=>setNewJob(p=>({...p,description:v}))} placeholder="Describe the issue or work required"/></div>
        <Input label="Date reported" value={newJob.date} onChange={v=>setNewJob(p=>({...p,date:v}))} placeholder="DD/MM/YYYY"/>
        <Input label="Contractor" value={newJob.contractor} onChange={v=>setNewJob(p=>({...p,contractor:v}))} placeholder="Contractor name/company"/>
        <Input label="Cost (£)" value={newJob.cost} onChange={v=>setNewJob(p=>({...p,cost:v}))} placeholder="e.g. 250" type="number"/>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Status</label><select value={newJob.status} onChange={e=>setNewJob(p=>({...p,status:e.target.value}))} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.4px'}}>Photos (before/after, up to 6)</label>
        <input ref={photoRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>handlePhotos(e.target.files)}/>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {jobPhotos.map((p,i)=><div key={i} style={{position:'relative',width:64,height:64,borderRadius:8,overflow:'hidden',border:'0.5px solid var(--border)'}}><img src={p} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/><button onClick={()=>setJobPhotos(prev=>prev.filter((_,j)=>j!==i))} style={{position:'absolute',top:2,right:2,width:16,height:16,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button></div>)}
          {jobPhotos.length<6&&<button onClick={()=>photoRef.current.click()} style={{width:64,height:64,borderRadius:8,border:'1.5px dashed var(--border-strong)',background:'var(--surface2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style={{fontSize:9,color:'var(--text-3)'}}>Add photo</span></button>}
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button><button onClick={addJob} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Log repair</button></div>
    </div>}
    {jobs.length===0?<div style={{textAlign:'center',padding:'40px 20px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14}}><div style={{fontSize:13,color:'var(--text-3)'}}>No maintenance jobs logged yet. Add a repair or share a tenant link.</div></div>:<>
      {open.length>0&&<><div style={{fontSize:12,fontWeight:500,color:'var(--text)',marginBottom:10}}>Open ({open.length})</div>
      {open.map(j=><div key={j.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px',marginBottom:8}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}><span style={{fontSize:13,fontWeight:500}}>{j.description}</span><Pill type={statusColor[j.status]||'grey'}>{j.status}</Pill>{j.source==='Tenant'&&<Pill type="blue">Tenant reported</Pill>}{j.urgency&&j.urgency!=='Normal'&&<Pill type={urgencyColor[j.urgency]||'grey'}>{j.urgency}</Pill>}</div>
            <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.8}}>{j.property&&<span style={{marginRight:12}}>{j.property}</span>}{j.category&&<span style={{marginRight:12}}>{j.category}</span>}{j.date&&<span style={{marginRight:12}}>{j.date}</span>}{j.tenantName&&j.source==='Tenant'&&<span style={{marginRight:12}}>From: {j.tenantName}</span>}{j.contractor&&<span style={{marginRight:12}}>Contractor: {j.contractor}</span>}{j.cost&&<span>Cost: {fmt(Number(j.cost))}</span>}</div>
            {j.photos&&j.photos.length>0&&<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>{j.photos.map((p,i)=><img key={i} src={p} alt="" style={{width:52,height:52,borderRadius:6,objectFit:'cover',border:'0.5px solid var(--border)',cursor:'pointer'}} onClick={()=>window.open(p)}/>)}</div>}
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}><select value={j.status} onChange={e=>updateStatus(j.id,e.target.value)} style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:11,fontFamily:'var(--font)',color:'var(--text)',outline:'none'}}>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select><button onClick={()=>deleteJob(j.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:14}}>x</button></div>
        </div>
      </div>)}</>}
      {done.length>0&&<><div style={{fontSize:12,fontWeight:500,color:'var(--text-2)',marginTop:16,marginBottom:10}}>Completed ({done.length})</div>{done.map(j=><div key={j.id} style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:12,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,opacity:0.75}}><div style={{flex:1,minWidth:0}}><div style={{display:'flex',gap:8,alignItems:'center',marginBottom:2,flexWrap:'wrap'}}><span style={{fontSize:12,color:'var(--text-2)'}}>{j.description}</span><Pill type={statusColor[j.status]||'grey'}>{j.status}</Pill>{j.source==='Tenant'&&<Pill type="blue">Tenant</Pill>}</div><div style={{fontSize:11,color:'var(--text-3)'}}>{j.property&&<span style={{marginRight:10}}>{j.property}</span>}{j.cost&&<span>Cost: {fmt(Number(j.cost))}</span>}</div>{j.photos&&j.photos.length>0&&<div style={{display:'flex',gap:4,marginTop:6}}>{j.photos.map((p,i)=><img key={i} src={p} alt="" style={{width:40,height:40,borderRadius:5,objectFit:'cover',border:'0.5px solid var(--border)',cursor:'pointer'}} onClick={()=>window.open(p)}/>)}</div>}</div><button onClick={()=>deleteJob(j.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:14}}>x</button></div>)}</>}
    </>}
  </div>
}

/* ---- Tools ---- */
function ToolsTab({portfolio}){
  const props=portfolio.properties||[]
  const[tool,setTool]=useState('remortgage')
  const[docType,setDocType]=useState('section8')
  const[selProp,setSelProp]=useState('')
  const[extra,setExtra]=useState({})
  const[generating,setGenerating]=useState(false)
  const[generated,setGenerated]=useState('')
  const[remProp,setRemProp]=useState('')
  const rp=props.find(p=>p.id===remProp||p.shortName===remProp)
  async function generateDoc(){const p=props.find(pp=>pp.id===selProp||pp.shortName===selProp)||props[0];if(!p)return alert('Please select a property');setGenerating(true);setGenerated('');try{const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:docType,property:p,portfolio,extra})});const data=await res.json();setGenerated(data.content||'Could not generate.')}catch{setGenerated('Connection error.')};setGenerating(false)}
  const ercAmt=rp&&rp.ercRate&&rp.mortgage?((Number(rp.ercRate)/100)*Number(rp.mortgage)).toFixed(0):null
  const equity=rp&&rp.currentValue&&rp.mortgage?Number(rp.currentValue)-Number(rp.mortgage):null
  const maxRelease=rp&&rp.currentValue?Math.floor(Number(rp.currentValue)*0.75)-Number(rp.mortgage||0):null
  return<div className="fade-up">
    <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>{[{id:'remortgage',label:'Remortgage planner'},{id:'documents',label:'Document generator'},{id:'report',label:'Portfolio report'}].map(t=><button key={t.id} onClick={()=>{setTool(t.id);setGenerated('')}} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:tool===t.id?'var(--brand)':'var(--border)',background:tool===t.id?'var(--brand-light)':'var(--surface)',color:tool===t.id?'var(--brand)':'var(--text-2)'}}>{t.label}</button>)}</div>
    {tool==='remortgage'&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>Remortgage planner</div>
      <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Select property</label><select value={remProp} onChange={e=>setRemProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Choose a property</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}</select></div>
      {rp&&<>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
          <div style={{background:'var(--surface2)',borderRadius:9,padding:'12px 14px'}}><div style={{fontSize:11,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Current mortgage</div><div style={{fontSize:18,fontWeight:600,fontFamily:'var(--mono)'}}>{fmt(Number(rp.mortgage||0))}</div></div>
          {equity&&<div style={{background:'var(--brand-subtle)',borderRadius:9,padding:'12px 14px'}}><div style={{fontSize:11,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Equity</div><div style={{fontSize:18,fontWeight:600,fontFamily:'var(--mono)',color:'var(--brand)'}}>{fmt(equity)}</div></div>}
          {maxRelease>0&&<div style={{background:'var(--green-bg)',borderRadius:9,padding:'12px 14px'}}><div style={{fontSize:11,color:'var(--green)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Max release @ 75% LTV</div><div style={{fontSize:18,fontWeight:600,fontFamily:'var(--mono)',color:'var(--green)'}}>{fmt(maxRelease)}</div></div>}
        </div>
        {rp.fixedEnd&&<div style={{marginBottom:8}}><Row label="Fixed rate ends" value={rp.fixedEnd}/></div>}
        {rp.rate&&<div style={{marginBottom:8}}><Row label="Current rate" value={`${rp.rate}%`}/></div>}
        {ercAmt&&<div style={{background:'#fce8e6',border:'0.5px solid #E24B4A',borderRadius:10,padding:'12px 14px',marginBottom:14}}><div style={{fontSize:12,fontWeight:600,color:'#791F1F',marginBottom:6}}>Early repayment charge (ERC)</div><div style={{fontSize:13,color:'#791F1F'}}>If you remortgage now: ERC of approximately {fmt(Number(ercAmt))}</div>{rp.fixedEnd&&<div style={{fontSize:12,color:'#a04040',marginTop:4}}>Wait until after {rp.fixedEnd} to avoid the ERC entirely</div>}</div>}
        {maxRelease>0&&<div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.15)',borderRadius:10,padding:'12px 14px'}}><div style={{fontSize:12,fontWeight:600,color:'var(--brand)',marginBottom:6}}>Capital release scenarios</div><div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.8}}>Remortgage to 75% LTV: release {fmt(maxRelease>0?maxRelease:0)} capital<br/>{ercAmt&&Number(ercAmt)>0&&<>Wait until fixed rate ends: save the {fmt(Number(ercAmt))} ERC<br/></>}Net capital available after ERC: {fmt(maxRelease-(Number(ercAmt)||0))}</div></div>}
      </>}
      {!remProp&&<div style={{fontSize:12,color:'var(--text-3)',padding:'8px 0'}}>Select a property above to see remortgage analysis.</div>}
    </div>}
    {tool==='documents'&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>Document generator</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',marginBottom:14}}>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Document type</label><select value={docType} onChange={e=>{setDocType(e.target.value);setExtra({});setGenerated('')}} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="section8">Section 8 Notice (England)</option><option value="inspection">Inspection report</option><option value="letter_rent_increase">Rent increase letter</option><option value="letter_entry">Right of entry notice</option></select></div>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select property</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName} {p.nation?`(${p.nation})`:''}</option>)}</select></div>
      </div>
      {(() => {const sp=props.find(p=>p.id===selProp||p.shortName===selProp);return sp?.nation==='Scotland'?<div style={{background:'#e0ecf8',border:'0.5px solid #005EB8',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#003090',lineHeight:1.6,marginBottom:14}}>Scottish property: Section 8 does not apply in Scotland. Use the First-tier Tribunal for Scotland repossession process instead.</div>:sp?.nation==='Wales'?<div style={{background:'#fce8ec',border:'0.5px solid #C8102E',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#8b0000',lineHeight:1.6,marginBottom:14}}>Welsh property: This property uses an Occupation Contract. Different possession rules apply under the Renting Homes (Wales) Act.</div>:null})()}
      {docType==='section8'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="Grounds" value={extra.grounds||''} onChange={v=>setExtra(p=>({...p,grounds:v}))} placeholder="e.g. Ground 8 - rent arrears"/><Input label="Arrears amount" value={extra.arrears||''} onChange={v=>setExtra(p=>({...p,arrears:v}))} placeholder="e.g. £1,200"/></div>}
      {docType==='inspection'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="Inspection date" value={extra.date||''} onChange={v=>setExtra(p=>({...p,date:v}))} placeholder="DD/MM/YYYY"/><Input label="Inspector name" value={extra.inspector||''} onChange={v=>setExtra(p=>({...p,inspector:v}))} placeholder="Your name"/><div style={{gridColumn:'1/-1'}}><Input label="Condition notes" value={extra.notes||''} onChange={v=>setExtra(p=>({...p,notes:v}))} placeholder="Specific items to include"/></div></div>}
      {docType==='letter_rent_increase'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="New rent (£/mo)" value={extra.newRent||''} onChange={v=>setExtra(p=>({...p,newRent:v}))} placeholder="e.g. 900" type="number"/><Input label="Effective date" value={extra.effectiveDate||''} onChange={v=>setExtra(p=>({...p,effectiveDate:v}))} placeholder="DD/MM/YYYY"/></div>}
      {docType==='letter_entry'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="Proposed visit date" value={extra.visitDate||''} onChange={v=>setExtra(p=>({...p,visitDate:v}))} placeholder="DD/MM/YYYY"/><Input label="Reason for visit" value={extra.reason||''} onChange={v=>setExtra(p=>({...p,reason:v}))} placeholder="e.g. Annual inspection"/></div>}
      <button onClick={generateDoc} disabled={generating} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:500,cursor:generating?'not-allowed':'pointer',opacity:generating?0.6:1,marginBottom:generating||generated?14:0}}>{generating?'Generating...':'Generate document'}</button>
      {generated&&<div style={{background:'var(--surface2)',borderRadius:10,padding:16,fontSize:12,lineHeight:1.9,whiteSpace:'pre-wrap',color:'var(--text-2)',fontFamily:'var(--mono)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div style={{fontSize:12,fontWeight:500,color:'var(--text)',fontFamily:'var(--font)'}}>Generated document</div><button onClick={()=>navigator.clipboard.writeText(generated)} style={{fontSize:11,color:'var(--brand)',background:'var(--brand-light)',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Copy</button></div>{generated}</div>}
    </div>}
    {tool==='report'&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Portfolio report</div>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:16}}>Summary for sharing with advisors or accountants</div>
      {props.length===0?<div style={{fontSize:12,color:'var(--text-3)'}}>Add properties to generate a report.</div>:<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>{[{label:'Total properties',value:props.length},{label:'Portfolio value',value:fmt(props.reduce((s,p)=>s+(Number(p.currentValue)||0),0))},{label:'Total mortgage',value:fmt(props.reduce((s,p)=>s+(Number(p.mortgage)||0),0))},{label:'Total equity',value:fmt(props.reduce((s,p)=>s+(Number(p.currentValue)||0)-(Number(p.mortgage)||0),0))},{label:'Monthly rent',value:fmt(props.reduce((s,p)=>s+(Number(p.rent)||0),0))},{label:'Annual rent',value:fmt(props.reduce((s,p)=>s+(Number(p.rent)||0),0)*12)}].map(m=><div key={m.label} style={{background:'var(--surface2)',borderRadius:9,padding:'12px 14px'}}><div style={{fontSize:11,color:'var(--text-3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.4px'}}>{m.label}</div><div style={{fontSize:16,fontWeight:600,fontFamily:'var(--mono)'}}>{m.value}</div></div>)}</div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Property breakdown</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:'0.5px solid var(--border)'}}>{['Property','Nation','Value','Mortgage','Equity','Rent/mo','Yield'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}</tr></thead>
            <tbody>{props.map(p=>{const eq=(Number(p.currentValue)||0)-(Number(p.mortgage)||0);const y_=p.rent&&p.currentValue?((Number(p.rent)*12/Number(p.currentValue))*100).toFixed(1)+'%':'-';const nl=p.nation?NATION_LABELS[p.nation]:null;return<tr key={p.id} style={{borderBottom:'0.5px solid var(--border)'}}><td style={{padding:'8px 8px',fontWeight:500}}>{p.shortName}</td><td style={{padding:'8px 8px'}}>{nl?<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:nl.bg,color:nl.color,fontWeight:500}}>{p.nation}</span>:'-'}</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)'}}>{p.currentValue?fmt(Number(p.currentValue)):'-'}</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)'}}>{p.mortgage?fmt(Number(p.mortgage)):'-'}</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)',color:eq>0?'var(--green)':'var(--red)'}}>{p.currentValue&&p.mortgage?fmt(eq):'-'}</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)'}}>{p.rent?fmt(Number(p.rent)):'-'}</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)'}}>{y_}</td></tr>})}</tbody>
          </table>
        </div>
        <button onClick={()=>{const text=`LETTLY PORTFOLIO REPORT\nGenerated: ${new Date().toLocaleDateString('en-GB')}\n\n${props.map(p=>`${p.shortName} (${p.nation||'England'})\n  Address: ${p.address}\n  Value: ${p.currentValue?fmt(Number(p.currentValue)):'-'}\n  Mortgage: ${p.mortgage?fmt(Number(p.mortgage)):'-'}\n  Equity: ${p.currentValue&&p.mortgage?fmt(Number(p.currentValue)-Number(p.mortgage)):'-'}\n  Rent: ${p.rent?fmt(Number(p.rent))+'/mo':'-'}\n  Tenant: ${p.tenantName||'-'}\n  Gas cert due: ${p.gasDue||'-'}\n  EICR due: ${p.eicrDue||'-'}\n  EPC: ${p.epcRating||'-'}`).join('\n\n')}`;navigator.clipboard.writeText(text)}} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:500,cursor:'pointer'}}>Copy report to clipboard</button>
      </>}
    </div>}
  </div>
}

/* ---- Legislation ---- */
function LegislationTab({portfolio}){
  const props=portfolio.properties||[]
  const nations=[...new Set(props.map(p=>p.nation||'England'))]
  const defaultNation=nations[0]||'England'
  const[nation,setNation]=useState(defaultNation)
  const legMap={England:LEGISLATION,Scotland:LEGISLATION_SCOTLAND,Wales:LEGISLATION_WALES}
  const legs=legMap[nation]||LEGISLATION
  const[open,setOpen]=useState(legs[0]?.id)
  const leg=legs.find(l=>l.id===open)||legs[0]
  const ic={critical:'var(--red)',high:'var(--amber)',ongoing:'var(--text-3)'}
  const ib={critical:'var(--red-bg)',high:'var(--amber-bg)',ongoing:'var(--surface2)'}
  const nl=NATION_LABELS[nation]||NATION_LABELS.England
  return<div className="fade-up">
    <div style={{marginBottom:16,fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>UK landlord law by nation - legislation differs significantly between England, Scotland and Wales.</div>
    {/* Nation switcher */}
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {['England','Scotland','Wales'].map(n=>{const nl2=NATION_LABELS[n];const hasProps=props.some(p=>(p.nation||'England')===n);return<button key={n} onClick={()=>{setNation(n);setOpen(legMap[n]?.[0]?.id)}} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'1px solid',borderColor:nation===n?nl2.color:'var(--border)',background:nation===n?nl2.bg:'var(--surface)',color:nation===n?nl2.color:'var(--text-2)',display:'flex',alignItems:'center',gap:6}}>{n}{hasProps&&<span style={{width:6,height:6,borderRadius:'50%',background:nl2.color,flexShrink:0}}/>}</button>})}
    </div>
    {/* Nation info banner */}
    <div style={{background:nl.bg,border:`0.5px solid ${nl.color}40`,borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:nl.color,lineHeight:1.7}}>
      {nation==='England'&&'England: Renters Rights Act in force from 1 May 2026. Section 21 abolished. All tenancies become periodic. PRS Database registration required.'}
      {nation==='Scotland'&&'Scotland: Private Residential Tenancies (PRTs) in force since 2017. No-fault evictions already abolished. Mandatory landlord registration with local council required.'}
      {nation==='Wales'&&'Wales: Renting Homes (Wales) Act in force since Dec 2022. Occupation Contracts replace ASTs. Rent Smart Wales registration mandatory.'}
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>{legs.map(l=><button key={l.id} onClick={()=>setOpen(l.id)} style={{padding:'7px 14px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:open===l.id?ic[l.impact]:'var(--border)',background:open===l.id?ib[l.impact]:'var(--surface)',color:open===l.id?ic[l.impact]:'var(--text-2)'}}>{l.name}</button>)}</div>
    {leg&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:16,padding:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:8}}><div><div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:400,marginBottom:4}}>{leg.name}</div><div style={{fontSize:12,color:'var(--text-3)'}}>{leg.status} - {leg.effectDate}</div></div><Pill type={leg.impact==='critical'?'red':leg.impact==='high'?'amber':'grey'}>{leg.impact==='critical'?'Critical':leg.impact==='high'?'High impact':'Ongoing'}</Pill></div>
      <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.7,marginBottom:20,padding:'12px 14px',background:'var(--surface2)',borderRadius:10}}>{leg.summary}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <div><div style={{fontSize:12,fontWeight:600,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}/>Current law</div>{leg.current.map((c,i)=><div key={i} style={{fontSize:12,color:'var(--text-2)',lineHeight:1.65,padding:'7px 0',borderBottom:i<leg.current.length-1?'0.5px solid var(--border)':'none'}}>{c.text}</div>)}</div>
        <div><div style={{fontSize:12,fontWeight:600,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:'50%',background:'var(--amber)',display:'inline-block'}}/>Upcoming changes</div>{leg.upcoming.map((u,i)=><div key={i} style={{fontSize:12,lineHeight:1.65,padding:'7px 0',borderBottom:i<leg.upcoming.length-1?'0.5px solid var(--border)':'none',color:u.severity==='red'?'#791F1F':u.severity==='green'?'var(--green)':'#633806'}}>{u.severity==='red'?'Warning: ':u.severity==='green'?'OK: ':'- '}{u.text}</div>)}</div>
      </div>
      <div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.15)',borderRadius:10,padding:'14px 16px'}}><div style={{fontSize:12,fontWeight:600,color:'var(--brand)',marginBottom:10}}>What you need to do</div>{leg.actions.map((a,i)=><div key={i} style={{fontSize:12,color:'var(--text-2)',lineHeight:1.65,padding:'5px 0',borderBottom:i<leg.actions.length-1?'0.5px solid rgba(27,94,59,0.1)':'none',display:'flex',gap:8}}><span style={{color:'var(--brand)',fontWeight:600,flexShrink:0}}>{i+1}.</span>{a}</div>)}</div>
    </div>}
  </div>
}

/* ---- AI ---- */
function AITab({portfolio}){
  const props=portfolio.properties||[]
  const nations=[...new Set(props.map(p=>p.nation||'England'))]
  const n=props.length
  const[messages,setMessages]=useState([{role:'assistant',content:n>0?`I can see your portfolio of ${n} propert${n===1?'y':'ies'} across ${nations.join(', ')}. Ask me anything about compliance, legislation, finances, or remortgage strategy.`:`Welcome to Lettly AI. Add properties first and I can give specific advice for your portfolio.`}])
  const[input,setInput]=useState(''),[loading,setLoading]=useState(false)
  const scrollRef=useRef(null)
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight},[messages])
  const quickQ=n>0?['What are my most urgent compliance actions?','What legislation applies to my Scottish properties?','Which properties have EPC risk?','Should I remortgage any properties now?']:["What are the main differences between English, Scottish and Welsh landlord law?",'I just inherited a house - what do I need to do to let it?','What compliance certificates do I legally need?','What is Section 24 tax?']
  async function send(text){const q=(text||input).trim();if(!q||loading)return;const newMsgs=[...messages,{role:'user',content:q}];setMessages(newMsgs);setInput('');setLoading(true);try{const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:newMsgs.slice(1),portfolio})});const data=await res.json();setMessages(prev=>[...prev,{role:'assistant',content:data.content||'Sorry, could not get a response.'}])}catch{setMessages(prev=>[...prev,{role:'assistant',content:'Connection error.'}])};setLoading(false)}
  return<div className="fade-up">
    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>{quickQ.map((q,i)=><button key={i} onClick={()=>send(q)} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'var(--text-2)',cursor:'pointer'}}>{q}</button>)}</div>
    <div style={{display:'flex',flexDirection:'column',height:'min(500px,60vh)'}}>
      <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:10,background:'var(--surface2)',borderRadius:'12px 12px 0 0',border:'0.5px solid var(--border)',borderBottom:'none'}}>
        {messages.map((m,i)=><div key={i} style={{maxWidth:'88%',alignSelf:m.role==='user'?'flex-end':'flex-start'}}>{m.role==='assistant'&&<div style={{fontSize:10,color:'var(--brand)',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.6px',fontWeight:600}}>Lettly AI</div>}<div style={{padding:'9px 13px',borderRadius:m.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px',background:m.role==='user'?'var(--brand)':'var(--surface)',color:m.role==='user'?'#fff':'var(--text)',border:m.role==='assistant'?'0.5px solid var(--border)':'none',fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{m.content}</div></div>)}
        {loading&&<div style={{alignSelf:'flex-start'}}><div style={{fontSize:10,color:'var(--brand)',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.6px',fontWeight:600}}>Lettly AI</div><div className="pulsing" style={{padding:'9px 13px',borderRadius:'12px 12px 12px 2px',background:'var(--surface)',border:'0.5px solid var(--border)',fontSize:12,color:'var(--text-3)'}}>Thinking</div></div>}
      </div>
      <div style={{display:'flex',gap:8,background:'var(--surface)',border:'0.5px solid var(--border)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:8}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask about legislation, compliance, finances or your specific portfolio" rows={1} style={{flex:1,background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',resize:'none',outline:'none'}}/>
        <button onClick={()=>send()} disabled={loading||!input.trim()} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:500,cursor:(loading||!input.trim())?'not-allowed':'pointer',opacity:(loading||!input.trim())?0.5:1,whiteSpace:'nowrap'}}>Send</button>
      </div>
    </div>
  </div>
}


/* ---- Rent Tracker ---- */
function RentTracker({portfolio, setPortfolio}){
  const props = portfolio.properties || []
  const rentLedger = portfolio.rentLedger || {}
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Generate last 12 months
  const months = []
  for(let i = 11; i >= 0; i--){
    const d = new Date(currentYear, currentMonth - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('en-GB', {month:'short', year:'numeric'}),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }

  const [selMonth, setSelMonth] = useState(months[months.length-1].key)
  const [selProp, setSelProp] = useState('all')

  function getStatus(propId, monthKey){
    return rentLedger?.[propId]?.[monthKey] || 'unpaid'
  }

  function setStatus(propId, monthKey, status){
    setPortfolio(prev => ({
      ...prev,
      rentLedger: {
        ...prev.rentLedger,
        [propId]: {
          ...(prev.rentLedger?.[propId] || {}),
          [monthKey]: status,
        }
      }
    }))
  }

  const filteredProps = selProp === 'all' ? props : props.filter(p => p.id === selProp)
  const totalExpected = filteredProps.reduce((s,p) => s + (Number(p.rent)||0), 0)
  const totalPaid = filteredProps.filter(p => getStatus(p.id, selMonth) === 'paid').reduce((s,p) => s + (Number(p.rent)||0), 0)
  const totalArrears = filteredProps.filter(p => ['unpaid','late','partial'].includes(getStatus(p.id, selMonth))).reduce((s,p) => s + (Number(p.rent)||0), 0)

  const statusMeta = {
    paid:    { label:'Paid',    color:'var(--green)',  bg:'var(--green-bg)' },
    partial: { label:'Partial', color:'#633806',       bg:'#fff8e1' },
    late:    { label:'Late',    color:'var(--red)',     bg:'var(--red-bg)' },
    unpaid:  { label:'Not yet', color:'var(--text-3)', bg:'var(--surface2)' },
  }

  // Arrears across all time
  const allArrears = []
  props.forEach(p => {
    months.slice(0, 11).forEach(m => { // exclude current month
      const s = getStatus(p.id, m.key)
      if(s === 'unpaid' || s === 'late'){
        allArrears.push({ prop: p.shortName, month: m.label, amount: Number(p.rent)||0, status: s })
      }
    })
  })

  return <div className="fade-up">
    {allArrears.length > 0 && <div style={{background:'var(--red-bg)',border:'0.5px solid var(--red)',borderRadius:12,padding:'12px 14px',marginBottom:14,color:'var(--red)',fontSize:12,lineHeight:1.8}}>
      <div style={{fontWeight:600,marginBottom:4}}>Rent arrears - {allArrears.length} outstanding payment{allArrears.length>1?'s':''}</div>
      {allArrears.slice(0,5).map((a,i) => <div key={i}>- {a.prop} - {a.month}: {fmt(a.amount)} {a.status}</div>)}
      {allArrears.length > 5 && <div style={{color:'var(--red)',opacity:0.7}}>...and {allArrears.length-5} more</div>}
    </div>}

    {/* Summary metrics */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
      <Metric label="Expected this month" value={totalExpected?fmt(totalExpected):'-'} sub="Total rent due"/>
      <Metric label="Received" value={totalPaid?fmt(totalPaid):'-'} sub={totalExpected>0?`${Math.round(totalPaid/totalExpected*100)}% collected`:''} subGreen={totalPaid===totalExpected&&totalExpected>0}/>
      <Metric label="Outstanding" value={totalArrears?fmt(totalArrears):'-'} sub={totalArrears>0?'Needs chasing':''} subRed={totalArrears>0}/>
    </div>

    {/* Controls */}
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
      <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 12px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',outline:'none'}}>
        {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
      <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 12px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',outline:'none'}}>
        <option value="all">All properties</option>
        {props.map(p => <option key={p.id} value={p.id}>{p.shortName}</option>)}
      </select>
    </div>

    {/* Rent ledger */}
    {props.length === 0
      ? <div style={{textAlign:'center',padding:'40px 20px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14}}><div style={{fontSize:13,color:'var(--text-3)'}}>Add properties with rent amounts to track payments.</div></div>
      : <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--surface2)'}}>
              {['Property','Tenant','Rent/mo','Status','Action','Notes'].map(h => <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredProps.map((p,i) => {
                const status = getStatus(p.id, selMonth)
                const sm = statusMeta[status] || statusMeta.unpaid
                const noteKey = `${selMonth}_note`
                const note = rentLedger?.[p.id]?.[noteKey] || ''
                return <tr key={p.id} style={{borderBottom:i<filteredProps.length-1?'0.5px solid var(--border)':'none'}}>
                  <td style={{padding:'10px 12px',fontWeight:500}}>{p.shortName}</td>
                  <td style={{padding:'10px 12px',color:'var(--text-2)'}}>{p.tenantName||'-'}</td>
                  <td style={{padding:'10px 12px',fontFamily:'var(--mono)',fontWeight:500}}>{p.rent?fmt(Number(p.rent)):'-'}</td>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{background:sm.bg,color:sm.color,fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20}}>{sm.label}</span>
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {['paid','partial','late','unpaid'].map(s => (
                        <button key={s} onClick={()=>setStatus(p.id,selMonth,s)}
                          style={{padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:500,cursor:'pointer',border:'0.5px solid',
                            borderColor:status===s?statusMeta[s].color:'var(--border)',
                            background:status===s?statusMeta[s].bg:'transparent',
                            color:status===s?statusMeta[s].color:'var(--text-3)'}}>
                          {statusMeta[s].label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <input
                      defaultValue={note}
                      onBlur={e=>setPortfolio(prev=>({...prev,rentLedger:{...prev.rentLedger,[p.id]:{...(prev.rentLedger?.[p.id]||{}),[noteKey]:e.target.value}}}))}
                      placeholder="e.g. Paid by BACS"
                      style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontFamily:'var(--font)',fontSize:11,color:'var(--text)',outline:'none',width:140}}/>
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
    }

    {/* Payment history - last 3 months mini view */}
    {props.length > 0 && <div style={{marginTop:16}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Payment history</div>
      <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'collapse',fontSize:11,minWidth:'100%'}}>
          <thead><tr>
            <th style={{textAlign:'left',padding:'6px 10px',color:'var(--text-3)',fontWeight:500,whiteSpace:'nowrap',minWidth:120}}>Property</th>
            {months.slice(-4).map(m => <th key={m.key} style={{padding:'6px 10px',color:'var(--text-3)',fontWeight:500,whiteSpace:'nowrap',textAlign:'center'}}>{m.label}</th>)}
          </tr></thead>
          <tbody>
            {props.map(p => <tr key={p.id} style={{borderTop:'0.5px solid var(--border)'}}>
              <td style={{padding:'7px 10px',fontWeight:500,color:'var(--text)'}}>{p.shortName}</td>
              {months.slice(-4).map(m => {
                const s = getStatus(p.id, m.key)
                const sm = statusMeta[s]||statusMeta.unpaid
                return <td key={m.key} style={{padding:'7px 10px',textAlign:'center'}}>
                  <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:sm.color,opacity:s==='unpaid'?0.3:1}} title={sm.label}/>
                </td>
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
        {Object.entries(statusMeta).map(([k,v]) => <span key={k} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-2)'}}><span style={{width:8,height:8,borderRadius:'50%',background:v.color,opacity:k==='unpaid'?0.3:1,flexShrink:0}}/>{v.label}</span>)}
      </div>
    </div>}
  </div>
}


/* ---- Condition Report ---- */
function ConditionReport({portfolio,setPortfolio,userId}){
  const props=portfolio.properties||[]
  const reports=portfolio.conditionReports||[]
  const[showForm,setShowForm]=useState(false)
  const[selProp,setSelProp]=useState('')
  const[reportType,setReportType]=useState('move_in')
  const[photos,setPhotos]=useState({})
  const[form,setForm]=useState({elecMeterReading:'',gasMeterReading:'',waterMeterReading:'',keysHanded:'',depositAmount:'',depositScheme:'',depositRef:'',notes:''})
  const photoRef=useRef(null)
  const[photoCategory,setPhotoCategory]=useState('general')

  const photoCategories=[
    {id:'general',label:'General'},{id:'kitchen',label:'Kitchen'},{id:'bathroom',label:'Bathroom'},
    {id:'lounge',label:'Lounge'},{id:'bedroom',label:'Bedrooms'},{id:'exterior',label:'Exterior'},
    {id:'meter_elec',label:'Elec meter'},{id:'meter_gas',label:'Gas meter'},
    {id:'keys',label:'Keys'},{id:'damage',label:'Damage'},
  ]

  async function handlePhotos(files){
    const compressed=await Promise.all(Array.from(files).slice(0,4).map(async f=>{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})
      return new Promise(res=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,1200/img.width);const cv=document.createElement('canvas');cv.width=img.width*scale;cv.height=img.height*scale;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);res(cv.toDataURL('image/jpeg',0.75))};img.src=b64})
    }))
    setPhotos(prev=>({...prev,[photoCategory]:[...(prev[photoCategory]||[]),...compressed].slice(0,8)}))
  }

  function saveReport(){
    if(!selProp) return
    const prop=props.find(p=>p.shortName===selProp||p.id===selProp)
    const report={id:Math.random().toString(36).slice(2),propertyId:prop?.id,propertyName:selProp,type:reportType,date:new Date().toLocaleDateString('en-GB'),timestamp:new Date().toISOString(),...form,photos,completedBy:userId}
    setPortfolio(prev=>({...prev,conditionReports:[...(prev.conditionReports||[]),report]}))
    setShowForm(false);setPhotos({});setForm({elecMeterReading:'',gasMeterReading:'',waterMeterReading:'',keysHanded:'',depositAmount:'',depositScheme:'',depositRef:'',notes:''})
  }

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
      <div><div style={{fontSize:13,fontWeight:500}}>Condition reports</div><div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Move-in and move-out inspections with photos, meter readings and key handover</div></div>
      <button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>+ New report</button>
    </div>

    {showForm&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18,marginBottom:16}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',marginBottom:12}}>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label>
          <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>
            <option value="">Select property</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}
          </select></div>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Type</label>
          <select value={reportType} onChange={e=>setReportType(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>
            <option value="move_in">Move-in</option><option value="move_out">Move-out</option><option value="periodic">Periodic</option><option value="inventory">Inventory</option>
          </select></div>
      </div>
      <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>Meter readings</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 12px',marginBottom:14}}>
        {[['elecMeterReading','Electric'],['gasMeterReading','Gas'],['waterMeterReading','Water']].map(([key,label])=>(
          <div key={key} style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label>
            <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder="Reading" style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}/></div>
        ))}
      </div>
      <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>Keys and deposit</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',marginBottom:14}}>
        {[['keysHanded','Keys handed to/from'],['depositAmount','Deposit amount (£)'],['depositScheme','Deposit scheme'],['depositRef','Deposit reference']].map(([key,label])=>(
          <div key={key} style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label>
            <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={label} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}/></div>
        ))}
      </div>
      <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>Photos</div>
      <input ref={photoRef} type="file" accept="image/*" multiple capture="environment" style={{display:'none'}} onChange={e=>handlePhotos(e.target.files)}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {photoCategories.map(cat=><button key={cat.id} onClick={()=>{setPhotoCategory(cat.id);setTimeout(()=>photoRef.current?.click(),100)}}
          style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:(photos[cat.id]||[]).length>0?'var(--brand)':'var(--border)',background:(photos[cat.id]||[]).length>0?'var(--brand-light)':'var(--surface)',color:(photos[cat.id]||[]).length>0?'var(--brand)':'var(--text-2)',position:'relative'}}>
          {cat.label}{(photos[cat.id]||[]).length>0&&<span style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'var(--brand)',color:'#fff',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{(photos[cat.id]||[]).length}</span>}
        </button>)}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
        {Object.entries(photos).flatMap(([cat,imgs])=>imgs.map((img,i)=>(
          <div key={cat+i} style={{position:'relative',width:56,height:56,borderRadius:7,overflow:'hidden',border:'0.5px solid var(--border)'}}>
            <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            <button onClick={()=>setPhotos(prev=>({...prev,[cat]:prev[cat].filter((_,j)=>j!==i)}))} style={{position:'absolute',top:2,right:2,width:14,height:14,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
          </div>
        )))}
      </div>
      <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Notes</label>
        <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional observations..." rows={3} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',resize:'vertical',boxSizing:'border-box'}}/>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button>
        <button onClick={saveReport} disabled={!selProp} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:selProp?'pointer':'not-allowed',opacity:selProp?1:0.5}}>Save report</button>
      </div>
    </div>}

    {reports.length===0&&!showForm&&<div style={{textAlign:'center',padding:'32px 20px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14}}><div style={{fontSize:13,color:'var(--text-3)'}}>No condition reports yet. Create a move-in report when a tenant arrives.</div></div>}
    {reports.length>0&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
      {[...reports].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(r=>{
        const typeLabel={move_in:'Move-in',move_out:'Move-out',periodic:'Periodic',inventory:'Inventory'}[r.type]||r.type
        const typeColor={move_in:'brand',move_out:'amber',periodic:'grey',inventory:'blue'}[r.type]||'grey'
        const totalPhotos=Object.values(r.photos||{}).reduce((s,p)=>s+p.length,0)
        return<div key={r.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6,flexWrap:'wrap'}}>
            <div><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}><span style={{fontSize:13,fontWeight:500}}>{r.propertyName}</span><Pill type={typeColor}>{typeLabel}</Pill><span style={{fontSize:11,color:'var(--text-3)'}}>{r.date}</span></div>
              <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.7}}>
                {r.elecMeterReading&&<span style={{marginRight:10}}>Elec: {r.elecMeterReading}</span>}
                {r.gasMeterReading&&<span style={{marginRight:10}}>Gas: {r.gasMeterReading}</span>}
                {r.keysHanded&&<span style={{marginRight:10}}>Keys: {r.keysHanded}</span>}
                {totalPhotos>0&&<span>{totalPhotos} photo{totalPhotos!==1?'s':''}</span>}
              </div>
            </div>
          </div>
          {totalPhotos>0&&<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {Object.entries(r.photos||{}).flatMap(([cat,imgs])=>imgs.slice(0,2).map((img,i)=>(
              <img key={cat+i} src={img} alt="" style={{width:44,height:44,borderRadius:5,objectFit:'cover',cursor:'pointer'}} onClick={()=>window.open(img)}/>
            ))).slice(0,8)}
          </div>}
          {r.notes&&<div style={{fontSize:11,color:'var(--text-2)',marginTop:6,paddingTop:6,borderTop:'0.5px solid var(--border)'}}>{r.notes}</div>}
        </div>
      })}
    </div>}
  </div>
}

/* ---- Root ---- */
const TABS=[{id:'overview',label:'Overview'},{id:'properties',label:'Properties'},{id:'rent',label:'Rent tracker'},{id:'finance',label:'Finance'},{id:'maintenance',label:'Maintenance'},{id:'conditions',label:'Conditions'},{id:'tools',label:'Tools'},{id:'legislation',label:'Legislation'},{id:'ai',label:'Lettly AI'}]

export default function Dashboard(){
  const{isLoaded,isSignedIn,user}=useUser();const router=useRouter()
  const[tab,setTab]=useState('overview')
  const[portfolio,setPortfolio]=useState({properties:[],expenses:[],maintenance:[],conditionReports:[],rentLedger:{},checklist:{},onboarding:null,contactEmail:'',ownerName:''})
  const[queue,setQueue]=useState([])
  const[showDrop,setShowDrop]=useState(false)
  const[loaded,setLoaded]=useState(false)
  const[formProp,setFormProp]=useState(null)
  const[showWizard,setShowWizard]=useState(false)

  useEffect(()=>{if(isLoaded&&!isSignedIn)router.replace('/')},[isLoaded,isSignedIn,router])
  useEffect(()=>{
    if(!user?.id)return
    // localStorage check is instant - prevents wizard flash on every login
    const wizardDone = typeof window !== 'undefined' && (localStorage.getItem('lettly_wizard_'+user.id) || localStorage.getItem('lettly_wizard_done'))
    if(!wizardDone){
      // Only show wizard after Supabase confirms no onboarding data
      getPortfolio(user.id).then(data=>{
        const p=data||{properties:[],expenses:[],maintenance:[],conditionReports:[],rentLedger:{},checklist:{},onboarding:null}
        const pSafe={...p,conditionReports:p.conditionReports||[],rentLedger:p.rentLedger||{},checklist:p.checklist||{},properties:p.properties||[],expenses:p.expenses||[],maintenance:p.maintenance||[]}
        setPortfolio(pSafe)
        setLoaded(true)
        if(!p.onboarding){setShowWizard(true)}
      })
    } else {
      getPortfolio(user.id).then(data=>{
        const p=data||{properties:[],expenses:[],maintenance:[],conditionReports:[],rentLedger:{},checklist:{},onboarding:null}
        const pSafe={...p,conditionReports:p.conditionReports||[],rentLedger:p.rentLedger||{},checklist:p.checklist||{},properties:p.properties||[],expenses:p.expenses||[],maintenance:p.maintenance||[]}
        setPortfolio(pSafe)
        setLoaded(true)
      })
    }
  },[user?.id])

  const saveRef=useRef(null)
  const dropRef=useRef(null) // prevents duplicate drop processing
  const[saveStatus,setSaveStatus]=useState('saved') // saved | saving | error
  const portfolioRef=useRef(portfolio)
  portfolioRef.current=portfolio

  useEffect(()=>{
    if(!user?.id||!loaded)return
    setSaveStatus('saving')
    clearTimeout(saveRef.current)
    saveRef.current=setTimeout(async()=>{
      try{
        await savePortfolio(user.id,portfolio)
        setSaveStatus('saved')
      }catch{
        setSaveStatus('error')
      }
    },800)
    return()=>clearTimeout(saveRef.current)
  },[portfolio,user?.id,loaded])

  // Force save before page unload (logout, tab close, refresh)
  useEffect(()=>{
    if(!user?.id)return
    const handleUnload = ()=>{
      if(portfolioRef.current&&user?.id){
        // Use sendBeacon for reliable save on unload
        const data=JSON.stringify({userId:user.id,data:portfolioRef.current})
        navigator.sendBeacon&&navigator.sendBeacon('/api/save',data)
        // Also try synchronous fallback
        savePortfolio(user.id,portfolioRef.current)
      }
    }
    window.addEventListener('beforeunload',handleUnload)
    return()=>window.removeEventListener('beforeunload',handleUnload)
  },[user?.id])

  function completeWizard(answers){
    setPortfolio(prev=>({...prev,onboarding:answers}))
    setShowWizard(false)
    // Double-write to localStorage - both keyed by user ID and a generic flag
    // Prevents wizard showing again even if user.id isn't available immediately
    try {
      if(user?.id) localStorage.setItem('lettly_wizard_'+user.id, '1')
      localStorage.setItem('lettly_wizard_done', '1')
    } catch(e) {}
  }

  function toggleCheck(id){
    setPortfolio(prev=>({...prev,checklist:{...prev.checklist,[id]:!prev.checklist[id]}}))
  }

  function updateProperty(prop){setPortfolio(prev=>{const props=prev.properties||[];const idx=props.findIndex(p=>p.id===prop.id);if(idx>=0){const updated=[...props];updated[idx]=prop;return{...prev,properties:updated}}return{...prev,properties:[...props,prop]}})}
  function deleteProperty(id){setPortfolio(prev=>({...prev,properties:(prev.properties||[]).filter(p=>p.id!==id)}))}

  async function handleFiles(files){
    // Prevent duplicate processing from multiple drop handlers firing
    const now = Date.now()
    if(dropRef.current && now - dropRef.current < 500) return
    dropRef.current = now
    setShowDrop(false)
    const valid=files.filter(f=>{
      const t=f.type.toLowerCase()
      const n=f.name.toLowerCase()
      return t==='application/pdf'||t.startsWith('image/')||
             n.endsWith('.pdf')||n.endsWith('.jpg')||n.endsWith('.jpeg')||
             n.endsWith('.png')||n.endsWith('.webp')||n.endsWith('.heic')||
             n.endsWith('.heif')||n.endsWith('.bmp')||n.endsWith('.tiff')||n.endsWith('.gif')
    });if(!valid.length)return
    // Process sequentially to avoid hammering the API
    for(const file of valid){
      const id=Math.random().toString(36).slice(2)
      setQueue(q=>[...q,{id,name:file.name,status:'reading'}])
      try{
        const {data:b64,mediaType:detectedType}=await fileToBase64(file)
        setQueue(q=>q.map(x=>x.id===id?{...x,status:'extracting'}:x))
        const res=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,data:b64,mediaType:detectedType||file.type})})
        const result=await res.json()
        setQueue(q=>q.map(x=>x.id===id?{...x,status:result.success?'done':'error',result}:x))
        if(result.success&&result.extracted)setPortfolio(prev=>mergeDoc(prev,result.extracted))
        // Small pause between files to avoid rate limits
        if(valid.indexOf(file)<valid.length-1) await new Promise(r=>setTimeout(r,500))
      }catch{
        setQueue(q=>q.map(x=>x.id===id?{...x,status:'error',result:{error:'Could not process this file.'}}:x))
      }
    }
  }

  if(!isLoaded||!isSignedIn)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/></div>

  // Pass toggleCheck down to Overview via portfolio context
  const portfolioWithToggle={...portfolio,_toggleCheck:toggleCheck}

  return<>
    <Head>
      <title>Dashboard - Lettly</title>
      <meta name="theme-color" content="#1b5e3b"/>
      <link rel="manifest" href="/manifest.json"/>
      <link rel="apple-touch-icon" href="/icon.svg"/>
      <meta name="apple-mobile-web-app-capable" content="yes"/>
      <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
      <meta name="apple-mobile-web-app-title" content="Lettly"/>
    </Head>
    <style>{`.dash-content{max-width:1060px;margin:0 auto;padding:24px 20px}@media(max-width:640px){.dash-content{padding:16px}}`}</style>

    {showWizard&&<OnboardingWizard onComplete={completeWizard} firstName={user?.firstName}/>}

    <div style={{minHeight:'100vh',background:'var(--bg)'}} onDragOver={e=>{e.preventDefault()}} onDragEnter={e=>{e.preventDefault();setShowDrop(true)}} onDragLeave={e=>{const r=e.relatedTarget;if(!r||!e.currentTarget.contains(r))setShowDrop(false)}} onDrop={e=>{e.preventDefault();setShowDrop(false)}}>
      <nav style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}><div style={{width:30,height:30,background:'var(--brand)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:14,fontWeight:700,fontFamily:'var(--display)',fontStyle:'italic'}}>L</span></div><span style={{fontFamily:'var(--display)',fontSize:17,fontWeight:400}}>Lettly</span></div>
        <div style={{display:'flex',gap:1,background:'var(--surface2)',padding:3,borderRadius:9,overflowX:'auto',maxWidth:'calc(100vw - 180px)',scrollbarWidth:'none'}}>{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'var(--surface)':'transparent',border:tab===t.id?'0.5px solid var(--border)':'none',padding:'5px 10px',borderRadius:7,fontFamily:'var(--font)',fontSize:11,color:tab===t.id?'var(--text)':'var(--text-2)',fontWeight:tab===t.id?500:400,cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}{t.id==='ai'&&<span style={{display:'inline-block',width:4,height:4,borderRadius:'50%',background:'var(--brand)',marginLeft:3,verticalAlign:'middle'}}/>}{t.id==='legislation'&&<span style={{display:'inline-block',width:4,height:4,borderRadius:'50%',background:'var(--red)',marginLeft:3,verticalAlign:'middle'}}/>}</button>)}</div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {saveStatus==='saving'&&<span style={{fontSize:11,color:'var(--text-3)'}}>Saving…</span>}
          {saveStatus==='saved'&&loaded&&<span style={{fontSize:11,color:'var(--green)'}}>✓ Saved</span>}
          {saveStatus==='error'&&<span style={{fontSize:11,color:'var(--red)'}}>Save failed</span>}
          <button onClick={()=>setShowDrop(v=>!v)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 10px',fontSize:12,color:'var(--text-2)',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add</button>
          <UserButton afterSignOutUrl="/" appearance={{variables:{colorPrimary:'#1b5e3b'}}}/>
        </div>
      </nav>
      {showDrop&&<div className="fade-in" style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'14px 16px'}}><div style={{maxWidth:700,margin:'0 auto'}}><DropZone onFiles={handleFiles} compact/></div></div>}
      {queue.length>0&&<div style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'10px 16px'}}>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:11,color:'var(--text-3)'}}>{queue.filter(q=>q.status==='done').length} of {queue.length} processed</span>
            <div style={{display:'flex',gap:8}}>
              {queue.some(q=>q.status==='error'||q.status==='done')&&<button onClick={()=>setQueue(q=>q.filter(x=>x.status==='reading'||x.status==='extracting'))} style={{fontSize:11,color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}}>Clear done</button>}
              <button onClick={()=>setQueue([])} style={{fontSize:11,color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}}>Clear all</button>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>{queue.map(item=><QueueItem key={item.id} item={item} onRetry={async(failedItem)=>{
              setQueue(q=>q.map(x=>x.id===failedItem.id?{...x,status:'reading',result:null}:x))
              try{
                const file=new File([],failedItem.name)
                // Re-fetch original file is not possible - show message instead
                setQueue(q=>q.map(x=>x.id===failedItem.id?{...x,status:'error',result:{error:'Please drop the file again to retry.'}}:x))
              }catch{}
            }}/>)}</div>
        </div>
      </div>}
      <div className="dash-content">
        {tab==='overview'&&<div style={{marginBottom:18}}><h1 style={{fontFamily:'var(--display)',fontSize:'clamp(22px,4vw,28px)',fontWeight:300,marginBottom:3}}>Good {getGreeting()}, {user?.firstName||'there'}</h1><p style={{fontSize:13,color:'var(--text-3)'}}>{(portfolio.properties||[]).length===0?'Add a property or drop documents to get started.':`${(portfolio.properties||[]).length} propert${(portfolio.properties||[]).length===1?'y':'ies'} saved`}</p></div>}
        {tab==='overview'    &&<Overview     portfolio={portfolio} onAddDocs={handleFiles} user={user} onToggleCheck={toggleCheck}/>}
        {tab==='properties'  &&<Properties   portfolio={portfolio} onAddDocs={handleFiles} onEdit={setFormProp} onAdd={()=>setFormProp({})}/>}
        {tab==='finance'     &&<FinanceTab    portfolio={portfolio} setPortfolio={setPortfolio}/> }
        {tab==='rent'        &&<RentTracker   portfolio={portfolio} setPortfolio={setPortfolio}/> }
        {tab==='maintenance' &&<MaintenanceTab portfolio={portfolio} setPortfolio={setPortfolio} userId={user?.id}/>}
        {tab==='tools'       &&<ToolsTab      portfolio={portfolio}/> }
        {tab==='conditions'  &&<div className='fade-up'><ConditionReport portfolio={portfolio} setPortfolio={setPortfolio} userId={user?.id}/></div>}
        {tab==='legislation' &&<LegislationTab portfolio={portfolio}/>}
        {tab==='ai'          &&<AITab         portfolio={portfolio}/>}
      </div>
    </div>
    {formProp!==null&&<PropertyForm initial={formProp} onSave={updateProperty} onDelete={deleteProperty} onClose={()=>setFormProp(null)}/>}
  </>
}
function getGreeting(){const h=new Date().getHours();return h<12?'morning':h<18?'afternoon':'evening'}
