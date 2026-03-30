import Head from 'next/head'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Landing() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <Head>
        <title>Lettly - Manage your rental property yourself, and save</title>
        <meta name="theme-color" content="#1b5e3b"/>
        <link rel="manifest" href="/manifest.json"/>
        <link rel="apple-touch-icon" href="/icon.svg"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-title" content="Lettly"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Everything UK landlords need to self-manage their properties. Compliance tracking, financial planning, AI document reading and more. Save £1,000-£3,000 a year." />
      </Head>

      <style>{`
        * { box-sizing: border-box; }
        .hero-title {
          font-family: var(--display);
          font-size: clamp(38px, 6vw, 68px);
          font-weight: 300;
          line-height: 1.08;
          color: var(--text);
          letter-spacing: -0.5px;
        }
        .hero-em { font-style: italic; color: var(--brand); }
        .section-title {
          font-family: var(--display);
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 300;
          color: var(--text);
          line-height: 1.18;
        }
        .section-sub {
          font-size: clamp(15px, 1.8vw, 17px);
          color: var(--text-2);
          line-height: 1.8;
        }
        .btn-primary {
          display: inline-block;
          background: var(--brand);
          color: #fff;
          font-size: 17px;
          font-weight: 600;
          padding: 18px 40px;
          border-radius: 14px;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(27,94,59,0.28);
          transition: transform 0.15s, box-shadow 0.15s;
          border: none;
          cursor: pointer;
          font-family: var(--font);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(27,94,59,0.34); }
        .btn-ghost {
          display: inline-block;
          color: var(--text-2);
          font-size: 16px;
          padding: 18px 28px;
          border-radius: 14px;
          text-decoration: none;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          transition: border-color 0.15s, color 0.15s;
          font-family: var(--font);
        }
        .btn-ghost:hover { border-color: var(--brand); color: var(--brand); }
        .saving-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fff8e8;
          border: 1px solid #f0d070;
          border-radius: 24px;
          padding: 9px 22px;
          font-size: 15px;
          font-weight: 600;
          color: #7a5000;
        }
        .pain-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px 22px;
        }
        .feature-block {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px 30px;
        }
        .trust-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 9px 20px;
          font-size: 14px;
          color: var(--text-2);
          font-weight: 500;
        }
        .stat-big {
          font-family: var(--display);
          font-size: clamp(40px, 6vw, 58px);
          font-weight: 300;
          color: var(--brand);
          line-height: 1;
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up   { animation: fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up-2 { animation: fadeUp 0.55s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up-3 { animation: fadeUp 0.55s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .cta-row { flex-direction: column; align-items: stretch; }
          .cta-row a { text-align: center; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: 1fr 1fr !important; }
          .trust-pills { flex-direction: column; align-items: center; }
        }
        @media (max-width: 480px) {
          .grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

        {/* ── Nav ── */}
        <nav style={{
          position:'sticky', top:0, zIndex:100,
          background: scrolled ? 'rgba(247,245,240,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : 'none',
          padding:'0 clamp(16px,4vw,48px)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          height:68, transition:'all 0.25s'
        }}>
          <a href="#" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}} style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <div style={{ width:38, height:38, background:'var(--brand)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:20, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:400, color:'var(--text)' }}>Lettly</span>
          </a>
          <div className="hide-mobile" style={{ display:'flex', gap:32, alignItems:'center' }}>
            {[['How it works','#how-it-works'],['Features','#features'],['Pricing','#pricing'],['Blog','/blog']].map(([l,h]) => (
              <a key={l} href={h} style={{ fontSize:14, color:'var(--text-2)', textDecoration:'none', transition:'color 0.15s' }}
                onMouseEnter={e=>e.target.style.color='var(--text)'} onMouseLeave={e=>e.target.style.color='var(--text-2)'}>{l}</a>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <a href="https://accounts.lettly.co/sign-in" className="btn-ghost" style={{ fontSize:14, padding:'9px 20px' }}>Sign in</a>
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary" style={{ fontSize:14, padding:'10px 22px', boxShadow:'0 2px 12px rgba(27,94,59,0.22)' }}>Try free for 14 days</a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ maxWidth:860, margin:'0 auto', padding:'clamp(60px,9vw,116px) clamp(20px,4vw,48px) clamp(52px,7vw,88px)', textAlign:'center' }}>

          <div className="saving-badge fade-up" style={{ marginBottom:34 }}>
            <span>💰</span> Landlords save £1,000–£3,000/year switching to Lettly
          </div>

          <h1 className="hero-title fade-up-2" style={{ marginBottom:24 }}>
            Manage your rental property<br/>
            <span className="hero-em">yourself, on your terms</span>
          </h1>

          <p className="section-sub fade-up-3" style={{ maxWidth:580, margin:'0 auto 44px', fontSize:'clamp(16px,2vw,19px)' }}>
            Everything you need to self-manage your properties with confidence. Compliance tracking, AI document reading, financial planning, expense recording, CGT calculations, and more, all in one place.
          </p>

          <p style={{ fontSize:15, color:'var(--text-2)', marginBottom:20, fontWeight:500 }}>
            Typical saving: <span style={{ color:'var(--brand)', fontWeight:600 }}>£1,020/year</span> on a single £850/mo property
          </p>
          <div className="cta-row fade-up-3" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:22 }}>
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary">
              Start self-managing your property →
            </a>
            <a href="#how-it-works" className="btn-ghost">
              See how it works
            </a>
          </div>

          <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:52 }}>
            Free for 14 days · No credit card · Takes 2 minutes
          </p>

          <div className="trust-pills" style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:40 }}>
            {[
              { icon:'🇬🇧', text:'Built for UK landlords' },
              { icon:'🏴', text:'England, Scotland and Wales covered' },
              { icon:'🔒', text:'Your data stays private' },
            ].map(t => (
              <span key={t.text} className="trust-pill"><span>{t.icon}</span>{t.text}</span>
            ))}
          </div>

          {/* Feature strip */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:40 }}>
            <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:28, textTransform:'uppercase', letterSpacing:'1px', fontWeight:700 }}>Everything included on every plan</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'16px 24px', textAlign:'left', maxWidth:860, margin:'0 auto' }}>
              {[
                { icon:'📄', label:'AI document extraction' },
                { icon:'⚖️', label:'Nation-specific compliance' },
                { icon:'📊', label:'Deal analyser' },
                { icon:'🧮', label:'CGT planner' },
                { icon:'🏢', label:'Ltd vs personal modeller' },
                { icon:'💷', label:'Expense tracker (HMRC)' },
                { icon:'📅', label:'Rent reminders to tenants' },
                { icon:'🔍', label:'Legislation monitor' },
                { icon:'🤖', label:'AI landlord assistant' },
                { icon:'📋', label:'Document generator' },
                { icon:'🏚️', label:'Void period tracker' },
                { icon:'🔧', label:'Contractor directory' },
                { icon:'🏠', label:'HMO management suite' },
                { icon:'🔥', label:'Fire safety tracking' },
                { icon:'📜', label:'HMO licence tracker' },
              ].map(f => (
                <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface)', borderRadius:10, padding:'10px 14px', border:'0.5px solid var(--border)' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{f.icon}</span>
                  <span style={{ fontSize:14, fontWeight:500, color:'var(--text)', lineHeight:1.4 }}>{f.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:24, fontSize:14, color:'var(--text-3)' }}>
              and more, <a href="#features" style={{ color:'var(--brand)', textDecoration:'none', fontWeight:600 }}>see all features →</a>
            </div>
          </div>
        </section>

        {/* ── SAVINGS BAR ── */}
        <section style={{ background:'var(--brand)', padding:'48px clamp(20px,4vw,48px)' }}>
          <div className="grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, maxWidth:900, margin:'0 auto', textAlign:'center' }}>
            {[
              { num:'£2,000', label:'Average annual saving', sub:'vs. full-service management fees' },
              { num:'10–20%', label:'Typical agent fee', sub:'typical full-service management fee' },
              { num:'1 place', label:'Everything managed', sub:'documents, rent, compliance' },
              { num:'2 min', label:'To set up', sub:'drop your documents and go' },
            ].map(s => (
              <div key={s.num}>
                <div style={{ fontFamily:'var(--display)', fontSize:'clamp(26px,4vw,38px)', fontWeight:300, color:'#fff', lineHeight:1, marginBottom:7 }}>{s.num}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.9)', marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RENTERS RIGHTS ACT URGENCY BANNER ── */}
        <section style={{ background:'#1c1a16', padding:'clamp(20px,3vw,28px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, flex:1 }}>
              <div style={{ background:'#E24B4A', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:700, color:'#fff', whiteSpace:'nowrap', flexShrink:0 }}>1 MAY 2026</div>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginBottom:3 }}>Renters Rights Act comes into force in England</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>Section 21 abolished. No more fixed-term ASTs. PRS Database registration required before serving any notice. Is your portfolio ready?</div>
              </div>
            </div>
            <a href="https://accounts.lettly.co/sign-up" style={{ flexShrink:0, background:'#E24B4A', color:'#fff', borderRadius:9, padding:'10px 22px', fontSize:13, fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>Check your compliance →</a>
          </div>
        </section>

        {/* ── PROBLEM → SOLUTION ── */}
        <section style={{ maxWidth:940, margin:'0 auto', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <h2 className="section-title" style={{ marginBottom:16 }}>Self-managing is easier<br/>than you think</h2>
            <p className="section-sub" style={{ maxWidth:520, margin:'0 auto' }}>
              With the right tools, you can manage your properties professionally, stay fully compliant, and keep more of your rental income.
            </p>
          </div>

          <div className="grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:44 }}>
            {/* Lettly column, LEFT, green, prominent */}
            <div style={{ background:'var(--brand-subtle)', border:'1.5px solid var(--brand)', borderRadius:16, padding:'20px 18px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--brand)', display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <div style={{ width:28, height:28, background:'var(--brand)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:'#fff', fontSize:14, fontWeight:700, fontFamily:'Georgia, serif', fontStyle:'italic' }}>L</span>
                  </div>
                  <span style={{ fontSize:15, fontWeight:600, fontFamily:'Georgia, serif', color:'var(--brand)' }}>Lettly</span>
                </div>
              {[
                { icon:'✅', title:'Keep your rent, all of it', body:'Manage yourself and save £1,000 to £3,000 per year. Lettly starts at just £8/month for 1-2 properties.' },
                { icon:'📲', title:'Drop a document, done', body:'Upload your gas cert, EICR or tenancy agreement. Lettly reads it and tracks every date automatically.' },
                { icon:'🛡️', title:'Stay compliant automatically', body:'Lettly reads your property postcode and applies the right law for England, Scotland or Wales. Reminders before every deadline.' },
                { icon:'📊', title:'One place for everything', body:'Tenants, rent, expenses, maintenance, documents, CGT, deal analysis. All in one dashboard.' },
              ].map(s => (
                <div key={s.title} style={{ marginBottom:12, background:'#fff', borderRadius:10, padding:'12px 14px', border:'0.5px solid rgba(27,94,59,0.15)' }}>
                  <div style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--brand)', marginBottom:3 }}>{s.title}</div>
                      <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.65 }}>{s.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Without column, RIGHT, muted, faded */}
            <div style={{ opacity:0.75 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Without Lettly</div>
              {[
                { icon:'💸', title:'Paying 10-20% in management fees', body:"On a £1,200/month property, that's up to £2,880/year straight out of your pocket." },
                { icon:'📁', title:'Chasing paperwork', body:'Gas certs, EICRs, EPCs, insurance renewals. All in different places, easy to miss.' },
                { icon:'😰', title:'Three different sets of landlord law', body:'One missed requirement can mean fines, an invalid notice, or losing your case in court.' },
                { icon:'📱', title:'Managing everything manually', body:'WhatsApp chains, sticky notes, and spreadsheets that only you understand.' },
              ].map(p => (
                <div key={p.title} style={{ marginBottom:12, background:'var(--surface2)', borderRadius:10, padding:'12px 14px', border:'0.5px solid var(--border)' }}>
                  <div style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <span style={{ fontSize:18, flexShrink:0, marginTop:1, filter:'grayscale(0.4)' }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text-2)', marginBottom:3 }}>{p.title}</div>
                      <div style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.65 }}>{p.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign:'center' }}>
            <div style={{ display:'inline-block', background:'var(--brand-light)', border:'1px solid rgba(27,94,59,0.15)', borderRadius:16, padding:'20px 36px' }}>
              <div style={{ fontFamily:'var(--display)', fontSize:'clamp(18px,2.5vw,23px)', fontWeight:300, color:'var(--brand)', lineHeight:1.5 }}>
                Lettly gives self-managing landlords a simple,<br/><em style={{fontStyle:'italic'}}>all-in-one dashboard.</em>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIRECT COST COMPARISON ── */}
        <section style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'clamp(48px,6vw,72px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:860, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:44 }}>
              <h2 className="section-title" style={{ marginBottom:14 }}>What you actually pay</h2>
              <p className="section-sub" style={{ maxWidth:500, margin:'0 auto' }}>Full-service management charges a percentage of every rent payment. Lettly is a flat annual fee.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
              {/* Lettly column - LEFT */}
              <div style={{ background:'var(--brand-subtle)', border:'2px solid var(--brand)', borderRadius:20, padding:'clamp(24px,3vw,36px)', position:'relative' }}>
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'var(--brand)', color:'#fff', borderRadius:20, padding:'5px 18px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>Replace your agent</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <div style={{ width:28, height:28, background:'var(--brand)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:'#fff', fontSize:14, fontWeight:700, fontFamily:'Georgia, serif', fontStyle:'italic' }}>L</span>
                  </div>
                  <span style={{ fontSize:15, fontWeight:600, fontFamily:'Georgia, serif', color:'var(--brand)' }}>Lettly</span>
                </div>
                {[
                  { label:'All properties (1–2)', value:'£8/month' },
                  { label:'All properties (3–5)', value:'£16/month' },
                  { label:'All properties (6–10)', value:'£24/month' },
                  { label:'Tenant finding portals', value:'From £29 one-off (OpenRent)' },
                  { label:'Annual total (1–2 props)', value:'£96/year', bold:true },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid rgba(27,94,59,0.15)' }}>
                    <span style={{ fontSize:13, color:'var(--brand)' }}>{r.label}</span>
                    <span style={{ fontSize:13, fontWeight:r.bold?700:500, color:'var(--brand)' }}>{r.value}</span>
                  </div>
                ))}
              </div>
              {/* Agent column - RIGHT, muted */}
              <div style={{ background:'#fce8e6', border:'1px solid #f5b8b4', borderRadius:20, padding:'clamp(24px,3vw,36px)', opacity:0.82 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#791F1F', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:20 }}>Full-service management</div>
                {[
                  { label:'Management fee', value:'10–15% of rent monthly' },
                  { label:'Let-only fee', value:'50–100% of first month rent' },
                  { label:'Renewal fee', value:'£100–£300 per tenancy' },
                  { label:'Maintenance markup', value:'10–15% on top of contractor' },
                  { label:'Annual total (£900/mo rent)', value:'£1,080–£1,620/year', bold:true },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'0.5px solid rgba(224,72,72,0.2)' }}>
                    <span style={{ fontSize:13, color:'#791F1F' }}>{r.label}</span>
                    <span style={{ fontSize:13, fontWeight:r.bold?700:500, color:'#791F1F' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'center', background:'var(--brand)', borderRadius:16, padding:'20px 28px' }}>
              <div style={{ fontFamily:'var(--display)', fontSize:'clamp(20px,3vw,28px)', fontWeight:300, color:'#fff', marginBottom:6 }}>
                Self-manage with Lettly and keep <span style={{ fontStyle:'italic' }}>£924–£1,524</span> more every year
              </div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,0.7)' }}>Based on a £900/month property. Your saving depends on your current agent fee.</div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ background:'var(--surface2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <h2 className="section-title" style={{ marginBottom:14 }}>Set up your portfolio<br/>in under 60 seconds</h2>
              <p className="section-sub">No manual data entry. No spreadsheets. Just drop your documents and go.</p>
            </div>
            <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {[
                { num:'1', icon:'📂', title:'Drop your documents', body:'Drag in any PDF or photo: gas certs, EICRs, insurance, tenancy agreements, mortgage offers. Works on your phone or computer.' },
                { num:'2', icon:'🤖', title:'Lettly reads them instantly', body:'Our AI extracts every date, name and figure automatically. Your property portfolio appears in seconds. No typing required.' },
                { num:'3', icon:'✅', title:'Stay compliant and in control', body:"Lettly detects your property's postcode and applies the right law. England, Scotland and Wales each have different rules. All tracked automatically, explained in plain English." },
              ].map(s => (
                <div key={s.num} className="feature-block">
                  <div style={{ width:46, height:46, background:'var(--brand)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:22 }}>
                    <span style={{ color:'#fff', fontFamily:'var(--display)', fontSize:22, fontWeight:600 }}>{s.num}</span>
                  </div>
                  <div style={{ fontSize:24, marginBottom:14 }}>{s.icon}</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:21, fontWeight:400, color:'var(--text)', marginBottom:10 }}>{s.title}</div>
                  <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.8 }}>{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT PREVIEW ── */}
        <section style={{ background:'var(--surface2)', borderTop:'1px solid var(--border)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:44 }}>
              <h2 className="section-title" style={{ marginBottom:14 }}>Everything in one place</h2>
              <p className="section-sub" style={{ maxWidth:520, margin:'0 auto' }}>Drop a document. Lettly reads it, matches it to the right property, and updates your compliance dashboard - instantly.</p>
            </div>
            {/* Dashboard mockup */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.08)' }}>
              {/* Mock nav bar */}
              <div style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, background:'var(--brand)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#fff', fontSize:14, fontWeight:700, fontFamily:'Georgia, serif', fontStyle:'italic' }}>L</span>
                  </div>
                  <span style={{ fontFamily:'Georgia, serif', fontSize:16 }}>Lettly</span>
                </div>
                <div style={{ display:'flex', gap:4, background:'var(--surface2)', padding:3, borderRadius:8 }}>
                  {['Overview','Properties','Compliance','Finance','AI'].map((t,i) => (
                    <span key={t} style={{ padding:'4px 12px', borderRadius:6, fontSize:11, fontWeight:500, background:i===0?'var(--surface)':'transparent', border:i===0?'0.5px solid var(--border)':'none', color:i===0?'var(--text)':'var(--text-3)' }}>{t}</span>
                  ))}
                </div>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'#fff', fontSize:11, fontWeight:600 }}>M</span>
                </div>
              </div>
              {/* Mock content */}
              <div style={{ padding:'24px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {/* Property cards */}
                {[
                  { name:'42 Victoria Road', nation:'England', status:'lettable', checks:['Gas cert ✓','EICR ✓','EPC C ✓','Insurance ✓','Deposit ✓'] },
                  { name:'8 Maple Close', nation:'England', status:'lettable', checks:['Gas cert ✓','EICR ✓','EPC B ✓','Insurance ✓','Deposit ✓'] },
                  { name:'14 Ashbrook Lane', nation:'England', status:'warning', checks:['Gas cert ✓','EICR due 14/06 ⚠️','EPC D - upgrade 2028','Insurance ✓','Deposit ✓'] },
                ].map(p => (
                  <div key={p.name} style={{ background:'var(--surface)', border:`0.5px solid ${p.status==='warning'?'#f5b8b4':'var(--border)'}`, borderRadius:12, padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{p.name}</div>
                        <div style={{ fontSize:10, color:'var(--text-3)' }}>{p.nation}</div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:p.status==='lettable'?'var(--green-bg)':'#fce8e6', color:p.status==='lettable'?'var(--green)':'#791F1F' }}>{p.status==='lettable'?'Lettable':'Action needed'}</div>
                    </div>
                    {p.checks.map(ch => (
                      <div key={ch} style={{ fontSize:11, color:ch.includes('⚠️')||ch.includes('2028')?'#b45309':ch.includes('✓')?'var(--text-2)':'var(--text-3)', padding:'3px 0', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ color:ch.includes('⚠️')||ch.includes('2028')?'#b45309':ch.includes('✓')?'var(--green)':'var(--red)', fontWeight:600, fontSize:10 }}>{ch.includes('⚠️')||ch.includes('2028')?'!':ch.includes('✓')?'✓':'✗'}</span>
                        {ch.replace(' ✓','').replace(' ⚠️','')}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ padding:'0 20px 20px', display:'flex', gap:8 }}>
                <div style={{ flex:1, background:'var(--green-bg)', border:'0.5px solid var(--green)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--green)' }}>
                  <span style={{ fontWeight:600 }}>2 properties</span> legally lettable
                </div>
                <div style={{ flex:1, background:'#fff8e1', border:'0.5px solid #EF9F27', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#633806' }}>
                  <span style={{ fontWeight:600 }}>1 property</span> needs attention
                </div>
                <div style={{ flex:1, background:'var(--brand-subtle)', border:'0.5px solid rgba(27,94,59,0.2)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--brand)' }}>
                  Drop a document to auto-fill →
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ maxWidth:940, margin:'0 auto', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <h2 className="section-title" style={{ marginBottom:14 }}>Everything you need<br/>to manage your rental</h2>
            <p className="section-sub" style={{ maxWidth:500, margin:'0 auto' }}>Built specifically for UK private landlords. No tech skills needed.</p>
          </div>

          <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
            {[
              {
                icon:'🧾',
                title:'Compliance made simple',
                items:['Gas safety certificate tracking','EICR electrical inspection alerts','EPC rating and 2028 upgrade guide','Nation-specific rules by property postcode','Email reminders before every deadline'],
              },
              {
                icon:'💸',
                title:'Rent & tenant tracking',
                items:['Track rent payments month by month','Manage all tenants in one place','Maintenance log with photos','Tenant issue reporting portal','Tax year export for your accountant','Section 8 notices generated for you'],
              },
              {
                icon:'📊',
                title:'All-in-one dashboard',
                items:['No spreadsheets, ever','No WhatsApp chaos','Finance and P&L tracker',"Renters' Rights Bill guidance",'Works on phone and computer'],
              },
              {
                icon:'🏠',
                title:'HMO management suite',
                items:['Room-by-room tenant and rent tracking','HMO licence number and expiry tracking','Fire risk assessment and review dates','PAT testing and emergency lighting records','10-point fire safety compliance checklist','Room size checker against mandatory minimums'],
                highlight:true,
              },
            ].map(f => (
              <div key={f.title} className="feature-block" style={f.highlight?{border:'1.5px solid var(--brand)',background:'var(--brand-subtle)'}:{}}>
                {f.highlight&&<div style={{fontSize:11,fontWeight:700,color:'var(--brand)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>New feature</div>}
                <div style={{ fontSize:34, marginBottom:20 }}>{f.icon}</div>
                <div style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:400, color:f.highlight?'var(--brand)':'var(--text)', marginBottom:20 }}>{f.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                  {f.items.map(item => (
                    <div key={item} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:14, color:'var(--text-2)', lineHeight:1.5 }}>
                      <span style={{ color:'var(--brand)', fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NATIONS LEGISLATION ── */}
        <section style={{ background:'var(--brand)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(28px,4vw,44px)', fontWeight:300, color:'#fff', lineHeight:1.18, marginBottom:14 }}>
                England, Scotland and Wales<br/>each have different landlord laws
              </h2>
              <p style={{ fontSize:'clamp(15px,1.8vw,17px)', color:'rgba(255,255,255,0.75)', lineHeight:1.8, maxWidth:560, margin:'0 auto' }}>
                Lettly detects your property postcode and applies the correct legislation automatically. No guessing. No getting it wrong.
              </p>
            </div>

            <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
              {[
                {
                  flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
                  nation:'England',
                  color:'rgba(255,255,255,0.12)',
                  items:[
                    { urgent:true,  text:"Renters Rights Act: Section 21 abolished from 1 May 2026 for new tenancies" },
                    { urgent:true,  text:"Fixed-term ASTs no longer available for new tenancies from 1 May 2026" },
                    { urgent:true,  text:"PRS Database registration required before serving notice" },
                    { urgent:false, text:"Awaab's Law: damp and mould response within 14 days" },
                    { urgent:false, text:"EPC minimum C required for new lets from 2028" },
                    { urgent:false, text:"Decent Homes Standard extended to private rented sector" },
                  ]
                },
                {
                  flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
                  nation:'Scotland',
                  color:'rgba(255,255,255,0.12)',
                  items:[
                    { urgent:true,  text:"Private Residential Tenancy (PRT) replaced ASTs in Scotland from December 2017" },
                    { urgent:true,  text:"Mandatory landlord registration with local council" },
                    { urgent:true,  text:"No fixed-term tenancies. Tenants can leave anytime." },
                    { urgent:false, text:"Repairing Standard: mandatory property condition rules" },
                    { urgent:false, text:"SafeDeposits Scotland: different deposit scheme rules" },
                    { urgent:false, text:"Rent control zones in some local authority areas" },
                  ]
                },
                {
                  flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
                  nation:'Wales',
                  color:'rgba(255,255,255,0.12)',
                  items:[
                    { urgent:true,  text:"Occupation Contracts replaced ASTs in Wales from 1 December 2022" },
                    { urgent:true,  text:"Rent Smart Wales: mandatory registration and licence" },
                    { urgent:true,  text:"29 fitness standards apply throughout every tenancy" },
                    { urgent:false, text:"6-month occupation period before notice can be served" },
                    { urgent:false, text:"Different deposit rules: max 1 month rent" },
                    { urgent:false, text:"Carbon monoxide alarm rules differ from England" },
                  ]
                },
              ].map(n => (
                <div key={n.nation} style={{ background:n.color, borderRadius:16, padding:'24px 20px', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <span style={{ fontSize:24 }}>{n.flag}</span>
                    <div style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:400, color:'#fff' }}>{n.nation}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {n.items.map((item,i) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ flexShrink:0, fontSize:11, marginTop:2, color:item.urgent?'#ffd166':'rgba(255,255,255,0.5)' }}>
                          {item.urgent ? '⚠' : '○'}
                        </span>
                        <span style={{ fontSize:13, color:item.urgent?'rgba(255,255,255,0.95)':'rgba(255,255,255,0.65)', lineHeight:1.5, fontWeight:item.urgent?500:400 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign:'center', marginTop:36 }}>
              <div style={{ display:'inline-block', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:12, padding:'14px 28px', fontSize:14, color:'rgba(255,255,255,0.9)', lineHeight:1.6, maxWidth:560 }}>
                Lettly applies the right rules for each nation automatically based on postcode. Add a property in Aberdeen and you get Scottish law. Add one in Cardiff and you get Welsh law.
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY LANDLORDS SWITCH ── */}
        <section style={{ background:'var(--surface2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <h2 className="section-title">Why landlords switch to Lettly</h2>
            </div>
            <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {[
                { stat:'£2,000+', label:'Saved per year', body:'Compared to typical full-service management fees of 10-15% of rent.' },
                { stat:'100%', label:'Control of your property', body:'Full control. You manage the relationship with your tenant and make all the decisions.' },
                { stat:'2 min', label:'To feel the benefit', body:'Upload your first document and your compliance dashboard populates instantly.' },
              ].map(s => (
                <div key={s.stat} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'36px 28px', textAlign:'center' }}>
                  <div className="stat-big" style={{ marginBottom:10 }}>{s.stat}</div>
                  <div style={{ fontSize:17, fontWeight:600, color:'var(--text)', marginBottom:10 }}>{s.label}</div>
                  <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.7 }}>{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRUST SECTION ── */}
        <section style={{ maxWidth:940, margin:'0 auto', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <h2 className="section-title" style={{ marginBottom:14 }}>Built for UK landlords,<br/>by people who understand the market</h2>
          </div>

          <div className="grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:40 }}>
            {[
              { icon:'🇬🇧', title:'England, Scotland and Wales all covered', body:"Lettly uses your property postcode to apply the right legislation automatically. England has the Renters Rights Act. Scotland has the PRT regime. Wales has Occupation Contracts. All three are different." },
              { icon:'⚖️', title:'Based on real compliance requirements', body:"Gas safety, EICRs, EPCs, deposit schemes, the Renters' Rights Bill. All the rules that actually affect you, tracked automatically." },
              { icon:'🌱', title:'Early access: help shape the product', body:"You're joining at the beginning. Your feedback directly shapes what we build next. We respond to every message personally." },
              { icon:'🔒', title:'Your data is secure and private', body:"Bank-grade authentication. AES-256 encryption. Stored in the UK. We never sell your data to third parties. Ever." },
            ].map(t => (
              <div key={t.title} className="pain-card">
                <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <span style={{ fontSize:28, flexShrink:0 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:7 }}>{t.title}</div>
                    <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.75 }}>{t.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'var(--brand-light)', border:'1px solid rgba(27,94,59,0.15)', borderRadius:20, padding:'32px 28px' }}>
              <div style={{ fontSize:28, color:'var(--brand)', marginBottom:14, fontFamily:'Georgia, serif', lineHeight:1, fontWeight:300 }}>&ldquo;</div>
              <div style={{ fontFamily:'var(--display)', fontSize:'clamp(16px,2vw,20px)', fontWeight:300, fontStyle:'italic', color:'var(--brand)', marginBottom:16, lineHeight:1.6 }}>
                I was paying £180 a month in management fees. Lettly gives me all the tools I need for £8. I wish I had found it sooner.
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>D</span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>David R.</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>2 properties · Yorkshire</div>
                </div>
              </div>
            </div>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:20, padding:'32px 28px' }}>
              <div style={{ fontSize:28, color:'var(--text-3)', marginBottom:14, fontFamily:'Georgia, serif', lineHeight:1, fontWeight:300 }}>&ldquo;</div>
              <div style={{ fontFamily:'var(--display)', fontSize:'clamp(16px,2vw,20px)', fontWeight:300, fontStyle:'italic', color:'var(--text)', marginBottom:16, lineHeight:1.6 }}>
                The compliance dashboard is what sold it for me. Gas cert, EICR, EPC all in one place with reminders. I never have to think about it.
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface3)', border:'0.5px solid var(--border-strong)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'var(--text-2)', fontSize:13, fontWeight:600 }}>S</span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>Sarah M.</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>3 properties · Manchester</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ background:'var(--surface2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <h2 className="section-title" style={{ marginBottom:14 }}>Simple, transparent pricing</h2>
              <p className="section-sub" style={{ maxWidth:480, margin:'0 auto 28px' }}>
                Starts at £8/month for 1-2 properties. All features included. 14-day free trial. No contract. Tax year export included on all plans.
              </p>
              <div style={{ display:'inline-block', background:'var(--brand-light)', border:'1px solid rgba(27,94,59,0.2)', borderRadius:12, padding:'12px 28px', fontSize:15, fontWeight:600, color:'var(--brand)' }}>
                Compare to management fees of £100 to £200/month per property
              </div>
            </div>

            <div className="grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
              {[
                { name:'Starter',   price:'£8',  props:'1–2 properties',          popular:false },
                { name:'Standard',  price:'£16', props:'3–4 properties',           popular:false },
                { name:'Portfolio', price:'£28', props:'5–7 properties',           popular:true  },
                { name:'Pro',       price:'£40', props:'8+ properties unlimited',  popular:false },
              ].map(plan => (
                <div key={plan.name} style={{
                  background: plan.popular ? 'var(--brand)' : 'var(--surface)',
                  border: plan.popular ? 'none' : '1px solid var(--border)',
                  borderRadius:18, padding:'26px 20px', position:'relative', display:'flex', flexDirection:'column'
                }}>
                  {plan.popular && <div style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'2px 10px', fontSize:11, color:'#fff', fontWeight:600 }}>Popular</div>}
                  <div style={{ fontSize:13, fontWeight:500, color: plan.popular ? 'rgba(255,255,255,0.65)':'var(--text-2)', marginBottom:10 }}>{plan.name}</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:42, fontWeight:300, color: plan.popular ? '#fff':'var(--text)', lineHeight:1, marginBottom:4 }}>{plan.price}</div>
                  <div style={{ fontSize:12, color: plan.popular ? 'rgba(255,255,255,0.5)':'var(--text-3)', marginBottom:16 }}>per month</div>
                  <div style={{ fontSize:13, fontWeight:500, color: plan.popular ? 'rgba(255,255,255,0.9)':'var(--brand)', marginBottom:20, padding:'7px 12px', background: plan.popular ? 'rgba(255,255,255,0.12)':'var(--brand-light)', borderRadius:10, textAlign:'center' }}>{plan.props}</div>
                  {['Document AI extraction','Compliance tracking','Rent & tenant tracker','Finance & P&L','Maintenance log','Legislation centre','Lettly AI assistant'].map(f => (
                    <div key={f} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:13, color: plan.popular ? 'rgba(255,255,255,0.75)':'var(--text-2)', marginBottom:8, lineHeight:1.4 }}>
                      <span style={{ color: plan.popular ? 'rgba(255,255,255,0.5)':'var(--green)', flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                  <a href="https://accounts.lettly.co/sign-up" style={{
                    display:'block', textAlign:'center', marginTop:'auto', paddingTop:20,
                    background: plan.popular ? '#fff':'var(--brand)',
                    color: plan.popular ? 'var(--brand)':'#fff',
                    fontSize:14, fontWeight:600, padding:'12px 16px', borderRadius:10, textDecoration:'none'
                  }}>Start free trial</a>
                </div>
              ))}
            </div>
            <p style={{ textAlign:'center', fontSize:13, color:'var(--text-3)' }}>
              14-day free trial on all plans · No credit card required · Cancel anytime
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ maxWidth:700, margin:'0 auto', padding:'clamp(72px,10vw,120px) clamp(20px,4vw,48px)', textAlign:'center' }}>
          <h2 className="section-title" style={{ marginBottom:20 }}>
            Start managing your rental today
          </h2>
          <p className="section-sub" style={{ maxWidth:480, margin:'0 auto 44px' }}>
            Join landlords who self-manage with confidence and keep more of their rental income. Free to start. Takes 2 minutes.
          </p>
          <a href="https://accounts.lettly.co/sign-up" className="btn-primary" style={{ fontSize:19, padding:'22px 56px' }}>
            Get started in 2 minutes →
          </a>
          <p style={{ fontSize:14, color:'var(--text-3)', marginTop:18 }}>
            No credit card · No contract · Cancel anytime
          </p>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', padding:'32px clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
            <a href="#" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}} style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
              <div style={{ width:30, height:30, background:'var(--brand)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:'#fff', fontSize:15, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
              </div>
              <span style={{ fontFamily:'var(--display)', fontSize:17, fontWeight:400, color:'var(--text)' }}>Lettly</span>
            </a>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {[['Privacy','/privacy'],['Terms','/terms'],['Security','/security'],['Blog','/blog'],['Contact','mailto:hello@lettly.co']].map(([l,h]) => (
                <a key={l} href={h} style={{ fontSize:13, color:'var(--text-3)', textDecoration:'none' }}>{l}</a>
              ))}
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>© 2026 Lettly · Built in the UK for UK landlords</div>
          </div>
        </footer>

      </div>
    </>
  )
}
