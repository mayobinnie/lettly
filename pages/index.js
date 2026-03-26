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
        <title>Lettly - AI property portfolio management for UK landlords</title>
        <meta name="theme-color" content="#1b5e3b"/>
        <link rel="manifest" href="/manifest.json"/>
        <link rel="apple-touch-icon" href="/icon.svg"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-title" content="Lettly"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="The only property platform built for the Renters' Rights Bill era. Drop your documents, Lettly reads them and keeps you compliant." />
      </Head>

      <style>{`
        * { box-sizing: border-box; }
        .hero-title { font-family: var(--display); font-size: clamp(36px, 6vw, 64px); font-weight: 300; line-height: 1.08; color: var(--text); }
        .hero-em { font-style: italic; color: var(--brand); }
        .section-title { font-family: var(--display); font-size: clamp(26px, 4vw, 40px); font-weight: 300; color: var(--text); line-height: 1.2; }
        .btn-primary { display: inline-block; background: var(--brand); color: #fff; font-size: 15px; font-weight: 500; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 20px rgba(27,94,59,0.25); transition: transform 0.15s, box-shadow 0.15s; border: none; cursor: pointer; font-family: var(--font); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(27,94,59,0.32); }
        .btn-ghost { display: inline-block; color: var(--text-2); font-size: 15px; padding: 14px 24px; border-radius: 12px; text-decoration: none; border: 0.5px solid var(--border-strong); background: var(--surface); transition: border-color 0.15s; font-family: var(--font); }
        .btn-ghost:hover { border-color: var(--brand-mid); }
        .feature-card { background: var(--surface); border: 0.5px solid var(--border); border-radius: 18px; padding: 28px 24px; transition: box-shadow 0.2s, transform 0.2s; }
        .feature-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
        .step-num { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; flex-shrink: 0; }
        .stat-num { font-family: var(--display); font-size: clamp(36px,5vw,52px); font-weight: 300; color: var(--brand); line-height: 1; }
        .ticker { display: inline-flex; align-items: center; gap: 7px; background: var(--brand-light); border: 0.5px solid rgba(27,94,59,0.18); border-radius: 20px; padding: 5px 14px; font-size: 12px; color: var(--brand); font-weight: 500; }
        .ticker-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); animation: pulse 1.5s ease infinite; }
        .doc-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 7px 16px; border-radius: 24px; font-weight: 500; }
        .testimonial { background: var(--surface); border: 0.5px solid var(--border); border-radius: 16px; padding: 24px; }
        .nav-sticky { background: var(--surface); border-bottom: 0.5px solid var(--border); }
        @media (max-width: 900px) { div[style*="repeat(4,1fr)"] { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .cta-row { flex-direction: column; align-items: stretch; }
          .cta-row a, .cta-row button { text-align: center; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

        {/* ── Sticky nav ── */}
        <nav style={{ position:'sticky', top:0, zIndex:100, background: scrolled ? 'var(--surface)' : 'transparent', borderBottom: scrolled ? '0.5px solid var(--border)' : 'none', padding:'0 clamp(16px,4vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, transition:'all 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'var(--brand)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontSize:18, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:20, fontWeight:400, color:'var(--text)' }}>Lettly</span>
            <span style={{ fontSize:10, color:'var(--brand)', background:'var(--brand-light)', padding:'2px 9px', borderRadius:20, fontWeight:500 }}>beta</span>
          </div>
          <div className="hide-mobile" style={{ display:'flex', gap:28, alignItems:'center' }}>
            {['How it works','Features','Legislation','Pricing','Blog'].map(l => (
              <a key={l} href={l==='Blog'?'/blog':`#${l.toLowerCase().replace(' ','-')}`} style={{ fontSize:13, color:'var(--text-2)', textDecoration:'none', transition:'color 0.15s' }}
                onMouseEnter={e=>e.target.style.color='var(--text)'} onMouseLeave={e=>e.target.style.color='var(--text-2)'}>{l}</a>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <a href="/sign-in" className="btn-ghost" style={{ fontSize:13, padding:'7px 18px' }}>Sign in</a>
            <a href="/sign-up" className="btn-primary" style={{ fontSize:13, padding:'8px 20px', boxShadow:'0 2px 10px rgba(27,94,59,0.2)' }}>Get started free</a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ maxWidth:900, margin:'0 auto', padding:'clamp(48px,8vw,100px) clamp(20px,4vw,48px) clamp(40px,6vw,80px)', textAlign:'center' }}>
          {/* Hero logo lockup */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:32 }}>
            <div style={{ width:52, height:52, background:'var(--brand)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontSize:26, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:'clamp(28px,4vw,38px)', fontWeight:400, color:'var(--text)', letterSpacing:'-0.5px' }}>Lettly</span>
          </div>

          <div className="ticker" style={{ marginBottom:28 }}>
            <span className="ticker-dot"/>
            England: Section 21 abolished 1 May 2026 · Scotland: PRT law · Wales: Occupation Contracts
          </div>

          <h1 className="hero-title" style={{ marginBottom:22 }}>
            Drop a document.<br/>
            <span className="hero-em">Your portfolio builds itself.</span>
          </h1>

          <p style={{ fontSize:'clamp(15px,2vw,18px)', color:'var(--text-2)', lineHeight:1.8, maxWidth:600, margin:'0 auto 20px' }}>
            Whether you just inherited a house, accidentally became a landlord, or manage a growing portfolio - Lettly reads your documents, tracks your compliance, and keeps you on the right side of the law.
          </p>

          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:20, margin:'0 auto 40px', maxWidth:560, fontSize:14, color:'var(--text-2)' }}>
            {[
              { icon:'✓', text:'Section 21 abolished 1 May 2026 - are you ready?' },
              { icon:'✓', text:'EPC minimum C required from 2028' },
              { icon:'✓', text:'England, Scotland and Wales covered' },
            ].map(item => (
              <div key={item.text} style={{ display:'flex', alignItems:'flex-start', gap:8, textAlign:'left' }}>
                <span style={{ color:'var(--brand)', fontWeight:600, flexShrink:0 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="cta-row" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:48 }}>
            <a href="/sign-up" className="btn-primary" style={{ fontSize:16, padding:'16px 40px' }}>
              Start free - no card needed
            </a>
            <a href="#how-it-works" className="btn-ghost" style={{ fontSize:15 }}>
              See how it works ↓
            </a>
          </div>

          {/* Document type badges */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {[
              { icon:'🔥', label:'Gas certificates', bg:'#fff8e1', fg:'#633806' },
              { icon:'⚡', label:'EICRs', bg:'#e3f2fd', fg:'#0C447C' },
              { icon:'🛡️', label:'Insurance policies', bg:'#f3e8ff', fg:'#6b21a8' },
              { icon:'🌿', label:'EPCs', bg:'#e8f5e9', fg:'#1e6e35' },
              { icon:'📄', label:'Tenancy agreements', bg:'#eaf4ee', fg:'#1b5e3b' },
              { icon:'🏦', label:'Mortgage offers', bg:'#fce8e6', fg:'#791F1F' },
            ].map(d => (
              <span key={d.label} className="doc-pill" style={{ background:d.bg, color:d.fg }}>
                <span style={{fontSize:14}}>{d.icon}</span>{d.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Stats bar ── */}
        <section style={{ background:'var(--surface)', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', padding:'40px clamp(20px,4vw,48px)' }}>
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, maxWidth:900, margin:'0 auto', textAlign:'center' }}>
            {[
              { num:'2.7m',  label:'UK private landlords affected', sub:'by Renters\' Rights Bill' },
              { num:'3',    label:'Nations covered', sub:'England, Scotland, Wales' },
              { num:'2028',  label:'EPC minimum C required', sub:'New tenancies from 2028' },
              { num:'£4',    label:'Per property per month', sub:'All features on every plan' },
            ].map(s => (
              <div key={s.num}>
                <div className="stat-num">{s.num}</div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginTop:6 }}>{s.label}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" style={{ maxWidth:900, margin:'0 auto', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 className="section-title" style={{ marginBottom:12 }}>From documents to dashboard<br/>in under 60 seconds</h2>
            <p style={{ fontSize:14, color:'var(--text-2)' }}>No manual data entry. No spreadsheets. Just drop and go.</p>
          </div>
          <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
            {[
              { num:'1', title:'Drop your documents', body:'Drag any PDF or image into Lettly - gas certs, EICRs, insurance, tenancy agreements, mortgage offers. Everything.' },
              { num:'2', title:'AI reads them instantly', body:'Lettly extracts every date, figure and detail automatically. No typing. No errors. Your portfolio appears in seconds.' },
              { num:'3', title:'Stay ahead of the law', body:'Compliance deadlines, EPC ratings, Renters\' Rights Bill impacts - all tracked and explained in plain English.' },
            ].map(s => (
              <div key={s.num} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div className="step-num">{s.num}</div>
                  <div>
                    <div style={{ fontFamily:'var(--display)', fontSize:18, fontWeight:400, color:'var(--text)', marginBottom:8 }}>{s.title}</div>
                    <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.75 }}>{s.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" style={{ background:'var(--surface2)', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <h2 className="section-title" style={{ marginBottom:12 }}>Everything a landlord needs</h2>
              <p style={{ fontSize:14, color:'var(--text-2)' }}>Built specifically for the UK private rented sector.</p>
            </div>
            <div className="features-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[
                { icon:'📄', title:'Document AI extraction', body:'Drop any PDF or photo - gas certs, EICRs, EPCs, insurance, tenancy agreements, mortgage offers. Lettly reads every date and figure automatically.' },
                { icon:'🔔', title:'Compliance tracking', body:'Never miss a gas cert, EICR or insurance deadline. Compliance timeline on your dashboard, plus email reminders to your inbox.' },
                { icon:'🌿', title:'EPC tracker', body:'EPC ratings tracked per property with 2028 upgrade guidance and estimated costs. Know which properties need work before the deadline hits.' },
                { icon:'💰', title:'Finance and P&L', body:'Income, mortgage payments and expenses tracked in one place. Annual P&L summary ready to hand straight to your accountant.' },
                { icon:'🔧', title:'Maintenance log', body:'Log repairs with photos, contractor details and costs. Tenants get a personal link to report issues directly - all saved to your log automatically.' },
                { icon:'📝', title:'Document generator', body:'AI drafts Section 8 notices, inspection reports, rent increase letters and right of entry notices. Copy and send in seconds.' },
                { icon:'🏦', title:'Remortgage planner', body:'See your equity, ERC cost and capital release options per property. Know whether to remortgage now or wait for your fixed rate to end.' },
                { icon:'⚖️', title:'Legislation centre', body:'Full breakdown of the Renters Rights Bill, Section 24 tax, EPC minimum C and deposit rules - with a specific action list for your portfolio.' },
              ].map(f => (
                <div key={f.title} className="feature-card">
                  <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:17, fontWeight:400, color:'var(--text)', marginBottom:8 }}>{f.title}</div>
                  <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.75 }}>{f.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Legislation urgency ── */}
        <section id="legislation" style={{ maxWidth:900, margin:'0 auto', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)' }}>
          <div style={{ background:'var(--brand)', borderRadius:20, padding:'clamp(32px,5vw,52px)', color:'#fff', textAlign:'center' }}>
            <div style={{ fontSize:12, fontWeight:500, opacity:0.7, textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 }}>The clock is ticking</div>
            <h2 style={{ fontFamily:'var(--display)', fontSize:'clamp(26px,4vw,40px)', fontWeight:300, lineHeight:1.2, marginBottom:20 }}>
              Different laws apply in England,<br/>Scotland and Wales.<br/><em style={{fontStyle:'italic'}}>Are you covered?</em>
            </h2>
            <p style={{ fontSize:'clamp(14px,1.8vw,16px)', opacity:0.85, lineHeight:1.8, maxWidth:560, margin:'0 auto 32px' }}>
              In England, the Renters Rights Act abolishes Section 21 from 1 May 2026. In Scotland, PRTs have been in force since 2017. In Wales, Occupation Contracts replaced ASTs in 2022. Lettly tracks the right laws for each of your properties automatically.
            </p>
            <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:36 }}>
              {[
                'Section 21 abolished',
                'All tenancies become periodic',
                'PRS Database registration required',
                'Decent Homes Standard extended',
                "Awaab's Law on damp & mould",
              ].map(item => (
                <div key={item} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, opacity:0.9 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.6)', flexShrink:0 }}/>
                  {item}
                </div>
              ))}
            </div>
            <a href="/sign-up" style={{ display:'inline-block', background:'#fff', color:'var(--brand)', fontSize:15, fontWeight:600, padding:'14px 36px', borderRadius:12, textDecoration:'none', boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>
              Get compliant with Lettly →
            </a>
          </div>
        </section>

        {/* -- Data security -- */}
        <section style={{ maxWidth:900, margin:'0 auto', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 className="section-title" style={{ marginBottom:12 }}>Your data is safe with us</h2>
            <p style={{ fontSize:14, color:'var(--text-2)' }}>You are uploading sensitive financial documents and tenant data. Here is how we protect it.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:32 }}>
            {[
              { icon:'🔐', title:'AES-256 encryption', body:'All data encrypted at rest and in transit. Your documents and portfolio data are never stored unencrypted.' },
              { icon:'🇬🇧', title:'Stored in the EU', body:'Your data is stored in AWS eu-west-1 (Ireland). UK GDPR compliant. You can request deletion at any time.' },
              { icon:'🚫', title:'Never sold or shared', body:'Lettly makes money from subscriptions only. We never sell your data or share it with advertisers or third parties.' },
              { icon:'🏦', title:'Bank-grade auth', body:'Authentication by Clerk - the same security standard used by enterprise financial platforms. MFA supported.' },
              { icon:'👤', title:'Row-level security', body:'Your data is locked to your account only. Other users cannot access your portfolio even if they tried.' },
              { icon:'🤖', title:'AI processing is transient', body:'Documents sent for AI extraction are processed and discarded. Anthropic does not retain your files under our API agreement.' },
            ].map(s => (
              <div key={s.title} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:14, padding:'20px 18px' }}>
                <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontSize:14, fontWeight:500, color:'var(--text)', marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>{s.body}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--brand-subtle)', border:'0.5px solid rgba(27,94,59,0.15)', borderRadius:12, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div><div style={{ fontSize:13, fontWeight:500, color:'var(--brand)', marginBottom:3 }}>Built on trusted infrastructure</div><div style={{ fontSize:12, color:'var(--text-2)' }}>Supabase (SOC 2) - Vercel (SOC 2) - Clerk (SOC 2) - Stripe (PCI DSS Level 1)</div></div>
            <a href="/security" style={{ fontSize:12, fontWeight:500, color:'var(--brand)', textDecoration:'none', background:'var(--brand-light)', padding:'7px 16px', borderRadius:8 }}>Full security details</a>
          </div>
        </section>

        {/* -- Pricing -- */}
        <section id="pricing" style={{ background:'var(--surface2)', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <h2 className="section-title" style={{ marginBottom:12 }}>Simple, transparent pricing</h2>
              <p style={{ fontSize:14, color:'var(--text-2)' }}>Start with a 14-day free trial. No contract, cancel anytime.</p>
            </div>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ display:'inline-block', background:'var(--brand-light)', border:'0.5px solid rgba(27,94,59,0.2)', borderRadius:12, padding:'10px 24px', fontSize:15, fontWeight:500, color:'var(--brand)' }}>
                £4 per property per month - all features included
              </div>
              <div style={{ fontSize:13, color:'var(--text-2)', marginTop:10 }}>Every plan includes every feature. You pay for your portfolio size, nothing else.</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { name:'Starter',   price:'£8',  props:'1-2 properties',  popular:false },
                { name:'Standard',  price:'£16', props:'3-4 properties',  popular:false },
                { name:'Portfolio', price:'£28', props:'5-7 properties',  popular:true  },
                { name:'Pro',       price:'£40', props:'8+ properties - unlimited', popular:false },
              ].map(plan => (
                <div key={plan.name} style={{ background:plan.popular?'var(--brand)':'var(--surface)', border:plan.popular?'none':'0.5px solid var(--border)', borderRadius:18, padding:'24px 20px', position:'relative', display:'flex', flexDirection:'column' }}>
                  {plan.popular&&<div style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'2px 9px', fontSize:10, color:'#fff', fontWeight:500 }}>Popular</div>}
                  <div style={{ fontSize:12, fontWeight:500, color:plan.popular?'rgba(255,255,255,0.7)':'var(--text-2)', marginBottom:10 }}>{plan.name}</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:38, fontWeight:300, color:plan.popular?'#fff':'var(--text)', lineHeight:1, marginBottom:3 }}>{plan.price}</div>
                  <div style={{ fontSize:11, color:plan.popular?'rgba(255,255,255,0.55)':'var(--text-3)', marginBottom:16 }}>per month - 14-day free trial</div>
                  <div style={{ fontSize:13, fontWeight:500, color:plan.popular?'rgba(255,255,255,0.9)':'var(--brand)', marginBottom:20, padding:'6px 12px', background:plan.popular?'rgba(255,255,255,0.15)':'var(--brand-light)', borderRadius:10, textAlign:'center' }}>{plan.props}</div>
                  {[
                    'Document AI extraction',
                    'Compliance tracking and alerts',
                    'Nation-specific legislation',
                    'EPC tracker and 2028 guidance',
                    'Finance and P&L tracker',
                    'Maintenance log with photos',
                    'Tenant issue report portal',
                    'Document generator',
                    'Remortgage planner',
                    'Section 24 tax calculator',
                    'Condition reports',
                    'Lettly AI assistant',
                  ].map(f => (
                    <div key={f} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12, color:plan.popular?'rgba(255,255,255,0.82)':'var(--text-2)', marginBottom:9, lineHeight:1.4 }}>
                      <span style={{ color:plan.popular?'rgba(255,255,255,0.6)':'var(--green)', fontSize:13, flexShrink:0, marginTop:1 }}>✓</span>{f}
                    </div>
                  ))}
                  <a href="/sign-up" style={{ display:'block', textAlign:'center', marginTop:'auto', paddingTop:20, background:plan.popular?'#fff':'var(--brand)', color:plan.popular?'var(--brand)':'#fff', fontSize:13, fontWeight:600, padding:'11px 16px', borderRadius:10, textDecoration:'none' }}>
                    Start free trial
                  </a>
                </div>
              ))}
            </div>

                        <p style={{ textAlign:'center', fontSize:12, color:'var(--text-3)', marginTop:20 }}>
              £4 per property per month - 14-day free trial on all plans - no credit card required - cancel anytime
            </p>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section style={{ maxWidth:680, margin:'0 auto', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)', textAlign:'center' }}>
          <h2 className="section-title" style={{ marginBottom:16 }}>
            Join landlords getting ahead<br/>of the Renters&#39; Rights Bill
          </h2>
          <p style={{ fontSize:15, color:'var(--text-2)', lineHeight:1.8, marginBottom:36 }}>
            Free to start. No credit card. Takes 2 minutes to set up your first property.
          </p>
          <div className="cta-row" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <a href="/sign-up" className="btn-primary" style={{ fontSize:16, padding:'16px 40px' }}>
              Create free account →
            </a>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background:'var(--surface)', borderTop:'0.5px solid var(--border)', padding:'28px clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, background:'var(--brand)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:'#fff', fontSize:14, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
              </div>
              <span style={{ fontFamily:'var(--display)', fontSize:16, fontWeight:400, color:'var(--text)' }}>Lettly</span>
            </div>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
              {[['Privacy','/privacy'],['Terms','/terms'],['Security','/security'],['Blog','/blog'],['Contact','mailto:hello@lettly.co']].map(([l,h]) => (
                <a key={l} href={h} style={{ fontSize:12, color:'var(--text-3)', textDecoration:'none' }}>{l}</a>
              ))}
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>
              © 2026 Lettly Ltd · Registered in England and Wales · ICO registered
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
