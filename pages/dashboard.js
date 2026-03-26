import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useUser, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { fmt, dueSoon, dueDays, epcColor, mergeDoc, LEGISLATION, LEGISLATION_SCOTLAND, LEGISLATION_WALES } from '../lib/data'
import { getPortfolio, savePortfolio } from '../lib/supabase'
import { detectNation, NATION_LABELS, getChecklist } from '../lib/nations'

function fileToBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file)})}

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
function DropZone({onFiles,compact}){const[over,setOver]=useState(false);const ref=useRef(null);function drop(e){e.preventDefault();setOver(false);const f=Array.from(e.dataTransfer.files).filter(f=>f.type==='application/pdf'||f.type.startsWith('image/'));if(f.length)onFiles(f)}
if(compact)return<div onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}} onDrop={drop} onClick={()=>ref.current.click()} style={{border:`1.5px dashed ${over?'var(--brand)':'var(--border-strong)'}`,borderRadius:12,padding:'14px 16px',cursor:'pointer',background:over?'var(--brand-subtle)':'transparent',display:'flex',alignItems:'center',gap:12}}><input ref={ref} type="file" multiple accept=".pdf,image/*" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}}/><div style={{width:32,height:32,borderRadius:8,background:over?'var(--brand)':'var(--brand-light)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><UpIcon color={over?'#fff':'var(--brand)'} size={15}/></div><div><div style={{fontSize:12,fontWeight:500}}>Drop documents</div><div style={{fontSize:11,color:'var(--text-3)'}}>Gas cert, EICR, EPC, insurance, tenancy</div></div></div>
return<div onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}} onDrop={drop} onClick={()=>ref.current.click()} style={{border:`2px dashed ${over?'var(--brand)':'rgba(0,0,0,0.14)'}`,borderRadius:20,padding:'clamp(32px,5vw,48px) clamp(20px,4vw,40px)',textAlign:'center',background:over?'var(--brand-subtle)':'var(--surface)',cursor:'pointer',transition:'all 0.25s'}}><input ref={ref} type="file" multiple accept=".pdf,image/*" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}}/><div className={over?'':'floating'} style={{width:64,height:64,borderRadius:'50%',margin:'0 auto 16px',background:over?'var(--brand)':'var(--brand-light)',display:'flex',alignItems:'center',justifyContent:'center'}}><UpIcon color={over?'#fff':'var(--brand)'} size={28}/></div><div style={{fontFamily:'var(--display)',fontSize:'clamp(18px,3vw,24px)',fontWeight:400,marginBottom:8}}>{over?'Release to analyse':'Drop your documents here'}</div><div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.75,marginBottom:18}}>Gas certs, EICRs, Insurance, EPCs, Tenancy agreements, Mortgage offers</div><div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginBottom:14}}>{Object.values(DOC_META).filter(d=>d.label!=='Document').map(d=><span key={d.label} style={{fontSize:11,padding:'4px 11px',borderRadius:20,background:d.bg,color:d.fg,display:'inline-flex',alignItems:'center',gap:4}}><span style={{fontSize:12}}>{d.icon}</span>{d.label}</span>)}</div><div style={{fontSize:11,color:'var(--text-3)'}}>PDF or image - your data stays private</div></div>}

