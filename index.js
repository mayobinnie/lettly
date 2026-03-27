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
        <title>Lettly - Manage your rental property without a letting agent</title>
        <meta name="theme-color" content="#1b5e3b"/>
        <link rel="manifest" href="/manifest.json"/>
        <link rel="apple-touch-icon" href="/icon.svg"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-title" content="Lettly"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Manage your rental property without a letting agent and stay fully compliant. Save £1,000–£3,000 a year. Built for UK landlords." />
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
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, background:'var(--brand)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:20, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:400, color:'var(--text)' }}>Lettly</span>
          </div>
          <div className="hide-mobile" style={{ display:'flex', gap:32, alignItems:'center' }}>
            {[['How it works','#how-it-works'],['Features','#features'],['Pricing','#pricing'],['Blog','/blog']].map(([l,h]) => (
              <a key={l} href={h} style={{ fontSize:14, color:'var(--text-2)', textDecoration:'none', transition:'color 0.15s' }}
                onMouseEnter={e=>e.target.style.color='var(--text)'} onMouseLeave={e=>e.target.style.color='var(--text-2)'}>{l}</a>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <a href="https://accounts.lettly.co/sign-in" className="btn-ghost" style={{ fontSize:14, padding:'9px 20px' }}>Sign in</a>
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary" style={{ fontSize:14, padding:'10px 22px', boxShadow:'0 2px 12px rgba(27,94,59,0.22)' }}>Get started free</a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ maxWidth:860, margin:'0 auto', padding:'clamp(60px,9vw,116px) clamp(20px,4vw,48px) clamp(52px,7vw,88px)', textAlign:'center' }}>

          <div className="saving-badge fade-up" style={{ marginBottom:34 }}>
            <span>💰</span> Landlords save £1,000–£3,000/year switching to Lettly
          </div>

          <h1 className="hero-title fade-up-2" style={{ marginBottom:24 }}>
            Manage your rental property<br/>
            <span className="hero-em">without a letting agent</span>
          </h1>

          <p className="section-sub fade-up-3" style={{ maxWidth:580, margin:'0 auto 44px', fontSize:'clamp(16px,2vw,19px)' }}>
            Track tenants, rent, and compliance in one simple platform built for UK landlords. Stay fully legal — without paying agent fees.
          </p>

          <div className="cta-row fade-up-3" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:22 }}>
            <a href="https://accounts.lettly.co/sign-up" className="btn-primary">
              Start managing your property
            </a>
            <a href="#how-it-works" className="btn-ghost">
              See how it works ↓
            </a>
          </div>

          <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:52 }}>
            Free to start · No credit card needed · Takes 2 minutes
          </p>

          <div className="trust-pills" style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            {[
              { icon:'🇬🇧', text:'Built for UK landlords' },
              { icon:'⚖️', text:'Designed around UK compliance' },
              { icon:'🔒', text:'Your data stays private' },
            ].map(t => (
              <span key={t.text} className="trust-pill"><span>{t.icon}</span>{t.text}</span>
            ))}
          </div>
        </section>

        {/* ── SAVINGS BAR ── */}
        <section style={{ background:'var(--brand)', padding:'48px clamp(20px,4vw,48px)' }}>
          <div className="grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, maxWidth:900, margin:'0 auto', textAlign:'center' }}>
            {[
              { num:'£2,000', label:'Average annual saving', sub:'vs. a high-street letting agent' },
              { num:'10–20%', label:'Typical agent fee', sub:'of rent — every single month' },
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

        {/* ── PROBLEM → SOLUTION ── */}
        <section style={{ maxWidth:940, margin:'0 auto', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <h2 className="section-title" style={{ marginBottom:16 }}>Letting agents are expensive<br/>and slow</h2>
            <p className="section-sub" style={{ maxWidth:520, margin:'0 auto' }}>
              You don't need a middleman to manage your property. You just need the right tools.
            </p>
          </div>

          <div className="grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:44 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--red)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14 }}>Without Lettly</div>
              {[
                { icon:'💸', title:'Paying 10–20% in agent fees', body:"On a £1,200/month property, that's up to £2,880/year straight out of your pocket." },
                { icon:'📁', title:'Chasing paperwork', body:'Gas certs, EICRs, EPCs, insurance renewals — all in different places, easy to miss.' },
                { icon:'😰', title:'Risk of missing legal requirements', body:'UK landlord law is changing fast. One missed requirement can mean fines or losing your case.' },
                { icon:'📱', title:'Managing tenants manually', body:'WhatsApp chains, sticky notes, and spreadsheets that only you understand.' },
              ].map(p => (
                <div key={p.title} className="pain-card" style={{ marginBottom:10, borderLeft:'3px solid #fce8e6' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:4 }}>{p.title}</div>
                      <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>{p.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--brand)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:14 }}>With Lettly</div>
              {[
                { icon:'✅', title:'Keep your rent — all of it', body:'Manage yourself and save £1,000–£3,000/year. Lettly costs just £4 per property per month.' },
                { icon:'📲', title:'Drop a document, done', body:'Upload your gas cert, EICR or tenancy agreement. Lettly reads it and tracks every date automatically.' },
                { icon:'🛡️', title:'Stay compliant automatically', body:'Reminders before every deadline. Nation-specific legislation. Never miss a legal requirement again.' },
                { icon:'📊', title:'One place for everything', body:'Tenants, rent, maintenance, documents — all in your dashboard. No spreadsheets needed.' },
              ].map(s => (
                <div key={s.title} className="pain-card" style={{ marginBottom:10, borderLeft:'3px solid var(--brand-mid)' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:4 }}>{s.title}</div>
                      <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.7 }}>{s.body}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign:'center' }}>
            <div style={{ display:'inline-block', background:'var(--brand-light)', border:'1px solid rgba(27,94,59,0.15)', borderRadius:16, padding:'20px 36px' }}>
              <div style={{ fontFamily:'var(--display)', fontSize:'clamp(18px,2.5vw,23px)', fontWeight:300, color:'var(--brand)', lineHeight:1.5 }}>
                Lettly replaces your letting agent with a simple,<br/><em style={{fontStyle:'italic'}}>all-in-one dashboard.</em>
              </div>
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
                { num:'1', icon:'📂', title:'Drop your documents', body:'Drag in any PDF or photo — gas certs, EICRs, insurance, tenancy agreements, mortgage offers. Works on phone or computer.' },
                { num:'2', icon:'🤖', title:'Lettly reads them instantly', body:'Our AI extracts every date, name and figure automatically. Your property portfolio appears in seconds. No typing required.' },
                { num:'3', icon:'✅', title:'Stay compliant and in control', body:"Deadlines tracked. Reminders sent. UK legislation explained in plain English. You're always one step ahead." },
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

        {/* ── FEATURES ── */}
        <section id="features" style={{ maxWidth:940, margin:'0 auto', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <h2 className="section-title" style={{ marginBottom:14 }}>Everything you need<br/>to manage your rental</h2>
            <p className="section-sub" style={{ maxWidth:500, margin:'0 auto' }}>Built specifically for UK private landlords. No tech skills needed.</p>
          </div>

          <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              {
                icon:'🧾',
                title:'Compliance made simple',
                items:['Gas safety certificate tracking','EICR electrical inspection alerts','EPC rating and 2028 upgrade guide','Email reminders before every deadline','Never miss a legal requirement'],
              },
              {
                icon:'💸',
                title:'Rent & tenant tracking',
                items:['Track rent payments month by month','Manage all tenants in one place','Maintenance log with photos','Tenant issue reporting portal','Section 8 notices generated for you'],
              },
              {
                icon:'📊',
                title:'All-in-one dashboard',
                items:['No spreadsheets, ever','No WhatsApp chaos','Finance and P&L tracker',"Renters' Rights Bill guidance",'Works on phone and computer'],
              },
            ].map(f => (
              <div key={f.title} className="feature-block">
                <div style={{ fontSize:34, marginBottom:20 }}>{f.icon}</div>
                <div style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:400, color:'var(--text)', marginBottom:20 }}>{f.title}</div>
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

        {/* ── WHY LANDLORDS SWITCH ── */}
        <section style={{ background:'var(--surface2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <h2 className="section-title">Why landlords switch to Lettly</h2>
            </div>
            <div className="grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {[
                { stat:'£2,000+', label:'Saved per year', body:'Compared to a typical high-street letting agent charging 10–15% of rent.' },
                { stat:'100%', label:'Control of your property', body:'No middleman. You talk directly to your tenant and make all the decisions.' },
                { stat:'5 min', label:'To feel the benefit', body:'Upload your first document and your compliance dashboard populates instantly.' },
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
              { icon:'🇬🇧', title:'Built in the UK for UK landlords', body:"Every feature is designed around the realities of the UK private rented sector — not a generic international tool adapted for Britain." },
              { icon:'⚖️', title:'Based on real compliance requirements', body:"Gas safety, EICRs, EPCs, deposit schemes, the Renters' Rights Bill — all the rules that actually affect you, tracked automatically." },
              { icon:'🌱', title:'Early access — help shape the product', body:"You're joining at the beginning. Your feedback directly shapes what we build next. We respond to every message personally." },
              { icon:'🔒', title:'Your data is secure and private', body:"Bank-grade authentication. AES-256 encryption. Stored in the EU. We never sell your data to third parties. Ever." },
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

          {/* Testimonial placeholder */}
          <div style={{ background:'var(--brand-light)', border:'1px solid rgba(27,94,59,0.15)', borderRadius:20, padding:'36px 32px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:14 }}>💬</div>
            <div style={{ fontFamily:'var(--display)', fontSize:'clamp(18px,2.5vw,24px)', fontWeight:300, fontStyle:'italic', color:'var(--brand)', marginBottom:12, lineHeight:1.5 }}>
              "I was paying £180 a month to my letting agent.<br/>Lettly does the same job for £4."
            </div>
            <div style={{ fontSize:14, color:'var(--text-3)' }}>Early access landlord · 2 properties · Yorkshire</div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ background:'var(--surface2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'clamp(56px,7vw,88px) clamp(20px,4vw,48px)' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <h2 className="section-title" style={{ marginBottom:14 }}>Simple, transparent pricing</h2>
              <p className="section-sub" style={{ maxWidth:480, margin:'0 auto 28px' }}>
                £4 per property per month. All features included. 14-day free trial. No contract.
              </p>
              <div style={{ display:'inline-block', background:'var(--brand-light)', border:'1px solid rgba(27,94,59,0.2)', borderRadius:12, padding:'12px 28px', fontSize:15, fontWeight:600, color:'var(--brand)' }}>
                Compare to agent fees of £100–£200/month per property
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
            Join landlords who have taken back control and stopped paying agent fees. Free to start. Takes 2 minutes.
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
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, background:'var(--brand)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:'#fff', fontSize:15, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
              </div>
              <span style={{ fontFamily:'var(--display)', fontSize:17, fontWeight:400, color:'var(--text)' }}>Lettly</span>
            </div>
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
