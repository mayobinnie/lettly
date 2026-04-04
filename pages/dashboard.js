import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useUser, UserButton } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { fmt, dueSoon, dueDays, epcColor, mergeDoc, LEGISLATION, LEGISLATION_SCOTLAND, LEGISLATION_WALES, getGrowthRate, projectValue } from '../lib/data'
// Portfolio loaded via /api/data (server-side auth)
import { detectNation, NATION_LABELS, getChecklist } from '../lib/nations'
import { savePortfolio } from '../lib/supabase'

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

  // PDF: send raw PDF bytes : preserves ALL pages for deep extraction
  // (Previously rendered page 1 only to JPEG : that was why extraction was shallow)
  if (ftype === 'application/pdf' || fname.endsWith('.pdf')) {
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
function Metric({label,value,sub,subGreen,subRed,onClick}){return<div onClick={onClick} style={{background:'var(--surface2)',borderRadius:'var(--radius)',padding:'14px 16px',cursor:onClick?'pointer':'default',transition:'background 0.15s'}} onMouseEnter={e=>{if(onClick)e.currentTarget.style.background='var(--surface3)'}} onMouseLeave={e=>{if(onClick)e.currentTarget.style.background='var(--surface2)'}}><div style={{fontSize:11,color:'var(--text-2)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{label}{onClick&&<span style={{float:'right',fontSize:10,color:'var(--brand)',fontWeight:400}}>View →</span>}</div><div style={{fontSize:20,fontWeight:600,fontFamily:'var(--mono)',letterSpacing:'-0.5px'}}>{value}</div>{sub&&<div style={{fontSize:11,marginTop:3,color:subGreen?'var(--green)':subRed?'var(--red)':'var(--text-3)'}}>{sub}</div>}</div>}
function Input({label,value,onChange,type='text',placeholder='',hint}){return<div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label><input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}/>{hint&&<div style={{fontSize:11,color:'var(--text-3)',marginTop:4}}>{hint}</div>}</div>}
function Select({label,value,onChange,options}){return<div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>{label}</label><select value={value||''} onChange={e=>onChange(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select></div>}

const DOC_META={gas_certificate:{label:'Gas cert',icon:'🔥',bg:'#fff8e1',fg:'#633806'},eicr:{label:'EICR',icon:'⚡',bg:'#e3f2fd',fg:'#0C447C'},insurance:{label:'Insurance',icon:'🛡️',bg:'#f3e8ff',fg:'#6b21a8'},epc_certificate:{label:'EPC',icon:'🌿',bg:'#e8f5e9',fg:'#1e6e35'},tenancy_agreement:{label:'Tenancy',icon:'📄',bg:'#eaf4ee',fg:'#1b5e3b'},mortgage_offer:{label:'Mortgage',icon:'🏦',bg:'#fce8e6',fg:'#791F1F'},completion_statement:{label:'Completion',icon:'🏠',bg:'#e8f5e9',fg:'#1e6e35'},other:{label:'Document',icon:'📋',bg:'#f2f0eb',fg:'#6b6860'}}
function DocBadge({type}){const m=DOC_META[type]||DOC_META.other;return<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:m.bg,color:m.fg}}><span style={{fontSize:12}}>{m.icon}</span>{m.label}</span>}

function UpIcon({color,size}){return<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
function DropZone({onFiles,compact,onScan,onManual}){
  const[over,setOver]=useState(false)
  const ref=useRef(null)
  const hasCamera=typeof navigator!=='undefined'&&!!navigator.mediaDevices?.getUserMedia
  function drop(e){e.preventDefault();e.stopPropagation();setOver(false);const f=Array.from(e.dataTransfer.files);if(f.length)onFiles(f)}
  function dragOver(e){e.preventDefault();setOver(true)}
  function dragLeave(e){if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}
  function pickFile(){ref.current.click()}
  const input=<input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.bmp,.tiff,.gif,image/*,application/pdf" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}}/>
  if(compact){
    return(
      <div style={{display:'flex',gap:8,alignItems:'stretch'}}>
        <div onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop} onClick={pickFile}
          style={{flex:1,border:'2px dashed var(--brand)',borderRadius:14,padding:'16px 20px',cursor:'pointer',background:'var(--brand-subtle)',display:'flex',alignItems:'center',gap:14,transition:'all 0.15s'}}>
          {input}
          <div style={{width:38,height:38,borderRadius:10,background:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <UpIcon color='#fff' size={18}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:'var(--brand)'}}>Drop or click to add documents</div>
            <div style={{fontSize:12,color:'var(--brand)',opacity:0.75,marginTop:2}}>Gas cert, EICR, EPC, insurance, tenancy, mortgage, AI reads it automatically</div>
          </div>
          <div style={{fontSize:12,fontWeight:600,flexShrink:0,whiteSpace:'nowrap',background:'var(--brand)',color:'#fff',padding:'7px 16px',borderRadius:8}}>{over?'Release':'Browse'}</div>
        </div>
        {onScan&&hasCamera&&<button onClick={onScan} style={{flexShrink:0,border:'1.5px solid var(--border-strong)',borderRadius:12,padding:'0 16px',background:'var(--surface)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all 0.15s',minWidth:60}} onMouseEnter={e=>{e.currentTarget.style.background='var(--brand-light)';e.currentTarget.style.borderColor='var(--brand)'}} onMouseLeave={e=>{e.currentTarget.style.background='var(--surface)';e.currentTarget.style.borderColor='var(--border-strong)'}}>
          <span style={{fontSize:18}}>📷</span>
          <span style={{fontSize:11,color:'var(--brand)',fontWeight:600}}>Scan</span>
        </button>}
        {onManual&&<button onClick={onManual} style={{flexShrink:0,border:'1.5px solid var(--border-strong)',borderRadius:12,padding:'0 16px',background:'var(--surface)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,transition:'all 0.15s',minWidth:60}} onMouseEnter={e=>{e.currentTarget.style.background='var(--brand-light)';e.currentTarget.style.borderColor='var(--brand)'}} onMouseLeave={e=>{e.currentTarget.style.background='var(--surface)';e.currentTarget.style.borderColor='var(--border-strong)'}}>
          <span style={{fontSize:18}}>✏️</span>
          <span style={{fontSize:11,color:'var(--brand)',fontWeight:600}}>Manual</span>
        </button>}
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
      <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.75,marginBottom:18}}>PDF, JPEG, PNG, HEIC and more: gas certs, EICRs, EPCs, insurance, tenancy agreements</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginBottom:14}}>
        {Object.values(DOC_META).filter(d=>d.label!=='Document').map(d=>(
          <span key={d.label} style={{fontSize:11,padding:'4px 11px',borderRadius:20,background:d.bg,color:d.fg,display:'inline-flex',alignItems:'center',gap:4}}>
            <span style={{fontSize:12}}>{d.icon}</span>{d.label}
          </span>
        ))}
      </div>
      <div style={{fontSize:11,color:'var(--text-3)'}}>PDF, JPEG, PNG, HEIC, WebP. Your data stays private.</div>
    </div>
  )
}



/* ---- Camera Scanner ---- */
function CameraScanner({onFiles,onClose}){
  const videoRef=useRef(null)
  const canvasRef=useRef(null)
  const streamRef=useRef(null)
  const[phase,setPhase]=useState('stream') // stream | preview | processing
  const[capturedImg,setCapturedImg]=useState(null)
  const[error,setError]=useState(null)
  const[torch,setTorch]=useState(false)
  const[multiShots,setMultiShots]=useState([])

  useEffect(()=>{
    startCamera()
    return()=>stopCamera()
  },[])

  async function startCamera(){
    try{
      const constraints={
        video:{
          facingMode:{ideal:'environment'},
          width:{ideal:1920},height:{ideal:1080},
          advanced:[{torch:false}]
        }
      }
      const stream=await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current=stream
      if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play()}
      setError(null)
    }catch(e){
      setError('Camera not available. Please allow camera access or use the file upload instead.')
    }
  }

  function stopCamera(){
    streamRef.current?.getTracks().forEach(t=>t.stop())
  }

  async function toggleTorch(){
    const track=streamRef.current?.getVideoTracks()[0]
    if(!track)return
    try{
      await track.applyConstraints({advanced:[{torch:!torch}]})
      setTorch(t=>!t)
    }catch{}
  }

  function capture(){
    const video=videoRef.current
    const canvas=canvasRef.current
    if(!video||!canvas)return
    canvas.width=video.videoWidth
    canvas.height=video.videoHeight
    const ctx=canvas.getContext('2d')
    // Auto-enhance: slight contrast + brightness boost for documents
    ctx.filter='contrast(1.12) brightness(1.05)'
    ctx.drawImage(video,0,0)
    ctx.filter='none'
    const dataUrl=canvas.toDataURL('image/jpeg',0.92)
    setCapturedImg(dataUrl)
    setPhase('preview')
  }

  function retake(){
    setCapturedImg(null)
    setPhase('stream')
  }

  function addAnother(){
    // Add current shot to batch, go back to camera
    setMultiShots(prev=>[...prev,capturedImg])
    setCapturedImg(null)
    setPhase('stream')
  }

  function confirmAndSend(useBatch=false){
    setPhase('processing')
    const shots=useBatch?[...multiShots,capturedImg]:[capturedImg]
    const files=shots.map((dataUrl,i)=>{
      const arr=dataUrl.split(',')
      const mime=arr[0].match(/:(.*?);/)[1]
      const bstr=atob(arr[1])
      let n=bstr.length
      const u8=new Uint8Array(n)
      while(n--)u8[n]=bstr.charCodeAt(n)
      const blob=new Blob([u8],{type:mime})
      return new File([blob],`scan_${Date.now()}_${i+1}.jpg`,{type:'image/jpeg'})
    })
    stopCamera()
    onFiles(files)
    onClose()
  }

  const btnBase={border:'none',borderRadius:12,cursor:'pointer',fontFamily:'var(--font)',fontWeight:500,transition:'all 0.15s'}

  return(
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'#000',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)'}}>
        <div style={{color:'#fff',fontSize:14,fontWeight:600}}>
          {phase==='stream'?'Scan document':phase==='preview'?'Check scan':'Processing...'}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {multiShots.length>0&&<div style={{background:'var(--brand)',color:'#fff',borderRadius:20,padding:'3px 10px',fontSize:12,fontWeight:600}}>{multiShots.length} queued</div>}
          <button onClick={()=>{stopCamera();onClose()}} style={{...btnBase,background:'rgba(255,255,255,0.15)',color:'#fff',padding:'7px 14px',fontSize:13}}>Cancel</button>
        </div>
      </div>

      {/* Viewfinder / Preview */}
      <div style={{flex:1,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {phase==='stream'&&<>
          <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          {/* Document guide overlay */}
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{width:'85%',maxWidth:500,aspectRatio:'0.707',border:'2px solid rgba(255,255,255,0.5)',borderRadius:8,boxShadow:'0 0 0 9999px rgba(0,0,0,0.35)'}}>
              <div style={{position:'absolute',top:-1,left:-1,width:20,height:20,borderTop:'3px solid var(--brand)',borderLeft:'3px solid var(--brand)',borderRadius:'8px 0 0 0'}}/>
              <div style={{position:'absolute',top:-1,right:-1,width:20,height:20,borderTop:'3px solid var(--brand)',borderRight:'3px solid var(--brand)',borderRadius:'0 8px 0 0'}}/>
              <div style={{position:'absolute',bottom:-1,left:-1,width:20,height:20,borderBottom:'3px solid var(--brand)',borderLeft:'3px solid var(--brand)',borderRadius:'0 0 0 8px'}}/>
              <div style={{position:'absolute',bottom:-1,right:-1,width:20,height:20,borderBottom:'3px solid var(--brand)',borderRight:'3px solid var(--brand)',borderRadius:'0 0 8px 0'}}/>
            </div>
          </div>
          <div style={{position:'absolute',bottom:100,left:0,right:0,textAlign:'center',color:'rgba(255,255,255,0.6)',fontSize:12}}>
            Align document within the frame
          </div>
        </>}

        {phase==='preview'&&capturedImg&&<>
          <img src={capturedImg} alt="Captured" style={{width:'100%',height:'100%',objectFit:'contain'}}/>
          <div style={{position:'absolute',top:14,left:14,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',borderRadius:8,padding:'6px 12px',color:'#fff',fontSize:12}}>
            Check clarity. Text should be sharp and readable.
          </div>
        </>}

        {phase==='processing'&&<div style={{textAlign:'center',color:'#fff'}}>
          <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite',margin:'0 auto 16px'}}/>
          <div style={{fontSize:15,fontWeight:500}}>Sending to Lettly AI...</div>
        </div>}

        {error&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>📷</div>
          <div style={{color:'#fff',fontSize:14,lineHeight:1.7,marginBottom:24}}>{error}</div>
          <button onClick={()=>{stopCamera();onClose()}} style={{...btnBase,background:'var(--brand)',color:'#fff',padding:'12px 28px',fontSize:14}}>Use file upload instead</button>
        </div>}
      </div>

      {/* Controls */}
      {!error&&phase!=='processing'&&<div style={{padding:'20px 24px 36px',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',justifyContent:'center',alignItems:'center',gap:16}}>
        {phase==='stream'&&<>
          <button onClick={toggleTorch} style={{...btnBase,background:torch?'#fff3':'rgba(255,255,255,0.1)',color:'#fff',width:48,height:48,borderRadius:'50%',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center'}} title="Torch">
            {torch?'🔦':'💡'}
          </button>
          <button onClick={capture} style={{...btnBase,width:72,height:72,borderRadius:'50%',background:'#fff',border:'4px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:54,height:54,borderRadius:'50%',background:'var(--brand)'}}/>
          </button>
          {multiShots.length>0
            ?<button onClick={()=>confirmAndSend(false)} style={{...btnBase,background:'var(--brand)',color:'#fff',padding:'12px 16px',fontSize:13,width:48,height:48,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}} title="Done">✓</button>
            :<div style={{width:48}}/>
          }
        </>}

        {phase==='preview'&&<>
          <button onClick={retake} style={{...btnBase,background:'rgba(255,255,255,0.12)',color:'#fff',padding:'13px 24px',fontSize:14}}>
            Retake
          </button>
          <button onClick={addAnother} style={{...btnBase,background:'rgba(255,255,255,0.12)',color:'#fff',padding:'13px 24px',fontSize:14}}>
            + Add page
          </button>
          <button onClick={()=>confirmAndSend(multiShots.length>0)} style={{...btnBase,background:'var(--brand)',color:'#fff',padding:'13px 28px',fontSize:14,boxShadow:'0 4px 16px rgba(27,94,59,0.4)'}}>
            {multiShots.length>0?`Send all ${multiShots.length+1}`:'Send to Lettly'}
          </button>
        </>}
      </div>}

      <canvas ref={canvasRef} style={{display:'none'}}/>
    </div>
  )
}


/* ---- Manual Entry Modal ---- */
function ManualEntryModal({portfolio, onMerge, onClose}){
  const props = portfolio.properties || []
  const[docType, setDocType] = useState('')
  const[propId, setPropId] = useState(props[0]?.id || '')
  const[form, setForm] = useState({})
  const[saved, setSaved] = useState(false)
  const set = (k,v) => setForm(prev=>({...prev,[k]:v}))

  const docTypes = [
    {id:'gas_certificate',  icon:'🔥', label:'Gas Safety Certificate'},
    {id:'eicr',             icon:'⚡', label:'EICR (Electrical)'},
    {id:'epc_certificate',  icon:'🌿', label:'EPC Certificate'},
    {id:'insurance',        icon:'🛡️', label:'Insurance Policy'},
    {id:'tenancy_agreement',icon:'📄', label:'Tenancy Agreement'},
    {id:'mortgage_offer',   icon:'🏦', label:'Mortgage / Finance'},
  ]

  function handleSave(){
    const prop = props.find(p=>p.id===propId)
    if(!prop && props.length > 0) return

    // Build an extracted object that matches what mergeDoc expects
    const extracted = {
      documentType: docType,
      property: {
        address: prop?.address || form.address || '',
        shortName: prop?.shortName || form.shortName || '',
      },
      compliance: {},
      tenancy: {},
      finance: {},
      summary: `Manually entered ${docTypes.find(d=>d.id===docType)?.label||'document'} for ${prop?.shortName||'property'}.`
    }

    if(docType === 'gas_certificate'){
      extracted.compliance.gas = {
        date: form.gasDate || '',
        due: form.gasDue || '',
        engineer: form.engineer || '',
        gasSafeNo: form.gasSafeNo || '',
        result: 'Pass',
      }
    }
    if(docType === 'eicr'){
      extracted.compliance.eicr = {
        date: form.eicrDate || '',
        due: form.eicrDue || '',
        result: form.eicrResult || 'Satisfactory',
        inspector: form.inspector || '',
      }
    }
    if(docType === 'epc_certificate'){
      extracted.compliance.epc = {
        rating: form.epcRating || '',
        expiry: form.epcExpiry || '',
        score: form.epcScore ? Number(form.epcScore) : undefined,
      }
    }
    if(docType === 'insurance'){
      extracted.compliance.insurance = {
        insurer: form.insurer || '',
        policyNumber: form.policyNo || '',
        renewal: form.insuranceRenewal || '',
        type: form.insuranceType || 'Landlord',
        premium: form.premium ? Number(form.premium) : undefined,
      }
    }
    if(docType === 'tenancy_agreement'){
      extracted.tenancy = {
        tenantName: form.tenantName || '',
        tenantPhone: form.tenantPhone || '',
        tenantEmail: form.tenantEmail || '',
        rent: form.rent ? Number(form.rent) : undefined,
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
        depositScheme: form.depositScheme || '',
        startDate: form.startDate || '',
        endDate: form.endDate || '',
      }
    }
    if(docType === 'mortgage_offer'){
      extracted.finance = {
        mortgage: form.mortgage ? Number(form.mortgage) : undefined,
        lender: form.lender || '',
        rate: form.rate ? Number(form.rate) : undefined,
        fixedEnd: form.fixedEnd || '',
        monthlyPayment: form.monthlyPayment ? Number(form.monthlyPayment) : undefined,
      }
    }

    onMerge(extracted)
    setSaved(true)
    setTimeout(()=>onClose(), 1200)
  }

  const inp = {
    background:'var(--surface)',border:'0.5px solid var(--border-strong)',
    borderRadius:8,padding:'9px 12px',fontFamily:'var(--font)',
    fontSize:13,color:'var(--text)',outline:'none',width:'100%',boxSizing:'border-box'
  }
  const lbl = {display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',
    marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}
  const field = (label,key,type='text',placeholder='') => (
    <div style={{marginBottom:14}}>
      <label style={lbl}>{label}</label>
      <input type={type} value={form[key]||''} onChange={e=>set(key,e.target.value)}
        placeholder={placeholder} style={inp}/>
    </div>
  )
  const grid2 = {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:620,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 -8px 40px rgba(0,0,0,0.12)'}}>

        {/* Header */}
        <div style={{padding:'18px 20px 16px',flexShrink:0,borderBottom:'0.5px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:400}}>Enter details manually</div>
            <button onClick={onClose} style={{background:'var(--surface2)',border:'none',borderRadius:'50%',width:30,height:30,cursor:'pointer',fontSize:16,color:'var(--text-2)',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
          </div>
          <div style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>Type in details from a document, certificate or policy</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20}}>

          {saved ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:300,color:'var(--brand)'}}>Saved to your portfolio</div>
            </div>
          ) : (<>

          {/* Step 1: pick property */}
          {props.length > 0 && (
            <div style={{marginBottom:20}}>
              <label style={lbl}>Which property?</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {props.map(p=>(
                  <button key={p.id} onClick={()=>setPropId(p.id)} style={{padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:propId===p.id?'var(--brand)':'var(--border)',background:propId===p.id?'var(--brand-light)':'var(--surface)',color:propId===p.id?'var(--brand)':'var(--text-2)',transition:'all 0.12s'}}>
                    {p.shortName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: pick document type */}
          <div style={{marginBottom:20}}>
            <label style={lbl}>Document type</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {docTypes.map(d=>(
                <button key={d.id} onClick={()=>{setDocType(d.id);setForm({})}} style={{padding:'10px 8px',borderRadius:10,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:docType===d.id?'var(--brand)':'var(--border)',background:docType===d.id?'var(--brand-light)':'var(--surface)',color:docType===d.id?'var(--brand)':'var(--text-2)',textAlign:'center',transition:'all 0.12s',lineHeight:1.4}}>
                  <div style={{fontSize:20,marginBottom:4}}>{d.icon}</div>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: fields for chosen type */}
          {docType==='gas_certificate'&&<div style={{background:'var(--bg)',borderRadius:12,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--text)'}}>🔥 Gas Safety Certificate</div>
            <div style={grid2}>
              <div>{field('Certificate date','gasDate','date')}</div>
              <div>{field('Next inspection due','gasDue','date')}</div>
              <div>{field("Engineer's name",'engineer','text','e.g. John Smith')}</div>
              <div>{field('Gas Safe No.','gasSafeNo','text','e.g. 123456')}</div>
            </div>
          </div>}

          {docType==='eicr'&&<div style={{background:'var(--bg)',borderRadius:12,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--text)'}}>⚡ EICR (Electrical Inspection)</div>
            <div style={grid2}>
              <div>{field('Inspection date','eicrDate','date')}</div>
              <div>{field('Next inspection due','eicrDue','date')}</div>
              <div>{field("Inspector's name",'inspector','text','e.g. Jane Smith')}</div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Result</label>
                <select value={form.eicrResult||'Satisfactory'} onChange={e=>set('eicrResult',e.target.value)} style={{...inp}}>
                  <option>Satisfactory</option>
                  <option>Unsatisfactory</option>
                </select>
              </div>
            </div>
          </div>}

          {docType==='epc_certificate'&&<div style={{background:'var(--bg)',borderRadius:12,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--text)'}}>🌿 EPC Certificate</div>
            <div style={grid2}>
              <div style={{marginBottom:14}}>
                <label style={lbl}>EPC Rating</label>
                <select value={form.epcRating||''} onChange={e=>set('epcRating',e.target.value)} style={{...inp}}>
                  {['','A','B','C','D','E','F','G'].map(r=><option key={r} value={r}>{r||'Select rating'}</option>)}
                </select>
              </div>
              <div>{field('Expiry date','epcExpiry','date')}</div>
              <div>{field('Energy score (SAP)','epcScore','number','e.g. 72')}</div>
            </div>
          </div>}

          {docType==='insurance'&&<div style={{background:'var(--bg)',borderRadius:12,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--text)'}}>🛡️ Insurance Policy</div>
            <div style={grid2}>
              <div>{field('Insurer','insurer','text','e.g. LV=')}</div>
              <div>{field('Policy number','policyNo','text','e.g. POL123456')}</div>
              <div>{field('Renewal date','insuranceRenewal','date')}</div>
              <div>{field('Annual premium (£)','premium','number','e.g. 211')}</div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Policy type</label>
                <select value={form.insuranceType||'Landlord'} onChange={e=>set('insuranceType',e.target.value)} style={{...inp}}>
                  <option>Landlord (buildings + liability)</option>
                  <option>Landlord buildings only</option>
                  <option>Landlord liability only</option>
                  <option>Home</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>}

          {docType==='tenancy_agreement'&&<div style={{background:'var(--bg)',borderRadius:12,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--text)'}}>📄 Tenancy Agreement</div>
            <div style={grid2}>
              <div>{field('Tenant full name','tenantName','text','e.g. Amanda Byrne')}</div>
              <div>{field('Tenant phone','tenantPhone','text','e.g. 07700 000000')}</div>
              <div>{field('Tenant email','tenantEmail','email','e.g. tenant@email.com')}</div>
              <div>{field('Monthly rent (£)','rent','number','e.g. 900')}</div>
              <div>{field('Tenancy start','startDate','date')}</div>
              <div>{field('Tenancy end','endDate','date')}</div>
              <div>{field('Deposit amount (£)','depositAmount','number','e.g. 900')}</div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>Deposit scheme</label>
                <select value={form.depositScheme||''} onChange={e=>set('depositScheme',e.target.value)} style={{...inp}}>
                  {['','DPS Custodial','DPS Insured','TDS Custodial','TDS Insured','mydeposits','SafeDeposits Scotland'].map(s=><option key={s} value={s}>{s||'Select scheme'}</option>)}
                </select>
              </div>
            </div>
          </div>}

          {docType==='mortgage_offer'&&<div style={{background:'var(--bg)',borderRadius:12,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--text)'}}>🏦 Mortgage / Finance</div>
            <div style={grid2}>
              <div>{field('Lender','lender','text','e.g. Halifax')}</div>
              <div>{field('Mortgage balance (£)','mortgage','number','e.g. 75000')}</div>
              <div>{field('Interest rate (%)','rate','number','e.g. 5.24')}</div>
              <div>{field('Monthly payment (£)','monthlyPayment','number','e.g. 340')}</div>
              <div>{field('Fixed rate end','fixedEnd','date')}</div>
            </div>
          </div>}

          </>)}
        </div>

        {/* Footer */}
        {!saved&&<div style={{padding:'14px 20px',borderTop:'0.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,background:'var(--surface)'}}>
          <button onClick={onClose} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 18px',fontSize:13,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button>
          <button onClick={handleSave} disabled={!docType} style={{background:docType?'var(--brand)':'var(--border)',color:'#fff',border:'none',borderRadius:8,padding:'9px 28px',fontSize:13,fontWeight:500,cursor:docType?'pointer':'default',transition:'background 0.15s'}}>
            Save to portfolio
          </button>
        </div>}
      </div>
    </div>
  )
}

function QueueItem({item,onRetry,onManual,onConfirm,onReject}){
  const done=item.status==='done',err=item.status==='error',confirm=item.status==='confirm',working=item.status==='reading'||item.status==='extracting'
  const ext=item.result?.extracted

  if(confirm&&item.changes){
    return<div className="scale-in" style={{background:'var(--surface)',border:'0.5px solid var(--brand)',borderRadius:12,padding:'12px 14px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'var(--brand)',flexShrink:0}}/>
        <div style={{fontSize:14,fontWeight:600,color:'var(--brand)',flex:1}}>{item.name}</div>
        <div style={{fontSize:11,background:'var(--brand-light)',color:'var(--brand)',borderRadius:6,padding:'2px 8px',fontWeight:500}}>{ext?.documentType?.replace(/_/g,' ')}</div>
      </div>
      <div style={{fontSize:11,color:'var(--text-2)',marginBottom:10,lineHeight:1.8,background:'var(--surface2)',borderRadius:8,padding:'8px 10px'}}>
        {item.changes.map(ch=><div key={ch} style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{color:'var(--brand)',fontSize:10,fontWeight:600}}>+</span>
          <span>{ch}</span>
        </div>)}
        {item.matchedProp
          ?<div style={{marginTop:4,paddingTop:4,borderTop:'0.5px solid var(--border)',color:'var(--brand)',fontSize:11}}><strong>Matched to:</strong> {item.matchedProp.shortName}</div>
          :<div style={{marginTop:4,paddingTop:4,borderTop:'0.5px solid var(--border)',color:'var(--text-3)',fontSize:11}}>Will create a new property entry</div>
        }
      </div>
      <div style={{fontSize:11,color:'var(--text-3)',marginBottom:8,lineHeight:1.5}}>Please verify all extracted data before saving. AI extraction may not be 100% accurate. You are responsible for ensuring your property records are correct.</div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onConfirm(item)} style={{flex:1,background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 0',fontSize:12,fontWeight:500,cursor:'pointer'}}>Save this data</button>
        <button onClick={()=>onManual&&onManual()} style={{flex:1,background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 0',fontSize:12,cursor:'pointer'}}>Enter manually</button>
        <button onClick={()=>onReject(item)} style={{background:'var(--surface2)',color:'var(--text-3)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 10px',fontSize:12,cursor:'pointer'}}>Discard</button>
      </div>
    </div>
  }

  return<div className="scale-in" style={{display:'flex',gap:12,alignItems:'flex-start',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px'}}><div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:done?'var(--brand-light)':err?'var(--red-bg)':'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center'}}>{done&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}{err&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}{working&&<div style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/>}</div><div style={{flex:1,minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:done&&ext?5:0}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{item.name}</div><Pill type={done?'green':err?'red':item.status==='extracting'?'amber':'grey'}>{done?'Extracted':err?'Error':item.status==='extracting'?'Analysing':'Reading'}</Pill></div>{done&&ext&&<div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6}}>{ext.summary}{ext.property?.shortName&&<span style={{marginLeft:6,color:'var(--brand)',fontWeight:500}}>- {ext.property.shortName}</span>}</div>}{done&&ext?.documentType&&<div style={{marginTop:6}}><DocBadge type={ext.documentType}/></div>}{err&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:3,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'var(--red)',lineHeight:1.5,display:'block',marginBottom:4}}>{item.result?.error||'Could not read this file.'}</span>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {onRetry&&<button onClick={()=>onRetry(item)} style={{fontSize:10,color:'var(--brand)',background:'var(--brand-light)',border:'none',borderRadius:5,padding:'3px 9px',cursor:'pointer',whiteSpace:'nowrap'}}>Try again</button>}
            {onManual&&<button onClick={onManual} style={{fontSize:10,color:'var(--text-2)',background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:5,padding:'3px 9px',cursor:'pointer',whiteSpace:'nowrap'}}>Enter manually instead</button>}
          </div>
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
        <div style={{width:18,height:18,borderRadius:5,border:'1.5px solid '+(checkedItems[item.id]?'var(--brand)':'var(--border-strong)'),background:checkedItems[item.id]?'var(--brand)':'transparent',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
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
const EMPTY_PROP={shortName:'',address:'',nation:'',ownership:'Personal',isHMO:false,hmoLicence:'',hmoLicenceExpiry:'',selectiveLicence:'',purchasePrice:'',purchaseDate:'',currentValue:'',mortgage:'',lender:'',rate:'',fixedEnd:'',monthlyPayment:'',ercRate:'',rent:'',rentReviewDate:'',tenantName:'',tenantPhone:'',tenantEmail:'',tenancyStart:'',tenancyEnd:'',depositAmount:'',depositScheme:'',rightToRentChecked:'',rightToRentDocType:'',rightToRentExpiry:'',rightToRentNotes:'',gasDue:'',eicrDue:'',epcRating:'',epcExpiry:'',insurer:'',policyNo:'',insuranceRenewal:'',insuranceType:'',notes:''}

/* ---- Valuation Widget ---- */
function ValuationWidget({address, currentValue, onAccept}){
  const[state,setState]=useState('idle') // idle | loading | done | error
  const[result,setResult]=useState(null)
  const[showComps,setShowComps]=useState(false)

  const postcode = (address||'').match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i)?.[0]

  async function fetchValuation(){
    if(!postcode) return
    setState('loading')
    try{
      const res = await fetch('/api/valuation',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({postcode})
      })
      const data = await res.json()
      setResult(data)
      setState(data.error?'error':'done')
    }catch(e){
      setState('error')
      setResult({error:'Could not connect to Land Registry.'})
    }
  }

  if(!postcode) return(
    <div style={{background:'var(--surface2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--text-3)',marginBottom:14}}>
      Add a full postcode to the address above to get a valuation estimate.
    </div>
  )

  return(
    <div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.2)',borderRadius:12,padding:14,marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:state==='done'?10:0}}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--brand)',marginBottom:2}}>Land Registry estimate</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>Based on recent sold prices near {postcode}</div>
        </div>
        {state==='idle'&&<button onClick={fetchValuation} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>
          Get estimate
        </button>}
        {state==='loading'&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-3)'}}>
          <div style={{width:12,height:12,borderRadius:'50%',border:'2px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/>
          Searching...
        </div>}
      </div>

      {state==='done'&&result&&<>
        {result.estimate ? <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{background:'var(--surface)',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:3}}>Estimated value</div>
              <div style={{fontSize:16,fontWeight:700,fontFamily:'var(--mono)',color:'var(--brand)'}}>£{result.estimate?.toLocaleString('en-GB')}</div>
            </div>
            <div style={{background:'var(--surface)',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:3}}>Sales range</div>
              <div style={{fontSize:12,fontWeight:500,fontFamily:'var(--mono)'}}>£{result.min?.toLocaleString('en-GB')} - £{result.max?.toLocaleString('en-GB')}</div>
            </div>
            <div style={{background:'var(--surface)',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:3}}>Based on</div>
              <div style={{fontSize:12,fontWeight:500}}>{result.count} sales</div>
            </div>
          </div>

          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {(!currentValue||currentValue===''||currentValue==='0')&&<button onClick={()=>onAccept(result.estimate)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>
              Use this estimate
            </button>}
            {currentValue&&currentValue!==''&&<button onClick={()=>onAccept(result.estimate)} style={{background:'var(--brand-light)',color:'var(--brand)',border:'0.5px solid rgba(27,94,59,0.2)',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>
              Update to £{result.estimate?.toLocaleString('en-GB')}
            </button>}
            <button onClick={()=>setShowComps(s=>!s)} style={{background:'none',border:'0.5px solid var(--border)',borderRadius:7,padding:'6px 12px',fontSize:11,color:'var(--text-2)',cursor:'pointer'}}>
              {showComps?'Hide':'Show'} comparables ({result.comparables?.length})
            </button>
          </div>

          {showComps&&result.comparables?.length>0&&<div style={{marginTop:10,borderTop:'0.5px solid var(--border)',paddingTop:10}}>
            <div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>Recent sold prices (HPI-adjusted to today)</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:180,overflowY:'auto'}}>
              {result.comparables.map((c,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'0.5px solid var(--border)',fontSize:11}}>
                  <div style={{color:'var(--text-2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>{c.address}</div>
                  <div style={{flexShrink:0,display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{color:'var(--text-3)'}}>{c.date}</span>
                    <span style={{fontFamily:'var(--mono)',fontWeight:500,color:'var(--text)'}}>£{c.adjustedPrice?.toLocaleString('en-GB')}</span>
                    <span style={{color:'var(--text-3)',fontSize:10}}>(sold £{c.price?.toLocaleString('en-GB')})</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:'var(--text-3)',marginTop:6}}>{result.note}</div>
          </div>}

        </> : <div style={{fontSize:12,color:'var(--text-2)'}}>{result.message||result.error||'No recent sales data found for this area.'}</div>}
      </>}

      {state==='error'&&<div style={{fontSize:12,color:'var(--red)',marginTop:8}}>{result?.error||'Could not fetch valuation data.'}</div>}
    </div>
  )
}

function PropertyForm({initial,onSave,onDelete,onClose}){
  const[p,setP]=useState({...EMPTY_PROP,...initial})
  const set=(k,v)=>setP(prev=>({...prev,[k]:v}))
  const[tab,setTab]=useState('basics')

  // Auto-detect nation from address/postcode
  function handleAddressChange(v){
    set('address',v)
    // Extract postcode using regex - more reliable than last-two-words approach
    const postcodeMatch = v.match(/([A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2})/i)
    if(postcodeMatch){
      const postcode = postcodeMatch[1].trim()
      const n = detectNation(postcode)
      if(n) set('nation', n)
    }
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
              {p.nation==='England'&&'English law applies. Renters Rights Act in force from 1 May 2026 for new tenancies. Section 21 abolished. PRS Database registration required before serving notices.'}
            </div>}
          </div>
          <Select label="Ownership" value={p.ownership} onChange={v=>set('ownership',v)} options={['Personal','Ltd Company','Joint']}/>
          <div style={{marginBottom:14}}>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input type="checkbox" checked={!!p.isHMO} onChange={e=>set('isHMO',e.target.checked)} style={{width:16,height:16,accentColor:'var(--brand)'}}/>
              <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>This is an HMO (5+ people from 2+ households)</span>
            </label>
            <div style={{fontSize:11,color:'var(--text-3)',marginTop:4,marginLeft:24}}>Mandatory HMO licence required from your local council. Check for selective/additional licensing in your area even if not an HMO.</div>
          </div>
          {p.isHMO&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px',background:'#fff8e1',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
            <Input label="HMO licence number" value={p.hmoLicence||''} onChange={v=>set('hmoLicence',v)} placeholder="e.g. HMO/2024/00123"/>
            <Input label="HMO licence expiry" value={p.hmoLicenceExpiry||''} onChange={v=>set('hmoLicenceExpiry',v)} placeholder="DD/MM/YYYY"/>
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <Input label="Purchase price" value={p.purchasePrice} onChange={v=>set('purchasePrice',v)} placeholder="e.g. 95000" type="number"/>
            <Input label="Purchase date" value={p.purchaseDate} onChange={v=>set('purchaseDate',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Current value (est.)" value={p.currentValue} onChange={v=>set('currentValue',v)} placeholder="e.g. 150000" type="number"/>
          </div>
          {p.currentValue&&p.purchasePrice&&<div style={{fontSize:12,color:'var(--green)',marginBottom:14}}>Estimated gain: {fmt(Number(p.currentValue)-Number(p.purchasePrice))}</div>}
          <ValuationWidget address={p.address} currentValue={p.currentValue} onAccept={v=>set('currentValue',String(v))}/>
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
            <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}><input type="checkbox" id="rentReminder" checked={!!p.rentReminders} onChange={e=>set('rentReminders',e.target.checked)}/><label htmlFor="rentReminder" style={{fontSize:12,color:'var(--text-2)'}}>Send automated rent reminders to tenant (5 days and 1 day before due date)</label></div>
            <Input label="Monthly rent" value={p.rent} onChange={v=>set('rent',v)} placeholder="e.g. 850" type="number"/>
            <Input label="Tenancy start" value={p.tenancyStart} onChange={v=>set('tenancyStart',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Tenancy end" value={p.tenancyEnd} onChange={v=>set('tenancyEnd',v)} placeholder="DD/MM/YYYY"/>
            <Input label="Deposit amount" value={p.depositAmount} onChange={v=>set('depositAmount',v)} placeholder="e.g. 850" type="number"/>
            <Select label="Deposit scheme" value={p.depositScheme} onChange={v=>set('depositScheme',v)} options={p.nation==='Scotland'?['','SafeDeposits Scotland','LPS Scotland','mydeposits Scotland']:['','DPS Custodial','DPS Insured','TDS Custodial','TDS Insured','mydeposits']}/>
          </div>
          <div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#633806',lineHeight:1.6}}>
            {p.nation==='Wales'?'Wales: maximum deposit is 1 months rent. Must be protected in approved scheme within 30 days.':p.nation==='Scotland'?'Scotland: maximum deposit is 2 months rent. Must be lodged within 30 working days.':'England: maximum deposit is 5 weeks rent. Must be protected within 30 days.'}
          </div>
          <div style={{marginTop:14,paddingTop:14,borderTop:'0.5px solid var(--border)'}}>
            <div style={{fontSize:12,fontWeight:500,marginBottom:10,color:'var(--text)'}}>Right to Rent check</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              <Input label="Date checked" value={p.rightToRentChecked} onChange={v=>set('rightToRentChecked',v)} placeholder="DD/MM/YYYY"/>
              <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Document type seen</label><select value={p.rightToRentDocType||''} onChange={e=>set('rightToRentDocType',e.target.value)} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select document</option><option>UK/Irish passport</option><option>UK birth certificate + NI number</option><option>Biometric Residence Permit</option><option>Share code (online check)</option><option>EU Settlement Scheme</option><option>Visa/entry clearance</option><option>Other</option></select></div>
              <Input label="Expiry (if time-limited)" value={p.rightToRentExpiry} onChange={v=>set('rightToRentExpiry',v)} placeholder="DD/MM/YYYY or N/A"/>
              <Input label="Notes" value={p.rightToRentNotes} onChange={v=>set('rightToRentNotes',v)} placeholder="e.g. Copies taken, stored securely"/>
            </div>
            {p.nation==='Scotland'&&<div style={{fontSize:11,color:'#003090',background:'#e0ecf8',borderRadius:7,padding:'7px 10px',lineHeight:1.5}}>Right to Rent checks are NOT required in Scotland. This is an England-only legal requirement.</div>}
            {p.nation==='Wales'&&<div style={{fontSize:11,color:'#333',background:'var(--surface2)',borderRadius:7,padding:'7px 10px',lineHeight:1.5}}>Right to Rent checks currently apply in England only. Wales is not covered by the scheme, though verifying tenant identity is still best practice.</div>}
            {p.rightToRentExpiry&&p.rightToRentExpiry!=='N/A'&&<div style={{marginTop:8,fontSize:11,color:'#633806',background:'#fff8e1',borderRadius:7,padding:'7px 10px',lineHeight:1.5}}>Time-limited right to rent. You must recheck before expiry: {p.rightToRentExpiry}</div>}
          </div>
          <div style={{marginTop:14,paddingTop:14,borderTop:'0.5px solid var(--border)'}}>
            <Input label="Annual rent review date" value={p.rentReviewDate} onChange={v=>set('rentReviewDate',v)} placeholder="DD/MM/YYYY: when can rent next be reviewed"/>
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
        <div style={{fontSize:14,fontWeight:600,color:'var(--brand)',marginBottom:1}}>{p.shortName}</div>
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
  const[open,setOpen]=useState(null) // which section is expanded

  // ── Compliance ──────────────────────────────────────────
  const complianceItems = []
  const complianceScore = props.length > 0
    ? props.reduce((s,p) => {
        let ps = 0
        if(p.gasDue && dueSoon(p.gasDue) !== 'overdue') ps += 33
        else complianceItems.push({prop:p.shortName, issue:'Gas Safety Certificate missing or overdue', fix:'Upload your gas cert or enter details manually', icon:'🔥', done:false})
        if(p.eicrDue && dueSoon(p.eicrDue) !== 'overdue') ps += 33
        else complianceItems.push({prop:p.shortName, issue:'EICR (electrical inspection) missing or overdue', fix:'Upload your EICR or enter the date manually', icon:'⚡', done:false})
        if(p.insurer && p.insuranceType?.toLowerCase() !== 'home') ps += 34
        else complianceItems.push({prop:p.shortName, issue:p.insurer?'Home insurance detected. Must be a landlord policy.':'No insurance recorded', fix:'Upload your insurance document or enter details manually', icon:'🛡️', done:false})
        return s + ps
      }, 0) / props.length
    : 0
  const compliancePct = Math.round(complianceScore)

  // What's good in compliance
  props.forEach(p=>{
    if(p.gasDue && dueSoon(p.gasDue) !== 'overdue') complianceItems.push({prop:p.shortName, issue:'Gas Safety Certificate valid', fix:'', icon:'✅', done:true})
    if(p.eicrDue && dueSoon(p.eicrDue) !== 'overdue') complianceItems.push({prop:p.shortName, issue:'EICR valid', fix:'', icon:'✅', done:true})
    if(p.epcRating) complianceItems.push({prop:p.shortName, issue:`EPC rating ${p.epcRating} recorded`, fix:['F','G'].includes(p.epcRating?.toUpperCase())?'EPC below E. Upgrade required before letting.':'', icon:['A','B','C'].includes(p.epcRating?.toUpperCase())?'✅':'⚠️', done:['A','B','C','D','E'].includes(p.epcRating?.toUpperCase())})
    else complianceItems.push({prop:p.shortName, issue:'EPC rating not recorded', fix:'Upload your EPC certificate or enter the rating manually', icon:'🌿', done:false})
  })

  // ── Financial health ─────────────────────────────────────
  const totalRent = props.reduce((s,p)=>s+(Number(p.rent)||0),0)
  const totalPayment = props.reduce((s,p)=>s+(Number(p.monthlyPayment)||0),0)
  const coverage = totalPayment > 0 ? totalRent / totalPayment : 0
  const finScore = coverage >= 1.5 ? 100 : coverage >= 1.25 ? 75 : coverage >= 1.0 ? 50 : 25
  const finItems = []
  props.forEach(p=>{
    if(!p.rent) finItems.push({prop:p.shortName, issue:'Monthly rent not recorded', fix:'Edit this property and add the monthly rent amount', icon:'💸', done:false})
    else finItems.push({prop:p.shortName, issue:`Rent £${Number(p.rent).toLocaleString()}/mo recorded`, fix:'', icon:'✅', done:true})
    if(!p.currentValue) finItems.push({prop:p.shortName, issue:'Property value not recorded', fix:'Edit this property and add an estimated current value: needed for yield and equity calculations', icon:'🏠', done:false})
    else finItems.push({prop:p.shortName, issue:`Value £${Number(p.currentValue).toLocaleString()} recorded`, fix:'', icon:'✅', done:true})
    if(!p.mortgage && !p.lender) finItems.push({prop:p.shortName, issue:'Mortgage details not recorded', fix:'Upload your mortgage offer or enter balance, lender and rate manually', icon:'🏦', done:false})
    else finItems.push({prop:p.shortName, issue:`Mortgage with ${p.lender||'lender'} recorded`, fix:'', icon:'✅', done:true})
    if(p.rent && p.monthlyPayment){
      const net = Number(p.rent) - Number(p.monthlyPayment)
      if(net < 0) finItems.push({prop:p.shortName, issue:`Negative cashflow: -£${Math.abs(net)}/mo`, fix:'Review rent level or remortgage to reduce monthly payment', icon:'⚠️', done:false})
      else finItems.push({prop:p.shortName, issue:`Positive cashflow +£${net}/mo`, fix:'', icon:'✅', done:true})
    }
  })

  // ── Data completeness ────────────────────────────────────
  const dataFields = [
    {key:'shortName',      label:'Property name',       fix:'Edit the property and add a name'},
    {key:'address',        label:'Full address',         fix:'Edit the property and add the full address with postcode'},
    {key:'rent',           label:'Monthly rent',         fix:'Edit the property or enter details manually'},
    {key:'currentValue',   label:'Current value',        fix:'Edit the property and add an estimated value'},
    {key:'mortgage',       label:'Mortgage balance',     fix:'Upload your mortgage offer or enter manually'},
    {key:'tenantName',     label:'Tenant name',          fix:'Upload your tenancy agreement or enter tenant details manually'},
    {key:'gasDue',         label:'Gas cert date',        fix:'Upload your gas certificate or enter manually'},
    {key:'eicrDue',        label:'EICR date',            fix:'Upload your EICR or enter manually'},
    {key:'epcRating',      label:'EPC rating',           fix:'Upload your EPC certificate or enter manually'},
    {key:'insurer',        label:'Insurance details',    fix:'Upload your insurance policy or enter manually'},
  ]
  const dataItems = []
  props.forEach(p=>{
    dataFields.forEach(f=>{
      dataItems.push({prop:p.shortName, issue:p[f.key]?`${f.label} recorded`:`${f.label} missing`, fix:p[f.key]?'':f.fix, icon:p[f.key]?'✅':'○', done:!!p[f.key]})
    })
  })
  const dataScore = props.length > 0
    ? Math.round(props.reduce((s,p)=>s+dataFields.filter(f=>p[f.key]).length/dataFields.length*100,0)/props.length)
    : 0

  const overall = props.length > 0 ? Math.round((compliancePct + finScore + dataScore) / 3) : 0
  const overallColor = overall >= 75 ? 'var(--green)' : overall >= 50 ? '#633806' : 'var(--red)'
  const overallBg = overall >= 75 ? 'var(--green-bg)' : overall >= 50 ? '#fff8e1' : 'var(--red-bg)'

  const sections = [
    {id:'compliance', label:'Compliance', score:compliancePct, color:'#1e6e35', items:complianceItems,
     description:'Gas certs, EICRs, EPC rating, and valid landlord insurance'},
    {id:'finance',    label:'Financial health', score:finScore, color:'#0C447C', items:finItems,
     description:'Rent recorded, property value, mortgage details, and cashflow'},
    {id:'data',       label:'Data completeness', score:dataScore, color:'#633806', items:dataItems,
     description:'How complete your property records are across all fields'},
  ]

  return <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
    {/* Header */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div>
        <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>Portfolio health score</div>
        <div style={{fontSize:11,color:'var(--text-3)'}}>Click any section to see what to improve</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:overallBg,display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${overallColor}`}}>
          <span style={{fontSize:16,fontWeight:700,color:overallColor}}>{overall}</span>
        </div>
        <span style={{fontSize:12,color:'var(--text-3)'}}>/100</span>
      </div>
    </div>

    {props.length===0
      ? <div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'8px 0'}}>Add properties to see your score</div>
      : sections.map(s=>{
          const isOpen = open === s.id
          const missing = s.items.filter(i=>!i.done)
          return <div key={s.id} style={{marginBottom:8,border:'0.5px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
            {/* Section header - clickable */}
            <button onClick={()=>setOpen(isOpen?null:s.id)} style={{width:'100%',background:isOpen?'var(--brand-subtle)':'var(--surface2)',border:'none',padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,fontFamily:'var(--font)'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:600,color:isOpen?'var(--brand)':'var(--text)'}}>{s.label}</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {missing.length > 0 && <span style={{fontSize:10,background:'var(--red-bg)',color:'var(--red)',borderRadius:20,padding:'1px 7px',fontWeight:500}}>{missing.length} to fix</span>}
                    <span style={{fontSize:12,fontWeight:600,color:s.color}}>{s.score}%</span>
                    <span style={{fontSize:10,color:'var(--text-3)',transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',display:'inline-block'}}>▼</span>
                  </div>
                </div>
                <div style={{height:5,borderRadius:3,background:'var(--surface3)',overflow:'hidden'}}>
                  <div style={{width:s.score+'%',height:'100%',background:s.color,borderRadius:3,transition:'width 0.6s ease'}}/>
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && <div style={{padding:'12px 14px',background:'var(--bg)',borderTop:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,color:'var(--text-3)',marginBottom:10}}>{s.description}</div>
              {/* Missing items first */}
              {missing.length > 0 && <>
                <div style={{fontSize:11,fontWeight:600,color:'var(--red)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.4px'}}>Action needed</div>
                {missing.map((item,i)=>(
                  <div key={i} style={{display:'flex',gap:10,padding:'8px 10px',background:'var(--red-bg)',borderRadius:8,marginBottom:6,alignItems:'flex-start'}}>
                    <span style={{fontSize:14,flexShrink:0}}>{item.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:'var(--brand)',marginBottom:2}}>{item.prop}: {item.issue}</div>
                      {item.fix&&<div style={{fontSize:11,color:'var(--text-2)',lineHeight:1.5}}>How to fix: {item.fix}</div>}
                    </div>
                  </div>
                ))}
              </>}
              {/* Done items */}
              {s.items.filter(i=>i.done).length > 0 && <>
                <div style={{fontSize:11,fontWeight:600,color:'var(--green)',marginBottom:6,marginTop:missing.length>0?10:0,textTransform:'uppercase',letterSpacing:'0.4px'}}>Already in place</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {s.items.filter(i=>i.done).map((item,i)=>(
                    <div key={i} style={{display:'flex',gap:6,padding:'5px 8px',background:'var(--green-bg)',borderRadius:6,alignItems:'center'}}>
                      <span style={{fontSize:12,flexShrink:0}}>{item.icon}</span>
                      <div style={{fontSize:11,color:'var(--text-2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.prop}: {item.issue}</div>
                    </div>
                  ))}
                </div>
              </>}
              {s.score < 100 && <div style={{marginTop:10,padding:'8px 10px',background:'var(--brand-light)',borderRadius:8,fontSize:11,color:'var(--brand)',lineHeight:1.5}}>
                <strong>To reach 100%:</strong> {s.id==='compliance'?'Every property needs a valid gas cert, EICR, EPC rating, and landlord insurance policy.':s.id==='finance'?'Add rent, current value, and mortgage details to every property. Positive cashflow on all properties scores highest.':'Complete all 10 fields for every property . Upload documents or use manual entry.'}
              </div>}
            </div>}
          </div>
        })
    }
  </div>
}

function Overview({portfolio,onAddDocs,onScan,onManual,user,onToggleCheck,setTab}){
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
    if(p.insuranceType?.toLowerCase()==='home')urgent.push(`${p.shortName} - Insurance is HOME policy. Landlord insurance required.`)
    if(p.isHMO&&!p.hmoLicence)urgent.push(`${p.shortName} - HMO licence number not recorded. Letting an unlicensed HMO is a criminal offence.`)
    if(p.hmoLicenceExpiry&&dueSoon(p.hmoLicenceExpiry)==='overdue')urgent.push(`${p.shortName} - HMO licence expired ${p.hmoLicenceExpiry}. Renew immediately.`)
    if(p.hmoLicenceExpiry&&dueSoon(p.hmoLicenceExpiry)==='due-soon')upcoming.push({text:`${p.shortName} - HMO licence expires ${p.hmoLicenceExpiry}`,days:dueDays(p.hmoLicenceExpiry)})
    if(p.insurer&&!p.insuranceType)urgent.push(`${p.shortName} - Insurance type not specified. Confirm buildings and liability cover.`)
    if(gas==='overdue')urgent.push(`${p.shortName} - Gas certificate overdue`)
    if(eicr==='overdue')urgent.push(`${p.shortName} - EICR overdue`)
    if(p.epcRating&&['D','E','F','G'].includes(p.epcRating?.toUpperCase()))urgent.push(`${p.shortName} - EPC ${p.epcRating} needs upgrading by 2028`)
    if(!p.rightToRentChecked&&p.tenantName&&(p.nation!=='Scotland'))urgent.push(`${p.shortName} - Right to Rent check not logged`)
    if(p.rightToRentExpiry&&p.rightToRentExpiry!=='N/A'&&dueSoon(p.rightToRentExpiry)==='due-soon')urgent.push(`${p.shortName} - Right to Rent expiring ${p.rightToRentExpiry} : recheck required`)
    if(gas==='due-soon')upcoming.push({text:`${p.shortName} - Gas cert due ${p.gasDue}`,days:dueDays(p.gasDue)})
    if(eicr==='due-soon')upcoming.push({text:`${p.shortName} - EICR due ${p.eicrDue}`,days:dueDays(p.eicrDue)})
    if(ins==='due-soon')upcoming.push({text:`${p.shortName} - Insurance renews ${p.insuranceRenewal}`,days:dueDays(p.insuranceRenewal)})
    if(p.rentReviewDate&&dueSoon(p.rentReviewDate)==='due-soon')upcoming.push({text:`${p.shortName} - Rent review date ${p.rentReviewDate}`,days:dueDays(p.rentReviewDate)})
    if(p.rentReviewDate&&dueSoon(p.rentReviewDate)==='overdue')urgent.push(`${p.shortName} - Rent review date ${p.rentReviewDate} has passed`)
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
    {props.length>0&&props.some(p=>!p.currentValue)&&<div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:13,fontWeight:500,color:'#633806',marginBottom:2}}>Portfolio value and yield are incomplete</div>
        <div style={{fontSize:12,color:'#a07030',lineHeight:1.6}}>{props.filter(p=>!p.currentValue).map(p=>p.shortName).join(', ')} {props.filter(p=>!p.currentValue).length===1?'is':'are'} missing a current value. Add it to unlock yield, equity and projection charts.</div>
      </div>
      <button onClick={()=>setTab&&setTab('properties')} style={{background:'#EF9F27',color:'#fff',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>Edit properties →</button>
    </div>}

    {/* Main metrics */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
      <Metric label="Portfolio value" value={totalValue?fmt(totalValue):'-'} sub={totalEquity>0?fmt(totalEquity)+' equity':''} subGreen={totalEquity>0} onClick={setTab?()=>setTab('finance'):null}/>
      <Metric label="Monthly income" value={totalRent?fmt(totalRent):'-'} sub={net>0?'Net '+fmt(net)+'/mo':''} subGreen={net>0} onClick={setTab?()=>setTab('rent'):null}/>
      <Metric label="Gross yield" value={grossYield?grossYield+'%':'-'} sub={grossYield?(Number(grossYield)>=5?'Above 5% target':'Below 5% target'):''} subGreen={Number(grossYield)>=5} onClick={setTab?()=>setTab('finance'):null}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
      <Metric label="Properties" value={props.length} sub={props.length===0?'Add a property':'In portfolio'} onClick={setTab?()=>setTab('properties'):null}/>
      <Metric label="Total mortgage" value={totalMortgage?fmt(totalMortgage):'-'} sub={totalValue>0&&totalMortgage>0?((totalMortgage/totalValue)*100).toFixed(0)+'% LTV':''} onClick={setTab?()=>setTab('finance'):null}/>
      <Metric label="Actions needed" value={urgent.length+upcoming.length} sub={urgent.length>0?urgent.length+' urgent':'Nothing urgent'} subRed={urgent.length>0} onClick={setTab?()=>setTab('properties'):null}/>
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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:600,color:'var(--brand)'}}>Property growth projections</div>
        <div style={{fontSize:10,color:'var(--text-3)'}}>Based on ONS HPI 5yr avg by postcode · <button onClick={()=>setTab&&setTab('finance')} style={{background:'none',border:'none',color:'var(--brand)',fontSize:10,cursor:'pointer',padding:0}}>update values →</button></div>
      </div>
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
      ?<DropZone onFiles={onAddDocs} onScan={onScan} onManual={onManual}/>
      :<>
        <DropZone onFiles={onAddDocs} compact onScan={onScan} onManual={onManual}/>
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

function InsuranceDetail({p}){
  const[open,setOpen]=useState(false)
  const keyFacts=[
    p.insuranceSumInsured&&{label:'Sum insured',value:'£'+Number(p.insuranceSumInsured).toLocaleString('en-GB')},
    p.insurancePremium&&{label:'Annual premium',value:'£'+Number(p.insurancePremium).toLocaleString('en-GB')},
    p.insuranceExcess&&{label:'Excess',value:'£'+Number(p.insuranceExcess).toLocaleString('en-GB')},
    p.insuranceLossOfRent&&{label:'Loss of rent',value:'£'+Number(p.insuranceLossOfRent).toLocaleString('en-GB')+(p.insuranceLossOfRentPeriod?' ('+p.insuranceLossOfRentPeriod+')':'')},
  ].filter(Boolean)

  return<div style={{marginTop:10,background:'var(--surface2)',borderRadius:10,overflow:'hidden'}}>
    {/* Header row: always visible */}
    <button onClick={()=>setOpen(v=>!v)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:14,fontWeight:600,color:'var(--brand)'}}>Insurance detail</span>
        {keyFacts.slice(0,2).map(f=><span key={f.label} style={{fontSize:11,color:'var(--text-3)'}}>{f.label}: <span style={{color:'var(--text-2)',fontWeight:500}}>{f.value}</span></span>)}
      </div>
      <span style={{fontSize:11,color:'var(--brand)',fontWeight:500}}>{open?'Hide':'Show full policy'}</span>
    </button>

    {/* Expandable detail */}
    {open&&<div style={{padding:'0 14px 14px',borderTop:'0.5px solid var(--border)'}}>
      {keyFacts.length>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 16px',fontSize:11,paddingTop:10}}>
        {keyFacts.map(f=><Row key={f.label} label={f.label} value={f.value}/>)}
        {p.insuranceBuildings&&<Row label="Buildings cover" value={'£'+Number(p.insuranceBuildings).toLocaleString('en-GB')}/>}
        {p.insuranceLiability&&<Row label="Liability cover" value={'£'+Number(p.insuranceLiability).toLocaleString('en-GB')}/>}
        {p.insuranceLegal&&<Row label="Legal expenses" value={'£'+Number(p.insuranceLegal).toLocaleString('en-GB')}/>}
        {p.insuranceBroker&&<Row label="Broker" value={p.insuranceBroker}/>}
      </div>}
      {p.insuranceCover&&<div style={{marginTop:10,fontSize:11,color:'var(--text-2)',lineHeight:1.7,padding:'8px 10px',background:'var(--surface)',borderRadius:7}}>
        <div style={{fontWeight:500,color:'var(--text)',marginBottom:4}}>What is covered</div>
        {p.insuranceCover}
      </div>}
      {p.insuranceUnoccupancy&&<div style={{marginTop:6,fontSize:11,color:'var(--amber)',background:'#fff8e1',borderRadius:6,padding:'7px 10px',lineHeight:1.6}}>
        <span style={{fontWeight:500}}>Unoccupancy clause: </span>{p.insuranceUnoccupancy}
      </div>}
      {p.insuranceExclusions&&<div style={{marginTop:6,fontSize:11,color:'var(--red)',background:'var(--red-bg)',borderRadius:6,padding:'7px 10px',lineHeight:1.6}}>
        <div style={{fontWeight:500,marginBottom:4}}>Exclusions</div>
        {p.insuranceExclusions}
      </div>}
    </div>}
  </div>
}

function RentabilityChecklist({prop}){
  if(!prop) return null
  const nation = prop.nation||'England'
  const checks = [
    {id:'gas',    label:'Gas Safety Certificate', status:prop.gasDue?'done':'missing',   hint:'Annual - Gas Safe registered engineer'},
    {id:'eicr',   label:'EICR (Electrical)',       status:prop.eicrDue?'done':'missing',  hint:'Every 5 years'},
    {id:'epc',    label:'EPC certificate',          status:prop.epcRating?(['A','B','C','D','E'].includes(prop.epcRating?.toUpperCase())?'done':'fail'):'missing', hint:'Minimum E (C from 2028)'},
    {id:'buildings_ins', label:'Buildings insurance', status:(()=>{const t=(prop.insuranceType||'').toLowerCase();const hasBldg=prop.insurer&&(t.includes('landlord')||t.includes('buildings')||t.includes('building'));return hasBldg?'done':prop.insurer&&t==='home'?'fail':'missing'})(), hint:'Buildings cover required if you own the freehold - not needed for leasehold flats where freeholder insures'},
    {id:'ins',    label:'Landlord liability insurance', status:prop.insurer&&prop.insuranceType?.toLowerCase()!=='home'?'done':prop.insurer?'fail':'missing', hint:'Public liability and landlord policy - must not be a standard home insurance policy'},
    ...(prop.isHMO?[{id:'hmo_lic',label:'HMO licence',status:prop.hmoLicence?'done':'missing',hint:'Mandatory for 5+ people from 2+ households - apply to local council'}]:[]),
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

function PropertyDropZone({propName,propId,onFiles,onManual}){
  const[over,setOver]=useState(false)
  const ref=useRef(null)

  function drop(e){
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    const files=Array.from(e.dataTransfer.files)
    if(files.length) onFiles(files)
  }

  return(
    <div onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}} onDrop={drop}
      style={{marginTop:14,border:'2px dashed '+(over?'var(--brand)':'rgba(27,94,59,0.25)'),borderRadius:14,padding:'14px 18px',cursor:'pointer',background:'var(--brand-subtle)',display:'flex',alignItems:'center',gap:14,transition:'all 0.15s'}}
      onClick={()=>ref.current.click()}>
      <input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf" style={{display:'none'}} onChange={e=>{onFiles(Array.from(e.target.files));e.target.value=''}}/>
      <div style={{width:36,height:36,borderRadius:9,background:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:'var(--brand)'}}>Add documents for {propName}</div>
        <div style={{fontSize:11,color:'var(--brand)',opacity:0.75,marginTop:2}}>Gas cert, EICR, EPC, insurance, tenancy, mortgage. AI reads it automatically.</div>
      </div>
      <div style={{display:'flex',gap:6,flexShrink:0}}>
        <div style={{fontSize:12,fontWeight:600,background:'var(--brand)',color:'#fff',padding:'6px 14px',borderRadius:8}}>{over?'Release':'Browse'}</div>
        <button onClick={e=>{e.stopPropagation();onManual()}} style={{fontSize:12,fontWeight:500,background:'var(--surface)',color:'var(--brand)',border:'0.5px solid var(--brand)',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontFamily:'var(--font)'}}>Manual</button>
      </div>
    </div>
  )
}

function Properties({portfolio,onAddDocs,onAddDocsToProp,onScan,onManual,onEdit,onAdd,maxProps,onUpgrade}){
  const props=portfolio.properties||[]
  const col=s=>s==='valid'?'var(--green)':s==='due-soon'?'var(--amber)':s==='overdue'?'var(--red)':'var(--text-3)'
  return<div className="fade-up">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{fontSize:13,color:'var(--text-2)'}}>{props.length} propert{props.length===1?'y':'ies'}</div>
      {maxProps&&maxProps<999&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:props.length>=maxProps?'#fce8e6':'var(--surface2)',color:props.length>=maxProps?'var(--red)':'var(--text-3)',fontWeight:500}}>{props.length}/{maxProps} on your plan</span>}
    </div>
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      {maxProps&&props.length>=maxProps&&<button onClick={onUpgrade} style={{fontSize:12,padding:'6px 12px',borderRadius:8,border:'0.5px solid var(--brand)',background:'var(--brand-light)',color:'var(--brand)',cursor:'pointer',fontWeight:500}}>Upgrade to add more</button>}
      <button onClick={onAdd} style={{background:props.length>=(maxProps||999)?'var(--surface2)':'var(--brand)',color:props.length>=(maxProps||999)?'var(--text-3)':'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add property</button>
    </div></div>
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
            {!p.rent&&p.currentValue&&<><div style={{fontSize:'clamp(14px,2vw,17px)',fontWeight:500,fontFamily:'var(--mono)',color:'var(--text-2)'}}>{fmt(Number(p.currentValue))}</div><div style={{fontSize:10,color:'var(--text-3)'}}>est. value</div></>}
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
          <div>{p.tenantName&&<Row label="Tenant" value={p.tenantName}/>}{p.tenantPhone&&<Row label="Phone" value={p.tenantPhone}/>}{p.tenancyStart&&<Row label="Start" value={p.tenancyStart}/>}{p.depositAmount&&<Row label="Deposit" value={fmt(Number(p.depositAmount))}/>}{p.purchaseDate&&<Row label="Purchased" value={p.purchaseDate}/>}{p.purchasePrice&&<Row label="Purchase price" value={fmt(Number(p.purchasePrice))}/>}{p.lender&&<Row label="Lender" value={p.lender}/>}{p.mortgage&&<Row label="Mortgage" value={fmt(Number(p.mortgage))}/>}{p.rate&&<Row label="Rate" value={`${p.rate}%`}/>}{p.fixedEnd&&<Row label="Fixed until" value={p.fixedEnd}/>}</div>
          <div>{p.gasDue&&<Row label="Gas due" value={p.gasDue} valueColor={col(gasC)}/>}{p.eicrDue&&<Row label="EICR due" value={p.eicrDue} valueColor={col(eicrC)}/>}{p.epcRating&&<Row label="EPC" value={`${p.epcRating}${p.epcExpiry?' - exp '+p.epcExpiry:''}`} valueColor={epcColor(p.epcRating)}/>}{!p.epcRating&&<Row label="EPC rating" value="Unknown - drop EPC cert" valueColor="var(--amber)"/>}{p.insurer&&<Row label="Insurer" value={p.insurer}/>}{p.insuranceRenewal&&<Row label="Ins. renew" value={p.insuranceRenewal} valueColor={col(insC)}/>}{p.notes&&<Row label="Notes" value={p.notes}/>}</div>
        </div>
        {p.insuranceType?.toLowerCase()==='home'&&<div style={{marginTop:10,fontSize:11,color:'var(--red)',background:'var(--red-bg)',borderRadius:7,padding:'7px 10px',lineHeight:1.6}}>Home insurance detected - you need a landlord policy.</div>}
        {p.insurer&&p.insuranceType?.toLowerCase()!=='home'&&(p.insuranceSumInsured||p.insuranceCover||p.insuranceExclusions||p.insuranceLossOfRent||p.insuranceUnoccupancy)&&<InsuranceDetail p={p}/>}
        {p.epcRating&&['D','E','F','G'].includes(p.epcRating.toUpperCase())&&<div style={{marginTop:10,background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#633806',lineHeight:1.6}}>EPC {p.epcRating}: Minimum C required for new lets from 2028, all lets from 2030. Estimated upgrade cost: {p.epcRating==='D'?'£3,000-£8,000':'£5,000-£15,000'}.</div>}
        {/* Property-scoped document drop */}
        <PropertyDropZone propName={p.shortName} propId={p.id} onFiles={files=>onAddDocsToProp&&onAddDocsToProp(files,p.id)} onManual={onManual}/>
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
      <div style={{fontSize:15,color:highlight?'var(--brand)':warn?'var(--red)':'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{label}</div>
      <div style={{fontSize:large?26:20,fontWeight:600,fontFamily:'var(--mono)',letterSpacing:'-0.5px',color:highlight?'var(--brand)':warn?'var(--red)':'var(--text)'}}>{value}</div>
      {sub&&<div style={{fontSize:15,marginTop:3,color:subGreen?'var(--green)':subRed?'var(--red)':'var(--text-3)'}}>{sub}</div>}
    </div>
  )

  return<div className="fade-up">
    {/* Sub-nav */}
    <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
      {[['overview','Overview'],['expenses','Income & Expenses'],['yields','Yield Analysis'],['s24','Section 24']].map(([id,label])=>(
        <button key={id} onClick={()=>setView(id)} style={{padding:'9px 18px',borderRadius:20,fontSize:15,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:view===id?'var(--brand)':'var(--border)',background:view===id?'var(--brand-light)':'var(--surface)',color:view===id?'var(--brand)':'var(--text-2)'}}>
          {label}
        </button>
      ))}
    </div>

    {view==='overview'&&<>
      {/* Missing data nudges */}
      {(()=>{
        const missing=[]
        const noValue=props.filter(p=>!p.currentValue)
        const noMortgage=props.filter(p=>p.lender&&!p.monthlyPayment)
        const noRent=props.filter(p=>!p.rent)
        const noRate=props.filter(p=>p.mortgage&&!p.rate)
        if(noValue.length>0) missing.push({icon:'🏠',text:`Property value missing on ${noValue.map(p=>p.shortName).join(', ')} : needed for yield, equity and LTV`,action:'Use Land Registry estimate in Edit property',key:'value'})
        if(noRent.length>0) missing.push({icon:'💸',text:`Monthly rent missing on ${noRent.map(p=>p.shortName).join(', ')} : needed for yield and net income`,action:'Edit property and add the monthly rent',key:'rent'})
        if(noMortgage.length>0) missing.push({icon:'🏦',text:`Monthly mortgage payment missing on ${noMortgage.map(p=>p.shortName).join(', ')} : needed for net yield and cashflow`,action:'Edit property and add the monthly payment amount',key:'mortgage'})
        if(noRate.length>0) missing.push({icon:'📊',text:`Interest rate missing on ${noRate.map(p=>p.shortName).join(', ')} : needed for interest coverage ratio`,action:'Edit property and add the interest rate',key:'rate'})
        if(missing.length===0) return null
        return<div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'16px 20px',marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:600,color:'#633806',marginBottom:12}}>To unlock all metrics, add the following:</div>
          {missing.map((m,i)=>(
            <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:i<missing.length-1?7:0}}>
              <span style={{fontSize:15,flexShrink:0}}>{m.icon}</span>
              <div>
                <div style={{fontSize:14,color:'#633806',lineHeight:1.5}}>{m.text}</div>
                <div style={{fontSize:15,color:'#a07030',marginTop:1}}>How: {m.action}</div>
              </div>
            </div>
          ))}
        </div>
      })()}

      {/* Monthly headline */}
      <div style={{background:'var(--brand)',borderRadius:14,padding:'20px 24px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {[
          {label:'Monthly rent',value:monthlyRent?fmt(monthlyRent):'-',sub:annualRent?fmt(annualRent)+'/yr':''},
          {label:'Monthly mortgage',value:monthlyMortgage?fmt(monthlyMortgage):'-',sub:annualMortgage?fmt(annualMortgage)+'/yr':''},
          {label:'Monthly net',value:monthlyNet?fmt(monthlyNet):'-',sub:annualNet?fmt(annualNet)+'/yr':'',pos:monthlyNet>0},
        ].map(m=>(
          <div key={m.label}>
            <div style={{fontSize:15,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{m.label}</div>
            <div style={{fontSize:26,fontWeight:600,fontFamily:'var(--mono)',color:m.pos?'#a3f0a0':'#fff'}}>{m.value}</div>
            {m.sub&&<div style={{fontSize:15,color:'rgba(255,255,255,0.55)',marginTop:2}}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Portfolio health metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16}}>
        <MetricCard label="Portfolio value" value={totalValue?fmt(totalValue):'-'} sub={totalEquity>0?fmt(totalEquity)+' equity':''} subGreen={totalEquity>0} highlight={totalEquity>0}/>
        <MetricCard label="Total mortgage" value={totalMortgage?fmt(totalMortgage):'-'} sub={portfolioLTV>0?portfolioLTV.toFixed(1)+'% LTV':''}/>
        <MetricCard label="Total equity" value={totalEquity>0?fmt(totalEquity):'-'} sub={totalEquity>0?'Across '+props.length+' propert'+(props.length===1?'y':'ies'):''} subGreen={totalEquity>0} highlight={totalEquity>0}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:16}}>
        <MetricCard label="Gross yield" value={grossYield>0?grossYield.toFixed(2)+'%':'-'} sub={grossYield>0?(grossYield>=5?'Above 5% target':'Below 5% target'):''} subGreen={grossYield>=5} subRed={grossYield>0&&grossYield<5}/>
        <MetricCard label="Net yield" value={netYield?netYield.toFixed(2)+'%':'-'} sub={netYield>0?(netYield>=3?'Healthy':'Low net yield'):''} subGreen={netYield>=3} subRed={netYield>0&&netYield<3}/>
        <MetricCard label="Return on equity" value={returnOnEquity?returnOnEquity.toFixed(1)+'%':'-'} sub="Annual net profit / equity" highlight={returnOnEquity>8}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        <MetricCard label="Interest coverage" value={interestCoverage?interestCoverage.toFixed(2)+'x':'-'} sub={interestCoverage>0?(interestCoverage>=1.5?'Healthy buffer':'Tight - under 1.5x'):''} subGreen={interestCoverage>=1.5} subRed={interestCoverage>0&&interestCoverage<1.25} warn={interestCoverage>0&&interestCoverage<1.25}/>
        <MetricCard label="Annual expenses" value={totalExpenses?fmt(totalExpenses):'-'} sub={totalExpenses>0?fmt(totalExpenses/12)+'/mo avg':''}/>
        <MetricCard label="Portfolio LTV" value={portfolioLTV>0?portfolioLTV.toFixed(1)+'%':'-'} sub={portfolioLTV>0?(portfolioLTV<=75?'Under 75% - remortgage headroom':'Over 75% - limited headroom'):''} subGreen={portfolioLTV>0&&portfolioLTV<=75} warn={portfolioLTV>80}/>
      </div>

      {/* Per-property summary */}
      {props.length>0&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:500,marginBottom:14}}>Property breakdown</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:14,minWidth:640}}>
            <thead><tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--surface2)'}}>
              {['Property','Rent/mo','Mortgage/mo','Net/mo','Value','Mortgage','Equity','LTV','Gross yield'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'16px 18px',fontSize:15,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>{h}</th>
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
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{rent?fmt(rent):<span style={{color:'var(--amber)',fontSize:10}}>add rent</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{mortgage?fmt(mortgage):<span style={{color:'var(--text-3)',fontSize:10}}>add payment</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:net>0?'var(--green)':net<0?'var(--red)':'var(--text-3)',fontWeight:500}}>{rent&&mortgage?fmt(net):<span style={{color:'var(--text-3)',fontSize:10}}>{rent?'add payment':'add rent'}</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{val?fmt(val):<span style={{color:'var(--amber)',fontSize:10}}>add value</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)'}}>{mort?fmt(mort):<span style={{color:'var(--text-3)',fontSize:10}}>add mortgage</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:equity>0?'var(--green)':'var(--red)',fontWeight:500}}>{val&&mort?fmt(equity):<span style={{color:'var(--text-3)',fontSize:10}}>{val?'add mortgage':'add value'}</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:ltv>80?'var(--red)':ltv>75?'var(--amber)':'var(--green)'}}>{ltv?ltv.toFixed(0)+'%':<span style={{color:'var(--text-3)',fontSize:10}}>{val?'add mortgage':'add value'}</span>}</td>
                  <td style={{padding:'9px 10px',fontFamily:'var(--mono)',color:gy>=5?'var(--green)':gy>0?'var(--amber)':'var(--text-3)'}}>{gy?gy.toFixed(1)+'%':<span style={{color:'var(--amber)',fontSize:10}}>{val?'add rent':'add value'}</span>}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Remortgage alerts */}
      {remortgageProps.length>0&&<div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'16px 18px',marginBottom:14,fontSize:14,color:'#633806',lineHeight:1.7}}>
        <div style={{fontWeight:600,marginBottom:6}}>Remortgage window : {remortgageProps.length} propert{remortgageProps.length===1?'y':'ies'} coming off fixed rate</div>
        {remortgageProps.map(p=><div key={p.id}>- {p.shortName}: fixed rate ends {p.fixedEnd} . Book now to avoid SVR.</div>)}
      </div>}
    </>}

    {view==='expenses'&&<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
        <MetricCard label="Annual rent income" value={annualRent?fmt(annualRent):'-'} subGreen={annualRent>0}/>
        <MetricCard label="Annual expenses" value={fmt(annualMortgage+totalExpenses)} sub="Mortgage + all costs"/>
        <MetricCard label="Annual net profit" value={fmt(annualNet)} subGreen={annualNet>0} subRed={annualNet<=0} sub={annualNet>0?'Before tax':'Loss position'}/>
      </div>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:15,fontWeight:500}}>Income and expenses</div>
          <button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'5px 14px',fontSize:14,fontWeight:500,cursor:'pointer'}}>+ Add expense</button>
        </div>
        {showForm&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <Input label="Date" value={newExp.date} onChange={v=>setNewExp(p=>({...p,date:v}))} placeholder="DD/MM/YYYY"/>
            <div style={{marginBottom:14}}><label style={{display:'block',fontSize:15,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={newExp.property} onChange={e=>setNewExp(p=>({...p,property:e.target.value}))} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:15,color:'var(--text)',outline:'none'}}><option value="">All</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName}</option>)}</select></div>
            <div style={{marginBottom:14}}><label style={{display:'block',fontSize:15,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Category</label><select value={newExp.category} onChange={e=>setNewExp(p=>({...p,category:e.target.value}))} style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:15,color:'var(--text)',outline:'none'}}><option value="">Select</option>{cats.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select></div>
            <Input label="Amount (£)" value={newExp.amount} onChange={v=>setNewExp(p=>({...p,amount:v}))} placeholder="e.g. 120" type="number"/>
            <div style={{gridColumn:'1/-1'}}><Input label="Description" value={newExp.description} onChange={v=>setNewExp(p=>({...p,description:v}))} placeholder="Brief description"/></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:14,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button><button onClick={addExpense} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:14,fontWeight:500,cursor:'pointer'}}>Add</button></div>
        </div>}
        {expenses.length===0
          ?<div style={{fontSize:14,color:'var(--text-3)',padding:'10px 0',textAlign:'center'}}>No expenses logged yet.</div>
          :<><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:'0.5px solid var(--border)'}}>{['Date','Property','Category','Description','Amount',''].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:14,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}</tr></thead>
            <tbody>{expenses.map(e=><tr key={e.id} style={{borderBottom:'0.5px solid var(--border)'}}><td style={{padding:'8px'}}>{e.date||'-'}</td><td style={{padding:'8px',color:'var(--text-2)'}}>{e.property||'All'}</td><td style={{padding:'8px'}}>{e.category}</td><td style={{padding:'8px',color:'var(--text-2)'}}>{e.description}</td><td style={{padding:'8px',fontFamily:'var(--mono)',fontWeight:500}}>{fmt(Number(e.amount))}</td><td style={{padding:'8px'}}><button onClick={()=>deleteExpense(e.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:14}}>x</button></td></tr>)}</tbody>
            <tfoot><tr style={{borderTop:'0.5px solid var(--border-strong)'}}><td colSpan={4} style={{padding:'8px',fontWeight:500,fontSize:12}}>Total</td><td style={{padding:'8px',fontFamily:'var(--mono)',fontWeight:600,color:'var(--red)'}}>{fmt(totalExpenses)}</td><td/></tr></tfoot>
          </table>
          {Object.keys(bycat).length>0&&<div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>{Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([cat,total])=><span key={cat} style={{fontSize:15,padding:'3px 9px',borderRadius:20,background:'var(--surface2)',color:'var(--text-2)'}}>{cat}: {fmt(total)}</span>)}</div>}
          </>
        }
      </div>
    </>}

    {view==='yields'&&<>
      <div style={{fontSize:15,color:'var(--text-2)',marginBottom:16,lineHeight:1.7}}>Yield analysis helps you identify your best and worst performing properties. Gross yield is rent vs purchase price. Net yield accounts for all costs.</div>
      {props.length===0
        ?<div style={{textAlign:'center',padding:'40px 20px',background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14}}><div style={{fontSize:15,color:'var(--text-3)'}}>Add properties with values and rent to see yield analysis.</div></div>
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
                  {gy>0&&<span style={{fontSize:14,padding:'3px 10px',borderRadius:20,background:gy>=5?'var(--green-bg)':gy>=3?'#fff8e1':'var(--red-bg)',color:gy>=5?'var(--green)':gy>=3?'#633806':'var(--red)',fontWeight:500}}>Gross yield: {gy.toFixed(2)}%</span>}
                  {ny?<span style={{fontSize:14,padding:'3px 10px',borderRadius:20,background:ny>=3?'var(--green-bg)':'var(--surface2)',color:ny>=3?'var(--green)':'var(--text-3)',fontWeight:500}}>Net yield: {ny.toFixed(2)}%</span>:null}
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
                ].map(m=><div key={m.l} style={{background:'var(--surface2)',borderRadius:8,padding:'16px 18px'}}>
                  <div style={{fontSize:15,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:3}}>{m.l}</div>
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
          <div style={{fontSize:15,fontWeight:500}}>Section 24 tax calculator</div>
          <div style={{fontSize:14,color:'var(--text-3)',marginTop:2}}>Extra tax cost on personal properties vs Ltd Company</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={taxRate} onChange={e=>setTaxRate(e.target.value)} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 10px',fontSize:14,fontFamily:'var(--font)',color:'var(--text)',outline:'none'}}>
            <option value="20">20% basic rate</option>
            <option value="40">40% higher rate</option>
            <option value="45">45% additional rate</option>
          </select>
          <button onClick={calcSection24} disabled={s24Loading} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'9px 18px',fontSize:14,fontWeight:500,cursor:'pointer'}}>{s24Loading?'Calculating...':'Calculate'}</button>
        </div>
      </div>
      <div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:9,padding:'14px 16px',fontSize:14,color:'#633806',lineHeight:1.7,marginBottom:12}}>
        Section 24 restricts mortgage interest relief for personally-owned properties. You can only claim 20% tax credit on mortgage interest regardless of your tax rate. This calculator shows your extra annual tax vs Ltd Company ownership.
      </div>
      {props.filter(p=>p.ownership==='Personal'&&p.mortgage).length===0
        ?<div style={{fontSize:14,color:'var(--text-3)',padding:'8px 0'}}>Add personal properties with mortgage details to use this calculator.</div>
        :<div style={{fontSize:15,color:'var(--text-2)',marginBottom:12}}>{props.filter(p=>p.ownership==='Personal').length} personal propert{props.filter(p=>p.ownership==='Personal').length===1?'y':'ies'}  and {props.filter(p=>p.ownership==='Ltd Company').length} Ltd Company
      <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.6,padding:'8px 12px',background:'var(--surface2)',borderRadius:8,margin:'8px 0'}}>Section 24 figures are estimates only. Your actual tax position depends on your total income, allowances and other reliefs. Always consult a qualified accountant or tax adviser before making decisions.</div></div>
      }
      {s24Result&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,fontSize:14,lineHeight:1.8,whiteSpace:'pre-wrap',color:'var(--text-2)',marginTop:8}}>{s24Result}</div>}
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
      {open.length>0&&<><div style={{fontSize:14,fontWeight:600,color:'var(--brand)',marginBottom:10}}>Open ({open.length})</div>
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

/* ---- Void Tracker Panel ---- */
function VoidTrackerPanel({portfolio,setPortfolio}){
  const props = portfolio.properties||[]
  const voids = portfolio.voids||[]
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[form,setForm]=useState({propId:'',startDate:'',endDate:'',reason:'',notes:''})
  const[showForm,setShowForm]=useState(false)
  const set=(k,v)=>setForm(prev=>({...prev,[k]:v}))

  function addVoid(){
    if(!form.propId||!form.startDate)return
    const updated={...portfolio,voids:[...voids,{...form,id:Math.random().toString(36).slice(2)}]}
    setPortfolio(updated)
    setForm({propId:'',startDate:'',endDate:'',reason:'',notes:''})
    setShowForm(false)
  }
  function deleteVoid(id){setPortfolio({...portfolio,voids:voids.filter(v=>v.id!==id)})}

  function voidCost(v){
    const prop=props.find(p=>p.id===v.propId)
    const rent=Number(prop?.rent)||0
    if(!rent||!v.startDate||!v.endDate)return null
    const start=new Date(v.startDate.split('/').reverse().join('-'))
    const end=new Date(v.endDate.split('/').reverse().join('-'))
    const days=Math.max(0,Math.round((end-start)/(1000*60*60*24)))
    return Math.round((rent/30)*days)
  }

  const totalVoidCost=voids.reduce((s,v)=>{const c=voidCost(v);return s+(c||0)},0)
  const currentVoids=voids.filter(v=>!v.endDate||!v.endDate.trim())

  const inp={background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',width:'100%'}

  return<div className="fade-up">
    {currentVoids.length>0&&<div style={{background:'var(--red-bg)',border:'0.5px solid var(--red)',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:12,color:'var(--red)',lineHeight:1.8}}>
      <div style={{fontWeight:600,marginBottom:4}}>{currentVoids.length} propert{currentVoids.length===1?'y':'ies'} currently void</div>
      {currentVoids.map(v=>{const p=props.find(pp=>pp.id===v.propId);return<div key={v.id}>- {p?.shortName||'Unknown'}: void since {v.startDate}{p?.rent&&<> , costing approximately {fmt(Number(p.rent))} per month in lost rent</>}</div>})}
    </div>}

    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>Void period tracker</div>
          <div style={{fontSize:12,color:'var(--text-3)'}}>Log periods when properties are empty between tenancies</div>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Log void</button>
      </div>

      {showForm&&<div style={{background:'var(--surface2)',borderRadius:10,padding:14,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
          <div style={{marginBottom:14,gridColumn:'1/-1'}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={form.propId} onChange={e=>set('propId',e.target.value)} style={inp}><option value="">Select property</option>{props.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Void start date</label><input type="date" value={form.startDate?form.startDate.split('/').reverse().join('-'):''} onChange={e=>{const p=e.target.value.split('-');set('startDate',p[2]+'/'+p[1]+'/'+p[0])}} style={inp}/></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Void end date (leave blank if ongoing)</label><input type="date" value={form.endDate?form.endDate.split('/').reverse().join('-'):''} onChange={e=>{const p=e.target.value.split('-');set('endDate',p[2]+'/'+p[1]+'/'+p[0])}} style={inp}/></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Reason</label><select value={form.reason} onChange={e=>set('reason',e.target.value)} style={inp}><option value="">Select reason</option><option>Between tenancies</option><option>Refurbishment</option><option>Unable to let</option><option>Awaiting probate / legal</option><option>Other</option></select></div>
          <div style={{marginBottom:14,gridColumn:'1/-1'}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Notes</label><input value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="e.g. New boiler being fitted" style={inp}/></div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button>
          <button onClick={addVoid} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Save void period</button>
        </div>
      </div>}

      {voids.length===0
        ?<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:'20px 0'}}>No void periods logged yet. Log empty periods to track lost income and inform yield calculations.</div>
        :<><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,marginBottom:10}}>
          <thead><tr style={{borderBottom:'0.5px solid var(--border)',background:'var(--surface2)'}}>{['Property','Start','End','Days','Lost income','Reason',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 8px',fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}</tr></thead>
          <tbody>{voids.map(v=>{
            const prop=props.find(p=>p.id===v.propId)
            const cost=voidCost(v)
            const start=v.startDate?new Date(v.startDate.split('/').reverse().join('-')):null
            const end=v.endDate?new Date(v.endDate.split('/').reverse().join('-')):new Date()
            const days=start?Math.round((end-start)/(1000*60*60*24)):null
            return<tr key={v.id} style={{borderBottom:'0.5px solid var(--border)'}} >
              <td style={{padding:'8px'}}><div style={{fontWeight:500}}>{prop?.shortName||'Unknown'}</div></td>
              <td style={{padding:'8px',fontFamily:'var(--mono)'}}>{v.startDate}</td>
              <td style={{padding:'8px',fontFamily:'var(--mono)'}}>{v.endDate||<span style={{color:'var(--red)',fontWeight:500}}>Ongoing</span>}</td>
              <td style={{padding:'8px',fontFamily:'var(--mono)'}}>{days!=null?days+' days':'-'}</td>
              <td style={{padding:'8px',fontFamily:'var(--mono)',color:'var(--red)'}}>{cost?fmt(cost):'-'}</td>
              <td style={{padding:'8px',color:'var(--text-2)'}}>{v.reason||'-'}</td>
              <td style={{padding:'8px'}}><button onClick={()=>deleteVoid(v.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:14}}>x</button></td>
            </tr>
          })}</tbody>
        </table>
        {totalVoidCost>0&&<div style={{background:'var(--red-bg)',border:'0.5px solid var(--red)',borderRadius:9,padding:'10px 14px',fontSize:12,color:'var(--red)'}}>Total lost income from voids: <strong>{fmt(totalVoidCost)}</strong></div>}
        </>
      }
    </div>

    {props.length>0&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Void cost per property</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {props.map(p=>{
          const propVoids=voids.filter(v=>v.id&&v.propId===p.id)
          const totalCost=propVoids.reduce((s,v)=>{const c=voidCost(v);return s+(c||0)},0)
          const totalDays=propVoids.reduce((s,v)=>{
            const start=v.startDate?new Date(v.startDate.split('/').reverse().join('-')):null
            const end=v.endDate?new Date(v.endDate.split('/').reverse().join('-')):new Date()
            return s+(start?Math.round((end-start)/(1000*60*60*24)):0)
          },0)
          const voidYield=p.rent&&totalDays>0?((totalCost/(Number(p.rent)*12))*100).toFixed(1):null
          return<div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'var(--surface2)',borderRadius:8}}>
            <div style={{fontSize:12,fontWeight:500}}>{p.shortName}</div>
            <div style={{display:'flex',gap:16,fontSize:12,color:'var(--text-2)'}}>
              <span>{propVoids.length} period{propVoids.length!==1?'s':''}</span>
              <span>{totalDays} days total</span>
              {totalCost>0&&<span style={{color:'var(--red)',fontWeight:500}}>{fmt(totalCost)} lost</span>}
              {voidYield&&<span style={{color:'var(--amber)'}}>-{voidYield}% yield impact</span>}
            </div>
          </div>
        })}
      </div>
    </div>}
  </div>
}

/* ---- Tax Export Panel ---- */
function TaxExportPanel({portfolio}){
  const props=portfolio.properties||[]
  const expenses=portfolio.expenses||[]
  const rentLedger=portfolio.rentLedger||{}
  const now=new Date()
  const[taxYear,setTaxYear]=useState(now.getMonth()>=3?now.getFullYear():now.getFullYear()-1)

  // UK tax year: 6 April to 5 April
  const yearStart=new Date(taxYear,3,6) // April 6
  const yearEnd=new Date(taxYear+1,3,5)  // April 5 next year

  // Calculate rent received per property from rent ledger
  const rentIncome=props.map(p=>{
    const months=Object.keys(rentLedger[p.id]||{}).filter(k=>k.match(/^\d{4}-\d{2}$/))
    const received=months.reduce((s,monthKey)=>{
      const status=rentLedger[p.id]?.[monthKey]
      const amount=rentLedger[p.id]?.[monthKey+'_amount']
      if(status==='paid')return s+(amount?Number(amount):Number(p.rent)||0)
      if(status==='partial')return s+(Number(amount)||0)
      return s
    },0)
    // Fallback: if no ledger data, estimate from monthly rent
    const fallback=(Number(p.rent)||0)*12
    return{prop:p,received:received||fallback,isEstimate:!received}
  })

  const totalRentIncome=rentIncome.reduce((s,r)=>s+r.received,0)

  // Expenses in tax year
  const yearExpenses=expenses.filter(e=>{
    if(!e.date)return true
    const parts=e.date.split('/')
    if(parts.length<3)return true
    const d=new Date(parts[2],parts[1]-1,parts[0])
    return d>=yearStart&&d<=yearEnd
  })
  const totalExpenses=yearExpenses.reduce((s,e)=>s+(Number(e.amount)||0),0)
  const totalMortgageInterest=props.reduce((s,p)=>{
    const rate=Number(p.rate)||0
    const balance=Number(p.mortgage)||0
    return s+(rate/100*balance)
  },0)
  const netProfit=totalRentIncome-totalExpenses
  const taxableProfit=netProfit // Section 24: mortgage interest not deductible for personal ownership

  const bycat={}
  yearExpenses.forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+Number(e.amount||0)})

  function copyReport(){
    const lines=[
      `LETTLY TAX YEAR SUMMARY`,
      `Tax year: ${taxYear}/${taxYear+1} (6 April ${taxYear} to 5 April ${taxYear+1})`,
      `Generated: ${new Date().toLocaleDateString('en-GB')}`,
      ``,
      `RENTAL INCOME`,
      ...rentIncome.map(r=>`  ${r.prop.shortName}: £${r.received.toLocaleString('en-GB')}${r.isEstimate?' (estimated)':''}`),
      `  TOTAL RENTAL INCOME: £${totalRentIncome.toLocaleString('en-GB')}`,
      ``,
      `ALLOWABLE EXPENSES`,
      ...Object.entries(bycat).map(([cat,amt])=>`  ${cat}: £${amt.toLocaleString('en-GB')}`),
      `  TOTAL EXPENSES: £${totalExpenses.toLocaleString('en-GB')}`,
      ``,
      `MORTGAGE INTEREST (Section 24 note)`,
      `  Estimated annual interest: £${Math.round(totalMortgageInterest).toLocaleString('en-GB')}`,
      `  Note: Under Section 24, mortgage interest is NOT deductible for personal ownership.`,
      `  A 20% basic rate tax credit applies instead.`,
      ``,
      `NET PROFIT: £${netProfit.toLocaleString('en-GB')}`,
      ``,
      `PROPERTY BREAKDOWN`,
      ...props.map(p=>`  ${p.shortName} (${p.nation||'England'}): Rent £${p.rent?Number(p.rent)*12:0}/yr, Mortgage £${p.mortgage||0} at ${p.rate||0}%`),
      ``,
      `This summary is for guidance only. Please confirm all figures with your accountant.`,
      `Prepared using Lettly: lettly.co`
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    alert('Report copied to clipboard')
  }

  return<div className="fade-up">
    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>Tax year summary</div>
          <div style={{fontSize:12,color:'var(--text-3)'}}>Accountant-ready income and expense summary</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <select value={taxYear} onChange={e=>setTaxYear(Number(e.target.value))} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 11px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',outline:'none'}}>
            {[2025,2024,2023,2022].map(y=><option key={y} value={y}>{y}/{y+1}</option>)}
          </select>
          <button onClick={copyReport} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Copy for accountant</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        <div style={{background:'var(--green-bg)',border:'0.5px solid var(--green)',borderRadius:10,padding:'12px 14px'}}>
          <div style={{fontSize:11,color:'var(--green)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Total rental income</div>
          <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--mono)',color:'var(--green)'}}>{fmt(totalRentIncome)}</div>
          <div style={{fontSize:11,color:'var(--green)',opacity:0.7,marginTop:2}}>Tax year {taxYear}/{taxYear+1}</div>
        </div>
        <div style={{background:'var(--red-bg)',border:'0.5px solid var(--red)',borderRadius:10,padding:'12px 14px'}}>
          <div style={{fontSize:11,color:'var(--red)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Total expenses</div>
          <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--mono)',color:'var(--red)'}}>{fmt(totalExpenses)}</div>
          <div style={{fontSize:11,color:'var(--red)',opacity:0.7,marginTop:2}}>{yearExpenses.length} items</div>
        </div>
        <div style={{background:netProfit>=0?'var(--brand-subtle)':'var(--red-bg)',border:'0.5px solid '+(netProfit>=0?'rgba(27,94,59,0.2)':'var(--red)'),borderRadius:10,padding:'12px 14px'}}>
          <div style={{fontSize:11,color:netProfit>=0?'var(--brand)':'var(--red)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4}}>Net profit</div>
          <div style={{fontSize:22,fontWeight:600,fontFamily:'var(--mono)',color:netProfit>=0?'var(--brand)':'var(--red)'}}>{fmt(netProfit)}</div>
          <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Before tax</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <div>
          <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Rental income by property</div>
          {rentIncome.map(r=><div key={r.prop.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)',fontSize:12}}>
            <span style={{color:'var(--text-2)'}}>{r.prop.shortName}</span>
            <span style={{fontFamily:'var(--mono)',fontWeight:500}}>{fmt(r.received)}{r.isEstimate&&<span style={{fontSize:10,color:'var(--text-3)',marginLeft:4}}>est.</span>}</span>
          </div>)}
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Expenses by category</div>
          {Object.keys(bycat).length===0
            ?<div style={{fontSize:12,color:'var(--text-3)'}}>No expenses logged for this tax year. Add expenses in the Finance tab.</div>
            :Object.entries(bycat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=><div key={cat} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)',fontSize:12}}>
              <span style={{color:'var(--text-2)'}}>{cat}</span>
              <span style={{fontFamily:'var(--mono)',fontWeight:500,color:'var(--red)'}}>{fmt(amt)}</span>
            </div>)
          }
        </div>
      </div>

      <div style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:10,padding:'10px 14px',marginBottom:10}}>
        <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.6}}>This summary is for guidance only and does not constitute tax or financial advice. All figures should be verified with your accountant before filing your Self Assessment. Rental income figures are based on data you have entered and may not be complete.</div>
      </div>
      <div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:10,padding:'12px 14px'}}>
        <div style={{fontSize:12,fontWeight:600,color:'#633806',marginBottom:6}}>Section 24 note</div>
        <div style={{fontSize:12,color:'#7a5000',lineHeight:1.7}}>Estimated mortgage interest this year: {fmt(Math.round(totalMortgageInterest))}. Under Section 24, this is NOT deductible for personal ownership. You receive a 20% basic rate tax credit instead. If you pay higher rate tax, Section 24 significantly increases your tax bill. Ask your accountant about moving to a limited company structure.</div>
      </div>
    </div>
  </div>
}




/* ============================================================
   CONTENT QUEUE TAB: AI agent drafts, Mayo approves
   ============================================================ */
function ContentQueueTab({user}){
  const[items,setItems]=useState([])
  const[loading,setLoading]=useState(true)
  const[filter,setFilter]=useState('draft')
  const[typeFilter,setTypeFilter]=useState('all')
  const[selected,setSelected]=useState(null)
  const[generating,setGenerating]=useState(false)
  const[topicInput,setTopicInput]=useState('')
  const[keywordInput,setKeywordInput]=useState('')
  const[genMsg,setGenMsg]=useState('')

  async function loadItems(){
    setLoading(true)
    try{
      const params = new URLSearchParams()
      if(filter!=='all') params.set('status',filter)
      if(typeFilter!=='all') params.set('type',typeFilter)
      const r = await fetch('/api/content-queue?'+params)
      const d = await r.json()
      setItems(d.items||[])
    }catch(e){console.error(e)}
    setLoading(false)
  }

  useState(()=>{loadItems()},[filter,typeFilter])

  async function updateItem(id, patch){
    await fetch('/api/content-queue',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...patch})})
    await loadItems()
    if(selected?.id===id) setSelected(prev=>({...prev,...patch}))
  }

  async function deleteItem(id){
    if(!confirm('Delete this draft?')) return
    await fetch('/api/content-queue',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setSelected(null)
    await loadItems()
  }

  async function generateContent(mode){
    setGenerating(true)
    setGenMsg('AI is researching and writing...')
    try{
      const body = mode==='topic'
        ? {manual:true,mode:'topic',topicTitle:topicInput,keyword:keywordInput}
        : {manual:true,mode:'seo'}
      const r = await fetch('/api/agent-content',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.NEXT_PUBLIC_CRON_SECRET},
        body:JSON.stringify(body)
      })
      const d = await r.json()
      setGenMsg(d.message||'Done')
      setTopicInput('')
      setKeywordInput('')
      await loadItems()
    }catch(e){setGenMsg('Error: '+e.message)}
    setGenerating(false)
  }

  const typeLabel={
    blog_post:'Blog post',
    social_instagram:'Instagram',
    social_linkedin:'LinkedIn',
    email_blast:'Email',
    seo_article:'SEO article'
  }
  const typeColour={
    blog_post:{bg:'#E6F1FB',col:'#0C447C'},
    social_instagram:{bg:'#FBEAF0',col:'#72243E'},
    social_linkedin:{bg:'#E6F1FB',col:'#0C447C'},
    email_blast:{bg:'#FAEEDA',col:'#633806'},
    seo_article:{bg:'#eaf3de',col:'#27500A'}
  }
  const urgencyCol={HIGH:'var(--red)',MEDIUM:'var(--amber)',LOW:'var(--text-3)'}
  const statusBg={draft:'var(--surface2)',approved:'var(--green-bg)',published:'#E6F1FB',rejected:'var(--red-bg)'}
  const statusCol={draft:'var(--text-2)',approved:'var(--green)',published:'#0C447C',rejected:'var(--red)'}

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Content queue</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>AI drafts content automatically. You review, edit if needed, then approve. Nothing publishes without your click.</div>
    </div>

    {/* Generate controls */}
    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:500,marginBottom:12}}>Generate content</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,marginBottom:10}}>
        <input value={topicInput} onChange={e=>setTopicInput(e.target.value)} placeholder="Article title e.g. How to evict a tenant legally" style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',outline:'none'}}/>
        <input value={keywordInput} onChange={e=>setKeywordInput(e.target.value)} placeholder="SEO keyword e.g. how to evict tenant UK" style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',outline:'none'}}/>
        <button onClick={()=>generateContent('topic')} disabled={generating||!topicInput} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:500,cursor:generating||!topicInput?'not-allowed':'pointer',opacity:generating||!topicInput?0.6:1,whiteSpace:'nowrap'}}>
          {generating?'Writing...':'Write article'}
        </button>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button onClick={()=>generateContent('seo')} disabled={generating} style={{background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 14px',fontSize:12,cursor:generating?'not-allowed':'pointer',opacity:generating?0.6:1}}>
          Run weekly SEO batch (2 articles)
        </button>
        {genMsg&&<span style={{fontSize:11,color:'var(--text-3)'}}>{genMsg}</span>}
      </div>
    </div>

    {/* Filters */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {['draft','approved','published','rejected','all'].map(s=>
        <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:filter===s?'var(--brand)':'var(--border)',background:filter===s?'var(--brand-light)':'var(--surface)',color:filter===s?'var(--brand)':'var(--text-2)',textTransform:'capitalize'}}>{s==='all'?'All statuses':s}</button>
      )}
      <div style={{width:1,background:'var(--border)',margin:'0 4px'}}/>
      {['all','blog_post','social_instagram','social_linkedin'].map(t=>
        <button key={t} onClick={()=>setTypeFilter(t)} style={{padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:typeFilter===t?'var(--brand)':'var(--border)',background:typeFilter===t?'var(--brand-light)':'var(--surface)',color:typeFilter===t?'var(--brand)':'var(--text-2)'}}>{t==='all'?'All types':typeLabel[t]||t}</button>
      )}
    </div>

    <div style={{display:'grid',gridTemplateColumns:selected?'1fr 1fr':'1fr',gap:14}}>
      {/* Item list */}
      <div>
        {loading?<div style={{fontSize:12,color:'var(--text-3)',padding:'20px 0',textAlign:'center'}}>Loading...</div>
        :items.length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'20px 0',textAlign:'center'}}>No items. Generate some content above or wait for the weekly agent to run.</div>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {items.map(item=>{
            const tc=typeColour[item.type]||{bg:'var(--surface2)',col:'var(--text-2)'}
            const isSelected=selected?.id===item.id
            return<div key={item.id} onClick={()=>setSelected(isSelected?null:item)}
              style={{background:isSelected?'var(--brand-subtle)':'var(--surface)',border:`0.5px solid ${isSelected?'var(--brand)':'var(--border)'}`,borderRadius:11,padding:'11px 14px',cursor:'pointer',transition:'all 0.15s'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}>
                <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:tc.bg,color:tc.col,flexShrink:0}}>{typeLabel[item.type]||item.type}</span>
                <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:statusBg[item.status]||'var(--surface2)',color:statusCol[item.status]||'var(--text-2)',flexShrink:0,textTransform:'capitalize'}}>{item.status}</span>
                {item.urgency==='HIGH'&&<span style={{fontSize:10,color:'var(--red)',fontWeight:600}}>URGENT</span>}
              </div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--brand)',marginBottom:2,lineHeight:1.4}}>{item.title}</div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>{new Date(item.created_at).toLocaleDateString('en-GB')} {item.source&&'· '+item.source.replace('_',' ')}</div>
              {item.status==='draft'&&<div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={e=>{e.stopPropagation();updateItem(item.id,{status:'approved'})}} style={{background:'var(--green-bg)',color:'var(--green)',border:'none',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:500,cursor:'pointer'}}>Approve</button>
                <button onClick={e=>{e.stopPropagation();updateItem(item.id,{status:'rejected'})}} style={{background:'var(--red-bg)',color:'var(--red)',border:'none',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>Reject</button>
                <button onClick={e=>{e.stopPropagation();deleteItem(item.id)}} style={{background:'none',color:'var(--text-3)',border:'none',padding:'4px 6px',fontSize:11,cursor:'pointer'}}>Delete</button>
              </div>}
              {item.status==='approved'&&<div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={e=>{e.stopPropagation();updateItem(item.id,{status:'published'})}} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:6,padding:'4px 12px',fontSize:11,fontWeight:500,cursor:'pointer'}}>Mark published</button>
              </div>}
            </div>
          })}
        </div>}
      </div>

      {/* Detail pane */}
      {selected&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,maxHeight:'80vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:500,color:'var(--text)',flex:1,paddingRight:8}}>{selected.title}</div>
          <button onClick={()=>setSelected(null)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:18,flexShrink:0}}>x</button>
        </div>
        {selected.meta_description&&<div style={{fontSize:11,color:'var(--text-3)',marginBottom:12,padding:'8px 10px',background:'var(--surface2)',borderRadius:8,lineHeight:1.6}}>
          <span style={{fontWeight:500,color:'var(--text-2)'}}>Meta: </span>{selected.meta_description}
        </div>}
        {selected.slug&&<div style={{fontSize:11,color:'var(--brand)',marginBottom:12}}>
          /blog/{selected.slug}
        </div>}
        <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.9,whiteSpace:'pre-wrap',borderTop:'0.5px solid var(--border)',paddingTop:12}}>
          {selected.body}
        </div>
        {selected.notes&&<div style={{marginTop:12,fontSize:11,color:'var(--text-3)',padding:'6px 10px',background:'var(--surface2)',borderRadius:7}}>
          {selected.notes}
        </div>}
        <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
          {selected.status==='draft'&&<>
            <button onClick={()=>updateItem(selected.id,{status:'approved'})} style={{background:'var(--green-bg)',color:'var(--green)',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Approve</button>
            <button onClick={()=>updateItem(selected.id,{status:'rejected'})} style={{background:'var(--red-bg)',color:'var(--red)',border:'none',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer'}}>Reject</button>
          </>}
          {selected.status==='approved'&&<button onClick={()=>updateItem(selected.id,{status:'published'})} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Mark published</button>}
          <button onClick={()=>{navigator.clipboard.writeText(selected.body||'')}} style={{background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer'}}>Copy</button>
        </div>
      </div>}
    </div>

    <div style={{marginTop:20,fontSize:11,color:'var(--text-3)',lineHeight:1.8,padding:'12px 14px',background:'var(--surface2)',borderRadius:10}}>
      <strong style={{color:'var(--text-2)'}}>How this works:</strong> The legislation monitor runs every Monday and triggers this agent automatically when it finds legal changes. The SEO agent runs every Wednesday and drafts 2 articles from the keyword list. You approve here, then copy the content to your blog or social scheduler. Nothing goes anywhere without your click.
    </div>
  </div>
}

/* ============================================================
   RESOURCES TAB: Curated landlord resources
   ============================================================ */
function ResourcesTab(){
  const[cat,setCat]=useState('associations')
  const[search,setSearch]=useState('')

  const RESOURCES = {
    associations: {
      label: 'Associations',
      desc: 'Join a landlord association for legal helplines, template documents, and lobbying on your behalf. Most offer significant discounts vs the cost of a solicitor.',
      items: [
        {name:'NRLA',full:'National Residential Landlords Association',url:'https://www.nrla.org.uk',desc:'Largest UK landlord association with 100,000+ members. Legal helpline, template documents, training, lobbying. England and Wales focus.',tag:'England & Wales',tagCol:'blue'},
        {name:'British Landlords Association',full:'BLA',url:'https://www.thebla.co.uk',desc:'Free and paid membership tiers. Legal advice, tenancy documents, landlord insurance deals.',tag:'UK-wide',tagCol:'green'},
        {name:'iHowz',full:'iHowz Landlord Association',url:'https://www.ihowz.uk',desc:'Practical guides, legal updates, and a supportive community for independent landlords.',tag:'UK-wide',tagCol:'green'},
        {name:'Scottish Association of Landlords',full:'SAL',url:'https://www.scottishlandlords.com',desc:'The leading Scottish landlord association. Essential for Scottish PRT compliance, tribunal support and landlord registration guidance.',tag:'Scotland',tagCol:'blue'},
        {name:'The Landlord Association',full:'TLA',url:'https://www.landlordassociation.org.uk',desc:'Free membership with access to tenancy agreements, legal guides and landlord forums.',tag:'UK-wide',tagCol:'green'},
        {name:'North West Landlords Association',full:'NWLA',url:'https://www.nwla.org.uk',desc:'Regional association covering the North West. Local council licensing updates and regional networking.',tag:'North West',tagCol:'amber'},
        {name:'Guild of Residential Landlords',full:'GRL',url:'https://www.grl.co.uk',desc:'UK-wide association offering legal helpline, tenancy documents and rent guarantee insurance partnerships.',tag:'UK-wide',tagCol:'green'},
        {name:'Westcountry Landlords Association',full:'WLA',url:'https://www.wlainfo.co.uk',desc:'Regional association for landlords in Devon, Cornwall and the South West.',tag:'South West',tagCol:'amber'},
      ]
    },
    publications: {
      label: 'News & Blogs',
      desc: 'Stay on top of legislation changes, market trends and landlord news. These publications break stories on rental law changes before they hit mainstream news.',
      items: [
        {name:'LandlordZONE',url:'https://www.landlordzone.co.uk',desc:'One of the longest-running landlord news sites. Breaking news on legislation, court cases and policy. Essential reading for compliance updates.',tag:'News',tagCol:'blue'},
        {name:'Landlord Today',url:'https://www.landlordtoday.co.uk',desc:'Daily news covering UK private rented sector. Good coverage of Renters Rights Act, EPC requirements and tax changes.',tag:'News',tagCol:'blue'},
        {name:'Property118',url:'https://www.property118.com',desc:'News, analysis and strategy for UK property investors. Strong coverage of tax, Section 24, and incorporation. Active community.',tag:'News & forum',tagCol:'blue'},
        {name:'Landlord Law Blog',full:'Tessa Shepperson',url:'https://www.landlordlawblog.co.uk',desc:'Written by solicitor Tessa Shepperson. Highly accurate legal analysis of landlord law. One of the most trustworthy sources for compliance guidance.',tag:'Legal',tagCol:'amber'},
        {name:'LandlordVision Blog',url:'https://www.landlordvision.co.uk/blog',desc:'Practical guides on property management, accounting and compliance for independent landlords.',tag:'Guides',tagCol:'green'},
        {name:'Property Investment Project',url:'https://www.propertyinvestmentproject.co.uk',desc:'Data-driven analysis of UK property investment. Good for yield calculations, area analysis and investment strategy.',tag:'Investment',tagCol:'green'},
        {name:'PropertyHawk Blog',url:'https://www.propertyhawk.co.uk/blog',desc:'Practical landlord guides covering compliance, tenancy management and legislation.',tag:'Guides',tagCol:'green'},
        {name:'Property Investor Today',url:'https://www.propertyinvestortoday.co.uk',desc:'News and analysis for property investors. Covers commercial and residential investment trends.',tag:'Investment',tagCol:'blue'},
        {name:'Your Property Network Magazine',full:'YPN',url:'https://www.yourpropertynetwork.co.uk',desc:'Monthly magazine for UK property investors. Strategy, case studies and market analysis.',tag:'Magazine',tagCol:'amber'},
      ]
    },
    forums: {
      label: 'Forums & Communities',
      desc: 'The most valuable free resource for landlords. Real experiences, peer advice and early warning on legislation changes, often faster than official channels.',
      items: [
        {name:'Property118 Forum',url:'https://www.property118.com',desc:'Active forum covering tax strategy, Section 24, lettings law and investment. Frequented by experienced portfolio landlords.',tag:'Tax & strategy',tagCol:'amber'},
        {name:'LandlordZONE Forum',url:'https://www.landlordzone.co.uk/forum',desc:'High-volume forum with questions on compliance, difficult tenants, deposit disputes and legislation.',tag:'Compliance',tagCol:'blue'},
        {name:'Property Tribes',url:'https://www.propertytribes.com',desc:'Friendly community covering all aspects of property investment and management. Good for beginner and intermediate landlords.',tag:'Community',tagCol:'green'},
        {name:'NRLA Member Forum',url:'https://www.nrla.org.uk/forum',desc:'Members-only forum with high-quality moderated advice. Legal team occasionally answers directly.',tag:'Members only',tagCol:'amber'},
        {name:'Property Forum',url:'https://www.propertyforum.com',desc:'General property discussion covering buy-to-let, development and commercial property.',tag:'General',tagCol:'green'},
        {name:'Reddit: r/uklandlords',url:'https://www.reddit.com/r/uklandlords',desc:'43,000+ UK landlords. Anonymous and direct. Good for gauging sentiment and finding out what real landlords are worried about.',tag:'Reddit',tagCol:'blue'},
      ]
    },
    podcasts: {
      label: 'Podcasts',
      desc: 'Learn while commuting. These cover property investment strategy, legislation and management. Most have back catalogues covering everything a new landlord needs.',
      items: [
        {name:'The Property Podcast',full:'Rob & Rob',url:'https://www.propertyhub.net/podcast',desc:'The most popular UK property podcast. 500+ episodes covering investment strategy, market analysis and landlord news. Essential for any serious investor.',tag:'Investment',tagCol:'green'},
        {name:'Listen Up Landlords',full:'NRLA',url:'https://www.nrla.org.uk',desc:'NRLA official podcast. Deep dives into legislation, compliance and landlord rights. Highly accurate legal content.',tag:'Compliance',tagCol:'blue'},
        {name:'Inside Property Investing',full:'Mike Stenhouse',url:'https://www.insidepropertyinvesting.com',desc:'Strategy-focused podcast for investors building a portfolio. Case studies from real landlords.',tag:'Strategy',tagCol:'amber'},
        {name:'The Business of Property Podcast',url:'https://www.businessofproperty.com',desc:'Property as a business: systems, processes and scaling. Good for landlords wanting to professionalise.',tag:'Business',tagCol:'amber'},
        {name:'Property Magic Podcast',full:'Simon Zutshi',url:'https://www.simonzutshi.com',desc:'Investment strategy, creative deals and portfolio building from one of the UK most experienced property investors.',tag:'Investment',tagCol:'green'},
        {name:'This Week in Property',full:'Richard Swan',url:'https://www.thisweekinproperty.com',desc:'Weekly roundup of UK property news, legislation changes and market data. Good for staying current.',tag:'News',tagCol:'blue'},
        {name:'The Property Rebel Podcast',url:'https://www.thepropertyrebel.co.uk',desc:'Covers unconventional investment strategies, deal sourcing and portfolio growth tactics.',tag:'Strategy',tagCol:'amber'},
      ]
    },
    youtube: {
      label: 'YouTube',
      desc: 'Video content for visual learners. These channels cover property investment, management and legislation in depth. Many episodes directly relevant to compliance.',
      items: [
        {name:'Succeed In Property',full:'Ranjan Bhattacharya',url:'https://www.youtube.com/@SucceedInProperty',desc:'Practical property investment education. Strong on tax, deal analysis and portfolio strategy. Experienced portfolio landlord.',tag:'Investment',tagCol:'green'},
        {name:'Property Hub',full:'Rob & Rob',url:'https://www.youtube.com/@PropertyHub',desc:'Companion to The Property Podcast. Market analysis, investment strategies and Q&As. Largest UK property YouTube channel.',tag:'Investment',tagCol:'green'},
        {name:'Moving Home with Charlie',full:'Charlie Lamdin',url:'https://www.youtube.com/@MovingHomewithCharlie',desc:'Market data and property trends. Less investment-focused: good for understanding buyer and tenant sentiment.',tag:'Market',tagCol:'blue'},
        {name:'The Property Circle',full:'Ste Hamilton',url:'https://www.youtube.com/@SteHamilton',desc:'Practical property management and investment from a working landlord. Honest and relatable content.',tag:'Management',tagCol:'amber'},
        {name:'Property Advisor',full:'Danny Valencia',url:'https://www.youtube.com/@DannyValencia',desc:'Investment analysis, deal breakdowns and portfolio strategy. Good data-driven content.',tag:'Investment',tagCol:'green'},
        {name:'Lettings Agency Growth',full:'Christopher Watkin',url:'https://www.youtube.com/@ChristopherWatkin',desc:'Primarily for letting agents but has useful content on tenant management, legislation and market trends relevant to landlords.',tag:'Industry',tagCol:'blue'},
      ]
    }
  }

  const cats = Object.keys(RESOURCES)
  const current = RESOURCES[cat]
  const tagStyles = {
    blue:  {bg:'#E6F1FB',col:'#0C447C'},
    green: {bg:'#eaf3de',col:'#27500A'},
    amber: {bg:'#FAEEDA',col:'#633806'},
    red:   {bg:'#FCEBEB',col:'#791F1F'},
  }

  const filtered = search.trim()
    ? cats.flatMap(k=>RESOURCES[k].items.map(i=>({...i,_cat:k}))).filter(i=>
        (i.name+i.desc+(i.full||'')+(i.tag||'')).toLowerCase().includes(search.toLowerCase()))
    : null

  return<div className="fade-up">
    {/* Header */}
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Landlord resources</div>
      <div style={{fontSize:12,color:'var(--text-3)',lineHeight:1.6}}>Curated associations, publications, forums, podcasts and YouTube channels for UK landlords. Lettly does not have commercial relationships with any of these: they are here because they are genuinely useful.</div>
    </div>

    {/* Search */}
    <div style={{marginBottom:16}}>
      <input
        value={search}
        onChange={e=>setSearch(e.target.value)}
        placeholder="Search resources..."
        style={{width:'100%',background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'9px 14px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',boxSizing:'border-box'}}
      />
    </div>

    {!filtered&&<div style={{display:'flex',gap:6,marginBottom:18,flexWrap:'wrap'}}>
      {cats.map(k=><button key={k} onClick={()=>setCat(k)} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:cat===k?'var(--brand)':'var(--border)',background:cat===k?'var(--brand-light)':'var(--surface)',color:cat===k?'var(--brand)':'var(--text-2)'}}>{RESOURCES[k].label}</button>)}
    </div>}

    {filtered
      ?<>
        <div style={{fontSize:12,color:'var(--text-3)',marginBottom:12}}>{filtered.length} result{filtered.length!==1?'s':''} for "{search}"</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map((item,i)=><ResourceCard key={i} item={item} tagStyles={tagStyles} catLabel={RESOURCES[item._cat]?.label}/>)}
        </div>
      </>
      :<>
        <div style={{fontSize:12,color:'var(--text-2)',marginBottom:14,lineHeight:1.6}}>{current.desc}</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {current.items.map((item,i)=><ResourceCard key={i} item={item} tagStyles={tagStyles}/>)}
        </div>
      </>
    }

    <div style={{marginTop:20,padding:'12px 14px',background:'var(--surface2)',borderRadius:10,fontSize:11,color:'var(--text-3)',lineHeight:1.7}}>
      Know a resource that should be here? Email <a href="mailto:hello@lettly.co" style={{color:'var(--brand)'}}>hello@lettly.co</a> and we will review it for inclusion. We only list genuinely useful independent resources.
    </div>
  </div>
}

function ResourceCard({item,tagStyles,catLabel}){
  const ts=tagStyles[item.tagCol]||tagStyles.green
  return<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
        <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{item.name}</span>
        {item.full&&<span style={{fontSize:11,color:'var(--text-3)'}}>{item.full}</span>}
        {item.tag&&<span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:ts.bg,color:ts.col}}>{item.tag}</span>}
        {catLabel&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:'var(--text-3)'}}>{catLabel}</span>}
      </div>
      <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.65}}>{item.desc}</div>
    </div>
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 12px',fontSize:11,fontWeight:500,textDecoration:'none',whiteSpace:'nowrap'}}>Visit</a>
  </div>
}

/* ============================================================
   TENANTS TAB: Find, check and track applicants
   ============================================================ */
function TenantsTab({portfolio,setPortfolio}){
  const props = portfolio.properties||[]
  const applicants = portfolio.applicants||[]
  const[view,setView]=useState('find')
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[showForm,setShowForm]=useState(false)
  const[form,setForm]=useState({propId:'',name:'',email:'',phone:'',income:'',employer:'',employmentType:'',monthlyIncome:'',creditScore:'',creditCheck:'',referenceEmployer:'',referenceLandlord:'',rightToRent:'',rightToRentDoc:'',pets:false,smoker:false,notes:'',status:'Enquiry'})
  const fset=(k,v)=>setForm(p=>({...p,[k]:v}))

  const inp={background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',width:'100%'}
  const lbl={display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}

  function saveApplicant(){
    if(!form.name.trim())return
    const updated={...portfolio,applicants:[...applicants,{...form,id:Math.random().toString(36).slice(2),createdAt:new Date().toISOString()}]}
    setPortfolio(updated)
    setForm({propId:'',name:'',email:'',phone:'',income:'',employer:'',employmentType:'',monthlyIncome:'',creditScore:'',creditCheck:'',referenceEmployer:'',referenceLandlord:'',rightToRent:'',rightToRentDoc:'',pets:false,smoker:false,notes:'',status:'Enquiry'})
    setShowForm(false)
  }

  function updateStatus(id,status){
    setPortfolio({...portfolio,applicants:applicants.map(a=>a.id===id?{...a,status}:a)})
  }

  function deleteApplicant(id){
    setPortfolio({...portfolio,applicants:applicants.filter(a=>a.id!==id)})
  }

  const statusColour={
    'Enquiry':       {bg:'var(--surface2)',        col:'var(--text-2)'},
    'Applied':       {bg:'#e8f5e9',                col:'#1b5e3b'},
    'Referencing':   {bg:'#fff8e1',                col:'#633806'},
    'Approved':      {bg:'var(--green-bg)',         col:'var(--green)'},
    'Rejected':      {bg:'var(--red-bg)',           col:'var(--red)'},
    'Offer made':    {bg:'var(--brand-subtle)',     col:'var(--brand)'},
    'Tenancy signed':{bg:'#e8f5e9',                col:'#1b5e3b'},
  }

  const FINDING_PLATFORMS = [
    {name:'OpenRent',url:'https://www.openrent.co.uk',price:'From £29 one-off',desc:'Most popular direct-to-landlord portal. Lists on Rightmove and Zoopla. No agent involved.',tag:'Recommended',tagCol:'green'},
    {name:'Rightmove',url:'https://www.rightmove.co.uk/landlords',price:'Via agent or OpenRent',desc:'Highest traffic in the UK. Cannot list directly: must use an agent or portal partner.',tag:'Highest traffic',tagCol:'blue'},
    {name:'Zoopla',url:'https://www.zoopla.co.uk',price:'Via agent or OpenRent',desc:'Second largest portal. Usually bundled with Rightmove listings via partners.',tag:'High traffic',tagCol:'blue'},
    {name:'SpareRoom',url:'https://www.spareroom.co.uk',price:'Free to £35/month',desc:'Best for rooms and HMO lettings. Large audience for sharers and young professionals.',tag:'HMO / rooms',tagCol:'amber'},
    {name:'Gumtree',url:'https://www.gumtree.com',price:'Free',desc:'Free listings. Lower quality leads than portals but useful for budget properties.',tag:'Free',tagCol:'gray'},
    {name:'Facebook Marketplace',url:'https://www.facebook.com/marketplace',price:'Free',desc:'Strong local reach. Good for 1-2 bed properties in any area. Younger audience.',tag:'Free',tagCol:'gray'},
  ]

  const REFERENCING_SERVICES = [
    {name:'Rightmove Tenant Passport',url:'https://www.rightmove.co.uk/landlords/tenant-referencing.html',price:'Free for landlords',desc:'Tenant completes their own reference check and shares the result with you. No cost to the landlord.',tag:'Free',tagCol:'green'},
    {name:'OpenRent Referencing',url:'https://www.openrent.co.uk/tenant-referencing',price:'£20 per tenant',desc:'Credit check, employer reference, previous landlord reference, Right to Rent. Quick turnaround.',tag:'Best value',tagCol:'green'},
    {name:'HomeLet',url:'https://www.homelet.co.uk',price:'From £30 per tenant',desc:'Comprehensive referencing with rent guarantee insurance option. Used by many letting agents.',tag:'Comprehensive',tagCol:'blue'},
    {name:'Let Alliance',url:'https://www.letalliance.co.uk',price:'From £25 per tenant',desc:'Fast turnaround. Includes income verification, credit check and employer reference.',tag:'Fast',tagCol:'amber'},
    {name:'Experian Rental Exchange',url:'https://www.experian.co.uk/consumer/rental-exchange.html',price:'Included with some services',desc:'Reports rental payments to Experian credit file: can incentivise tenants to pay on time.',tag:'Credit reporting',tagCol:'gray'},
  ]

  const propById = id => props.find(p=>p.id===id)

  return<div className="fade-up">
    {/* Sub-nav */}
    <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
      {[{id:'find',label:'Find tenants'},{id:'check',label:'Referencing services'},{id:'applicants',label:`Applicants (${applicants.length})`}].map(v=>
        <button key={v.id} onClick={()=>setView(v.id)} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:view===v.id?'var(--brand)':'var(--border)',background:view===v.id?'var(--brand-light)':'var(--surface)',color:view===v.id?'var(--brand)':'var(--text-2)'}}>{v.label}</button>
      )}
    </div>

    {/* ── FIND TENANTS ── */}
    {view==='find'&&<div>
      <div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.2)',borderRadius:12,padding:'14px 16px',marginBottom:18,fontSize:12,color:'var(--brand)',lineHeight:1.7}}>
        <strong>Lettly does not charge to advertise your property.</strong> We partner with the best tenant-finding platforms so you can list directly without using a letting agent. The platforms below are tried and tested by UK private landlords.
      </div>
      <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Where to advertise your property</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {FINDING_PLATFORMS.map(p=>{
          const tagStyles={green:{bg:'#eaf3de',col:'#27500A'},blue:{bg:'#E6F1FB',col:'#0C447C'},amber:{bg:'#FAEEDA',col:'#633806'},gray:{bg:'var(--surface2)',col:'var(--text-2)'}}
          const ts=tagStyles[p.tagCol]
          return<div key={p.name} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{p.name}</span>
                <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:ts.bg,color:ts.col}}>{p.tag}</span>
              </div>
              <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6,marginBottom:6}}>{p.desc}</div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>{p.price}</div>
            </div>
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer',textDecoration:'none',whiteSpace:'nowrap'}}>Visit site</a>
          </div>
        })}
      </div>
      <div style={{marginTop:20,background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'14px 16px',fontSize:12,color:'#633806',lineHeight:1.7}}>
        <strong>What letting agents do that these platforms also do:</strong> advertise on Rightmove and Zoopla, conduct viewings (if you pay for accompanied viewings on OpenRent), carry out referencing (available as an add-on on all platforms above), and prepare tenancy agreements. The main thing agents add is time: they manage enquiries and viewings on your behalf. If you have a local property and can do viewings yourself, you do not need an agent.
      </div>
    </div>}

    {/* ── REFERENCING SERVICES ── */}
    {view==='check'&&<div>
      <div style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:18,fontSize:12,color:'var(--text-2)',lineHeight:1.7}}>
        <strong style={{color:'var(--text)'}}>What a full reference check should cover:</strong> credit history, employment verification and income, previous landlord reference, Right to Rent check (England and Wales), CCJs and bankruptcy, and affordability (rent should not exceed 35-40% of gross monthly income). Under the Tenant Fees Act 2019 you cannot charge tenants for referencing: you must pay for it yourself.
      </div>
      <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Referencing services</div>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
        {REFERENCING_SERVICES.map(p=>{
          const tagStyles={green:{bg:'#eaf3de',col:'#27500A'},blue:{bg:'#E6F1FB',col:'#0C447C'},amber:{bg:'#FAEEDA',col:'#633806'},gray:{bg:'var(--surface2)',col:'var(--text-2)'}}
          const ts=tagStyles[p.tagCol]
          return<div key={p.name} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{p.name}</span>
                <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:ts.bg,color:ts.col}}>{p.tag}</span>
              </div>
              <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.6,marginBottom:6}}>{p.desc}</div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>{p.price}</div>
            </div>
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer',textDecoration:'none',whiteSpace:'nowrap'}}>Visit site</a>
          </div>
        })}
      </div>

      {/* Built-in affordability checker */}
      <AffordabilityChecker props={props}/>
    </div>}

    {/* ── APPLICANT TRACKER ── */}
    {view==='applicants'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <div style={{fontSize:13,fontWeight:500}}>Applicant tracker</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Track enquiries and applications through to tenancy</div>
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>+ Add applicant</button>
      </div>

      {showForm&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>New applicant</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 14px'}}>
          <div style={{marginBottom:14,gridColumn:'1/-1'}}><label style={lbl}>Property</label><select value={form.propId} onChange={e=>fset('propId',e.target.value)} style={inp}><option value="">Select property</option>{props.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Full name</label><input value={form.name} onChange={e=>fset('name',e.target.value)} placeholder="Applicant name" style={inp}/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Status</label><select value={form.status} onChange={e=>fset('status',e.target.value)} style={inp}><option>Enquiry</option><option>Applied</option><option>Referencing</option><option>Approved</option><option>Offer made</option><option>Tenancy signed</option><option>Rejected</option></select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Email</label><input value={form.email} onChange={e=>fset('email',e.target.value)} placeholder="email@example.com" style={inp}/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Phone</label><input value={form.phone} onChange={e=>fset('phone',e.target.value)} placeholder="07700 000000" style={inp}/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Employment type</label><select value={form.employmentType} onChange={e=>fset('employmentType',e.target.value)} style={inp}><option value="">Select</option><option>Employed full-time</option><option>Employed part-time</option><option>Self-employed</option><option>Contractor</option><option>Retired</option><option>Universal Credit</option><option>Student</option><option>Other</option></select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Gross monthly income (£)</label><input type="number" value={form.monthlyIncome} onChange={e=>fset('monthlyIncome',e.target.value)} placeholder="e.g. 3000" style={inp}/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Employer</label><input value={form.employer} onChange={e=>fset('employer',e.target.value)} placeholder="Employer name" style={inp}/></div>
          <div style={{marginBottom:14}}><label style={lbl}>Credit check result</label><select value={form.creditCheck} onChange={e=>fset('creditCheck',e.target.value)} style={inp}><option value="">Not yet done</option><option>Pass</option><option>Pass with conditions</option><option>Fail</option></select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Employer reference</label><select value={form.referenceEmployer} onChange={e=>fset('referenceEmployer',e.target.value)} style={inp}><option value="">Not yet done</option><option>Obtained: satisfactory</option><option>Obtained: unsatisfactory</option><option>Unable to obtain</option></select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Previous landlord reference</label><select value={form.referenceLandlord} onChange={e=>fset('referenceLandlord',e.target.value)} style={inp}><option value="">Not yet done</option><option>Obtained: satisfactory</option><option>Obtained: unsatisfactory</option><option>Unable to obtain</option><option>First-time renter</option></select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Right to Rent verified</label><select value={form.rightToRent} onChange={e=>fset('rightToRent',e.target.value)} style={inp}><option value="">Not yet checked</option><option>Verified: unlimited right</option><option>Verified: time limited</option><option>Failed</option><option>N/A (Scotland)</option></select></div>
          <div style={{marginBottom:14}}><label style={lbl}>Document type seen</label><select value={form.rightToRentDoc} onChange={e=>fset('rightToRentDoc',e.target.value)} style={inp}><option value="">Select</option><option>UK/Irish passport</option><option>UK birth certificate + NI</option><option>Biometric Residence Permit</option><option>Share code (online check)</option><option>EU Settlement Scheme</option><option>Visa/entry clearance</option></select></div>
          <div style={{marginBottom:14,display:'flex',gap:16,alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
              <input type="checkbox" checked={form.pets} onChange={e=>fset('pets',e.target.checked)} style={{width:14,height:14,accentColor:'var(--brand)'}}/> Has pets
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
              <input type="checkbox" checked={form.smoker} onChange={e=>fset('smoker',e.target.checked)} style={{width:14,height:14,accentColor:'var(--brand)'}}/> Smoker
            </label>
          </div>
          <div style={{marginBottom:14,gridColumn:'1/-1'}}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>fset('notes',e.target.value)} placeholder="Any additional notes about this applicant" rows={2} style={{...inp,resize:'vertical'}}/></div>
        </div>

        {/* Affordability indicator */}
        {form.monthlyIncome&&form.propId&&(()=>{
          const prop=props.find(p=>p.id===form.propId)
          const rent=Number(prop?.rent||0)
          const income=Number(form.monthlyIncome)
          if(!rent||!income)return null
          const ratio=Math.round((rent/income)*100)
          const ok=ratio<=35
          const warn=ratio>35&&ratio<=40
          return<div style={{gridColumn:'1/-1',marginBottom:14,padding:'10px 14px',borderRadius:9,background:ok?'var(--green-bg)':warn?'#fff8e1':'var(--red-bg)',border:`0.5px solid ${ok?'var(--green)':warn?'#EF9F27':'var(--red)'}`,fontSize:12,color:ok?'var(--green)':warn?'#633806':'var(--red)'}}>
            Affordability: rent is {ratio}% of gross monthly income. {ok?'Within the 35% guideline.':warn?'Above 35% guideline: consider a guarantor.':'Above 40%: high risk. Guarantor strongly recommended.'}
          </div>
        })()}

        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
          <button onClick={()=>setShowForm(false)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer',color:'var(--text-2)'}}>Cancel</button>
          <button onClick={saveApplicant} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>Save applicant</button>
        </div>
      </div>}

      {applicants.length===0
        ?<div style={{textAlign:'center',padding:'32px 0',fontSize:13,color:'var(--text-3)'}}>No applicants tracked yet. Use the platforms in "Find tenants" to advertise, then add enquiries here to track them through to tenancy.</div>
        :<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {applicants.map(a=>{
            const prop=propById(a.propId)
            const sc=statusColour[a.status]||statusColour['Enquiry']
            const rent=Number(prop?.rent||0)
            const income=Number(a.monthlyIncome||0)
            const ratio=rent&&income?Math.round((rent/income)*100):null
            const checks=[
              {label:'Credit',val:a.creditCheck},
              {label:'Employer ref',val:a.referenceEmployer},
              {label:'Landlord ref',val:a.referenceLandlord},
              {label:'Right to Rent',val:a.rightToRent},
            ]
            return<div key={a.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{a.name}</div>
                  <div style={{fontSize:11,color:'var(--text-3)'}}>{prop?.shortName||'No property'}{a.employmentType&&' · '+a.employmentType}{a.employer&&' at '+a.employer}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)} style={{fontSize:11,fontWeight:500,padding:'3px 8px',borderRadius:20,border:'none',background:sc.bg,color:sc.col,cursor:'pointer',outline:'none',fontFamily:'var(--font)'}}>
                    {Object.keys(statusColour).map(s=><option key={s}>{s}</option>)}
                  </select>
                  <button onClick={()=>deleteApplicant(a.id)} style={{color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',fontSize:16,lineHeight:1}}>x</button>
                </div>
              </div>

              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                {checks.map(ch=>{
                  const done=ch.val&&!ch.val.includes('Not yet')&&!ch.val.includes('Not yet')
                  const fail=ch.val?.toLowerCase().includes('fail')||ch.val?.toLowerCase().includes('unsatisfactory')
                  return<span key={ch.label} style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:!ch.val?'var(--surface2)':fail?'var(--red-bg)':done?'var(--green-bg)':'#fff8e1',color:!ch.val?'var(--text-3)':fail?'var(--red)':done?'var(--green)':'#633806'}}>
                    {ch.label}: {ch.val||'Pending'}
                  </span>
                })}
                {ratio&&<span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:ratio<=35?'var(--green-bg)':ratio<=40?'#fff8e1':'var(--red-bg)',color:ratio<=35?'var(--green)':ratio<=40?'#633806':'var(--red)'}}>Affordability: {ratio}%</span>}
                {a.pets&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:'var(--text-2)'}}>Pets</span>}
                {a.smoker&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:'var(--text-2)'}}>Smoker</span>}
              </div>

              {a.notes&&<div style={{fontSize:11,color:'var(--text-3)',fontStyle:'italic'}}>{a.notes}</div>}
              {(a.email||a.phone)&&<div style={{marginTop:8,fontSize:11,color:'var(--text-2)',display:'flex',gap:12}}>
                {a.email&&<a href={'mailto:'+a.email} style={{color:'var(--brand)',textDecoration:'none'}}>{a.email}</a>}
                {a.phone&&<a href={'tel:'+a.phone} style={{color:'var(--brand)',textDecoration:'none'}}>{a.phone}</a>}
              </div>}
            </div>
          })}
        </div>
      }

      <div style={{marginTop:16,background:'#fce8e6',border:'0.5px solid #E24B4A',borderRadius:10,padding:'12px 14px',fontSize:11,color:'#791F1F',lineHeight:1.7}}>
        <strong>Data protection note:</strong> Applicant information is personal data under UK GDPR. Store only what is necessary, delete records for unsuccessful applicants promptly, and ensure your privacy notice covers rental applicants. You must not discriminate on protected characteristics (race, sex, religion, disability, pregnancy, sexual orientation, gender reassignment, age, or marriage) when selecting tenants under the Equality Act 2010.
      </div>
    </div>}
  </div>
}

/* Affordability checker widget */
function AffordabilityChecker({props}){
  const[rent,setRent]=useState('')
  const[income,setIncome]=useState('')
  const ratio=rent&&income?((Number(rent)/Number(income))*100).toFixed(1):null
  const ok=ratio<=35
  const warn=ratio>35&&ratio<=40
  const inp2={background:'var(--surface)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none',width:'100%'}
  return<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
    <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Affordability calculator</div>
    <div style={{fontSize:12,color:'var(--text-3)',marginBottom:14}}>Rent should not exceed 35% of gross monthly income (40% is the absolute maximum most lenders accept)</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Monthly rent (£)</label>
        <input type="number" value={rent} onChange={e=>setRent(e.target.value)} placeholder="e.g. 850" style={inp2}/>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Gross monthly income (£)</label>
        <input type="number" value={income} onChange={e=>setIncome(e.target.value)} placeholder="e.g. 2800" style={inp2}/>
      </div>
    </div>
    {ratio&&<div style={{padding:'12px 14px',borderRadius:10,background:ok?'var(--green-bg)':warn?'#fff8e1':'var(--red-bg)',border:`0.5px solid ${ok?'var(--green)':warn?'#EF9F27':'var(--red)'}`,fontSize:13,color:ok?'var(--green)':warn?'#633806':'var(--red)',lineHeight:1.7}}>
      <div style={{fontWeight:600,marginBottom:4}}>Rent is {ratio}% of income</div>
      <div style={{fontSize:12}}>{ok?'Within the 35% affordability guideline. Applicant is likely to pass referencing.':warn?'Between 35-40%. Borderline: consider requesting a guarantor or additional income evidence.':'Above 40%. High risk of rent arrears. Guarantor strongly recommended. Most referencing services will flag this.'}</div>
    </div>}
  </div>
}


/* ================================================================
   EXPENSES PANEL
   ================================================================ */
function ExpensesPanel({portfolio,setPortfolio}){
  const props=portfolio.properties||[]
  const[expenses,setExpenses]=useState([])
  const[loading,setLoading]=useState(true)
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[form,setForm]=useState({category:'repairs_maintenance',amount:'',date:'',description:''})
  const[saving,setSaving]=useState(false)
  const[filterProp,setFilterProp]=useState('all')

  const HMRC_CATEGORIES=[
    {id:'repairs_maintenance',label:'Repairs & maintenance'},
    {id:'insurance',label:'Insurance premiums'},
    {id:'mortgage_interest',label:'Mortgage interest (Section 24)'},
    {id:'letting_agent',label:'Letting agent fees'},
    {id:'legal_professional',label:'Legal & professional fees'},
    {id:'ground_rent',label:'Ground rent & service charge'},
    {id:'utilities',label:'Utilities paid by landlord'},
    {id:'travel',label:'Travel to property'},
    {id:'advertising',label:'Advertising & tenant finding'},
    {id:'other',label:'Other allowable expense'},
  ]

  useEffect(()=>{
    fetch('/api/expenses').then(r=>r.json()).then(d=>setExpenses(d.expenses||[])).finally(()=>setLoading(false))
  },[])

  async function addExpense(){
    if(!form.amount||!selProp) return
    setSaving(true)
    try{
      const r=await fetch('/api/expenses',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({propId:selProp,category:form.category,amount:parseFloat(form.amount),date:form.date||new Date().toISOString().split('T')[0],description:form.description})})
      const d=await r.json()
      if(d.expense) setExpenses(prev=>[d.expense,...prev])
      setForm({category:'repairs_maintenance',amount:'',date:'',description:''})
    }catch(e){alert('Could not save expense')}
    setSaving(false)
  }

  async function deleteExpense(id){
    if(!confirm('Delete this expense?')) return
    await fetch('/api/expenses',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setExpenses(prev=>prev.filter(e=>e.id!==id))
  }

  const filtered=filterProp==='all'?expenses:expenses.filter(e=>e.prop_id===filterProp)
  const total=filtered.reduce((s,e)=>s+Number(e.amount),0)
  const byCategory={}
  filtered.forEach(e=>{byCategory[e.category]=(byCategory[e.category]||0)+Number(e.amount)})
  const catLabel=id=>HMRC_CATEGORIES.find(c=>c.id===id)?.label||id
  const propName=id=>props.find(p=>p.id===id)?.shortName||id

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Expense tracker</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>HMRC allowable expenses by property. Used for tax year export and MTD submissions.</div>
    </div>
    {/* Add expense form */}
    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:500,marginBottom:12}}>Add expense</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}>
          {props.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}
        </select>
        <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}>
          {HMRC_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input type="number" placeholder="Amount £" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}/>
        <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}/>
      </div>
      <input placeholder="Description (optional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',marginBottom:8,boxSizing:'border-box'}}/>
      <button onClick={addExpense} disabled={saving||!form.amount} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:500,cursor:saving||!form.amount?'not-allowed':'pointer',opacity:saving||!form.amount?0.6:1}}>
        {saving?'Saving...':'Add expense'}
      </button>
    </div>
    {/* Summary */}
    {filtered.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginBottom:16}}>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
        <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>Total expenses</div>
        <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--mono)',color:'var(--red)'}}>-£{total.toLocaleString('en-GB',{maximumFractionDigits:0})}</div>
      </div>
      {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([cat,amt])=><div key={cat} style={{background:'var(--surface2)',borderRadius:10,padding:'12px 14px'}}>
        <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>{catLabel(cat)}</div>
        <div style={{fontSize:16,fontWeight:500,fontFamily:'var(--mono)'}}>£{Number(amt).toLocaleString('en-GB',{maximumFractionDigits:0})}</div>
      </div>)}
    </div>}
    {/* Filter + list */}
    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
      <button onClick={()=>setFilterProp('all')} style={{padding:'4px 12px',borderRadius:20,fontSize:11,border:'0.5px solid',borderColor:filterProp==='all'?'var(--brand)':'var(--border)',background:filterProp==='all'?'var(--brand-light)':'var(--surface)',color:filterProp==='all'?'var(--brand)':'var(--text-2)',cursor:'pointer'}}>All</button>
      {props.map(p=><button key={p.id} onClick={()=>setFilterProp(p.id)} style={{padding:'4px 12px',borderRadius:20,fontSize:11,border:'0.5px solid',borderColor:filterProp===p.id?'var(--brand)':'var(--border)',background:filterProp===p.id?'var(--brand-light)':'var(--surface)',color:filterProp===p.id?'var(--brand)':'var(--text-2)',cursor:'pointer'}}>{p.shortName}</button>)}
    </div>
    {loading?<div style={{fontSize:12,color:'var(--text-3)',padding:'20px 0',textAlign:'center'}}>Loading...</div>
    :filtered.length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'20px 0',textAlign:'center'}}>No expenses yet. Add your first above.</div>
    :<div style={{display:'flex',flexDirection:'column',gap:7}}>
      {filtered.map(e=><div key={e.id} style={{display:'flex',alignItems:'center',gap:12,background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:10,padding:'10px 14px'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:500}}>{catLabel(e.category)}</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>{propName(e.prop_id)} {e.date&&' · '+new Date(e.date).toLocaleDateString('en-GB')} {e.description&&' · '+e.description}</div>
        </div>
        <div style={{fontSize:14,fontWeight:600,fontFamily:'var(--mono)',color:'var(--red)',flexShrink:0}}>-£{Number(e.amount).toLocaleString('en-GB',{maximumFractionDigits:0})}</div>
        <button onClick={()=>deleteExpense(e.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:16,padding:'0 4px',flexShrink:0}}>x</button>
      </div>)}
    </div>}
  </div>
}

/* ================================================================
   DEAL ANALYSER
   ================================================================ */
function DealAnalyser({props}){
  const[price,setPrice]=useState('')
  const[rent,setRent]=useState('')
  const[deposit,setDeposit]=useState(25)
  const[rate,setRate]=useState(5.0)
  const[term,setTerm]=useState(25)
  const[costs,setCosts]=useState(3000)

  const p=Number(price)||0
  const r=Number(rent)||0
  const dep=p*(Number(deposit)/100)
  const loan=p-dep
  const monthlyRate=Number(rate)/100/12
  const payments=Number(term)*12
  const monthlyMortgage=loan>0&&monthlyRate>0?loan*(monthlyRate*Math.pow(1+monthlyRate,payments))/(Math.pow(1+monthlyRate,payments)-1):0
  const grossYield=p>0&&r>0?((r*12)/p*100):0
  const netYield=p>0&&r>0?(((r*12)-(monthlyMortgage*12))/p*100):0
  const monthlyCashflow=r-monthlyMortgage
  const sdlt=p<=250000?0:p<=925000?(p-250000)*0.03:p<=1500000?20250+(p-925000)*0.08:66250+(p-1500000)*0.13
  const totalCosts=dep+sdlt+Number(costs)
  const annualReturn=monthlyCashflow*12
  const roi=totalCosts>0?(annualReturn/totalCosts*100):0

  function Row({label,value,color}){return<div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid var(--border)'}}>
    <span style={{fontSize:12,color:'var(--text-2)'}}>{label}</span>
    <span style={{fontSize:12,fontWeight:500,color:color||'var(--text)',fontFamily:'var(--mono)'}}>{value}</span>
  </div>}

  const fmt=n=>'£'+Math.round(n).toLocaleString('en-GB')
  const pct=n=>n.toFixed(1)+'%'
  const good=monthlyCashflow>0?'var(--green)':'var(--red)'

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Deal analyser</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>Enter a purchase price and expected rent. See yield, cashflow, SDLT and ROI before you buy.</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {/* Inputs */}
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
        <div style={{fontSize:12,fontWeight:500,marginBottom:12}}>Property details</div>
        {[
          {label:'Purchase price',value:price,set:setPrice,placeholder:'e.g. 150000'},
          {label:'Expected monthly rent',value:rent,set:setRent,placeholder:'e.g. 850'},
          {label:'Other purchase costs (surveys, legal)',value:costs,set:setCosts,placeholder:'e.g. 3000'},
        ].map(f=><div key={f.label} style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>{f.label}</div>
          <input type="number" value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',boxSizing:'border-box'}}/>
        </div>)}
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-3)',marginBottom:4}}><span>Deposit</span><span style={{fontWeight:500,color:'var(--text)'}}>{deposit}% = {price?fmt(dep):'£0'}</span></div>
          <input type="range" min="15" max="40" step="5" value={deposit} onChange={e=>setDeposit(Number(e.target.value))} style={{width:'100%'}}/>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-3)',marginBottom:4}}><span>Interest rate</span><span style={{fontWeight:500,color:'var(--text)'}}>{rate}%</span></div>
          <input type="range" min="3" max="9" step="0.1" value={rate} onChange={e=>setRate(Number(e.target.value))} style={{width:'100%'}}/>
        </div>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-3)',marginBottom:4}}><span>Mortgage term</span><span style={{fontWeight:500,color:'var(--text)'}}>{term} years</span></div>
          <input type="range" min="10" max="35" step="5" value={term} onChange={e=>setTerm(Number(e.target.value))} style={{width:'100%'}}/>
        </div>
      </div>
      {/* Results */}
      <div>
        <div style={{background:monthlyCashflow>0?'var(--green-bg)':'var(--red-bg)',border:'0.5px solid '+(monthlyCashflow>0?'var(--green)':'var(--red)'),borderRadius:14,padding:16,marginBottom:10,textAlign:'center'}}>
          <div style={{fontSize:11,color:good,marginBottom:4}}>Monthly cashflow</div>
          <div style={{fontSize:32,fontWeight:600,fontFamily:'var(--mono)',color:good}}>{price&&rent?fmt(monthlyCashflow):'-'}</div>
          <div style={{fontSize:11,color:good}}>after {price&&rent?fmt(monthlyMortgage):'-'}/mo mortgage</div>
        </div>
        <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:14}}>
          <Row label="Gross yield" value={price&&rent?pct(grossYield):'-'} color={grossYield>=6?'var(--green)':grossYield>=4?'var(--amber)':'var(--red)'}/>
          <Row label="Net yield (after mortgage)" value={price&&rent?pct(netYield):'-'} color={netYield>=3?'var(--green)':netYield>=1?'var(--amber)':'var(--red)'}/>
          <Row label="Annual return" value={price&&rent?fmt(annualReturn):'-'}/>
          <Row label="ROI on cash in" value={price&&rent?pct(roi):'-'} color={roi>=8?'var(--green)':roi>=4?'var(--amber)':'var(--red)'}/>
          <Row label="SDLT (buy-to-let surcharge)" value={price?fmt(sdlt):'-'}/>
          <Row label="Total cash required" value={price?fmt(totalCosts):'-'}/>
          <Row label="Loan to value" value={deposit+'% deposit / '+(100-deposit)+'% LTV'}/>
        </div>
        <div style={{fontSize:11,color:'var(--text-3)',marginTop:8,lineHeight:1.6}}>SDLT includes the 3% buy-to-let surcharge. Does not include running costs (insurance, repairs, void periods) which typically reduce net yield by 1-2%. Not financial advice.</div>
      </div>
    </div>
  </div>
}

/* ================================================================
   CGT PLANNER
   ================================================================ */
function CGTPlanner({props}){
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[salePrice,setSalePrice]=useState('')
  const[purchasePrice,setPurchasePrice]=useState('')
  const[purchaseCosts,setPurchaseCosts]=useState(3000)
  const[improvements,setImprovements]=useState(0)
  const[saleCosts,setSaleCosts]=useState(3000)
  const[yearsOwned,setYearsOwned]=useState(5)
  const[higherRate,setHigherRate]=useState(true)

  const sp=Number(salePrice)||0
  const pp=Number(purchasePrice)||0
  const gain=sp-pp-Number(purchaseCosts)-Number(improvements)-Number(saleCosts)
  const annualAllowance=3000
  const taxableGain=Math.max(0,gain-annualAllowance)
  const cgtRate=higherRate?0.24:0.18
  const cgtDue=taxableGain*cgtRate
  const netProceeds=sp-Number(saleCosts)-(pp+Number(purchaseCosts)+Number(improvements))-cgtDue

  const fmt=n=>'£'+Math.round(Math.max(0,n)).toLocaleString('en-GB')
  function Row({label,value,bold,color}){return<div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)'}}>
    <span style={{fontSize:12,color:bold?'var(--text)':'var(--text-2)',fontWeight:bold?500:400}}>{label}</span>
    <span style={{fontSize:12,fontWeight:bold?600:500,color:color||'var(--text)',fontFamily:'var(--mono)'}}>{value}</span>
  </div>}

  const selectedProp=props.find(p=>p.id===selProp)
  if(selectedProp?.purchasePrice&&!purchasePrice) setPurchasePrice(selectedProp.purchasePrice)

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>CGT planner</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>Estimate capital gains tax on disposal. Includes the annual allowance and 2024/25 CGT rates.</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
        <div style={{fontSize:12,fontWeight:500,marginBottom:12}}>Property details</div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>Property</div>
          <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}>
            {props.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}
          </select>
        </div>
        {[
          {label:'Expected sale price',value:salePrice,set:setSalePrice},
          {label:'Original purchase price',value:purchasePrice,set:setPurchasePrice},
          {label:'Purchase costs (SDLT, legal)',value:purchaseCosts,set:setPurchaseCosts},
          {label:'Capital improvements (extensions, renovations)',value:improvements,set:setImprovements},
          {label:'Sale costs (agent fees, legal)',value:saleCosts,set:setSaleCosts},
        ].map(f=><div key={f.label} style={{marginBottom:8}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:3}}>{f.label}</div>
          <input type="number" value={f.value} onChange={e=>f.set(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',boxSizing:'border-box'}}/>
        </div>)}
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
          <input type="checkbox" id="higherRate" checked={higherRate} onChange={e=>setHigherRate(e.target.checked)}/>
          <label htmlFor="higherRate" style={{fontSize:12,color:'var(--text-2)'}}>Higher rate taxpayer (24% CGT rate)</label>
        </div>
      </div>
      <div>
        <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:14,marginBottom:10}}>
          <Row label="Sale price" value={fmt(sp)}/>
          <Row label="Less: purchase price" value={'-'+fmt(pp)}/>
          <Row label="Less: purchase costs" value={'-'+fmt(purchaseCosts)}/>
          <Row label="Less: improvements" value={'-'+fmt(improvements)}/>
          <Row label="Less: sale costs" value={'-'+fmt(saleCosts)}/>
          <Row label="Total gain" value={fmt(gain)} bold/>
          <Row label="Less: annual CGT allowance" value={'-'+fmt(annualAllowance)}/>
          <Row label="Taxable gain" value={fmt(taxableGain)}/>
          <Row label={'CGT at '+(higherRate?'24':'18')+'%'} value={fmt(cgtDue)} color="var(--red)"/>
        </div>
        <div style={{background:gain>0?'var(--green-bg)':'var(--surface2)',border:'0.5px solid '+(gain>0?'var(--green)':'var(--border)'),borderRadius:14,padding:16,textAlign:'center',marginBottom:8}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>Net proceeds after CGT</div>
          <div style={{fontSize:28,fontWeight:600,fontFamily:'var(--mono)',color:gain>0?'var(--green)':'var(--text)'}}>{fmt(netProceeds)}</div>
        </div>
        <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.6,padding:'8px 12px',background:'var(--surface2)',borderRadius:8}}>
          Based on 2024/25 CGT rates: 18% basic rate, 24% higher rate for residential property. Does not account for Private Residence Relief, Lettings Relief, or other reliefs. Consult an accountant before selling. Not financial advice.
        </div>
      </div>
    </div>
  </div>
}

/* ================================================================
   LTD VS PERSONAL
   ================================================================ */
function LtdVsPersonal({portfolio}){
  const[rent,setRent]=useState(portfolio.properties?.reduce((s,p)=>s+(Number(p.rent)||0),0)||2000)
  const[mortgage,setMortgage]=useState(portfolio.properties?.reduce((s,p)=>s+(Number(p.monthlyPayment)||0),0)||800)
  const[expenses,setExpenses]=useState(200)
  const[taxBand,setTaxBand]=useState('higher')
  const[salary,setSalary]=useState(50000)
  const[extracting,setExtracting]=useState(true)

  const annualRent=Number(rent)*12
  const annualMortgage=Number(mortgage)*12
  const annualExpenses=Number(expenses)*12
  const annualSalary=Number(salary)

  // Personal ownership
  const mortgageInterestPersonal=annualMortgage
  const personalProfit=annualRent-annualExpenses
  const sec24Credit=mortgageInterestPersonal*0.20
  const personalTax=taxBand==='higher'?personalProfit*0.40:personalProfit*0.20
  const personalNetAfterTax=personalProfit-personalTax+sec24Credit

  // Ltd company
  const ltdProfit=annualRent-annualMortgage-annualExpenses
  const corpTax=ltdProfit>0?ltdProfit*0.19:0
  const ltdProfitAfterTax=ltdProfit-corpTax
  const dividendAllowance=500
  const dividendTaxable=Math.max(0,ltdProfitAfterTax-dividendAllowance)
  const dividendTax=extracting?(taxBand==='higher'?dividendTaxable*0.3375:dividendTaxable*0.0875):0
  const ltdNetAfterTax=ltdProfitAfterTax-dividendTax

  const saving=ltdNetAfterTax-personalNetAfterTax
  const fmt=n=>'£'+Math.round(Math.abs(n)).toLocaleString('en-GB')

  function Row({label,value,color,bold}){return<div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid var(--border)'}}>
    <span style={{fontSize:12,color:bold?'var(--text)':'var(--text-2)',fontWeight:bold?500:400}}>{label}</span>
    <span style={{fontSize:12,fontWeight:bold?600:500,color:color||'var(--text)',fontFamily:'var(--mono)'}}>{value}</span>
  </div>}

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Ltd company vs personal ownership</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>Should you incorporate? Model both scenarios side by side including Section 24 and corporation tax.</div>
    </div>
    {/* Inputs */}
    <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:14,marginBottom:16}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
        {[
          {label:'Total monthly rent',value:rent,set:setRent},
          {label:'Total monthly mortgage payments',value:mortgage,set:setMortgage},
          {label:'Monthly expenses (insurance, repairs, etc.)',value:expenses,set:setExpenses},
          {label:'Your other employment income',value:salary,set:setSalary},
        ].map(f=><div key={f.label}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:3}}>{f.label}</div>
          <input type="number" value={f.value} onChange={e=>f.set(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)',boxSizing:'border-box'}}/>
        </div>)}
        <div>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:3}}>Tax band</div>
          <select value={taxBand} onChange={e=>setTaxBand(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}>
            <option value="basic">Basic rate (20%)</option>
            <option value="higher">Higher rate (40%)</option>
          </select>
        </div>
        <div>
          <div style={{fontSize:12,color:'var(--text-3)',marginBottom:6}}>Extract as dividends?</div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',background:'var(--surface2)',padding:'8px 10px',borderRadius:8,border:'0.5px solid var(--border-strong)'}}>
            <input type="checkbox" checked={extracting} onChange={e=>setExtracting(e.target.checked)} style={{accentColor:'var(--brand)',width:14,height:14}}/>
            <span style={{fontSize:12,color:'var(--text-2)'}}>{extracting?'Yes, paying dividends':'No, retaining profit'}</span>
          </label>
        </div>
      </div>
    </div>
    {/* Comparison */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:500,marginBottom:10,color:'var(--text)'}}>Personal ownership</div>
        <Row label="Annual rental income" value={fmt(annualRent)}/>
        <Row label="Allowable expenses" value={'-'+fmt(annualExpenses)}/>
        <Row label="Taxable profit" value={fmt(personalProfit)}/>
        <Row label={'Income tax ('+(taxBand==='higher'?'40':'20')+'%)'} value={'-'+fmt(personalTax)} color="var(--red)"/>
        <Row label="Section 24 tax credit (20%)" value={'+'+fmt(sec24Credit)} color="var(--green)"/>
        <Row label="Net after tax" value={fmt(personalNetAfterTax)} bold color="var(--text)"/>
      </div>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--brand)',borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:500,marginBottom:10,color:'var(--brand)'}}>Ltd company</div>
        <Row label="Annual rental income" value={fmt(annualRent)}/>
        <Row label="Mortgage interest (fully deductible)" value={'-'+fmt(annualMortgage)}/>
        <Row label="Allowable expenses" value={'-'+fmt(annualExpenses)}/>
        <Row label="Corporation tax (19%)" value={'-'+fmt(corpTax)} color="var(--red)"/>
        {extracting&&<Row label="Dividend tax on extraction" value={'-'+fmt(dividendTax)} color="var(--red)"/>}
        <Row label="Net after all tax" value={fmt(ltdNetAfterTax)} bold color="var(--brand)"/>
      </div>
    </div>
    <div style={{background:saving>0?'var(--green-bg)':'var(--red-bg)',border:'0.5px solid '+(saving>0?'var(--green)':'var(--red)'),borderRadius:12,padding:'14px 16px',textAlign:'center',marginBottom:8}}>
      <div style={{fontSize:13,fontWeight:500,color:saving>0?'var(--green)':'var(--red)'}}>
        {saving>0?'Ltd company saves you '+fmt(saving)+' per year':'Personal ownership saves you '+fmt(Math.abs(saving))+' per year'}
      </div>
    </div>
    <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.6,padding:'8px 12px',background:'var(--surface2)',borderRadius:8}}>
      Simplified model. Assumes all Ltd profit is extracted as dividends each year (worst case for Ltd). Corporation tax applies regardless. Does not include: CGT on incorporation transfer, loss of mortgage relief (lenders often charge higher rates for Ltd companies), accountancy costs (approx. £800-1,500/yr for Ltd), or all personal tax implications. Always take professional advice before incorporating. Not financial or tax advice.
    </div>
  </div>
}

/* ================================================================
   CONTRACTOR DIRECTORY
   ================================================================ */
function ContractorDirectory({portfolio}){
  const props=portfolio.properties||[]
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[category,setCategory]=useState('gas')
  const prop=props.find(p=>p.id===selProp)
  const postcode=prop?.address?.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i)?.[0]||''

  const CATEGORIES=[
    {id:'gas',label:'Gas Safe engineer (gas cert)',search:'gas safe engineer'},
    {id:'electrical',label:'Electrician (EICR)',search:'electrician EICR domestic'},
    {id:'epc',label:'EPC assessor',search:'EPC energy performance certificate assessor'},
    {id:'plumber',label:'Plumber',search:'plumber emergency'},
    {id:'roofing',label:'Roofer',search:'roofing contractor'},
    {id:'general',label:'General builder / handyman',search:'general builder handyman'},
    {id:'locksmith',label:'Locksmith',search:'locksmith emergency'},
    {id:'inventory',label:'Inventory clerk',search:'inventory clerk lettings'},
  ]

  const cat=CATEGORIES.find(c=>c.id===category)
  const searchQuery=cat?encodeURIComponent(cat.search+' '+postcode):''
  const checkatradeUrl='https://www.checkatrade.com/search?search='+searchQuery
  const ratedUrl='https://www.ratedpeople.com/find-tradespeople?q='+searchQuery
  const findATradeUrl='https://www.findatrade.com/search?q='+encodeURIComponent((cat?.search||'')+' '+postcode)
  const gasSafeUrl='https://www.gassaferegister.co.uk/find-an-engineer/'
  const neieUrl='https://www.napit.org.uk/find-a-member'

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Find a contractor</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>Find Gas Safe engineers, electricians, EPC assessors and other trades near your properties.</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
      <div>
        <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>Property (to get local results)</div>
        <select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}>
          {props.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}
        </select>
      </div>
      <div>
        <div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>What do you need?</div>
        <select value={category} onChange={e=>setCategory(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--font)',fontSize:12,color:'var(--text)'}}>
          {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
    </div>
    {postcode&&<div style={{fontSize:12,color:'var(--brand)',fontWeight:500,marginBottom:12}}>Searching near: {postcode}</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginBottom:16}}>
      {[
        {name:'Gas Safe Register',desc:'Official register for gas engineers. Use for gas certs.',url:gasSafeUrl,badge:'Official',color:'var(--brand)'},
        {name:'NAPIT / NICEIC',desc:'Find certified electricians for EICR work.',url:neieUrl,badge:'Official',color:'var(--brand)'},
        {name:'Checkatrade',desc:'Vetted tradespeople with reviews. Pre-searched for your area.',url:checkatradeUrl,badge:'Vetted',color:'var(--amber)'},
        {name:'Rated People',desc:'Get multiple quotes from local trades.',url:ratedUrl,badge:'Quotes',color:'#0C447C'},
      ].map(s=><a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',textDecoration:'none',display:'block',transition:'all 0.15s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
          <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{s.name}</div>
          <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:s.color,fontWeight:500}}>{s.badge}</span>
        </div>
        <div style={{fontSize:12,color:'var(--text-3)',lineHeight:1.5}}>{s.desc}</div>
        <div style={{fontSize:11,color:'var(--brand)',marginTop:8}}>Search now →</div>
      </a>)}
    </div>
    <div style={{background:'var(--surface2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--text-3)',lineHeight:1.7}}>
      Always verify Gas Safe registration numbers at gassaferegister.co.uk before any gas work. Keep copies of all contractor certificates in Lettly by dropping them in the property document zone.
    </div>
  </div>
}

/* ================================================================
   REFERRAL PANEL
   ================================================================ */
function ReferralPanel(){
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(true)
  const[redeemCode,setRedeemCode]=useState('')
  const[redeemMsg,setRedeemMsg]=useState('')
  const[copied,setCopied]=useState(false)

  useEffect(()=>{
    fetch('/api/referral').then(r=>r.json()).then(d=>setData(d)).finally(()=>setLoading(false))
  },[])

  async function redeem(){
    if(!redeemCode.trim()) return
    const r=await fetch('/api/referral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:redeemCode.trim().toUpperCase()})})
    const d=await r.json()
    setRedeemMsg(d.message||d.error||'Something went wrong')
  }

  const link=data?.code?'https://lettly.co/?ref='+data.code:''

  function copy(){navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),2000)}

  return<div className="fade-up">
    <div style={{marginBottom:18}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>Refer and earn</div>
      <div style={{fontSize:12,color:'var(--text-3)'}}>Share Lettly with fellow landlords. Both of you get a free month when they sign up and start a subscription.</div>
    </div>
    {loading?<div style={{fontSize:12,color:'var(--text-3)',padding:'20px 0',textAlign:'center'}}>Loading...</div>:<>
      {/* Your code */}
      <div style={{background:'var(--brand-subtle)',border:'1px solid var(--brand)',borderRadius:14,padding:'20px 24px',marginBottom:16,textAlign:'center'}}>
        <div style={{fontSize:12,color:'var(--brand)',marginBottom:8,fontWeight:500}}>Your referral link</div>
        <div style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:600,color:'var(--brand)',marginBottom:12,wordBreak:'break-all'}}>{link||'Generating...'}</div>
        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={copy} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 20px',fontSize:12,fontWeight:500,cursor:'pointer'}}>
            {copied?'Copied!':'Copy link'}
          </button>
          {typeof navigator!=='undefined'&&navigator.share&&<button onClick={()=>navigator.share({title:'Lettly',text:'Manage your rental properties without a letting agent. Use my link for a free month:',url:link})} style={{background:'var(--surface)',color:'var(--brand)',border:'0.5px solid var(--brand)',borderRadius:8,padding:'8px 20px',fontSize:12,cursor:'pointer'}}>Share</button>}
        </div>
      </div>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:600,color:'var(--brand)',fontFamily:'var(--mono)'}}>{data?.uses||0}</div>
          <div style={{fontSize:12,color:'var(--text-3)'}}>Landlords referred</div>
        </div>
        <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:600,color:'var(--green)',fontFamily:'var(--mono)'}}>{data?.credits||0}</div>
          <div style={{fontSize:12,color:'var(--text-3)'}}>Free months earned</div>
        </div>
      </div>
      {/* Redeem a code */}
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
        <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>Have a referral code?</div>
        <div style={{display:'flex',gap:8}}>
          <input value={redeemCode} onChange={e=>setRedeemCode(e.target.value.toUpperCase())} placeholder="e.g. LETTLY-AB12CD" style={{flex:1,background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 10px',fontFamily:'var(--mono)',fontSize:12,color:'var(--text)'}}/>
          <button onClick={redeem} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,cursor:'pointer'}}>Apply</button>
        </div>
        {redeemMsg&&<div style={{fontSize:12,color:redeemMsg.includes('error')||redeemMsg.includes('Invalid')?'var(--red)':'var(--green)',marginTop:8}}>{redeemMsg}</div>}
      </div>
    </>}
  </div>
}


/* ================================================================
   HMO TAB, Full HMO management dashboard
   Shows only when portfolio has at least one HMO property
   ================================================================ */

/* ================================================================
   INVOICING TAB
   ================================================================ */
function InvoicingTab({portfolio}){
  const props=portfolio.properties||[]
  const[invoices,setInvoices]=useState([])
  const[loading,setLoading]=useState(true)
  const[view,setView]=useState('list') // list | create | preview
  const[invType,setInvType]=useState('rent')
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[preview,setPreview]=useState(null)
  const[previewNum,setPreviewNum]=useState('')
  const[sending,setSending]=useState(false)
  const[filterStatus,setFilterStatus]=useState('all')

  // Landlord settings (pulled from portfolio)
  const[landlord,setLandlord]=useState({
    name:portfolio.landlordName||'',
    address:portfolio.landlordAddress||'',
    email:portfolio.landlordEmail||portfolio.contactEmail||'',
    phone:portfolio.landlordPhone||'',
    utr:portfolio.utr||'',
    company:portfolio.company||'',
    bankDetails:portfolio.bankDetails||'',
    vatNumber:portfolio.vatNumber||'',
  })

  const prop=props.find(p=>p.id===selProp)||props[0]

  // Invoice form state
  const today=new Date().toISOString().split('T')[0]
  const nextMonth=new Date(new Date().setMonth(new Date().getMonth()+1)).toISOString().split('T')[0]

  const defaultItems={
    rent:[{description:'Monthly rent',qty:1,unitPrice:prop?.rent||'',amount:prop?.rent||''}],
    contractor:[{description:'',qty:1,unitPrice:'',amount:''}],
    expense:[{description:'',qty:1,unitPrice:'',amount:''}],
  }

  const[form,setForm]=useState({
    type:'rent',
    recipientName:prop?.tenantName||'',
    recipientEmail:prop?.tenantEmail||'',
    recipientAddress:'',
    date:today,
    dueDate:nextMonth,
    period:'',
    paymentTerms:'Payment due within 14 days of invoice date',
    bankDetails:portfolio.bankDetails||'',
    vatRate:'',
    notes:'',
    items:defaultItems.rent,
  })

  useEffect(()=>{
    fetch('/api/invoices').then(r=>r.json()).then(d=>setInvoices(d.invoices||[])).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{
    if(prop){
      setForm(f=>({...f,
        recipientName:invType==='rent'?prop.tenantName||'':f.recipientName,
        recipientEmail:invType==='rent'?prop.tenantEmail||'':f.recipientEmail,
        items:defaultItems[invType]||f.items,
      }))
    }
  },[selProp,invType])

  function setItem(idx,field,val){
    setForm(f=>{
      const items=[...f.items]
      items[idx]={...items[idx],[field]:val}
      // Auto-calc amount from qty * unitPrice
      if(field==='qty'||field==='unitPrice'){
        const q=Number(field==='qty'?val:items[idx].qty)||1
        const u=Number(field==='unitPrice'?val:items[idx].unitPrice)||0
        items[idx].amount=String(q*u)
      }
      if(field==='amount'){items[idx].unitPrice=val}
      return{...f,items}
    })
  }

  function addItem(){setForm(f=>({...f,items:[...f.items,{description:'',qty:1,unitPrice:'',amount:''}]}))}
  function removeItem(idx){setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))}

  const totalNet=form.items.reduce((s,i)=>s+(Number(i.amount)||0),0)
  const vatAmt=form.vatRate?totalNet*(Number(form.vatRate)/100):0
  const totalGross=totalNet+vatAmt
  const fmt=n=>'£'+Number(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})

  async function handlePreview(){
    setSending(true)
    const res=await fetch('/api/invoices',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'preview',invoice:{...form,type:invType,propId:selProp},landlord,property:prop})})
    const d=await res.json()
    setPreview(d.html)
    setPreviewNum(d.invoiceNumber)
    setView('preview')
    setSending(false)
  }

  async function handleSend(action){
    setSending(true)
    const res=await fetch('/api/invoices',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,invoice:{...form,type:invType,propId:selProp},landlord,property:prop})})
    const d=await res.json()
    if(d.invoiceNumber){
      setInvoices(prev=>[d.invoice,...prev])
      if(d.html){setPreview(d.html);setPreviewNum(d.invoiceNumber);setView('preview')}
      else{setView('list')}
    }
    setSending(false)
  }

  async function markPaid(id){
    await fetch('/api/invoices',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'paid'})})
    setInvoices(prev=>prev.map(inv=>inv.id===id?{...inv,status:'paid'}:inv))
  }

  async function deleteInv(id){
    if(!confirm('Delete this invoice?')) return
    await fetch('/api/invoices',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setInvoices(prev=>prev.filter(inv=>inv.id!==id))
  }

  function StatusPill({status}){
    const colors={draft:['var(--text-3)','var(--surface2)'],sent:['#0C447C','#E6F1FB'],paid:['var(--green)','var(--green-bg)'],overdue:['var(--red)','#fce8e6']}
    const[fg,bg]=colors[status]||colors.draft
    return<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:600,color:fg,background:bg,textTransform:'uppercase',letterSpacing:'0.5px'}}>{status||'draft'}</span>
  }

  function IInput({label,value,onChange,placeholder,type,span}){
    return<div style={{marginBottom:12,gridColumn:span?'1/-1':''}}>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4,fontWeight:500}}>{label}</div>
      <input type={type||'text'} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||''}
        style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'9px 12px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',boxSizing:'border-box'}}/>
    </div>
  }

  function ITextarea({label,value,onChange,placeholder,rows}){
    return<div style={{marginBottom:12}}>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4,fontWeight:500}}>{label}</div>
      <textarea value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||''} rows={rows||3}
        style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'9px 12px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',boxSizing:'border-box',resize:'vertical'}}/>
    </div>
  }

  const filtered=filterStatus==='all'?invoices:invoices.filter(i=>i.status===filterStatus)
  const totalUnpaid=invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+(Number(i.amount)||0),0)
  const totalPaid=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(Number(i.amount)||0),0)

  return<div className="fade-up">
    {/* ── PREVIEW MODE ── */}
    {view==='preview'&&preview&&<div>
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={()=>setView('create')} style={{background:'var(--surface2)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 14px',fontSize:13,cursor:'pointer'}}>
          Back to edit
        </button>
        <button onClick={()=>{const w=window.open('','_blank');w.document.write(preview);w.document.close();setTimeout(()=>w.print(),500)}}
          style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          Download PDF
        </button>
        <button onClick={()=>handleSend('send')} disabled={!form.recipientEmail||sending}
          style={{background:'#0C447C',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:13,fontWeight:500,cursor:'pointer',opacity:!form.recipientEmail||sending?0.6:1}}>
          {sending?'Sending...':'Send by email'}
        </button>
        <button onClick={()=>handleSend('save')} disabled={sending}
          style={{background:'var(--surface)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 14px',fontSize:13,cursor:'pointer'}}>
          Save as draft
        </button>
        <span style={{fontSize:12,color:'var(--text-3)',marginLeft:4}}>{previewNum}</span>
      </div>
      <div style={{border:'0.5px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <iframe srcDoc={preview} style={{width:'100%',height:700,border:'none'}} title="Invoice preview"/>
      </div>
    </div>}

    {/* ── CREATE MODE ── */}
    {view==='create'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>New invoice</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Fill in details below then preview before sending</div>
        </div>
        <button onClick={()=>setView('list')} style={{background:'var(--surface2)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'}}>
          Cancel
        </button>
      </div>

      {/* Invoice type */}
      <div style={{display:'flex',gap:6,marginBottom:20}}>
        {[['rent','Rent invoice'],['contractor','Contractor invoice'],['expense','Expense receipt']].map(([id,label])=>(
          <button key={id} onClick={()=>setInvType(id)}
            style={{padding:'8px 16px',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',border:'0.5px solid',
              borderColor:invType===id?'var(--brand)':'var(--border)',
              background:invType===id?'var(--brand)':'var(--surface)',
              color:invType===id?'#fff':'var(--text-2)'}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* Left: invoice details */}
        <div>
          <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Property</div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4,fontWeight:500}}>Property</div>
              <select value={selProp} onChange={e=>setSelProp(e.target.value)}
                style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'9px 12px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)'}}>
                {props.map(p=><option key={p.id} value={p.id}>{p.shortName}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
              <IInput label="Invoice date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
              <IInput label="Due date" value={form.dueDate} onChange={v=>setForm(f=>({...f,dueDate:v}))} type="date"/>
            </div>
            <IInput label="Period (e.g. April 2026)" value={form.period} onChange={v=>setForm(f=>({...f,period:v}))} placeholder="e.g. April 2026 rent" span/>
          </div>

          <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>{invType==='rent'?'Tenant':'Recipient'} details</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
              <IInput label="Name" value={form.recipientName} onChange={v=>setForm(f=>({...f,recipientName:v}))} placeholder="Full name"/>
              <IInput label="Email" value={form.recipientEmail} onChange={v=>setForm(f=>({...f,recipientEmail:v}))} placeholder="email@example.com"/>
            </div>
            <ITextarea label="Address" value={form.recipientAddress} onChange={v=>setForm(f=>({...f,recipientAddress:v}))} placeholder="Address" rows={2}/>
          </div>

          <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Payment & terms</div>
            <IInput label="Payment terms" value={form.paymentTerms} onChange={v=>setForm(f=>({...f,paymentTerms:v}))} placeholder="e.g. Payment due within 14 days"/>
            <ITextarea label="Bank details (shown on invoice)" value={form.bankDetails} onChange={v=>setForm(f=>({...f,bankDetails:v}))} placeholder={'Sort code: 12-34-56\nAccount: 12345678\nName: J. Bloggs'} rows={3}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
              <IInput label="VAT rate % (if applicable)" value={form.vatRate} onChange={v=>setForm(f=>({...f,vatRate:v}))} placeholder="Leave blank if not VAT registered" type="number"/>
            </div>
            <ITextarea label="Additional notes" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Any additional information" rows={2}/>
          </div>
        </div>

        {/* Right: line items + landlord */}
        <div>
          <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Line items</div>
            {form.items.map((item,idx)=><div key={idx} style={{background:'var(--surface2)',borderRadius:10,padding:10,marginBottom:8}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 60px 90px',gap:6,marginBottom:6}}>
                <input placeholder="Description" value={item.description} onChange={e=>setItem(idx,'description',e.target.value)}
                  style={{background:'#fff',border:'0.5px solid var(--border-strong)',borderRadius:6,padding:'6px 8px',fontSize:12,fontFamily:'var(--font)',color:'var(--text)'}}/>
                <input placeholder="Qty" type="number" value={item.qty} onChange={e=>setItem(idx,'qty',e.target.value)}
                  style={{background:'#fff',border:'0.5px solid var(--border-strong)',borderRadius:6,padding:'6px 8px',fontSize:12,fontFamily:'var(--font)',color:'var(--text)'}}/>
                <input placeholder="£ amount" type="number" value={item.amount} onChange={e=>setItem(idx,'amount',e.target.value)}
                  style={{background:'#fff',border:'0.5px solid var(--border-strong)',borderRadius:6,padding:'6px 8px',fontSize:12,fontFamily:'var(--font)',color:'var(--text)',textAlign:'right'}}/>
              </div>
              {form.items.length>1&&<button onClick={()=>removeItem(idx)} style={{fontSize:11,color:'var(--red)',background:'none',border:'none',cursor:'pointer'}}>Remove</button>}
            </div>)}
            <button onClick={addItem} style={{fontSize:12,color:'var(--brand)',background:'none',border:'0.5px dashed var(--brand)',borderRadius:7,padding:'6px 14px',cursor:'pointer',width:'100%'}}>
              + Add line item
            </button>
            {/* Totals */}
            <div style={{borderTop:'0.5px solid var(--border)',marginTop:12,paddingTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                <span style={{color:'var(--text-3)'}}>Subtotal</span>
                <span style={{fontFamily:'var(--mono)'}}>{fmt(totalNet)}</span>
              </div>
              {vatAmt>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                <span style={{color:'var(--text-3)'}}>VAT ({form.vatRate}%)</span>
                <span style={{fontFamily:'var(--mono)'}}>{fmt(vatAmt)}</span>
              </div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:600,color:'var(--brand)',borderTop:'0.5px solid var(--border)',paddingTop:8,marginTop:4}}>
                <span>Total</span>
                <span style={{fontFamily:'var(--mono)'}}>{fmt(totalGross)}</span>
              </div>
            </div>
          </div>

          <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Your details (landlord)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
              <IInput label="Your name" value={landlord.name} onChange={v=>setLandlord(l=>({...l,name:v}))} placeholder="Full name or company"/>
              <IInput label="Email" value={landlord.email} onChange={v=>setLandlord(l=>({...l,email:v}))} placeholder="your@email.com"/>
              <IInput label="Phone" value={landlord.phone} onChange={v=>setLandlord(l=>({...l,phone:v}))} placeholder="e.g. 07700 900000"/>
              <IInput label="UTR (if self-assessment)" value={landlord.utr} onChange={v=>setLandlord(l=>({...l,utr:v}))} placeholder="e.g. 1234567890"/>
            </div>
            <ITextarea label="Address" value={landlord.address} onChange={v=>setLandlord(l=>({...l,address:v}))} placeholder="Your address" rows={2}/>
            <IInput label="Company name (if Ltd)" value={landlord.company} onChange={v=>setLandlord(l=>({...l,company:v}))} placeholder="e.g. Hannat Property Limited" span/>
          </div>

          <div style={{display:'flex',gap:8}}>
            <button onClick={handlePreview} disabled={sending||totalNet===0}
              style={{flex:1,background:'var(--brand)',color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:600,cursor:totalNet===0||sending?'not-allowed':'pointer',opacity:totalNet===0||sending?0.6:1}}>
              {sending?'Loading...':'Preview invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>}

    {/* ── LIST MODE ── */}
    {view==='list'&&<>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
        {[
          {label:'Total invoiced',value:fmt(totalNet+totalPaid),icon:'📄'},
          {label:'Outstanding',value:fmt(totalUnpaid),icon:'⏳',color:'var(--amber)'},
          {label:'Paid',value:fmt(totalPaid),icon:'✅',color:'var(--green)'},
          {label:'Total invoices',value:String(invoices.length),icon:'🗂️'},
        ].map(s=><div key={s.label} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{s.icon} {s.label}</div>
          <div style={{fontSize:18,fontWeight:600,fontFamily:'var(--mono)',color:s.color||'var(--text)'}}>{s.value}</div>
        </div>)}
      </div>

      {/* Actions */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {['all','draft','sent','paid','overdue'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',
                borderColor:filterStatus===s?'var(--brand)':'var(--border)',
                background:filterStatus===s?'var(--brand-light)':'var(--surface)',
                color:filterStatus===s?'var(--brand)':'var(--text-2)',
                textTransform:'capitalize'}}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={()=>setView('create')}
          style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          + New invoice
        </button>
      </div>

      {loading?<div style={{fontSize:13,color:'var(--text-3)',padding:'24px 0',textAlign:'center'}}>Loading invoices...</div>
      :filtered.length===0?<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)'}}>
        <div style={{fontSize:32,marginBottom:12}}>📄</div>
        <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>No invoices yet</div>
        <div style={{fontSize:12}}>Create your first invoice to send rent receipts to tenants or record contractor invoices.</div>
      </div>
      :<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(inv=><div key={inv.id} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600}}>{inv.invoice_number}</span>
              <StatusPill status={inv.status}/>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:'var(--text-3)',textTransform:'capitalize'}}>{inv.type}</span>
            </div>
            <div style={{fontSize:13,color:'var(--text-2)',marginBottom:2}}>{inv.recipient_name} {inv.period&&'· '+inv.period}</div>
            <div style={{fontSize:11,color:'var(--text-3)'}}>{inv.date&&new Date(inv.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div style={{fontSize:16,fontWeight:600,fontFamily:'var(--mono)',color:inv.status==='paid'?'var(--green)':'var(--text)',flexShrink:0}}>
            {fmt(inv.amount)}
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            {inv.status!=='paid'&&<button onClick={()=>markPaid(inv.id)}
              style={{fontSize:12,padding:'5px 10px',borderRadius:7,border:'0.5px solid var(--green)',background:'var(--green-bg)',cursor:'pointer',color:'var(--green)',fontWeight:500}}>
              Mark paid
            </button>}
            <button onClick={()=>deleteInv(inv.id)}
              style={{fontSize:12,padding:'5px 10px',borderRadius:7,border:'0.5px solid var(--border)',background:'var(--surface2)',cursor:'pointer',color:'var(--red)'}}>
              Delete
            </button>
          </div>
        </div>)}
      </div>}
    </>}
  </div>
}


/* ================================================================
   PAYWALL GATE + CHECKOUT FLOW
   ================================================================ */
function PaywallBanner({subscription,user,onUpgrade,propCount,maxProps}){
  const status=subscription?.status
  const isActive=['active','trialing'].includes(status)
  const isAdmin=user?.publicMetadata?.admin||(user?.emailAddresses?.[0]?.emailAddress||'').includes('lettly.co')
  if(isActive||isAdmin) return null

  return<div style={{background:'linear-gradient(135deg,#1b3a2d 0%,#1b5e3b 100%)',margin:'0 0 20px',borderRadius:14,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
    <div style={{flex:1}}>
      <div style={{fontSize:15,fontWeight:600,color:'#fff',marginBottom:4}}>
        {status==='none'||!status?'Start your 14-day free trial':'Your trial has ended'}
      </div>
      <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.5}}>
        {status==='none'||!status
          ?`You are using the free preview (${propCount||0}/${maxProps||1} propert${(maxProps||1)===1?'y':'ies'}). Choose a plan to unlock all features and add more properties.`
          :'Upgrade to continue accessing your portfolio, compliance alerts, AI assistant and more.'}
      </div>
    </div>
    <button onClick={onUpgrade} style={{background:'#fff',color:'var(--brand)',border:'none',borderRadius:10,padding:'10px 22px',fontSize:14,fontWeight:600,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
      {status==='none'||!status?'Start free trial':'Choose a plan'}
    </button>
  </div>
}

function UpgradeModal({onClose,user,currentPlan}){
  const[selPlan,setSelPlan]=useState('standard')
  const[addHmo,setAddHmo]=useState(false)
  const[loading,setLoading]=useState(false)

  const PLANS=[
    {id:'starter',name:'Starter',price:8,props:'1-2 properties'},
    {id:'standard',name:'Standard',price:16,props:'3-5 properties'},
    {id:'portfolio',name:'Portfolio',price:28,props:'6-10 properties',popular:true},
    {id:'pro',name:'Pro',price:40,props:'Unlimited'},
  ]

  async function startCheckout(){
    setLoading(true)
    try{
      const r=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({plan:selPlan,addHmo,email:user?.emailAddresses?.[0]?.emailAddress})})
      const d=await r.json()
      if(d.url) window.location.href=d.url
      else alert('Could not start checkout. Please try again.')
    }catch(e){alert('Could not start checkout. Please try again.')}
    setLoading(false)
  }

  const plan=PLANS.find(p=>p.id===selPlan)
  const total=(plan?.price||0)+(addHmo?12.50:0)

  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:'var(--surface)',borderRadius:20,padding:'32px 28px',maxWidth:520,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:400,marginBottom:4}}>Choose your plan</div>
          <div style={{fontSize:13,color:'var(--text-3)'}}>14-day free trial, no credit card required</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--text-3)',padding:'0 4px'}}>x</button>
      </div>

      {/* Plan selector */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
        {PLANS.map(p=><button key={p.id} onClick={()=>setSelPlan(p.id)}
          style={{padding:'12px 14px',borderRadius:12,border:'1.5px solid',textAlign:'left',cursor:'pointer',
            borderColor:selPlan===p.id?'var(--brand)':'var(--border)',
            background:selPlan===p.id?'var(--brand-subtle)':'var(--surface)',
            position:'relative'}}>
          {p.popular&&<span style={{position:'absolute',top:8,right:8,fontSize:10,background:'var(--brand)',color:'#fff',padding:'1px 6px',borderRadius:20,fontWeight:600}}>Popular</span>}
          <div style={{fontSize:13,fontWeight:600,color:selPlan===p.id?'var(--brand)':'var(--text)',marginBottom:2}}>{p.name}</div>
          <div style={{fontSize:18,fontWeight:700,color:selPlan===p.id?'var(--brand)':'var(--text)',fontFamily:'var(--mono)'}}>£{p.price}<span style={{fontSize:11,fontWeight:400}}>/mo</span></div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>{p.props}</div>
        </button>)}
      </div>

      {/* HMO add-on */}
      <label style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface2)',borderRadius:10,cursor:'pointer',marginBottom:20,border:'0.5px solid '+(addHmo?'var(--brand)':'var(--border)')}}>
        <input type="checkbox" checked={addHmo} onChange={e=>setAddHmo(e.target.checked)} style={{accentColor:'var(--brand)',width:16,height:16}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:500}}>Add HMO management suite</div>
          <div style={{fontSize:11,color:'var(--text-3)'}}>Room tracking, licence manager, fire safety checklist, PAT testing</div>
        </div>
        <div style={{fontSize:13,fontWeight:600,color:'var(--brand)',flexShrink:0}}>+£12.50/mo</div>
      </label>

      {/* Total */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderTop:'0.5px solid var(--border)',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--text-2)'}}>Total after 14-day trial</span>
        <span style={{fontSize:20,fontWeight:700,fontFamily:'var(--mono)',color:'var(--brand)'}}>£{total.toFixed(2).replace('.00','')}/mo</span>
      </div>

      <button onClick={startCheckout} disabled={loading}
        style={{width:'100%',background:'var(--brand)',color:'#fff',border:'none',borderRadius:12,padding:'14px',fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,marginBottom:12}}>
        {loading?'Redirecting to checkout...':'Start 14-day free trial →'}
      </button>
      <div style={{fontSize:11,color:'var(--text-3)',textAlign:'center',lineHeight:1.6}}>
        No credit card required to start. Cancel anytime. You will be redirected to Stripe for secure payment.
      </div>
    </div>
  </div>
}

function HMOTab({portfolio,setPortfolio}){
  const props=(portfolio.properties||[]).filter(p=>p.isHMO)
  const[selProp,setSelProp]=useState(props[0]?.id||'')
  const[view,setView]=useState('overview')
  const[showRoomForm,setShowRoomForm]=useState(false)
  const[editRoom,setEditRoom]=useState(null)
  const[roomForm,setRoomForm]=useState({name:'',sizeSqm:'',tenant:'',tenantEmail:'',tenantPhone:'',rent:'',depositAmount:'',depositScheme:'',depositRef:'',tenancyStart:'',notes:''})

  const prop=props.find(p=>p.id===selProp)||props[0]
  const rooms=prop?.rooms||[]

  function updateProp(updates){
    setPortfolio(prev=>({...prev,properties:(prev.properties||[]).map(p=>p.id===prop?.id?{...p,...updates}:p)}))
  }

  function saveRoom(room){
    const existing=rooms.find(r=>r.id===room.id)
    const updated=existing?rooms.map(r=>r.id===room.id?room:r):[...rooms,{...room,id:'room_'+Date.now()}]
    updateProp({rooms:updated})
    setShowRoomForm(false)
    setEditRoom(null)
    setRoomForm({name:'',sizeSqm:'',tenant:'',tenantEmail:'',tenantPhone:'',rent:'',depositAmount:'',depositScheme:'',depositRef:'',tenancyStart:'',notes:''})
  }

  function deleteRoom(id){
    if(!confirm('Delete this room?')) return
    updateProp({rooms:rooms.filter(r=>r.id!==id)})
  }

  function HMOInput({label,value,onChange,placeholder,type}){
    return<div style={{marginBottom:12}}>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4,fontWeight:500}}>{label}</div>
      <input type={type||'text'} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder||''}
        style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'9px 12px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',boxSizing:'border-box'}}/>
    </div>
  }

  const totalRent=rooms.reduce((s,r)=>s+(Number(r.rent)||0),0)
  const occupiedRooms=rooms.filter(r=>r.tenant).length
  const MIN_ROOM_SIZE_1=6.51
  const MIN_ROOM_SIZE_2=10.22
  const smallRooms=rooms.filter(r=>r.sizeSqm&&Number(r.sizeSqm)<MIN_ROOM_SIZE_1)

  function dueDays(dateStr){
    if(!dateStr) return null
    const parts=dateStr.split('/')
    if(parts.length!==3) return null
    const d=new Date(parts[2],parts[1]-1,parts[0])
    return Math.ceil((d-new Date())/(1000*60*60*24))
  }

  function StatusBadge({days,label}){
    if(days===null) return<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'var(--surface2)',color:'var(--text-3)'}}>Not set</span>
    const color=days<0?'var(--red)':days<=30?'#EF9F27':'var(--green)'
    const bg=days<0?'#fce8e6':days<=30?'#FFF3E0':'var(--green-bg)'
    return<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:bg,color}}>{days<0?'EXPIRED':'Due in '+days+'d'}</span>
  }

  if(!prop) return<div style={{padding:40,textAlign:'center',color:'var(--text-3)'}}>No HMO properties found. Enable HMO mode on a property in the Properties tab.</div>

  const licenceDays=dueDays(prop.hmoLicenceExpiry)
  const fireDays=dueDays(prop.fireRiskReviewDate)
  const patDays=dueDays(prop.patExpiry)
  const emergencyDays=dueDays(prop.emergencyLightingDate)

  return<div className="fade-up">
    {/* HMO Header Banner */}
    <div style={{background:'linear-gradient(135deg,#1b3a2d 0%,#1b5e3b 100%)',borderRadius:16,padding:'20px 24px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:44,height:44,background:'rgba(255,255,255,0.15)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:22}}>🏠</span>
        </div>
        <div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:3}}>HMO Management</div>
          <div style={{fontSize:18,fontWeight:600,color:'#fff',fontFamily:'var(--display)'}}>House in Multiple Occupation</div>
        </div>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {props.map(p=><button key={p.id} onClick={()=>setSelProp(p.id)}
          style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'1px solid',
            borderColor:selProp===p.id?'#fff':'rgba(255,255,255,0.3)',
            background:selProp===p.id?'rgba(255,255,255,0.2)':'transparent',
            color:'#fff'}}>
          {p.shortName}
        </button>)}
      </div>
    </div>

    {/* Sub nav */}
    <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
      {[['overview','Overview'],['rooms','Rooms'],['licence','Licence'],['fire','Fire safety'],['finance','Income & finances'],['docs','Documents']].map(([id,label])=>(
        <button key={id} onClick={()=>setView(id)} style={{padding:'8px 16px',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',border:'0.5px solid',
          borderColor:view===id?'var(--brand)':'var(--border)',
          background:view===id?'var(--brand)':'var(--surface)',
          color:view===id?'#fff':'var(--text-2)'}}>
          {label}
        </button>
      ))}
    </div>

    {/* ── OVERVIEW ── */}
    {view==='overview'&&<>
      {/* Key stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
        {[
          {label:'Total rooms',value:rooms.length||'-',icon:'🛏️'},
          {label:'Occupied',value:rooms.length?`${occupiedRooms}/${rooms.length}`:'0/0',icon:'👤',color:occupiedRooms===rooms.length&&rooms.length>0?'var(--green)':'var(--amber)'},
          {label:'Monthly income',value:totalRent?'£'+totalRent.toLocaleString('en-GB'):'-',icon:'💷',color:'var(--green)'},
          {label:'Void rooms',value:rooms.length-occupiedRooms||'0',icon:'🔑',color:(rooms.length-occupiedRooms)>0?'var(--red)':'var(--green)'},
        ].map(s=><div key={s.label} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{s.icon} {s.label}</div>
          <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--mono)',color:s.color||'var(--text)'}}>{s.value}</div>
        </div>)}
      </div>

      {/* Compliance status */}
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Compliance status</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {[
            {label:'HMO Licence',sub:prop.hmoLicence?`#${prop.hmoLicence}`:'Not recorded',days:licenceDays,icon:'📋'},
            {label:'Fire Risk Assessment',sub:prop.fireRiskDate?`Completed ${prop.fireRiskDate}`:'Not recorded',days:fireDays,icon:'🔥'},
            {label:'PAT Testing',sub:prop.patDate?`Last tested ${prop.patDate}`:'Not recorded',days:patDays,icon:'🔌'},
            {label:'Emergency Lighting',sub:prop.emergencyLightingDate?`Due ${prop.emergencyLightingDate}`:'Not recorded',days:emergencyDays,icon:'💡'},
            {label:'Gas Certificate',sub:prop.gasDue?`Due ${prop.gasDue}`:'Not recorded',days:dueDays(prop.gasDue),icon:'🔥'},
            {label:'EICR',sub:prop.eicrDue?`Due ${prop.eicrDue}`:'Not recorded',days:dueDays(prop.eicrDue),icon:'⚡'},
          ].map(item=><div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'0.5px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:16}}>{item.icon}</span>
              <div>
                <div style={{fontSize:13,fontWeight:500}}>{item.label}</div>
                <div style={{fontSize:11,color:'var(--text-3)'}}>{item.sub}</div>
              </div>
            </div>
            <StatusBadge days={item.days}/>
          </div>)}
        </div>
      </div>

      {/* Warnings */}
      {smallRooms.length>0&&<div style={{background:'#fce8e6',border:'1px solid #f5b8b4',borderRadius:12,padding:'12px 16px',marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:600,color:'var(--red)',marginBottom:6}}>Room size warning</div>
        {smallRooms.map(r=><div key={r.id} style={{fontSize:12,color:'#791F1F'}}>{r.name}: {r.sizeSqm}m² is below the minimum 6.51m² required for a single occupant</div>)}
      </div>}
    </>}

    {/* ── ROOMS ── */}
    {view==='rooms'&&<>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:600}}>Room management</div>
          <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>Track each room, tenant, rent and deposit separately</div>
        </div>
        <button onClick={()=>{setEditRoom(null);setRoomForm({name:'',sizeSqm:'',tenant:'',tenantEmail:'',tenantPhone:'',rent:'',depositAmount:'',depositScheme:'',depositRef:'',tenancyStart:'',notes:''});setShowRoomForm(true)}}
          style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          + Add room
        </button>
      </div>

      {showRoomForm&&<div style={{background:'var(--surface)',border:'1.5px solid var(--brand)',borderRadius:14,padding:20,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14,color:'var(--brand)'}}>{editRoom?'Edit room':'Add room'}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
          <HMOInput label="Room name" value={roomForm.name} onChange={v=>setRoomForm(f=>({...f,name:v}))} placeholder="e.g. Room 1, Bedroom A"/>
          <HMOInput label="Size (m²)" value={roomForm.sizeSqm} onChange={v=>setRoomForm(f=>({...f,sizeSqm:v}))} placeholder="e.g. 8.5" type="number"/>
          <HMOInput label="Tenant name" value={roomForm.tenant} onChange={v=>setRoomForm(f=>({...f,tenant:v}))} placeholder="Full name"/>
          <HMOInput label="Tenant email" value={roomForm.tenantEmail} onChange={v=>setRoomForm(f=>({...f,tenantEmail:v}))} placeholder="email@example.com"/>
          <HMOInput label="Tenant phone" value={roomForm.tenantPhone} onChange={v=>setRoomForm(f=>({...f,tenantPhone:v}))} placeholder="e.g. 07700 900000"/>
          <HMOInput label="Monthly rent (£)" value={roomForm.rent} onChange={v=>setRoomForm(f=>({...f,rent:v}))} placeholder="e.g. 550" type="number"/>
          <HMOInput label="Deposit amount (£)" value={roomForm.depositAmount} onChange={v=>setRoomForm(f=>({...f,depositAmount:v}))} placeholder="e.g. 550" type="number"/>
          <HMOInput label="Deposit scheme" value={roomForm.depositScheme} onChange={v=>setRoomForm(f=>({...f,depositScheme:v}))} placeholder="e.g. DPS, MyDeposits, TDS"/>
          <HMOInput label="Deposit reference" value={roomForm.depositRef} onChange={v=>setRoomForm(f=>({...f,depositRef:v}))} placeholder="e.g. DPS-12345"/>
          <HMOInput label="Tenancy start" value={roomForm.tenancyStart} onChange={v=>setRoomForm(f=>({...f,tenancyStart:v}))} placeholder="DD/MM/YYYY"/>
        </div>
        <HMOInput label="Notes" value={roomForm.notes} onChange={v=>setRoomForm(f=>({...f,notes:v}))} placeholder="Any additional notes"/>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button onClick={()=>saveRoom(editRoom?{...editRoom,...roomForm}:{...roomForm,id:'room_'+Date.now()})}
            style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'8px 20px',fontSize:13,fontWeight:500,cursor:'pointer'}}>
            {editRoom?'Save changes':'Add room'}
          </button>
          <button onClick={()=>{setShowRoomForm(false);setEditRoom(null)}}
            style={{background:'var(--surface2)',color:'var(--text)',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>
            Cancel
          </button>
        </div>
      </div>}

      {rooms.length===0?<div style={{textAlign:'center',padding:'40px 0',color:'var(--text-3)',fontSize:13}}>No rooms added yet. Click Add room to get started.</div>
      :<div style={{display:'flex',flexDirection:'column',gap:10}}>
        {rooms.map(room=>{
          const sizeOk=!room.sizeSqm||Number(room.sizeSqm)>=MIN_ROOM_SIZE_1
          return<div key={room.id} style={{background:'var(--surface)',border:'0.5px solid '+(sizeOk?'var(--border)':'var(--red)'),borderRadius:12,padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <span style={{fontSize:14,fontWeight:600}}>{room.name||'Unnamed room'}</span>
                  {room.sizeSqm&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:sizeOk?'var(--surface2)':'#fce8e6',color:sizeOk?'var(--text-3)':'var(--red)'}}>{room.sizeSqm}m²</span>}
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:room.tenant?'var(--green-bg)':'var(--surface2)',color:room.tenant?'var(--green)':'var(--text-3)'}}>{room.tenant?'Occupied':'Vacant'}</span>
                </div>
                {room.tenant&&<div style={{fontSize:12,color:'var(--text-2)',marginBottom:2}}>{room.tenant}{room.tenantEmail&&' · '+room.tenantEmail}</div>}
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  {room.rent&&<span style={{fontSize:12,color:'var(--text-3)'}}>Rent: <strong style={{color:'var(--brand)'}}>£{Number(room.rent).toLocaleString('en-GB')}/mo</strong></span>}
                  {room.depositAmount&&<span style={{fontSize:12,color:'var(--text-3)'}}>Deposit: £{Number(room.depositAmount).toLocaleString('en-GB')}</span>}
                  {room.depositScheme&&<span style={{fontSize:12,color:'var(--text-3)'}}>{room.depositScheme}{room.depositRef&&' #'+room.depositRef}</span>}
                  {room.tenancyStart&&<span style={{fontSize:12,color:'var(--text-3)'}}>From: {room.tenancyStart}</span>}
                </div>
                {!sizeOk&&<div style={{fontSize:11,color:'var(--red)',marginTop:4}}>Room below minimum size of {MIN_ROOM_SIZE_1}m² for single occupancy</div>}
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>{setEditRoom(room);setRoomForm(room);setShowRoomForm(true)}}
                  style={{fontSize:12,padding:'5px 12px',borderRadius:7,border:'0.5px solid var(--border)',background:'var(--surface2)',cursor:'pointer',color:'var(--text)'}}>Edit</button>
                <button onClick={()=>deleteRoom(room.id)}
                  style={{fontSize:12,padding:'5px 12px',borderRadius:7,border:'0.5px solid var(--border)',background:'var(--surface2)',cursor:'pointer',color:'var(--red)'}}>Remove</button>
              </div>
            </div>
          </div>
        })}
        <div style={{background:'var(--brand-subtle)',border:'0.5px solid var(--brand)',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:13,color:'var(--brand)',fontWeight:500}}>Total monthly income</span>
          <span style={{fontSize:13,fontWeight:600,fontFamily:'var(--mono)',color:'var(--brand)'}}>£{totalRent.toLocaleString('en-GB')}/mo</span>
        </div>
      </div>}
    </>}

    {/* ── LICENCE ── */}
    {view==='licence'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>HMO licence details</div>
        <HMOInput label="Licence number" value={prop.hmoLicence} onChange={v=>updateProp({hmoLicence:v})} placeholder="e.g. HMO/2024/00123"/>
        <HMOInput label="Issuing council" value={prop.hmoCouncil} onChange={v=>updateProp({hmoCouncil:v})} placeholder="e.g. Leeds City Council"/>
        <HMOInput label="Licence issue date" value={prop.hmoLicenceIssued} onChange={v=>updateProp({hmoLicenceIssued:v})} placeholder="DD/MM/YYYY"/>
        <HMOInput label="Licence expiry date" value={prop.hmoLicenceExpiry} onChange={v=>updateProp({hmoLicenceExpiry:v})} placeholder="DD/MM/YYYY"/>
        <HMOInput label="Licence type" value={prop.hmoLicenceType} onChange={v=>updateProp({hmoLicenceType:v})} placeholder="e.g. Mandatory / Additional / Selective"/>
        <HMOInput label="Max permitted occupants" value={prop.hmoMaxOccupants} onChange={v=>updateProp({hmoMaxOccupants:v})} placeholder="e.g. 6" type="number"/>
      </div>
      <div>
        <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Licence status</div>
          {licenceDays===null?<div style={{fontSize:13,color:'var(--text-3)'}}>Enter expiry date to track status</div>
          :<div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:36,fontWeight:700,fontFamily:'var(--mono)',color:licenceDays<0?'var(--red)':licenceDays<=60?'#EF9F27':'var(--green)',marginBottom:8}}>
              {licenceDays<0?'EXPIRED':licenceDays+' days'}
            </div>
            <div style={{fontSize:12,color:'var(--text-3)'}}>{licenceDays<0?'Licence has expired. Renew immediately.':licenceDays<=60?'Renewal due soon. Apply at least 2 months before expiry.':'Licence valid. No action required.'}</div>
          </div>}
        </div>
        <div style={{background:'#fff8e1',border:'0.5px solid #EF9F27',borderRadius:12,padding:'12px 14px'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#633806',marginBottom:6}}>Licence renewal tips</div>
          <div style={{fontSize:11,color:'#633806',lineHeight:1.7}}>
            Apply at least 2 months before expiry. You will need: current gas cert, EICR, fire risk assessment, floor plan with room sizes, fit and proper person declaration, and council application fee (typically £500-£1,200). Operating without a licence is a criminal offence.
          </div>
        </div>
      </div>
    </div>}

    {/* ── FIRE SAFETY ── */}
    {view==='fire'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Fire safety records</div>
        <HMOInput label="Fire risk assessment date" value={prop.fireRiskDate} onChange={v=>updateProp({fireRiskDate:v})} placeholder="DD/MM/YYYY"/>
        <HMOInput label="Next review date" value={prop.fireRiskReviewDate} onChange={v=>updateProp({fireRiskReviewDate:v})} placeholder="DD/MM/YYYY"/>
        <HMOInput label="Assessor name / company" value={prop.fireRiskAssessor} onChange={v=>updateProp({fireRiskAssessor:v})} placeholder="e.g. SafeCheck Ltd"/>
        <HMOInput label="PAT test date" value={prop.patDate} onChange={v=>updateProp({patDate:v})} placeholder="DD/MM/YYYY"/>
        <HMOInput label="PAT next due" value={prop.patExpiry} onChange={v=>updateProp({patExpiry:v})} placeholder="DD/MM/YYYY"/>
        <HMOInput label="Emergency lighting check date" value={prop.emergencyLightingDate} onChange={v=>updateProp({emergencyLightingDate:v})} placeholder="DD/MM/YYYY"/>
      </div>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Fire safety checklist</div>
        {[
          'Mains-wired interlinked smoke alarms on every storey',
          'Heat detector in kitchen',
          'Carbon monoxide alarms in all rooms with combustion appliances',
          'Fire doors (FD30) with intumescent strips and self-closers',
          'Emergency lighting on escape routes (5+ occupants)',
          'Fire blanket in kitchen',
          'Fire extinguisher on each level',
          'Clear escape routes at all times',
          'Written fire risk assessment in place',
          'Tenants given fire safety briefing at move-in',
        ].map((item,i)=>{
          const key='fireSafety_'+i
          return<label key={item} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10,cursor:'pointer'}}>
            <input type="checkbox" checked={!!(prop.fireSafetyChecks||{})[key]}
              onChange={e=>updateProp({fireSafetyChecks:{...(prop.fireSafetyChecks||{}),[key]:e.target.checked}})}
              style={{marginTop:2,accentColor:'var(--brand)',flexShrink:0}}/>
            <span style={{fontSize:12,color:'var(--text-2)',lineHeight:1.5}}>{item}</span>
          </label>
        })}
        <div style={{marginTop:8,fontSize:11,color:'var(--text-3)',padding:'8px 10px',background:'var(--surface2)',borderRadius:8}}>
          Tick each item you have in place. Keep photographic evidence and inspection records for council visits.
        </div>
      </div>
    </div>}

    {/* ── INCOME & FINANCES ── */}
    {view==='finance'&&<div>
      <div style={{background:'var(--brand)',borderRadius:14,padding:'16px 20px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:16,textAlign:'center'}}>
        {[
          {label:'Total monthly rent',value:'£'+totalRent.toLocaleString('en-GB'),sub:rooms.length+' rooms'},
          {label:'Annual income',value:'£'+(totalRent*12).toLocaleString('en-GB'),sub:'before expenses'},
          {label:'Occupied rooms',value:occupiedRooms+'/'+rooms.length,sub:rooms.length-occupiedRooms+' void'},
          {label:'Avg rent per room',value:rooms.length?'£'+Math.round(totalRent/(rooms.length||1)).toLocaleString('en-GB'):'-',sub:'per month'},
        ].map(s=><div key={s.label}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginBottom:4}}>{s.label}</div>
          <div style={{fontSize:22,fontWeight:600,color:'#fff',fontFamily:'var(--mono)'}}>{s.value}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{s.sub}</div>
        </div>)}
      </div>
      <div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Room-by-room breakdown</div>
        {rooms.length===0?<div style={{fontSize:12,color:'var(--text-3)',padding:'16px 0',textAlign:'center'}}>Add rooms in the Rooms tab to see the breakdown here</div>
        :rooms.map(room=><div key={room.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'0.5px solid var(--border)'}}>
          <div>
            <div style={{fontSize:13,fontWeight:500}}>{room.name}</div>
            <div style={{fontSize:11,color:'var(--text-3)'}}>{room.tenant||'Vacant'}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:600,fontFamily:'var(--mono)',color:room.tenant?'var(--brand)':'var(--text-3)'}}>{room.rent?'£'+Number(room.rent).toLocaleString('en-GB')+'/mo':'Void'}</div>
            {room.depositAmount&&<div style={{fontSize:11,color:'var(--text-3)'}}>Deposit: £{Number(room.depositAmount).toLocaleString('en-GB')}</div>}
          </div>
        </div>)}
      </div>
      <div style={{background:'var(--surface2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--text-3)',lineHeight:1.7}}>
        HMO yield, mortgage analysis, CGT and Section 24 calculations use the property values set in your Properties tab. The Finance tab in the main navigation also includes these tools for all your properties including HMOs.
      </div>
    </div>}

    {/* ── DOCUMENTS ── */}
    {view==='docs'&&<div>
      <div style={{fontSize:13,color:'var(--text-2)',marginBottom:16,lineHeight:1.7}}>
        HMO-specific documents are stored alongside your standard property documents. Drop any document below and Lettly will extract dates and details automatically.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginBottom:16}}>
        {[
          {icon:'📋',label:'HMO Licence',desc:'Council-issued licence document'},
          {icon:'🔥',label:'Fire Risk Assessment',desc:'Written FRA document'},
          {icon:'🔌',label:'PAT Test Certificate',desc:'Annual appliance test records'},
          {icon:'💡',label:'Emergency Lighting',desc:'Annual test certificate'},
          {icon:'📐',label:'Floor Plans',desc:'Room sizes for licence application'},
          {icon:'🚨',label:'Fire Alarm Certificate',desc:'Installation and test records'},
        ].map(d=><div key={d.label} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
          <span style={{fontSize:20}}>{d.icon}</span>
          <div style={{fontSize:13,fontWeight:500,marginTop:6}}>{d.label}</div>
          <div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{d.desc}</div>
        </div>)}
      </div>
      <div style={{background:'var(--surface2)',borderRadius:10,padding:'12px 14px',fontSize:12,color:'var(--text-3)'}}>
        Drop documents into the main drop zone at the top of the page. Lettly will detect document type and attach to this property automatically. HMO compliance requirements vary by local authority. Always verify licence conditions with your local council. Lettly tracks and reminds but does not constitute legal advice.
      </div>
    </div>}
  </div>
}

function ToolsTab({portfolio,setPortfolio}){
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
    <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>{[{id:'remortgage',label:'Remortgage planner'},{id:'documents',label:'Document generator'},{id:'voids',label:'Void tracker'},{id:'taxexport',label:'Tax export'},{id:'expenses',label:'Expenses'},{id:'deal',label:'Deal analyser'},{id:'cgt',label:'CGT planner'},{id:'ltd',label:'Ltd vs personal'},{id:'contractors',label:'Find a contractor'},{id:'referral',label:'Refer & earn'},{id:'report',label:'Portfolio report'}].map(t=><button key={t.id} onClick={()=>{setTool(t.id);setGenerated('')}} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,cursor:'pointer',border:'0.5px solid',borderColor:tool===t.id?'var(--brand)':'var(--border)',background:tool===t.id?'var(--brand-light)':'var(--surface)',color:tool===t.id?'var(--brand)':'var(--text-2)'}}>{t.label}</button>)}</div>
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
      <div style={{fontSize:11,color:'var(--text-3)',lineHeight:1.6,padding:'8px 12px',background:'var(--surface2)',borderRadius:8,marginTop:4}}>For information only. Not financial advice. Always consult an independent mortgage broker before remortgaging.</div>
    </div>}
    {tool==='documents'&&<div style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:16}}>
      <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>Document generator</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px',marginBottom:14}}>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Document type</label><select value={docType} onChange={e=>{setDocType(e.target.value);setExtra({});setGenerated('')}} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="ast">Assured Shorthold Tenancy (England)</option><option value="section8">Section 8 Notice (England)</option><option value="inspection">Inspection report</option><option value="letter_rent_increase">Rent increase letter</option><option value="letter_entry">Right of entry notice</option><option value="right_to_rent_letter">Right to Rent check letter</option></select></div>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,fontWeight:500,color:'var(--text-2)',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px'}}>Property</label><select value={selProp} onChange={e=>setSelProp(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'8px 11px',fontFamily:'var(--font)',fontSize:13,color:'var(--text)',outline:'none'}}><option value="">Select property</option>{props.map(p=><option key={p.id} value={p.shortName}>{p.shortName} {p.nation?`(${p.nation})`:''}</option>)}</select></div>
      </div>
      {(() => {const sp=props.find(p=>p.id===selProp||p.shortName===selProp);return sp?.nation==='Scotland'?<div style={{background:'#e0ecf8',border:'0.5px solid #005EB8',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#003090',lineHeight:1.6,marginBottom:14}}>Scottish property: Section 8 does not apply in Scotland. Use the First-tier Tribunal for Scotland repossession process instead.</div>:sp?.nation==='Wales'?<div style={{background:'#fce8ec',border:'0.5px solid #C8102E',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#8b0000',lineHeight:1.6,marginBottom:14}}>Welsh property: This property uses an Occupation Contract. Different possession rules apply under the Renting Homes (Wales) Act.</div>:null})()}
      {docType==='ast'&&<div style={{background:'#e8f5e9',border:'0.5px solid #a5d6a7',borderRadius:9,padding:'10px 13px',fontSize:12,color:'#1b5e3b',lineHeight:1.6,marginBottom:14}}>Important: From 1 May 2026, the Renters Rights Act means new tenancies in England cannot be fixed-term ASTs. All new tenancies become periodic tenancies. This draft AST includes periodic tenancy terms. Always have complex agreements reviewed by a solicitor.</div>}
      {docType==='section8'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="Grounds" value={extra.grounds||''} onChange={v=>setExtra(p=>({...p,grounds:v}))} placeholder="e.g. Ground 8 - rent arrears"/><Input label="Arrears amount" value={extra.arrears||''} onChange={v=>setExtra(p=>({...p,arrears:v}))} placeholder="e.g. £1,200"/></div>}
      {docType==='inspection'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="Inspection date" value={extra.date||''} onChange={v=>setExtra(p=>({...p,date:v}))} placeholder="DD/MM/YYYY"/><Input label="Inspector name" value={extra.inspector||''} onChange={v=>setExtra(p=>({...p,inspector:v}))} placeholder="Your name"/><div style={{gridColumn:'1/-1'}}><Input label="Condition notes" value={extra.notes||''} onChange={v=>setExtra(p=>({...p,notes:v}))} placeholder="Specific items to include"/></div></div>}
      {docType==='letter_rent_increase'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="New rent (£/mo)" value={extra.newRent||''} onChange={v=>setExtra(p=>({...p,newRent:v}))} placeholder="e.g. 900" type="number"/><Input label="Effective date" value={extra.effectiveDate||''} onChange={v=>setExtra(p=>({...p,effectiveDate:v}))} placeholder="DD/MM/YYYY"/></div>}
      {docType==='letter_entry'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}><Input label="Proposed visit date" value={extra.visitDate||''} onChange={v=>setExtra(p=>({...p,visitDate:v}))} placeholder="DD/MM/YYYY"/><Input label="Reason for visit" value={extra.reason||''} onChange={v=>setExtra(p=>({...p,reason:v}))} placeholder="e.g. Annual inspection"/></div>}
      <button onClick={generateDoc} disabled={generating} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:500,cursor:generating?'not-allowed':'pointer',opacity:generating?0.6:1,marginBottom:generating||generated?14:0}}>{generating?'Generating...':'Generate document'}</button>
      {generated&&<><div style={{background:'#fce8e6',border:'0.5px solid #E24B4A',borderRadius:8,padding:'10px 14px',marginBottom:8,fontSize:11,color:'#791F1F',lineHeight:1.6}}><strong>Important:</strong> This is a draft document for reference only. It does not constitute legal advice. Review with a qualified solicitor before use. You remain solely responsible for ensuring any document is legally valid and appropriate for your circumstances.</div><div style={{background:'var(--surface2)',borderRadius:10,padding:16,fontSize:12,lineHeight:1.9,whiteSpace:'pre-wrap',color:'var(--text-2)',fontFamily:'var(--mono)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div style={{fontSize:14,fontWeight:600,color:'var(--brand)',fontFamily:'var(--font)'}}>Generated document</div><button onClick={()=>navigator.clipboard.writeText(generated)} style={{fontSize:11,color:'var(--brand)',background:'var(--brand-light)',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>Copy</button></div>{generated}</div></> }
    </div>}
    {tool==='voids'&&<VoidTrackerPanel portfolio={portfolio} setPortfolio={setPortfolio}/>}
    {tool==='taxexport'&&<TaxExportPanel portfolio={portfolio}/>}
    {tool==='expenses'&&<ExpensesPanel portfolio={portfolio} setPortfolio={setPortfolio}/>}
    {tool==='deal'&&<DealAnalyser props={props}/>}
    {tool==='cgt'&&<CGTPlanner props={props}/>}
    {tool==='ltd'&&<LtdVsPersonal portfolio={portfolio}/>}
    {tool==='contractors'&&<ContractorDirectory portfolio={portfolio}/>}
    {tool==='referral'&&<ReferralPanel/>}
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
      {nation==='England'&&'England: Renters Rights Act in force from 1 May 2026. Section 21 abolished for new tenancies. All tenancies become periodic. Fixed-term ASTs no longer available for new tenancies. PRS Database registration required before serving any notice.'}
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
  const[messages,setMessages]=useState([{role:'assistant',content:n>0?`I can see your portfolio of ${n} propert${n===1?'y':'ies'} across ${nations.join(', ')}. Ask me anything about compliance, legislation, finances, or remortgage strategy.\n\nNote: I provide general information and guidance only, not legal or financial advice. Always verify important decisions with a qualified solicitor or accountant.`:`Welcome to Lettly AI. Add properties first and I can give specific advice for your portfolio.\n\nNote: I provide general information and guidance only, not legal or financial advice. Always verify important decisions with a qualified solicitor or accountant.`}])
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
  const totalPaid = filteredProps.reduce((s,p) => {
    const status = getStatus(p.id, selMonth)
    if(status === 'paid') {
      const actual = Number(rentLedger?.[p.id]?.[selMonth+'_amount'])
      return s + (actual || Number(p.rent) || 0)
    }
    if(status === 'partial') {
      const actual = Number(rentLedger?.[p.id]?.[selMonth+'_amount'])
      return s + (actual || 0)
    }
    return s
  }, 0)
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
              {['Property','Tenant','Rent/mo','Status','Amount / Date / Note'].map(h => <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>)}
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
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      <input
                        defaultValue={rentLedger?.[p.id]?.[selMonth+'_amount']||''}
                        onBlur={e=>setPortfolio(prev=>({...prev,rentLedger:{...prev.rentLedger,[p.id]:{...(prev.rentLedger?.[p.id]||{}),[selMonth+'_amount']:e.target.value}}}))}
                        placeholder={status==='partial'?'Amount received':'Amount (£)'}
                        type="number"
                        style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontFamily:'var(--mono)',fontSize:11,color:'var(--text)',outline:'none',width:110}}/>
                      <input
                        defaultValue={rentLedger?.[p.id]?.[selMonth+'_date']||''}
                        onBlur={e=>setPortfolio(prev=>({...prev,rentLedger:{...prev.rentLedger,[p.id]:{...(prev.rentLedger?.[p.id]||{}),[selMonth+'_date']:e.target.value}}}))}
                        placeholder="Date received"
                        type="date"
                        style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontFamily:'var(--font)',fontSize:11,color:'var(--text)',outline:'none',width:130}}/>
                      <input
                        defaultValue={note}
                        onBlur={e=>setPortfolio(prev=>({...prev,rentLedger:{...prev.rentLedger,[p.id]:{...(prev.rentLedger?.[p.id]||{}),[noteKey]:e.target.value}}}))}
                        placeholder="Note e.g. BACS ref"
                        style={{background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 8px',fontFamily:'var(--font)',fontSize:11,color:'var(--text)',outline:'none',width:130}}/>
                    </div>
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

/* ---- Bottom Navigation (mobile) ---- */
function BottomNav({tab, setTab, portfolio, user}){
  const props = portfolio.properties || []
  const[showMore, setShowMore]=useState(false)

  const MAIN=[
    {id:'overview',   label:'Home',       icon:'🏠'},
    {id:'properties', label:'Properties', icon:'🏘'},
    {id:'finance',    label:'Finance',    icon:'💷'},
    {id:'legislation',label:'Compliance', icon:'🛡'},
    {id:'_more',      label:'More',       icon:'⋯'},
  ]

  const visibleTabIds=['overview','properties','finance','legislation']

  const MORE_TABS=TABS.filter(t=>{
    if(visibleTabIds.includes(t.id)) return false
    if(t.adminOnly&&!user?.publicMetadata?.admin&&!(user?.emailAddresses?.[0]?.emailAddress||'').includes('lettly.co')) return false
    if(t.hmoOnly&&!props.some(p=>p.isHMO)) return false
    return true
  })

  function pick(id){
    if(id==='_more'){setShowMore(v=>!v);return}
    setTab(id)
    setShowMore(false)
  }

  const moreIsActive=!visibleTabIds.includes(tab)

  return(<>
    {showMore&&<>
      <div onClick={()=>setShowMore(false)} style={{position:'fixed',inset:0,zIndex:148,background:'rgba(0,0,0,0.25)'}}/>
      <div className="more-menu">
        <div style={{width:'100%',fontSize:11,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.5px',padding:'0 6px 8px',borderBottom:'0.5px solid var(--border)',marginBottom:4}}>More</div>
        {MORE_TABS.map(t=>(
          <button key={t.id} onClick={()=>pick(t.id)} className={'more-menu-btn'+(tab===t.id?' active':'')}>
            {t.label}
          </button>
        ))}
      </div>
    </>}
    <nav className="bottom-nav">
      {MAIN.map(t=>{
        const isActive=t.id==='_more'?moreIsActive&&showMore:tab===t.id
        return(
          <button key={t.id} onClick={()=>pick(t.id)} className={'bnav-btn'+(isActive?' active':'')}>
            {isActive&&t.id!=='_more'&&<span className="bnav-dot"/>}
            <span className="bnav-icon">{t.icon}</span>
            <span className="bnav-label" style={{color:isActive?'var(--brand)':'var(--text-3)'}}>{t.label}</span>
          </button>
        )
      })}
    </nav>
  </>)
}

/* ---- Root ---- */
const TABS=[{id:'overview',label:'Overview',short:'Home'},{id:'properties',label:'Properties',short:'Props'},{id:'tenants',label:'Find & check tenants',short:'Tenants'},{id:'resources',label:'Resources',short:'Links'},{id:'content',label:'Content queue',short:'Content',adminOnly:true},{id:'rent',label:'Rent tracker',short:'Rent'},{id:'finance',label:'Finance',short:'Finance'},{id:'hmo',label:'HMO',short:'HMO',hmoOnly:true},{id:'invoicing',label:'Invoicing',short:'Invoices'},{id:'maintenance',label:'Maintenance',short:'Jobs'},{id:'conditions',label:'Conditions',short:'Conds'},{id:'tools',label:'Tools',short:'Tools'},{id:'legislation',label:'Legislation',short:'Law'},{id:'ai',label:'Lettly AI',short:'AI'}]

export default function Dashboard(){
  const{isLoaded,isSignedIn,user}=useUser();const router=useRouter()
  const[tab,setTab]=useState('overview')
  const[subscription,setSubscription]=useState(null)
  const[subLoading,setSubLoading]=useState(true)
  const[showUpgrade,setShowUpgrade]=useState(false)
  const[portfolio,setPortfolio]=useState({properties:[],expenses:[],maintenance:[],conditionReports:[],rentLedger:{},checklist:{},onboarding:null,contactEmail:'',ownerName:'',voids:[],applicants:[]})
  const[queue,setQueue]=useState([])
  const[showDrop,setShowDrop]=useState(false)
  const[loaded,setLoaded]=useState(false)
  const[justSubscribed,setJustSubscribed]=useState(false)
  // Derive property limit from subscription plan - must be after all useState
  const isAdmin=user?.publicMetadata?.admin||(user?.emailAddresses?.[0]?.emailAddress||'').includes('lettly.co')
  const maxProps=isAdmin?999:(subscription?.maxProperties||((['active','trialing'].includes(subscription?.status))?({starter:2,standard:5,portfolio:10,pro:999}[subscription?.plan]||2):1)||1)
  const atLimit=(portfolio.properties||[]).length>=maxProps
  const[formProp,setFormProp]=useState(null)
  const[showWizard,setShowWizard]=useState(false)

  useEffect(()=>{if(isLoaded&&!isSignedIn){router.replace('/');return}
    if(isLoaded&&isSignedIn&&typeof window!=='undefined'&&window.location.search.includes('subscribed=1'))setJustSubscribed(true)},[isLoaded,isSignedIn,router])
  useEffect(()=>{
    if(!user?.id)return
    // localStorage check is instant - prevents wizard flash on every login
    const wizardDone = typeof window !== 'undefined' && (localStorage.getItem('lettly_wizard_'+user.id) || localStorage.getItem('lettly_wizard_done'))
    if(!wizardDone){
      // Only show wizard after Supabase confirms no onboarding data
      fetch('/api/stripe/subscription').then(r=>r.json()).then(d=>setSubscription(d.subscription)).finally(()=>setSubLoading(false))
      fetch('/api/data').then(r=>r.json()).then(({data})=>{
        const p=data||{properties:[],expenses:[],maintenance:[],conditionReports:[],rentLedger:{},checklist:{},onboarding:null}
        const pSafe={...p,conditionReports:p.conditionReports||[],rentLedger:p.rentLedger||{},checklist:p.checklist||{},properties:p.properties||[],expenses:p.expenses||[],maintenance:p.maintenance||[],voids:p.voids||[],applicants:p.applicants||[]}
        setPortfolio(pSafe)
        setLoaded(true)
        if(!p.onboarding){setShowWizard(true)}
      })
    } else {
      fetch('/api/stripe/subscription').then(r=>r.json()).then(d=>setSubscription(d.subscription)).finally(()=>setSubLoading(false))
      fetch('/api/data').then(r=>r.json()).then(({data})=>{
        const p=data||{properties:[],expenses:[],maintenance:[],conditionReports:[],rentLedger:{},checklist:{},onboarding:null}
        const pSafe={...p,conditionReports:p.conditionReports||[],rentLedger:p.rentLedger||{},checklist:p.checklist||{},properties:p.properties||[],expenses:p.expenses||[],maintenance:p.maintenance||[],voids:p.voids||[],applicants:p.applicants||[]}
        setPortfolio(pSafe)
        setLoaded(true)
      })
    }
  },[user?.id])

  const saveRef=useRef(null)
  const dropRef=useRef(null) // prevents duplicate drop processing
  const[saveStatus,setSaveStatus]=useState('saved') // saved | saving | error
  const[showCamera,setShowCamera]=useState(false)
  const[showManual,setShowManual]=useState(false)
  const portfolioRef=useRef(portfolio)
  portfolioRef.current=portfolio

  useEffect(()=>{
    if(!user?.id||!loaded)return
    setSaveStatus('saving')
    clearTimeout(saveRef.current)
    saveRef.current=setTimeout(async()=>{
      try{
        // Route through /api/save so service key is used server-side (bypasses RLS reliably)
        const res = await fetch('/api/save',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({data:portfolio})
        })
        const json = await res.json().catch(()=>({}))
        setSaveStatus(res.ok?'saved':'error')
        if(!res.ok) console.error('Portfolio save failed:', res.status, json)
      }catch(e){
        setSaveStatus('error')
        console.error('Portfolio save threw:', e.message)
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
        const data=JSON.stringify({data:portfolioRef.current})
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

  function updateProperty(prop){
    const limit = subscription?.maxProperties || ((['active','trialing'].includes(subscription?.status)) ? ({starter:2,standard:5,portfolio:10,pro:999}[subscription?.plan]||2) : 1) || 1
    setPortfolio(prev=>{
      const props=prev.properties||[]
      const idx=props.findIndex(p=>p.id===prop.id)
      if(idx>=0){const updated=[...props];updated[idx]=prop;return{...prev,properties:updated}}
      if(props.length>=limit){setShowUpgrade(true);return prev}
      return{...prev,properties:[...props,prop]}
    })
  }
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
        if(result.success&&result.extracted){
          // Show what was extracted before saving
          const extracted = result.extracted
          const prop = extracted.property
          const matchedProp = prop ? (portfolioRef.current||portfolio).properties?.find(p=>{
            const pAddr = (p.address||'').toLowerCase()
            const pShort = (p.shortName||'').toLowerCase()
            const eAddr = (prop.address||'').toLowerCase()
            const eShort = (prop.shortName||'').toLowerCase()
            const eHouseNum = eAddr.match(/^\d+/)?.[0] || eShort.match(/^\d+/)?.[0]
            const pHouseNum = pAddr.match(/^\d+/)?.[0] || pShort.match(/^\d+/)?.[0]
            if(eHouseNum && pHouseNum && eHouseNum !== pHouseNum) return false
            const streetWords = eAddr.split(' ').filter(w=>w.length>3&&!/^\d+$/.test(w))
            return streetWords.some(w=>pAddr.includes(w)) && eShort.length > 3
          }) : null

          // Build a summary of what will be saved
          const changes = []
          if(prop?.shortName) changes.push('Property: '+prop.shortName)
          const t = extracted.tenancy||{}
          const cx = extracted.compliance||{}
          const f2 = extracted.finance||{}
          if(t.rent) changes.push('Rent: £'+t.rent+'/mo')
          if(t.tenantName) changes.push('Tenant: '+t.tenantName)
          if(cx.gas?.due) changes.push('Gas cert due: '+cx.gas.due)
          if(cx.eicr?.due) changes.push('EICR due: '+cx.eicr.due)
          if(cx.epc?.rating) changes.push('EPC: '+cx.epc.rating)
          if(cx.insurance?.insurer) changes.push('Insurer: '+cx.insurance.insurer)
          if(f2.mortgage) changes.push('Mortgage: £'+f2.mortgage)
          if(f2.lender) changes.push('Lender: '+f2.lender)

          setQueue(q=>q.map(x=>x.id===id?{...x,status:'confirm',result,extracted,changes,matchedProp}:x))
        } else {
          setQueue(q=>q.map(x=>x.id===id?{...x,status:'error',result}:x))
        }
        // Small pause between files to avoid rate limits
        if(valid.indexOf(file)<valid.length-1) await new Promise(r=>setTimeout(r,500))
      }catch{
        setQueue(q=>q.map(x=>x.id===id?{...x,status:'error',result:{error:'Could not process this file.'}}:x))
      }
    }
  }

  // Property-scoped file handler: skips address matching, goes direct to property
  async function handleFilesForProp(files, propId) {
    const valid = files.filter(f => {
      const ext = f.name.toLowerCase()
      return ext.endsWith('.pdf') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
             ext.endsWith('.png') || ext.endsWith('.heic') || ext.endsWith('.webp')
    })
    for (const file of valid) {
      const id = Math.random().toString(36).slice(2)
      setQueue(q => [...q, { id, name: file.name, status: 'reading', forcePropId: propId }])
      try {
        const { data: b64, mediaType: detectedType } = await fileToBase64(file)
        setQueue(q => q.map(x => x.id === id ? { ...x, status: 'extracting' } : x))
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, data: b64, mediaType: detectedType || file.type })
        })
        const result = await res.json()
        if (result.success && result.extracted) {
          // Force-assign to this property, no matching needed
          setPortfolio(prev => {
            const props = prev.properties || []
            const patch = {}
            const cx = result.extracted.compliance || {}
            const t = result.extracted.tenancy || {}
            const f2 = result.extracted.finance || {}
            // Apply same field mapping as mergeDoc but skip address matching
            if (cx.gas?.date) patch.gasDate = cx.gas.date
            if (cx.gas?.due) patch.gasDue = cx.gas.due
            if (cx.eicr?.date) patch.eicrDate = cx.eicr.date
            if (cx.eicr?.due) patch.eicrDue = cx.eicr.due
            if (cx.epc?.rating) patch.epcRating = cx.epc.rating.toUpperCase().trim().charAt(0)
            if (cx.epc?.expiry) patch.epcExpiry = cx.epc.expiry
            if (cx.insurance?.insurer) patch.insurer = cx.insurance.insurer
            if (cx.insurance?.renewal) patch.insuranceRenewal = cx.insurance.renewal
            if (cx.insurance?.premium) patch.insurancePremium = Number(String(cx.insurance.premium).replace(/[^0-9.]/g,''))||undefined
            if (cx.insurance?.sumInsured) patch.insuranceSumInsured = Number(String(cx.insurance.sumInsured).replace(/[^0-9.]/g,''))||undefined
            if (cx.insurance?.excess) patch.insuranceExcess = Number(String(cx.insurance.excess).replace(/[^0-9.]/g,''))||undefined
            if (cx.insurance?.unoccupancyClause) patch.insuranceUnoccupancy = cx.insurance.unoccupancyClause
            if (cx.insurance?.exclusions) patch.insuranceExclusions = cx.insurance.exclusions
            if (cx.insurance?.cover) patch.insuranceCover = cx.insurance.cover
            if (cx.insurance?.lossOfRentCover) patch.insuranceLossOfRent = cx.insurance.lossOfRentCover
            if (cx.insurance?.broker) patch.insuranceBroker = cx.insurance.broker
            if (t.rent) patch.rent = Number(String(t.rent).replace(/[^0-9.]/g,''))||undefined
            if (t.tenantName) patch.tenantName = t.tenantName
            if (t.tenantPhone) patch.tenantPhone = t.tenantPhone
            if (t.tenantEmail) patch.tenantEmail = t.tenantEmail
            if (t.depositAmount) patch.depositAmount = Number(String(t.depositAmount).replace(/[^0-9.]/g,''))||undefined
            if (t.depositScheme) patch.depositScheme = t.depositScheme
            if (t.startDate) patch.tenancyStart = t.startDate
            if (f2.lender) patch.lender = f2.lender
            if (f2.mortgage) patch.mortgage = Number(String(f2.mortgage).replace(/[^0-9.]/g,''))||undefined
            if (f2.rate) patch.rate = f2.rate
            if (f2.fixedEnd) patch.fixedEnd = f2.fixedEnd
            if (f2.monthlyPayment) patch.monthlyPayment = Number(String(f2.monthlyPayment).replace(/[^0-9.]/g,''))||undefined
            const docType = result.extracted.documentType
            const updated = props.map(p =>
              p.id === propId
                ? { ...p, ...patch, docs: Array.from(new Set([...(p.docs || []), docType])) }
                : p
            )
            return { ...prev, properties: updated }
          })
          setQueue(q => q.map(x => x.id === id ? { ...x, status: 'done', result } : x))
        } else {
          setQueue(q => q.map(x => x.id === id ? { ...x, status: 'error', result } : x))
        }
        if (valid.indexOf(file) < valid.length - 1) await new Promise(r => setTimeout(r, 500))
      } catch {
        setQueue(q => q.map(x => x.id === id ? { ...x, status: 'error', result: { error: 'Could not process this file.' } } : x))
      }
    }
  }

  if(!isLoaded||!isSignedIn)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:28,height:28,borderRadius:'50%',border:'2.5px solid var(--brand)',borderTopColor:'transparent',animation:'spin 0.75s linear infinite'}}/></div>
  // Camera scanner overlay


  if(showCamera)return<CameraScanner onFiles={f=>{handleFiles(f)}} onClose={()=>setShowCamera(false)}/>
  // iOS safe area support
  const safeAreaStyle = typeof window !== 'undefined' ? {paddingBottom:'env(safe-area-inset-bottom,0px)'} : {}

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
    <style>{`
      .dash-content{max-width:1060px;margin:0 auto;padding:20px 20px 40px}
      @media(max-width:640px){.dash-content{padding:12px 12px 24px}}
      @media(max-width:480px){.dash-content{padding:10px 10px 20px}}

      /* ---- Bottom nav: mobile only ---- */
      .bottom-nav{display:none}

      @media(max-width:768px){
        .bottom-nav{
          display:flex;
          position:fixed;
          bottom:0;left:0;right:0;
          z-index:150;
          background:var(--surface);
          border-top:0.5px solid var(--border);
          padding:6px 0;
          padding-bottom:calc(6px + env(safe-area-inset-bottom,0px));
        }

        /* Hide top tab strip on mobile */
        .nav-tabs-desktop{display:none !important}

        /* Hide secondary nav clutter on mobile */
        .nav-save-status{display:none !important}
        .nav-upgrade-btn{display:none !important}
        .nav-billing-btn{display:none !important}

        /* Extra bottom padding so content clears the bottom nav */
        .dash-content{padding-bottom:90px !important}

        /* Mobile upload bar: camera button is primary, drop zone hidden */
        .upload-bar-desktop{display:none !important}
        .upload-bar-mobile{display:flex !important}
      }

      @media(min-width:769px){
        .upload-bar-mobile{display:none !important}
        .upload-bar-desktop{display:block}
      }

      /* Bottom nav button base */
      .bnav-btn{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:2px;flex:1;border:none;background:none;cursor:pointer;padding:6px 0;
        font-family:var(--font);position:relative;
        -webkit-tap-highlight-color:transparent;
      }
      .bnav-btn span.bnav-icon{font-size:20px;line-height:1}
      .bnav-btn span.bnav-label{font-size:10px;letter-spacing:0.1px}
      .bnav-btn.active span.bnav-label{font-weight:600;color:var(--brand)}
      .bnav-btn.active span.bnav-icon{filter:drop-shadow(0 0 3px rgba(27,94,59,0.3))}
      .bnav-dot{
        position:absolute;top:5px;
        width:4px;height:4px;border-radius:50%;background:var(--brand);
      }

      /* More menu slide-up */
      .more-menu{
        position:fixed;bottom:0;left:0;right:0;
        background:var(--surface);
        border-top:0.5px solid var(--border);
        border-radius:16px 16px 0 0;
        padding:12px 8px;
        padding-bottom:calc(72px + env(safe-area-inset-bottom,0px));
        z-index:149;
        display:flex;flex-wrap:wrap;gap:4px;
      }
      .more-menu-btn{
        display:flex;align-items:center;gap:10px;
        padding:11px 14px;border-radius:10px;
        background:transparent;border:none;cursor:pointer;
        font-size:14px;color:var(--text);font-family:var(--font);
        width:50%;box-sizing:border-box;
        -webkit-tap-highlight-color:transparent;
      }
      .more-menu-btn.active{background:var(--brand-light);color:var(--brand);font-weight:600}
    `}</style>

    {showWizard&&<OnboardingWizard onComplete={completeWizard} firstName={user?.firstName}/>}

    <div style={{minHeight:'100vh',background:'var(--bg)'}} onDragOver={e=>{e.preventDefault()}} onDragEnter={e=>{e.preventDefault();setShowDrop(true)}} onDragLeave={e=>{const r=e.relatedTarget;if(!r||!e.currentTarget.contains(r))setShowDrop(false)}} onDrop={e=>{e.preventDefault();setShowDrop(false)}}>
      <nav style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',height:62,position:'sticky',top:0,zIndex:100,gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}><div style={{width:34,height:34,background:'var(--brand)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:16,fontWeight:700,fontFamily:'var(--display)',fontStyle:'italic'}}>L</span></div><span style={{fontFamily:'var(--display)',fontSize:20,fontWeight:400}}>Lettly</span></div>
        <div className="nav-tabs-desktop" style={{display:'flex',gap:1,background:'var(--surface2)',padding:3,borderRadius:9,overflowX:'auto',maxWidth:'calc(100vw - 180px)',scrollbarWidth:'none'}}>{TABS.filter(t=>{if(t.adminOnly&&!user?.publicMetadata?.admin&&!user?.emailAddresses?.[0]?.emailAddress?.includes('lettly.co'))return false;if(t.hmoOnly&&!(portfolio.properties||[]).some(p=>p.isHMO))return false;return true;}).map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'var(--surface)':'transparent',border:tab===t.id?'0.5px solid var(--border)':'none',padding:'7px 13px',borderRadius:7,fontFamily:'var(--font)',fontSize:13,color:tab===t.id?'var(--text)':'var(--text-2)',fontWeight:tab===t.id?600:400,cursor:'pointer',whiteSpace:'nowrap'}}><span className='tab-label-full'>{t.label}</span><span className='tab-label-short' style={{display:'none'}}>{t.short}</span>{t.id==='ai'&&<span style={{display:'inline-block',width:4,height:4,borderRadius:'50%',background:'var(--brand)',marginLeft:3,verticalAlign:'middle'}}/>}{t.id==='legislation'&&<span style={{display:'inline-block',width:4,height:4,borderRadius:'50%',background:'var(--red)',marginLeft:3,verticalAlign:'middle'}}/>}</button>)}</div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {saveStatus==='saving'&&<span className="nav-save-status" style={{fontSize:11,color:'var(--text-3)'}}>Saving…</span>}
          {saveStatus==='saved'&&loaded&&<span className="nav-save-status" style={{fontSize:11,color:'var(--green)'}}>✓ Saved</span>}
          {saveStatus==='error'&&<span className="nav-save-status" style={{fontSize:11,color:'var(--red)'}}>Save failed</span>}
          <button onClick={()=>setShowDrop(v=>!v)} style={{background:'none',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'6px 10px',fontSize:12,color:'var(--text-2)',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add</button>
          {(!subscription||subscription.status==='none')&&<button className="nav-upgrade-btn" onClick={()=>setShowUpgrade(true)} style={{fontSize:11,padding:'5px 12px',borderRadius:7,border:'0.5px solid var(--brand)',background:'var(--brand-light)',cursor:'pointer',color:'var(--brand)',fontWeight:600,whiteSpace:'nowrap'}}>Upgrade</button>}
          {subscription&&['active','trialing'].includes(subscription.status)&&<button className="nav-billing-btn" onClick={async()=>{const r=await fetch('/api/stripe/portal',{method:'POST'});const d=await r.json();if(d.url)window.location.href=d.url}} style={{fontSize:11,padding:'5px 12px',borderRadius:7,border:'0.5px solid var(--border)',background:'var(--surface2)',cursor:'pointer',color:'var(--text-2)',whiteSpace:'nowrap'}}>Billing</button>}
          <UserButton afterSignOutUrl="/" appearance={{variables:{colorPrimary:'#1b5e3b'}}}/>
        </div>
      </nav>
      {/* Desktop upload bar */}
      <div className="upload-bar-desktop" style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'14px 20px'}}><div style={{maxWidth:800,margin:'0 auto'}}><DropZone onFiles={handleFiles} compact onScan={()=>setShowCamera(true)} onManual={()=>setShowManual(true)}/></div></div>

      {/* Mobile upload bar: camera-first */}
      <div className="upload-bar-mobile" style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'10px 14px',gap:8,alignItems:'stretch'}}>
        <button onClick={()=>setShowCamera(true)} style={{flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'var(--brand)',color:'#fff',border:'none',borderRadius:12,padding:'13px 0',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>
          <span style={{fontSize:20}}>📷</span> Scan document
        </button>
        <label style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:12,padding:'13px 0',fontSize:13,fontWeight:500,cursor:'pointer',color:'var(--text-2)',fontFamily:'var(--font)'}}>
          <span style={{fontSize:16}}>📁</span> Browse
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*,application/pdf" style={{display:'none'}} onChange={e=>{handleFiles(Array.from(e.target.files));e.target.value=''}}/>
        </label>
        <button onClick={()=>setShowManual(true)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:'var(--surface2)',border:'0.5px solid var(--border-strong)',borderRadius:12,padding:'13px 0',fontSize:13,fontWeight:500,cursor:'pointer',color:'var(--text-2)',fontFamily:'var(--font)'}}>
          <span style={{fontSize:16}}>✏️</span> Manual
        </button>
      </div>
      <div className="dash-content" style={{paddingTop:0}}>
        {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)} user={user} currentPlan={subscription?.plan}/>}
        <PaywallBanner subscription={subscription} user={user} onUpgrade={()=>setShowUpgrade(true)} propCount={(portfolio.properties||[]).length} maxProps={maxProps}/>
      </div>
      {queue.length>0&&<div style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'10px 16px'}}>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:11,color:'var(--text-3)'}}>{queue.filter(q=>q.status==='done').length} of {queue.length} processed</span>
            <div style={{display:'flex',gap:8}}>
              {queue.some(q=>q.status==='error'||q.status==='done')&&<button onClick={()=>setQueue(q=>q.filter(x=>x.status==='reading'||x.status==='extracting'))} style={{fontSize:11,color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}}>Clear done</button>}
              <button onClick={()=>setQueue([])} style={{fontSize:11,color:'var(--text-3)',background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}}>Clear all</button>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>{queue.map(item=><QueueItem key={item.id} item={item} onManual={()=>setShowManual(true)} onConfirm={(confirmedItem)=>{
  try {
    const ex = confirmedItem.extracted
    const prevProps = portfolioRef.current?.properties || []
    // Try mergeDoc first (handles matching + field mapping)
    let next = mergeDoc(portfolioRef.current, ex)
    // If mergeDoc didn't add a new property and there was no match, create one directly
    if(!confirmedItem.matchedProp && next.properties.length === prevProps.length){
      const cx = ex.compliance||{}, t = ex.tenancy||{}, f2 = ex.finance||{}
      const patch = {}
      if(cx.gas?.due) patch.gasDue = cx.gas.due
      if(cx.gas?.date) patch.gasDate = cx.gas.date
      if(cx.eicr?.due) patch.eicrDue = cx.eicr.due
      if(cx.eicr?.date) patch.eicrDate = cx.eicr.date
      if(cx.epc?.rating) patch.epcRating = cx.epc.rating?.toUpperCase()?.trim()?.charAt(0)
      if(cx.epc?.expiry) patch.epcExpiry = cx.epc.expiry
      if(cx.insurance?.insurer) patch.insurer = cx.insurance.insurer
      if(cx.insurance?.renewal) patch.insuranceRenewal = cx.insurance.renewal
      if(cx.insurance?.type) patch.insuranceType = cx.insurance.type
      if(t.tenantName) patch.tenantName = t.tenantName
      if(t.tenantEmail) patch.tenantEmail = t.tenantEmail
      if(t.tenantPhone) patch.tenantPhone = t.tenantPhone
      if(t.rent) patch.rent = Number(String(t.rent).replace(/[^0-9.]/g,''))||undefined
      if(t.startDate) patch.tenancyStart = t.startDate
      if(t.depositAmount) patch.depositAmount = Number(String(t.depositAmount).replace(/[^0-9.]/g,''))||undefined
      if(t.depositScheme) patch.depositScheme = t.depositScheme
      if(f2.lender) patch.lender = f2.lender
      if(f2.mortgage) patch.mortgage = Number(String(f2.mortgage).replace(/[^0-9.]/g,''))||undefined
      if(f2.rate) patch.rate = f2.rate
      if(f2.fixedEnd) patch.fixedEnd = f2.fixedEnd
      if(f2.monthlyPayment) patch.monthlyPayment = Number(String(f2.monthlyPayment).replace(/[^0-9.]/g,''))||undefined
      const newProp = {
        id: Math.random().toString(36).slice(2),
        shortName: ex.property?.shortName || ex.property?.address?.split(',')[0]?.trim() || 'New property',
        address: ex.property?.address || '',
        nation: 'England',
        ownership: 'Personal',
        docs: [ex.documentType].filter(Boolean),
        ...patch
      }
      next = {...portfolioRef.current, properties:[...prevProps, newProp]}
    }
    setPortfolio(next)
  } catch(e) {
    console.error('Save error:', e)
    // Absolute fallback - create minimal property
    const ex = confirmedItem.extracted
    if(!confirmedItem.matchedProp && ex?.property?.address) {
      const newProp = {
        id: Math.random().toString(36).slice(2),
        shortName: ex.property?.shortName || ex.property?.address?.split(',')[0]?.trim() || 'New property',
        address: ex.property?.address || '',
        nation: 'England',
        ownership: 'Personal',
        docs: [ex.documentType].filter(Boolean)
      }
      setPortfolio(prev => ({...prev, properties:[...(prev.properties||[]), newProp]}))
    }
  }
  setQueue(q=>q.map(x=>x.id===confirmedItem.id?{...x,status:'done'}:x))
}} onReject={(rejectedItem)=>{setQueue(q=>q.filter(x=>x.id!==rejectedItem.id))}} onRetry={async(failedItem)=>{
              setQueue(q=>q.map(x=>x.id===failedItem.id?{...x,status:'reading',result:null}:x))
              try{
                const file=new File([],failedItem.name)
                // Re-fetch original file is not possible - show message instead
                setQueue(q=>q.map(x=>x.id===failedItem.id?{...x,status:'error',result:{error:'Please drop the file again to retry.'}}:x))
              }catch{}
            }} onManual={()=>setShowManual(true)}/>)}</div>
        </div>
      </div>}
      <div className="dash-content">
        {tab==='overview'&&<div style={{marginBottom:20,paddingBottom:20,borderBottom:'0.5px solid var(--border)'}}>{justSubscribed&&<div style={{background:'var(--green-bg)',border:'0.5px solid var(--green)',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:13,color:'var(--green)',fontWeight:500,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>Welcome to Lettly! Your 14-day free trial has started.</span><button onClick={()=>setJustSubscribed(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--green)',fontSize:16}}>x</button></div>}<h1 style={{fontFamily:'var(--display)',fontSize:'clamp(26px,4vw,38px)',fontWeight:400,marginBottom:6,color:'var(--text)',letterSpacing:'-0.3px'}}>Good {getGreeting()}, {user?.firstName||'there'}</h1><p style={{fontSize:14,color:'var(--text-2)',fontWeight:500}}>{(portfolio.properties||[]).length===0?'Add a property or drop documents to get started.':`${(portfolio.properties||[]).length} propert${(portfolio.properties||[]).length===1?'y':'ies'} in your portfolio`}</p></div>}
        {tab==='overview'    &&<Overview     portfolio={portfolio} onAddDocs={handleFiles} onScan={()=>setShowCamera(true)} onManual={()=>setShowManual(true)} user={user} onToggleCheck={toggleCheck} setTab={setTab}/>}
        {tab==='properties'  &&<Properties   portfolio={portfolio} onAddDocs={handleFiles} onAddDocsToProp={handleFilesForProp} onEdit={setFormProp} onAdd={()=>{if(atLimit){setShowUpgrade(true)}else{setFormProp({})}}} maxProps={maxProps} onUpgrade={()=>setShowUpgrade(true)}/>}
        {tab==='tenants'     &&<TenantsTab    portfolio={portfolio} setPortfolio={setPortfolio}/>}
        {tab==='resources'   &&<ResourcesTab/>}
        {tab==='content'    &&<ContentQueueTab user={user}/>}
        {tab==='finance'     &&<FinanceTab    portfolio={portfolio} setPortfolio={setPortfolio}/> }
        {tab==='rent'        &&<RentTracker   portfolio={portfolio} setPortfolio={setPortfolio}/> }
        {tab==='maintenance' &&<MaintenanceTab portfolio={portfolio} setPortfolio={setPortfolio} userId={user?.id}/>}
        {tab==='tools'       &&<ToolsTab      portfolio={portfolio} setPortfolio={setPortfolio}/> }
        {tab==='conditions'  &&<div className='fade-up'><ConditionReport portfolio={portfolio} setPortfolio={setPortfolio} userId={user?.id}/></div>}
        {tab==='legislation' &&<LegislationTab portfolio={portfolio}/>}
        {tab==='ai'          &&<AITab         portfolio={portfolio}/>}
        {tab==='hmo'         &&<HMOTab         portfolio={portfolio} setPortfolio={setPortfolio}/>}
        {tab==='invoicing'   &&<InvoicingTab   portfolio={portfolio}/>}
        <div style={{marginTop:32,paddingTop:16,borderTop:'0.5px solid var(--border)',fontSize:11,color:'var(--text-3)',lineHeight:1.7,textAlign:'center'}}>
          Lettly provides information and tools to help you manage your properties. Nothing on this platform constitutes legal, financial, or compliance advice. You remain solely responsible for complying with all landlord obligations. Always consult a qualified solicitor or accountant before making legal or financial decisions.
          {' '}<a href="/terms" style={{color:'var(--text-3)',textDecoration:'underline'}}>Terms of Service</a>
        </div>
      </div>
    </div>
    {formProp!==null&&<PropertyForm initial={formProp} onSave={updateProperty} onDelete={deleteProperty} onClose={()=>setFormProp(null)}/>}
    {showManual&&<ManualEntryModal portfolio={portfolio} onMerge={extracted=>{setPortfolio(prev=>mergeDoc(prev,extracted))}} onClose={()=>setShowManual(false)}/>}
    <BottomNav tab={tab} setTab={setTab} portfolio={portfolio} user={user}/>
  </>
}
function getGreeting(){const h=new Date().getHours();return h<12?'morning':h<18?'afternoon':'evening'}

export async function getServerSideProps(){return{props:{}}}