function QueueItem({item}){const done=item.status==='done',err=item.status==='error',working=item.status==='reading'||item.status==='extracting';const ext=item.result?.extracted
return<div className="scale-in" style={{display:'flex',gap:12,alignItems:'flex-start',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px'}}><div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:done?'var(--brand-light)':err?'var(--red-bg)':'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center'}}>{done&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}{err&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}{working&&<div style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/>}</div><div style={{flex:1,minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:done&&ext?5:0}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{item.name}</div><Pill type={done?'green':err?'red':item.status==='extracting'?'amber':'grey'}>{done?'Extracted':err?'Error':item.status==='extracting'?'Analysing':'Reading'}</Pill></div>{done&&ext&&<div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6}}>{ext.summary}{ext.property?.shortName&&<span style={{marginLeft:6,color:'var(--brand)',fontWeight:500}}>- {ext.property.shortName}</span>}</div>}{done&&ext?.documentType&&<div style={{marginTop:6}}><DocBadge type={ext.documentType}/></div>}{err&&<div style={{fontSize:11,color:'var(--red)',marginTop:3}}>{item.result?.error||'Could not read this file.'}</div>}</div></div>}

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
        <div style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${checkedItems[item.id]?'var(--brand)':'var(--border-strong)'}`,background:checkedItems[item.id]?'var(--brand)':'transparent',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
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

/* ---- Overview ---- */
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

  function toggleCheck(id){
    const updated={...portfolio,checklist:{...checklist,[id]:!checklist[id]}}
    return updated
  }

  return<div className="fade-up">
    {urgent.length>0&&<div style={{background:'#fce8e6',border:'0.5px solid #E24B4A',borderRadius:12,padding:'12px 14px',marginBottom:14,color:'#791F1F',fontSize:12,lineHeight:1.8}}><div style={{fontWeight:600,marginBottom:4}}>Warning: {urgent.length} urgent action{urgent.length>1?'s':''}</div>{urgent.map((x,i)=><div key={i}>- {x}</div>)}</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
      <Metric label="Portfolio value" value={totalValue?fmt(totalValue):'-'} sub={totalEquity>0?`${fmt(totalEquity)} equity`:''} subGreen={totalEquity>0}/>
      <Metric label="Monthly income" value={totalRent?fmt(totalRent):'-'} sub={net>0?`Net ${fmt(net)}/mo`:''} subGreen={net>0}/>
      <Metric label="Gross yield" value={grossYield?`${grossYield}%`:'-'} sub={grossYield?'Across portfolio':''}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
      <Metric label="Properties" value={props.length} sub={props.length===0?'Add a property':'In portfolio'}/>
      <Metric label="Total mortgage" value={totalMortgage?fmt(totalMortgage):'-'} sub={totalValue>0&&totalMortgage>0?`${((totalMortgage/totalValue)*100).toFixed(0)}% LTV`:''}/>
      <Metric label="Actions needed" value={urgent.length+upcoming.length} sub={urgent.length>0?`${urgent.length} urgent`:'Nothing urgent'} subRed={urgent.length>0}/>
    </div>

    {/* Nation breakdown */}
    {props.length>0&&(()=>{const nations={};props.forEach(p=>nations[p.nation||'England']=(nations[p.nation||'England']||0)+1);return Object.keys(nations).length>1?<div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>{Object.entries(nations).map(([n,count])=>{const nl=NATION_LABELS[n]||NATION_LABELS.England;return<span key={n} style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:nl.bg,color:nl.color,fontWeight:500}}>{n}: {count} propert{count===1?'y':'ies'}</span>})}</div>:null})()}

    {showChecklist&&<FirstTimeLandlordChecklist nation={checklistNation} checkedItems={checklist} onToggle={onToggleCheck||((id)=>{})}/>}

    {showPricingNudge&&(()=>{
      const sizeMap={'1-5':'Starter','5-10':'Growth','10-20':'Portfolio','20+':'Portfolio'}
      const priceMap={'1-5':'£10','5-10':'£15','10-20':'£25','20+':'£25'}
      const plan=sizeMap[onboarding.portfolioSize]||'Portfolio'
      const price=priceMap[onboarding.portfolioSize]||'£25'
      return<div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div><div style={{fontSize:13,fontWeight:500,color:'var(--brand)',marginBottom:2}}>Based on your portfolio size, {plan} plan looks right for you</div><div style={{fontSize:12,color:'var(--text-2)'}}>Up to {onboarding.portfolioSize} properties - {price}/month with a 14-day free trial</div></div>
        <a href="https://lettly.co/#pricing" style={{fontSize:12,fontWeight:500,color:'var(--brand)',background:'var(--brand-light)',border:'none',borderRadius:7,padding:'7px 14px',textDecoration:'none',whiteSpace:'nowrap'}}>View plans</a>
      </div>
    })()}
    {props.length===0?<DropZone onFiles={onAddDocs}/>:<>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:500}}>Compliance timeline</div>
          <button onClick={sendReminders} disabled={sending} style={{background:emailSent?'var(--green-bg)':'var(--brand-light)',color:emailSent?'var(--green)':'var(--brand)',border:'none',borderRadius:7,padding:'5px 12px',fontSize:11,fontWeight:500,cursor:'pointer'}}>{emailSent?'Sent!':sending?'Sending...':'Email reminders'}</button>
        </div>
        {upcoming.length===0&&urgent.length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'6px 0'}}>No upcoming compliance issues.</div>:upcoming.map((t,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<upcoming.length-1?'0.5px solid var(--border)':'none',gap:8,flexWrap:'wrap'}}><span style={{fontSize:12,color:'var(--text-2)'}}>{t.text}</span><Pill type={t.days!=null&&t.days<=30?'red':'amber'} dot>{t.days!=null&&t.days<=0?'Overdue':t.days!=null?`${t.days}d`:'Due soon'}</Pill></div>)}
      </div>
    </>}
  </div>
}

/* ---- Properties ---- */
function Properties({portfolio,onAddDocs,onEdit,onAdd}){
  const props=portfolio.properties||[]
  const col=s=>s==='valid'?'var(--green)':s==='due-soon'?'var(--amber)':s==='overdue'?'var(--red)':'var(--text-3)'
  return<div className="fade-up">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div style={{fontSize:13,color:'var(--text-2)'}}>{props.length} propert{props.length===1?'y':'ies'}</div><button onClick={onAdd} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add property</button></div>
    {props.length===0?<DropZone onFiles={onAddDocs}/>:props.map(p=>{
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
  const cats=['Mortgage payment','Insurance','Gas certificate','EICR','Repairs and maintenance','Agent fees','Letting fees','Legal fees','Accountant fees','Utilities','Council tax','Ground rent','Service charge','Other']
  const totalRent=props.reduce((s,p)=>s+(Number(p.rent)||0),0)*12
  const totalMortgage=props.reduce((s,p)=>s+(Number(p.monthlyPayment)||0),0)*12
  const totalExpenses=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0)
  const netProfit=totalRent-totalMortgage-totalExpenses
  function addExpense(){if(!newExp.amount||!newExp.category)return;const updated={...portfolio,expenses:[...expenses,{...newExp,id:Math.random().toString(36).slice(2)}]};setPortfolio(updated);setNewExp({date:'',property:'',category:'',description:'',amount:''});setShowForm(false)}
  function deleteExpense(id){setPortfolio({...portfolio,expenses:expenses.filter(e=>e.id!==id)})}
  const bycat={};expenses.forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+Number(e.amount||0)})
  async function calcSection24(){setS24Loading(true);try{const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'section24_report',portfolio,extra:{taxRate}})});const data=await res.json();setS24Result(data.content||'Could not calculate.')}catch{setS24Result('Connection error.')};setS24Loading(false)}
  return<div className="fade-up">
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
      <Metric label="Annual rent income" value={totalRent?fmt(totalRent):'-'} sub="Across all properties" subGreen={totalRent>0}/>
      <Metric label="Annual mortgage costs" value={totalMortgage?fmt(totalMortgage):'-'} sub="All payments x12"/>
      <Metric label="Net profit (est.)" value={fmt(netProfit)} sub={netProfit>0?'Before tax':'Loss position'} subGreen={netProfit>0} subRed={netProfit<=0}/>
    </div>
    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div style={{fontSize:13,fontWeight:500}}>Income and expenses</div><button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'5px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add expense</button></div>
      {showForm&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
          <Input label="Date" value={newExp.date} onChange={v=>setNewExp(p=>({...p,date:v}))} placeholder="DD/MM/YYYY"/>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={newExp.property} onChange={e=>setNewExp(p=>({...p,property:e.target.value}))} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">All properties</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Category</label><select value={newExp.category} onChange={e=>setNewExp(p=>({...p,category:e.target.value}))} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select category</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <Input label="Amount (£)" value={newExp.amount} onChange={v=>setNewExp(p=>({...p,amount:v}))} placeholder="e.g. 120" type="number"/>
          <div style={{gridColumn:'1/-1'}}><Input label="Description" value={newExp.description} onChange={v=>setNewExp(p=>({...p,description:v}))} placeholder="Brief description"/></div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button><button onClick={addExpense} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Add</button></div>
      </div>}
      {expenses.length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'10px 0',textAlign:'center'}}>No expenses logged yet.</div>:<>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead><tr style={{borderBottom:'0.5px solid var(--border)'}}>{['Date','Property','Category','Description','Amount',''].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}</tr></thead>
          <tbody>{expenses.map(e=><tr key={e.id} style={{borderBottom:'0.5px solid var(--border)'}}><td style={{padding:'8px 8px',color:'var(--text-2)'}}>{e.date||'-'}</td><td style={{padding:'8px 8px',color:'var(--text-2)'}}>{e.property||'All'}</td><td style={{padding:'8px 8px'}}>{e.category}</td><td style={{padding:'8px 8px',color:'var(--text-2)'}}>{e.description}</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)',fontWeight:500}}>{fmt(Number(e.amount))}</td><td style={{padding:'8px 8px'}}><button onClick={()=>deleteExpense(e.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:14}}>x</button></td></tr>)}</tbody>
          <tfoot><tr style={{borderTop:'0.5px solid var(--border-strong)'}}><td colSpan={4} style={{padding:'8px 8px',fontWeight:500,fontSize:12}}>Total expenses</td><td style={{padding:'8px 8px',fontFamily:'var(--mono)',fontWeight:600,color:'var(--red)'}}>{fmt(totalExpenses)}</td><td/></tr></tfoot>
        </table>
        {Object.keys(bycat).length>0&&<div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:8}}>{Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([cat,total])=><span key={cat} style={{fontSize:11,padding:'4px 10px',borderRadius:20,background:'var(--surface2)',color:'var(--text-2)'}}>{cat}: {fmt(total)}</span>)}</div>}
      </>}
    </div>
    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div><div style={{fontSize:13,fontWeight:500}}>Section 24 tax calculator</div><div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Extra tax on personal properties vs Ltd Company</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={taxRate} onChange={e=>setTaxRate(e.target.value)} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 10px',fontSize:12,fontFamily:'var(--font)',color:'var(--text)',outline:'none'}}><option value="20">20% basic rate</option><option value="40">40% higher rate</option><option value="45">45% additional rate</option></select>
          <button onClick={calcSection24} disabled={s24Loading} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>{s24Loading?'Calculating...':'Calculate'}</button>
        </div>
      </div>
      {props.filter(p=>p.ownership==='Personal'&&p.mortgage).length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'8px 0'}}>Add personal properties with mortgage details to use this calculator.</div>:<div style={{fontSize:12,color:'var(--text-2)',marginBottom:8}}>Analysing {props.filter(p=>p.ownership==='Personal').length} personal propert{props.filter(p=>p.ownership==='Personal').length===1?'y':'ies'}</div>}
      {s24Result&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',color:'var(--text-2)',marginTop:8}}>{s24Result}</div>}
    </div>
  </div>
}


/* ---- Property Rentability Checklist ---- */
function RentabilityChecklist({prop}){
  if(!prop)return null
  const nation=prop.nation||'England'
  const checks=[
    {id:'gas',label:'Gas Safety Certificate',status:prop.gasDue?'done':'missing',due:prop.gasDue,hint:'Annual - Gas Safe registered engineer'},
    {id:'eicr',label:'EICR (Electrical)',status:prop.eicrDue?'done':'missing',due:prop.eicrDue,hint:'Every 5 years'},
    {id:'epc',label:'EPC certificate',status:prop.epcRating?(['A','B','C','D'].includes(prop.epcRating?.toUpperCase())?(prop.epcRating?.toUpperCase()==='E'?'warning':'done'):'fail'):'missing',due:prop.epcExpiry,hint:'Minimum E (C from 2028)'},
    {id:'ins',label:'Landlord insurance',status:prop.insurer&&prop.insuranceType?.toLowerCase()!=='home'?'done':prop.insurer?'fail':'missing',hint:'Must be landlord policy not home insurance'},
    {id:'deposit',label:'Deposit protected',status:prop.depositScheme?'done':'missing',hint:'Within 30 days of receipt'},
    {id:'tenancy',label:nation==='Wales'?'Occupation Contract':'Tenancy agreement',status:(prop.docs||[]).includes('tenancy_agreement')?'done':'missing',hint:nation==='Scotland'?'Private Residential Tenancy':nation==='Wales'?'Written Statement required':'AST or periodic tenancy'},
    ...(nation==='Scotland'?[{id:'scot_reg',label:'Scottish Landlord Register',status:prop.scottishReg?'done':'missing',hint:'Mandatory - register with local council'}]:[]),
    ...(nation==='Wales'?[{id:'rent_smart',label:'Rent Smart Wales',status:prop.rentSmart?'done':'missing',hint:'Mandatory registration and licence'}]:[]),
    {id:'smoke',label:'Smoke alarms fitted',status:prop.smokeAlarms?'done':'missing',hint:'Every floor, tested on move-in'},
    {id:'co',label:'CO alarm fitted',status:prop.coAlarm?'done':'missing',hint:'Every room with combustion appliance'},
  ]
  const done=checks.filter(c=>c.status==='done').length
  const fail=checks.filter(c=>c.status==='fail'||c.status==='missing').length
  const pct=Math.round((done/checks.length)*100)
  const isLettable=fail===0

  return<div style={{background:isLettable?'var(--green-bg)':'#fce8e6',border:`0.5px solid ${isLettable?'var(--green)':'#E24B4A'}`,borderRadius:12,padding:14,marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:8}}>
      <div style={{fontSize:12,fontWeight:600,color:isLettable?'var(--green)':'#791F1F'}}>
        {isLettable?'Property is legally lettable':'Property may not be legally lettable'}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:60,height:5,borderRadius:3,background:'rgba(0,0,0,0.1)',overflow:'hidden'}}>
          <div style={{width:`${pct}%`,height:'100%',background:isLettable?'var(--green)':'#E24B4A',borderRadius:3}}/>
        </div>
        <span style={{fontSize:11,fontWeight:500,color:isLettable?'var(--green)':'#791F1F'}}>{pct}%</span>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 12px'}}>
      {checks.map(ch=><div key={ch.id} style={{display:'flex',alignItems:'flex-start',gap:6,padding:'3px 0'}}>
        <span style={{fontSize:13,flexShrink:0,marginTop:1,color:ch.status==='done'?'var(--green)':ch.status==='fail'?'var(--red)':'var(--amber)'}}>
          {ch.status==='done'?'✓':ch.status==='fail'?'✗':'○'}
        </span>
        <div>
          <div style={{fontSize:11,color:ch.status==='done'?'var(--text-2)':'var(--text)',fontWeight:ch.status!=='done'?500:400}}>{ch.label}</div>
          {ch.status!=='done'&&<div style={{fontSize:10,color:'var(--text-3)'}}>{ch.hint}</div>}
          {ch.due&&ch.status==='done'&&<div style={{fontSize:10,color:'var(--text-3)'}}>Due: {ch.due}</div>}
        </div>
      </div>)}
    </div>
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
    {id:'general',label:'General condition'},
    {id:'kitchen',label:'Kitchen'},
    {id:'bathroom',label:'Bathroom'},
    {id:'lounge',label:'Living room'},
    {id:'bedroom',label:'Bedrooms'},
    {id:'exterior',label:'Exterior'},
    {id:'meter_elec',label:'Electric meter'},
    {id:'meter_gas',label:'Gas meter'},
    {id:'meter_water',label:'Water meter'},
    {id:'keys',label:'Keys handed over'},
    {id:'garden',label:'Garden'},
    {id:'damage',label:'Existing damage'},
  ]

  async function handlePhotos(files){
    const compressed=await Promise.all(Array.from(files).slice(0,4).map(async f=>{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})
      return new Promise(res=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,1200/img.width);const cv=document.createElement('canvas');cv.width=img.width*scale;cv.height=img.height*scale;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);res(cv.toDataURL('image/jpeg',0.75))};img.src=b64})
    }))
    setPhotos(prev=>({...prev,[photoCategory]:[...(prev[photoCategory]||[]),...compressed].slice(0,8)}))
  }

  function saveReport(){
    if(!selProp)return
    const prop=props.find(p=>p.shortName===selProp||p.id===selProp)
    const report={
      id:Math.random().toString(36).slice(2),
      propertyId:prop?.id,
      propertyName:selProp,
      type:reportType,
      date:new Date().toLocaleDateString('en-GB'),
      timestamp:new Date().toISOString(),
      ...form,
      photos,
      completedBy:userId,
    }
    setPortfolio(prev=>({...prev,conditionReports:[...(prev.conditionReports||[]),report]}))
    setShowForm(false)
    setPhotos({})
    setForm({elecMeterReading:'',gasMeterReading:'',waterMeterReading:'',keysHanded:'',depositAmount:'',depositScheme:'',depositRef:'',notes:''})
  }

  const propReports=selProp?reports.filter(r=>r.propertyName===selProp):reports

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
      <div>
        <div style={{fontSize:13,fontWeight:500}}>Condition reports</div>
        <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Move-in and move-out inspections with photos, meter readings and key handover</div>
      </div>
      <button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>+ New report</button>
    </div>

    {showForm&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18,marginBottom:16}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',marginBottom:16}}>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label>
          <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>
            <option value="">Select property</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}
          </select>
        </div>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Report type</label>
          <select value={reportType} onChange={e=>setReportType(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>
            <option value="move_in">Move-in inspection</option>
            <option value="move_out">Move-out inspection</option>
            <option value="periodic">Periodic inspection</option>
            <option value="inventory">Inventory</option>
          </select>
        </div>
      </div>

      {/* Meter readings */}
      <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:10}}>Meter readings</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 12px',marginBottom:16}}>
        {[['elecMeterReading','Electric meter'],['gasMeterReading','Gas meter'],['waterMeterReading','Water meter']].map(([key,label])=>(
          <div key={key} style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label>
            <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder="Reading"
              style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}/>
          </div>
        ))}
      </div>

      {/* Keys and deposit */}
      <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:10}}>Keys and deposit</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',marginBottom:16}}>
        {[['keysHanded','Keys handed to/from'],['depositAmount','Deposit amount (£)'],['depositScheme','Deposit scheme'],['depositRef','Deposit reference']].map(([key,label])=>(
          <div key={key} style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label>
            <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={label}
              style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}/>
          </div>
        ))}
      </div>

      {/* Photos by category */}
      <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:10}}>Photos</div>
      <input ref={photoRef} type="file" accept="image/*" multiple capture="environment" style={{display:'none'}} onChange={e=>handlePhotos(e.target.files)}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {photoCategories.map(cat=><button key={cat.id} onClick={()=>{setPhotoCategory(cat.id);setTimeout(()=>photoRef.current?.click(),100)}}
          style={{padding:'5px 10px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:(photos[cat.id]||[]).length>0?'var(--brand)':'var(--border)',background:(photos[cat.id]||[]).length>0?'var(--brand-light)':'var(--surface)',color:(photos[cat.id]||[]).length>0?'var(--brand)':'var(--text-2)',position:'relative'}}>
          {cat.label}
          {(photos[cat.id]||[]).length>0&&<span style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'var(--brand)',color:'#fff',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{(photos[cat.id]||[]).length}</span>}
        </button>)}
      </div>
      {/* Show photos */}
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
        {Object.entries(photos).flatMap(([cat,imgs])=>imgs.map((img,i)=>(
          <div key={`${cat}-${i}`} style={{position:'relative',width:56,height:56,borderRadius:7,overflow:'hidden',border:'0.5px solid var(--border)'}}>
            <img src={img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            <button onClick={()=>setPhotos(prev=>({...prev,[cat]:prev[cat].filter((_,j)=>j!==i)}))}
              style={{position:'absolute',top:2,right:2,width:14,height:14,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
          </div>
        )))}
      </div>

      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Additional notes</label>
        <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Any additional observations or notes..." rows={3}
          style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',resize:'vertical',boxSizing:'border-box'}}/>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button>
        <button onClick={saveReport} disabled={!selProp} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:selProp?'pointer':'not-allowed',opacity:selProp?1:0.5}}>Save report</button>
      </div>
    </div>}

    {/* Report list */}
    {reports.length>0&&<>
      {props.length>1&&<div style={{marginBottom:10}}>
        <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 12px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',outline:'none'}}>
          <option value="">All properties</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}
        </select>
      </div>}
      {(selProp?reports.filter(r=>r.propertyName===selProp):reports).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(r=>{
        const typeLabel={move_in:'Move-in',move_out:'Move-out',periodic:'Periodic',inventory:'Inventory'}[r.type]||r.type
        const typeColor={move_in:'brand',move_out:'amber',periodic:'grey',inventory:'blue'}[r.type]||'grey'
        const totalPhotos=Object.values(r.photos||{}).reduce((s,p)=>s+p.length,0)
        return<div key={r.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px',marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8,flexWrap:'wrap'}}>
            <div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                <span style={{fontSize:13,fontWeight:500}}>{r.propertyName}</span>
                <Pill type={typeColor}>{typeLabel}</Pill>
                <span style={{fontSize:11,color:'var(--text-3)'}}>{r.date}</span>
              </div>
              <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.7}}>
                {r.elecMeterReading&&<span style={{marginRight:12}}>Electric: {r.elecMeterReading}</span>}
                {r.gasMeterReading&&<span style={{marginRight:12}}>Gas: {r.gasMeterReading}</span>}
                {r.waterMeterReading&&<span style={{marginRight:12}}>Water: {r.waterMeterReading}</span>}
                {r.keysHanded&&<span style={{marginRight:12}}>Keys: {r.keysHanded}</span>}
                {r.depositRef&&<span style={{marginRight:12}}>Deposit ref: {r.depositRef}</span>}
                {totalPhotos>0&&<span>{totalPhotos} photo{totalPhotos!==1?'s':''}</span>}
              </div>
            </div>
          </div>
          {totalPhotos>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {Object.entries(r.photos||{}).flatMap(([cat,imgs])=>imgs.slice(0,2).map((img,i)=>(
              <img key={`${cat}-${i}`} src={img} alt="" style={{width:44,height:44,borderRadius:6,objectFit:'cover',border:'0.5px solid var(--border)',cursor:'pointer'}} onClick={()=>window.open(img)}/>
            ))).slice(0,8)}
            {totalPhotos>8&&<div style={{width:44,height:44,borderRadius:6,background:'var(--surface2)',border:'0.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--text-3)'}}>+{totalPhotos-8}</div>}
          </div>}
          {r.notes&&<div style={{fontSize:11,color:'var(--text-2)',marginTop:8,paddingTop:8,borderTop:'0.5px solid var(--border)',lineHeight:1.6}}>{r.notes}</div>}
        </div>
      })}
    </>}
    {reports.length===0&&!showForm&&<div style={{textAlign:'center',padding:'32px 20px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14}}>
      <div style={{fontSize:13,color:'var(--text-3)'}}>No condition reports yet. Create a move-in report when a new tenant arrives.</div>
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

/* ---- Root ---- */
const TABS=[{id:'overview',label:'Overview'},{id:'properties',label:'Properties'},{id:'finance',label:'Finance'},{id:'maintenance',label:'Maintenance'},{id:'conditions',label:'Condition reports'},{id:'tools',label:'Tools'},{id:'legislation',label:'Legislation'},{id:'ai',label:'Lettly AI'}]

export default function Dashboard(){
  const{isLoaded,isSignedIn,user}=useUser();const router=useRouter()
  const[tab,setTab]=useState('overview')
  const[portfolio,setPortfolio]=useState({properties:[],expenses:[],maintenance:[],conditionReports:[],checklist:{},onboarding:null})
  const[queue,setQueue]=useState([])
  const[showDrop,setShowDrop]=useState(false)
  const[loaded,setLoaded]=useState(false)
  const[formProp,setFormProp]=useState(null)
  const[showWizard,setShowWizard]=useState(false)

  useEffect(()=>{if(isLoaded&&!isSignedIn)router.replace('/')},[isLoaded,isSignedIn,router])
  useEffect(()=>{
    if(!user?.id)return
    getPortfolio(user.id).then(data=>{
      const p=data||{properties:[],expenses:[],maintenance:[],checklist:{},onboarding:null}
      setPortfolio(p)
      setLoaded(true)
      // Show wizard if first time (no onboarding data and no properties)
      if(!p.onboarding&&(!p.properties||p.properties.length===0)){
        setShowWizard(true)
      }
    })
  },[user?.id])

  const saveRef=useRef(null)
  useEffect(()=>{if(!user?.id||!loaded)return;clearTimeout(saveRef.current);saveRef.current=setTimeout(()=>savePortfolio(user.id,portfolio),1500);return()=>clearTimeout(saveRef.current)},[portfolio,user?.id,loaded])

  function completeWizard(answers){
    setPortfolio(prev=>({...prev,onboarding:answers}))
    setShowWizard(false)
    // Store portfolio size for analytics/pricing suggestions
    if(answers.portfolioSize){
      console.log('Portfolio size recorded:', answers.portfolioSize)
    }
  }

  function toggleCheck(id){
    setPortfolio(prev=>({...prev,checklist:{...prev.checklist,[id]:!prev.checklist[id]}}))
  }

  function updateProperty(prop){setPortfolio(prev=>{const props=prev.properties||[];const idx=props.findIndex(p=>p.id===prop.id);if(idx>=0){const updated=[...props];updated[idx]=prop;return{...prev,properties:updated}}return{...prev,properties:[...props,prop]}})}
  function deleteProperty(id){setPortfolio(prev=>({...prev,properties:(prev.properties||[]).filter(p=>p.id!==id)}))}

  async function handleFiles(files){
    setShowDrop(false)
    const valid=files.filter(f=>f.type==='application/pdf'||f.type.startsWith('image/'));if(!valid.length)return
    for(const file of valid){
      const id=Math.random().toString(36).slice(2)
      setQueue(q=>[...q,{id,name:file.name,status:'reading'}])
      try{const b64=await fileToBase64(file);setQueue(q=>q.map(x=>x.id===id?{...x,status:'extracting'}:x));const res=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,data:b64,mediaType:file.type})});const result=await res.json();setQueue(q=>q.map(x=>x.id===id?{...x,status:result.success?'done':'error',result}:x));if(result.success&&result.extracted)setPortfolio(prev=>mergeDoc(prev,result.extracted))}
      catch{setQueue(q=>q.map(x=>x.id===id?{...x,status:'error'}:x))}
    }
  }

  if(!isLoaded||!isSignedIn)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/></div>

  // Pass toggleCheck down to Overview via portfolio context
  const portfolioWithToggle={...portfolio,_toggleCheck:toggleCheck}

  return<>
    <Head><title>Dashboard - Lettly</title></Head>
    <style>{`.dash-content{max-width:1060px;margin:0 auto;padding:24px 20px}@media(max-width:640px){.dash-content{padding:16px}}`}</style>

    {showWizard&&<OnboardingWizard onComplete={completeWizard} firstName={user?.firstName}/>}

    <div style={{minHeight:'100vh',background:'var(--bg)'}} onDragOver={e=>{e.preventDefault();setShowDrop(true)}} onDrop={e=>{e.preventDefault();const f=Array.from(e.dataTransfer.files).filter(f=>f.type==='application/pdf'||f.type.startsWith('image/'));if(f.length)handleFiles(f)}}>
      <nav style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}><div style={{width:30,height:30,background:'var(--brand)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:14,fontWeight:700,fontFamily:'var(--display)',fontStyle:'italic'}}>L</span></div><span style={{fontFamily:'var(--display)',fontSize:17,fontWeight:400}}>Lettly</span></div>
        <div style={{display:'flex',gap:1,background:'var(--surface2)',padding:3,borderRadius:9,overflowX:'auto',maxWidth:'calc(100vw - 180px)',scrollbarWidth:'none'}}>{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'var(--surface)':'transparent',border:tab===t.id?'0.5px solid var(--border)':'none',padding:'5px 10px',borderRadius:7,fontFamily:'var(--font)',fontSize:11,color:tab===t.id?'var(--text)':'var(--text-2)',fontWeight:tab===t.id?500:400,cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}{t.id==='ai'&&<span style={{display:'inline-block',width:4,height:4,borderRadius:'50%',background:'var(--brand)',marginLeft:3,verticalAlign:'middle'}}/>}{t.id==='legislation'&&<span style={{display:'inline-block',width:4,height:4,borderRadius:'50%',background:'var(--red)',marginLeft:3,verticalAlign:'middle'}}/>}</button>)}</div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}><button onClick={()=>setShowDrop(v=>!v)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 10px',fontSize:12,color:'var(--text-2)',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add</button><UserButton afterSignOutUrl="/" appearance={{variables:{colorPrimary:'#1b5e3b'}}}/></div>
      </nav>
      {showDrop&&<div className="fade-in" style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'14px 16px'}}><div style={{maxWidth:700,margin:'0 auto'}}><DropZone onFiles={handleFiles} compact/></div></div>}
      {queue.length>0&&<div style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'10px 16px'}}><div style={{maxWidth:700,margin:'0 auto',display:'flex',flexDirection:'column',gap:7}}>{queue.map(item=><QueueItem key={item.id} item={item}/>)}</div></div>}
      <div className="dash-content">
        {tab==='overview'&&<div style={{marginBottom:18}}><h1 style={{fontFamily:'var(--display)',fontSize:'clamp(22px,4vw,28px)',fontWeight:300,marginBottom:3}}>Good {getGreeting()}, {user?.firstName||'there'}</h1><p style={{fontSize:13,color:'var(--text-3)'}}>{(portfolio.properties||[]).length===0?'Add a property or drop documents to get started.':`${(portfolio.properties||[]).length} propert${(portfolio.properties||[]).length===1?'y':'ies'} saved`}</p></div>}
        {tab==='overview'    &&<Overview     portfolio={portfolio} onAddDocs={handleFiles} user={user} onToggleCheck={toggleCheck}/>}
        {tab==='properties'  &&<Properties   portfolio={portfolio} onAddDocs={handleFiles} onEdit={setFormProp} onAdd={()=>setFormProp({})}/>}
        {tab==='finance'     &&<FinanceTab    portfolio={portfolio} setPortfolio={setPortfolio}/>}
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
