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
            {['How it works','Features','Legislation','Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(' ','-')}`} style={{ fontSize:13, color:'var(--text-2)', textDecoration:'none', transition:'color 0.15s' }}
                onMouseEnter={e=>e.target.style.color='var(--text)'} onMouseLeave={e=>e.target.style.color='var(--text-2)'}>{l}</a>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <a href="https://accounts.lettly.co/sign-in" className="btn-ghost" style={{ fontSize:13, padding:'7px 18px' }}>Sign in</a>
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary" style={{ fontSize:13, padding:'8px 20px', boxShadow:'0 2px 10px rgba(27,94,59,0.2)' }}>Get started free</a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ maxWidth:900, margin:'0 auto', padding:'clamp(48px,8vw,100px) clamp(20px,4vw,48px) clamp(40px,6vw,80px)', textAlign:'center' }}>
          <div className="ticker" style={{ marginBottom:28 }}>
            <span className="ticker-dot"/>
            Renters&#39; Rights Bill - Royal Assent 2025 · Section 21 ends Oct 2026
          </div>

          <h1 className="hero-title" style={{ marginBottom:22 }}>
            The only property platform<br/>
            <span className="hero-em">built for what&#39;s coming.</span>
          </h1>

          <p style={{ fontSize:'clamp(15px,2vw,18px)', color:'var(--text-2)', lineHeight:1.8, maxWidth:580, margin:'0 auto 44px' }}>
            Drop your certificates, tenancy agreements and mortgage offers.
            Lettly reads them instantly, tracks your compliance, and keeps you ahead of the Renters&#39; Rights Bill.
          </p>

          <div className="cta-row" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:48 }}>
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary" style={{ fontSize:16, padding:'16px 40px' }}>
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
              { num:'Oct 26',label:'Section 21 abolished', sub:'Are you ready?' },
              { num:'2028',  label:'EPC minimum C required', sub:'New tenancies from 2028' },
              { num:'£7.50', label:'Starts from per month', sub:'14-day free trial included' },
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
          <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
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
                { icon:'📄', title:'Document extraction', body:'Upload any property document and Lettly pulls out every date, figure, and detail - gas certs, EICRs, insurance, EPCs, tenancy agreements, mortgage offers.' },
                { icon:'🔔', title:'Compliance alerts', body:'Never miss a gas cert renewal, EICR deadline or insurance expiry. Email reminders sent automatically before every deadline.' },
                { icon:'🌿', title:'EPC tracker', body:'Track EPC ratings across your portfolio. Get clear guidance on upgrade costs and timelines for the 2028 minimum C requirement.' },
                { icon:'⚖️', title:'Legislation centre', body:'Full breakdown of the Renters\' Rights Bill, Section 24 tax changes, EPC requirements and deposit rules - with your specific action list.' },
                { icon:'💰', title:'Financial dashboard', body:'Portfolio value, total equity, LTV, gross yield, net yield - all calculated automatically as you add properties.' },
                { icon:'🤖', title:'Lettly AI assistant', body:'Ask anything about your portfolio, legislation, or finances. Get specific answers based on your actual properties - not generic advice.' },
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
              Section 21 ends in October 2026.<br/>Are you prepared?
            </h2>
            <p style={{ fontSize:'clamp(14px,1.8vw,16px)', opacity:0.85, lineHeight:1.8, maxWidth:560, margin:'0 auto 32px' }}>
              The Renters&#39; Rights Bill abolishes no-fault evictions, converts all tenancies to periodic, and requires PRS Database registration before you can serve any notice. 2.7 million landlords need to act.
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
            <a href="https://accounts.lettly.co/sign-up" style={{ display:'inline-block', background:'#fff', color:'var(--brand)', fontSize:15, fontWeight:600, padding:'14px 36px', borderRadius:12, textDecoration:'none', boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>
              Get compliant with Lettly →
            </a>
          </div>
        </section>

        {/* -- Pricing -- */}
        <section id="pricing" style={{ background:'var(--surface2)', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', padding:'clamp(48px,6vw,80px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:960, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <h2 className="section-title" style={{ marginBottom:12 }}>Simple, transparent pricing</h2>
              <p style={{ fontSize:14, color:'var(--text-2)' }}>Start with a 14-day free trial. No contract, cancel anytime.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { name:'Starter', price:'£7.50', period:'per month', props:'1-2 properties', highlight:false, features:['Up to 2 properties', 'Document extraction', 'Compliance tracking', 'Legislation centre', 'Lettly AI assistant'] },
                { name:'Standard', price:'£10', period:'per month', props:'3-5 properties', highlight:false, features:['Up to 5 properties', 'Everything in Starter', 'Email reminders', 'EPC tracker', 'Financial dashboard'] },
                { name:'Portfolio', price:'£14', period:'per month', props:'5-10 properties', highlight:true, popular:true, features:['Up to 10 properties', 'Everything in Standard', 'Full financial analytics', 'Mortgage strategy tools', 'Priority support'] },
                { name:'Professional', price:'£25', period:'per month', props:'10+ properties', highlight:false, features:['Unlimited properties', 'Everything in Portfolio', 'Multiple user access', 'Bulk document upload', 'Dedicated support'] },
              ].map(plan => (
                <div key={plan.name} style={{ background:plan.highlight?'var(--brand)':'var(--surface)', border:plan.highlight?'none':'0.5px solid var(--border)', borderRadius:18, padding:'24px 20px', position:'relative', overflow:'hidden' }}>
                  {plan.popular&&<div style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.2)', borderRadius:20, padding:'2px 9px', fontSize:10, color:'#fff', fontWeight:500 }}>Popular</div>}
                  <div style={{ fontSize:12, fontWeight:500, color:plan.highlight?'rgba(255,255,255,0.7)':'var(--text-2)', marginBottom:10 }}>{plan.name}</div>
                  <div style={{ fontFamily:'var(--display)', fontSize:34, fontWeight:300, color:plan.highlight?'#fff':'var(--text)', lineHeight:1, marginBottom:2 }}>{plan.price}</div>
                  <div style={{ fontSize:11, color:plan.highlight?'rgba(255,255,255,0.6)':'var(--text-3)', marginBottom:4 }}>{plan.period}</div>
                  <div style={{ fontSize:11, fontWeight:500, color:plan.highlight?'rgba(255,255,255,0.85)':'var(--brand)', marginBottom:20, padding:'4px 10px', background:plan.highlight?'rgba(255,255,255,0.12)':'var(--brand-light)', borderRadius:20, display:'inline-block' }}>{plan.props}</div>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', gap:7, alignItems:'flex-start', fontSize:12, color:plan.highlight?'rgba(255,255,255,0.85)':'var(--text-2)', marginBottom:9, lineHeight:1.4 }}>
                      <span style={{ color:plan.highlight?'rgba(255,255,255,0.7)':'var(--green)', fontSize:13, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                  <a href="https://accounts.lettly.co/sign-up" style={{ display:'block', textAlign:'center', marginTop:20, background:plan.highlight?'#fff':'var(--brand)', color:plan.highlight?'var(--brand)':'#fff', fontSize:12, fontWeight:600, padding:'10px 16px', borderRadius:9, textDecoration:'none' }}>
                    Start free trial
                  </a>
                </div>
              ))}
            </div>
            <p style={{ textAlign:'center', fontSize:12, color:'var(--text-3)', marginTop:20 }}>
              All plans include a 14-day free trial. No credit card required to start. Cancel anytime.
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
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary" style={{ fontSize:16, padding:'16px 40px' }}>
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
              {['Privacy','Terms','Contact'].map(l => (
                <a key={l} href={`mailto:hello@lettly.co`} style={{ fontSize:12, color:'var(--text-3)', textDecoration:'none' }}>{l}</a>
              ))}
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>
              © 2026 Lettly · Built for UK landlords · lettly.co
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
