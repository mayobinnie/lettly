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

  useEffect(()=>{loadItems()},[filter,typeFilter])

  async function publishPost(id){
    const isAdmin = user?.publicMetadata?.admin || (user?.emailAddresses?.[0]?.emailAddress||'').includes('lettly.co')
    const r = await fetch('/api/blog/publish', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({itemId:id, isAdmin})})
    const d = await r.json()
    if(d.ok) {
      await loadItems()
      alert('Published! Blog post live at lettly.co/blog/' + d.slug)
    } else {
      alert('Publish failed: ' + (d.error||'unknown error'))
    }
  }

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
        : {manual:true,mode:mode}
      const r = await fetch('/api/admin/trigger-content',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
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
    social_facebook:'Facebook',
    social_twitter:'X / Twitter',
    email_blast:'Newsletter',
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
        <button onClick={()=>generateContent('countdown')} disabled={generating} style={{background:'#fce8e6',color:'#791F1F',border:'0.5px solid #E24B4A',borderRadius:8,padding:'7px 14px',fontSize:12,cursor:generating?'not-allowed':'pointer',opacity:generating?0.6:1,fontWeight:500}}>
          RRA countdown posts
        </button>
        <button onClick={()=>generateContent('newsletter')} disabled={generating} style={{background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 14px',fontSize:12,cursor:generating?'not-allowed':'pointer',opacity:generating?0.6:1}}>
          Draft monthly newsletter
        </button>
        <button onClick={()=>generateContent('social_from_blog')} disabled={generating} style={{background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:8,padding:'7px 14px',fontSize:12,cursor:generating?'not-allowed':'pointer',opacity:generating?0.6:1}}>
          Social posts from latest blog
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
      {['all','blog_post','social_instagram','social_linkedin','social_facebook','email_blast'].map(t=>
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
                <button onClick={e=>{e.stopPropagation();item.type==='blog_post'?publishPost(item.id):updateItem(item.id,{status:'published'})}} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:6,padding:'4px 12px',fontSize:11,fontWeight:500,cursor:'pointer'}}>{item.type==='blog_post'?'Publish to blog':'Mark published'}</button>
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
          {selected.status==='approved'&&<button onClick={()=>selected.type==='blog_post'?publishPost(selected.id):updateItem(selected.id,{status:'published'})} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:'pointer'}}>{selected.type==='blog_post'?'Publish to blog':'Mark published'}</button>}
          <button onClick={()=>{navigator.clipboard.writeText(selected.body||'')}} style={{background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,cursor:'pointer'}}>Copy</button>
        </div>
      </div>}
    </div>

    <div style={{marginTop:20,fontSize:11,color:'var(--text-3)',lineHeight:1.8,padding:'12px 14px',background:'var(--surface2)',borderRadius:10}}>
      <strong style={{color:'var(--text-2)'}}>How this works:</strong> The legislation monitor runs every Monday and triggers this agent automatically when it finds legal changes. The SEO agent runs every Wednesday and drafts 2 articles from the keyword list. You approve here, then copy the content to your blog or social scheduler. Nothing goes anywhere without your click.
    </div>
  </div>
}
