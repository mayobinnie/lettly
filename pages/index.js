import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

const R = '#e07b7b'
const RL = '#eca9a9'
const RDIM = 'rgba(224,123,123,0.11)'
const RBDR = 'rgba(224,123,123,0.26)'

function startCheckout() {
  window.location.href = 'https://accounts.lettly.co/sign-in'
}

function RoseBtn({ href, children, large, onClick }) {
  const style = {
    background: R, color: '#fff', border: 'none', borderRadius: 100,
    fontFamily: "'DM Sans', sans-serif", fontWeight: 700, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block', transition: 'all .2s',
    fontSize: large ? 16 : 14, padding: large ? '16px 36px' : '9px 22px'
  }
  if (href) return (
    <Link href={href} style={style}
      onMouseEnter={e => { e.currentTarget.style.background = RL; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = R; e.currentTarget.style.transform = 'none' }}>
      {children}
    </Link>
  )
  return (
    <button onClick={onClick} style={style}
      onMouseEnter={e => { e.currentTarget.style.background = RL; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = R; e.currentTarget.style.transform = 'none' }}>
      {children}
    </button>
  )
}

function GhostBtn({ href, children, large }) {
  return (
    <Link href={href} style={{
      color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: 100, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
      textDecoration: 'none', display: 'inline-block', transition: 'all .2s',
      background: 'transparent', fontSize: large ? 16 : 14,
      padding: large ? '15px 30px' : '8px 18px'
    }}>
      {children}
    </Link>
  )
}

function PricingSection() {
  const [billing, setBilling] = useState('annual')

  const plans = [
    {
      id: 'starter', name: 'Starter', monthly: 12.5, annual: 10,
      props: '1-2 properties',
      features: ['AI document extraction', 'Compliance tracking', 'Rent tracker', 'Lettly AI', 'All three nations', 'All tools included']
    },
    {
      id: 'standard', name: 'Standard', monthly: 25, annual: 20,
      props: '3-5 properties', popular: true,
      features: ['Everything in Starter', 'Invoicing', 'Condition reports', 'Tax year export', 'Finance tools suite', 'Tenant portal']
    },
    {
      id: 'portfolio', name: 'Portfolio', monthly: 44, annual: 35,
      props: '6-10 properties',
      features: ['Everything in Standard', 'HMO management suite', 'Growth projections', 'Portfolio health score', 'Priority support', 'Referral programme']
    },
  ]

  return (
    <section style={{ padding: '92px 44px', maxWidth: 1200, margin: '0 auto' }} className="sec-pad" id="pricing">
      <div style={{ fontSize: 11, fontWeight: 700, color: R, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>Simple pricing</div>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: 18 }}>
        No hidden fees.<br/>No feature gating.
      </h2>
      <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', fontWeight: 300, maxWidth: 520, lineHeight: 1.75, marginBottom: 36 }}>
        Every plan includes every feature. Price reflects portfolio size only.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 100, padding: 3, gap: 2, marginBottom: 36, width: 'fit-content' }}>
        {['annual', 'monthly'].map(b => (
          <button key={b} onClick={() => setBilling(b)} style={{ padding: '7px 20px', borderRadius: 100, border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: billing === b ? 600 : 400, background: billing === b ? R : 'transparent', color: '#fff', cursor: 'pointer' }}>
            {b === 'annual' ? 'Annual (save 20%)' : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="grid-3">
        {plans.map(plan => {
          const price = billing === 'annual' ? plan.annual : plan.monthly
          const isHot = plan.popular
          return (
            <div key={plan.id} style={{ background: isHot ? 'linear-gradient(145deg,#1a0d0d,#150a0a)' : '#161010', border: '0.5px solid ' + (isHot ? RBDR : 'rgba(255,255,255,0.08)'), borderRadius: 16, padding: 30, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {isHot && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: R, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap', fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most popular</div>}
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: isHot ? RL : 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>{plan.name}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 52, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>
                <sup style={{ fontSize: 22, fontWeight: 600, verticalAlign: 'top', marginTop: 10, marginRight: 2 }}>£</sup>
                {price}
                <sub style={{ fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.55)', letterSpacing: 0 }}>/mo</sub>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 22, paddingBottom: 20, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                {plan.props} · billed {billing}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: R, fontSize: 13, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={startCheckout} style={{ width: '100%', padding: 13, borderRadius: 100, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', background: isHot ? R : 'transparent', color: '#fff', border: isHot ? 'none' : '0.5px solid rgba(255,255,255,0.15)' }}>
                Start free trial
              </button>
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
        14-day free trial on all plans, no credit card required. Enterprise plans for 10+ properties: <a href="mailto:hello@lettly.co" style={{ color: RL, textDecoration: 'underline' }}>contact us</a>.
      </div>
    </section>
  )
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const features = [
    { icon: '📋', title: 'AI document extraction', desc: 'Drop a gas cert, EICR, EPC or tenancy agreement. Lettly reads it and updates your records automatically. Every date, every detail.' },
    { icon: '🛡️', title: 'Compliance tracking', desc: 'Gas certs, EICRs, EPCs, insurance, Right to Rent, every deadline tracked with alerts before anything expires.' },
    { icon: '💷', title: 'Rent tracker', desc: 'Monthly ledger for every property. Mark payments, log dates, track arrears across your full portfolio at a glance.' },
    { icon: '⚖️', title: 'Legislation centre', desc: 'England, Scotland and Wales covered. Renters Rights Act, PRT, Occupation Contracts, always current, always by nation.' },
    { icon: '🤖', title: 'Lettly AI', desc: 'Ask anything about your portfolio, compliance or finances. Instant answers built on your actual property data.' },
    { icon: '📊', title: 'Finance and tax tools', desc: 'Section 24 calculator, CGT planner, Ltd vs personal comparison, deal analyser and remortgage planner. All built in.' },
    { icon: '🔧', title: 'Maintenance log', desc: 'Log repairs, track contractors, give tenants a direct reporting link. Photos, costs and status all in one place.' },
    { icon: '📄', title: 'Invoicing', desc: 'Generate and send rent receipts and contractor invoices. PDF download, email delivery, payment tracking included.' },
    { icon: '🏠', title: 'HMO management', desc: 'Room-by-room tracking, licence management, fire safety checklist and PAT testing records for HMO landlords.' },
  ]

  const testimonials = [
    { initials: 'JM', name: 'James M.', role: '3 properties, Yorkshire', text: 'Finally something that actually understands UK landlord law. The AI document reading saves me hours every time I get a new certificate.' },
    { initials: 'SR', name: 'Sarah R.', role: '2 properties, Manchester', text: 'I was paying £180 a month to a letting agent. Switched to Lettly for £20. The compliance tracking alone is worth it.' },
    { initials: 'DK', name: 'David K.', role: '5 properties, Edinburgh and Leeds', text: 'The Scotland coverage is excellent. I could not find another tool that handles PRT requirements alongside English properties.' },
  ]

  const navLink = { fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }
  const darkSection = { background: '#111010', borderTop: '0.5px solid rgba(255,255,255,0.07)', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }
  const secTag = { fontSize: 11, fontWeight: 700, color: R, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16, display: 'inline-block' }
  const secH2 = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: 18 }
  const secSub = { fontSize: 18, color: 'rgba(255,255,255,0.55)', fontWeight: 300, maxWidth: 520, lineHeight: 1.75, marginBottom: 52 }

  return (
    <>
      <Head>
        <title>Lettly: Property management for UK landlords</title>
        <meta name="description" content="Replace your letting agent with Lettly. AI document extraction, compliance tracking, rent management and legislation for UK private landlords. From £10/month."/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet"/>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

          .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
          .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
          .grid-features { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:rgba(255,255,255,0.08); border:0.5px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; }
          .grid-footer { display:grid; grid-template-columns:250px 1fr 1fr 1fr; gap:36px; }
          .sec-pad { padding:92px 44px; }
          .hero-pad { padding:148px 44px 80px; }
          .nav-links { display:flex; gap:26px; flex:1; }
          .nav-ctas { display:flex; gap:10px; align-items:center; }
          .hamburger { display:none; background:none; border:none; cursor:pointer; padding:4px; }
          .mobile-menu { display:none; }
          .dash-preview { padding:0 44px 80px; }
          .dash-desktop { display:block; }
          .dash-mobile { display:none !important; }

          @media (max-width:768px) {
            .dash-desktop { display:none !important; }
            .dash-mobile { display:flex !important; }
            .grid-3 { grid-template-columns:1fr; gap:12px; }
            .grid-2 { grid-template-columns:1fr; gap:14px; }
            .grid-features { grid-template-columns:1fr; }
            .grid-footer { grid-template-columns:1fr 1fr; gap:24px; }
            .sec-pad { padding:60px 20px; }
            .hero-pad { padding:110px 20px 60px; }
            .nav-links { display:none; }
            .nav-ctas { display:none; }
            .hamburger { display:flex; align-items:center; justify-content:center; margin-left:auto; }
            .dash-preview { padding:0 20px 60px; }
            .mobile-menu {
              display:block;
              position:fixed;
              top:62px;
              left:0;
              right:0;
              background:rgba(13,10,10,0.98);
              backdrop-filter:blur(24px);
              border-bottom:0.5px solid rgba(255,255,255,0.08);
              padding:20px;
              z-index:99;
            }
            .footer-bottom { flex-direction:column; gap:8px; }
          }
        `}</style>
      </Head>

      <div style={{ background: '#0d0a0a', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

        {/* NAV */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', gap: 24, background: 'rgba(13,10,10,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, background: R, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>L</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>Lettly</span>
          </Link>
          <div className="nav-links">
            <Link href="#features" style={navLink}>Features</Link>
            <Link href="#nations" style={navLink}>Nations</Link>
            <Link href="#pricing" style={navLink}>Pricing</Link>
            <Link href="/blog" style={navLink}>Guides</Link>
          </div>
          <div className="nav-ctas">
            <a href="/dashboard" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', padding: '8px 18px', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 100, textDecoration: 'none' }}>Log in</a>
            <RoseBtn href="#pricing">Start free trial</RoseBtn>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen
              ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="4" y1="4" x2="18" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="4" x2="4" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
              : <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="3" y1="7" x2="19" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="19" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="17" x2="19" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
          </button>
        </nav>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="mobile-menu">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['#features','Features'],['#nations','Nations'],['#pricing','Pricing'],['/blog','Guides']].map(([href, label]) => (
                <Link key={label} href={href} onClick={() => setMenuOpen(false)} style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', padding: '11px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>{label}</Link>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <a href="/dashboard" style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', padding: '12px 20px', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 100, textDecoration: 'none', textAlign: 'center' }}>Log in</a>
                <button onClick={() => { setMenuOpen(false); startCheckout() }} style={{ fontSize: 15, fontWeight: 700, color: '#fff', background: R, padding: '13px 20px', borderRadius: 100, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Start free trial</button>
              </div>
            </div>
          </div>
        )}

        {/* HERO */}
        <section className="hero-pad" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflowY: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '60px 60px', WebkitMaskImage: 'radial-gradient(ellipse 90% 65% at 50% 0%,black,transparent 75%)', maskImage: 'radial-gradient(ellipse 90% 65% at 50% 0%,black,transparent 75%)', opacity: .45 }}/>
          <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle,rgba(224,123,123,0.09) 0%,transparent 68%)' }}/>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: RDIM, border: '0.5px solid ' + RBDR, borderRadius: 100, padding: '6px 16px', marginBottom: 36, fontSize: 12, fontWeight: 600, color: RL, animation: 'fadeUp .5s ease both' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: R, animation: 'pulse 2s infinite', display: 'inline-block' }}/>
            Renters Rights Act in force 1 May 2026. Are you ready?
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(42px,7.5vw,88px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 24, maxWidth: 860, animation: 'fadeUp .5s .08s ease both' }}>
            Everything your<br/>letting agent does.<br/><em style={{ fontStyle: 'normal', color: R }}>For £10 a month.</em>
          </h1>

          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,0.55)', fontWeight: 300, maxWidth: 560, lineHeight: 1.75, marginBottom: 40, animation: 'fadeUp .5s .16s ease both' }}>
            AI document reading, compliance tracking, rent management and full UK legislation across England, Scotland and Wales. No letting agent required.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeUp .5s .24s ease both' }}>
            <RoseBtn onClick={startCheckout} large>Start free trial, 14 days free →</RoseBtn>
            <GhostBtn href="#pricing" large>See pricing</GhostBtn>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>No credit card required. Cancel any time.</p>
        </section>

        {/* DASHBOARD PREVIEW - desktop browser */}
        <div className="dash-preview dash-desktop">
          <div style={{ background: '#111010', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ background: '#1a1515', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171', display: 'inline-block' }}/>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }}/>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
              <div style={{ flex: 1, background: '#111010', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>lettly.co/dashboard</div>
            </div>
            <div style={{ display: 'flex', minHeight: 420 }}>
              <div style={{ width: 200, background: '#0d0a0a', borderRight: '0.5px solid rgba(255,255,255,0.07)', padding: '20px 14px', flexShrink: 0 }}>
                {['Overview','Properties','Finance','Compliance','Rent tracker','Maintenance','Lettly AI'].map((item, i) => (
                  <div key={item} style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 2, fontSize: 13, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', background: i === 0 ? RDIM : 'transparent', cursor: 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? R : 'rgba(255,255,255,0.2)', flexShrink: 0 }}/>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, padding: 20, overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, minWidth: 380 }}>
                  {[['Portfolio value','£485,000',null],['Monthly income','£3,250',null],['Compliance','2 alerts','warn']].map(([label, val, st]) => (
                    <div key={label} style={{ flex: 1, background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', minWidth: 110 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: st === 'warn' ? RL : '#fff' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, minWidth: 380 }}>
                  {[
                    { addr: '11 Northfield Ave, HU5', rent: '£850/mo', gas: {v:'Valid',s:'ok'}, eicr: {v:'Valid',s:'ok'}, epc: 'C', warn: 'Gas cert due in 28 days', bg: 'linear-gradient(135deg,#1a2a1e,#1e3024)', status: 'ok' },
                    { addr: '7 Tower Hill Mews, HU1', rent: '£1,100/mo', gas: {v:'Valid',s:'ok'}, eicr: {v:'Overdue',s:'err'}, epc: 'D', warn: 'EICR overdue: book now', bg: 'linear-gradient(135deg,#1a1e2a,#202838)', status: 'err' },
                  ].map(p => (
                    <div key={p.addr} style={{ background: '#1e1515', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 11, overflow: 'hidden' }}>
                      <div style={{ height: 90, background: p.bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="70" height="70" viewBox="0 0 80 80" fill="none" style={{ opacity: .18 }}><rect x="10" y="35" width="60" height="35" fill="white" rx="2"/><polygon points="40,8 5,38 75,38" fill="white"/><rect x="30" y="50" width="20" height="20" fill="#111"/></svg>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'linear-gradient(transparent,rgba(0,0,0,.75))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{p.addr}</div>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: p.status === 'ok' ? 'rgba(74,222,128,.14)' : 'rgba(248,113,113,.14)', color: p.status === 'ok' ? '#4ade80' : '#f87171' }}>{p.status === 'ok' ? 'Compliant' : 'Action needed'}</span>
                        </div>
                      </div>
                      <div style={{ padding: 10 }}>
                        {[['Rent', p.rent, null], ['Gas cert', p.gas.v, p.gas.s], ['EICR', p.eicr.v, p.eicr.s], ['EPC', p.epc, null]].map(([label, val, st]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                            <span>{label}</span>
                            {st ? <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: st === 'ok' ? 'rgba(74,222,128,.14)' : st === 'w' ? RDIM : 'rgba(248,113,113,.14)', color: st === 'ok' ? '#4ade80' : st === 'w' ? RL : '#f87171' }}>{val}</span>
                              : <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{val}</span>}
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '7px 10px', background: RDIM, borderTop: '0.5px solid ' + RBDR, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>⚠</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: RL }}>{p.warn}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PHONE MOCKUP - mobile only */}
        <div className="dash-mobile" style={{ display: 'none', padding: '0 24px 60px', justifyContent: 'center' }}>
          {/* phone shell */}
          <div style={{ width: '100%', maxWidth: 300, background: '#1a1515', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 36, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            {/* notch bar */}
            <div style={{ background: '#111010', padding: '12px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>9:41</span>
              <div style={{ width: 80, height: 18, background: '#0d0a0a', borderRadius: 20 }}/>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <svg width="14" height="10" viewBox="0 0 14 10" fill="rgba(255,255,255,0.4)"><rect x="0" y="3" width="2" height="7" rx="1"/><rect x="3" y="2" width="2" height="8" rx="1"/><rect x="6" y="1" width="2" height="9" rx="1"/><rect x="9" y="0" width="2" height="10" rx="1"/></svg>
                <svg width="14" height="10" viewBox="0 0 14 10" fill="rgba(255,255,255,0.4)"><rect x="1" y="3" width="12" height="7" rx="2" fillOpacity="0.3"/><rect x="1" y="3" width="9" height="7" rx="2"/><rect x="13" y="5" width="1.5" height="3" rx="1"/></svg>
              </div>
            </div>
            {/* app header */}
            <div style={{ background: '#0d0a0a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, background: R, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: '#fff' }}>L</div>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>Lettly</span>
              </div>
              <div style={{ fontSize: 10, color: RL, background: RDIM, border: '0.5px solid ' + RBDR, borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>2 alerts</div>
            </div>
            {/* stats row */}
            <div style={{ padding: '14px 12px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Portfolio value','£485,000',false],['Monthly income','£3,250',false]].map(([label, val]) => (
                <div key={label} style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>{val}</div>
                </div>
              ))}
            </div>
            {/* property cards */}
            <div style={{ padding: '0 12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { addr: '11 Northfield Ave, HU5', rent: '£850/mo', gas: {v:'Valid',s:'ok'}, eicr: {v:'Valid',s:'ok'}, epc: 'C', warn: 'Gas cert due in 28 days', bg: 'linear-gradient(135deg,#1a2a1e,#1e3024)', status: 'ok' },
                { addr: '7 Tower Hill Mews, HU1', rent: '£1,100/mo', gas: {v:'Valid',s:'ok'}, eicr: {v:'Overdue',s:'err'}, epc: 'D', warn: 'EICR overdue: book now', bg: 'linear-gradient(135deg,#1a1e2a,#202838)', status: 'err' },
              ].map(p => (
                <div key={p.addr} style={{ background: '#1e1515', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 80, background: p.bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="54" height="54" viewBox="0 0 80 80" fill="none" style={{ opacity: .18 }}><rect x="10" y="35" width="60" height="35" fill="white" rx="2"/><polygon points="40,8 5,38 75,38" fill="white"/><rect x="30" y="50" width="20" height="20" fill="#111"/></svg>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'linear-gradient(transparent,rgba(0,0,0,.8))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>{p.addr}</div>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: p.status === 'ok' ? 'rgba(74,222,128,.18)' : 'rgba(248,113,113,.18)', color: p.status === 'ok' ? '#4ade80' : '#f87171' }}>{p.status === 'ok' ? 'Compliant' : 'Action needed'}</span>
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    {[['Rent', p.rent, null], ['Gas cert', p.gas.v, p.gas.s], ['EICR', p.eicr.v, p.eicr.s], ['EPC', p.epc, null]].map(([label, val, st]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                        <span>{label}</span>
                        {st ? <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: st === 'ok' ? 'rgba(74,222,128,.14)' : 'rgba(248,113,113,.14)', color: st === 'ok' ? '#4ade80' : '#f87171' }}>{val}</span>
                          : <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{val}</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '6px 10px', background: RDIM, borderTop: '0.5px solid ' + RBDR, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11 }}>⚠</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: RL }}>{p.warn}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* home indicator */}
            <div style={{ background: '#111010', padding: '8px 0 14px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}/>
            </div>
          </div>
        </div>

        {/* STRIP */}
        <div style={{ background: '#111010', borderTop: '0.5px solid rgba(255,255,255,0.07)', borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '26px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginRight: 4 }}>Works alongside</span>
          {['DPS','TDS','mydeposits','Gas Safe Register','Land Registry','SafeDeposits Scotland','Stripe'].map(t => (
            <span key={t} style={{ padding: '7px 14px', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 100, fontSize: 12, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)' }}>{t}</span>
          ))}
        </div>

        {/* FEATURES */}
        <section className="sec-pad" style={{ maxWidth: 1200, margin: '0 auto' }} id="features">
          <div style={secTag}>Everything included</div>
          <h2 style={secH2}>Not a feature list.<br/>A letting agent replacement.</h2>
          <p style={secSub}>Every tool a letting agent uses to justify their fee, built into one platform.</p>
          <div className="grid-features">
            {features.map(f => (
              <div key={f.title} style={{ background: '#0d0a0a', padding: '34px 28px', cursor: 'default', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#161010'}
                onMouseLeave={e => e.currentTarget.style.background = '#0d0a0a'}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: RDIM, border: '0.5px solid ' + RBDR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 9 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON */}
        <div style={darkSection}>
          <section className="sec-pad" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={secTag}>The honest numbers</div>
            <h2 style={secH2}>Letting agents charge 10–15%<br/>of your rent. We don't.</h2>
            <p style={secSub}>On an £850/month property that is over £1,200 a year, for work you can do yourself in minutes.</p>
            <div className="grid-2">
              <div style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 36 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Letting agent: full management</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Everything you pay for...</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 52, fontWeight: 800, color: R, marginBottom: 24, letterSpacing: '-2px', lineHeight: 1 }}>£1,275<span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.5)', letterSpacing: 0 }}>/yr</span></div>
                {['10–15% of rent, every month, every year','England only: Scotland and Wales not covered','Tenancy renewal fees on top','Maintenance markups passed back to you','You still carry all the legal liability'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 11 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, marginTop: 1, background: 'rgba(248,113,113,.10)', color: '#f87171' }}>✕</div>{item}
                  </div>
                ))}
              </div>
              <div style={{ background: 'linear-gradient(145deg,#1a0d0d,#150a0a)', border: '0.5px solid ' + RBDR, borderRadius: 16, padding: 36 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: RL, marginBottom: 20 }}>Lettly: full management software</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Everything you actually need.</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 52, fontWeight: 800, color: R, marginBottom: 24, letterSpacing: '-2px', lineHeight: 1 }}>£120<span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.5)', letterSpacing: 0 }}>/yr</span></div>
                {['AI reads every certificate automatically','Compliance alerts before anything expires','England, Scotland and Wales all covered','Every feature included, nothing gated','14-day free trial, cancel any time'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: 11 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, marginTop: 1, background: RDIM, color: RL }}>✓</div>{item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* NATIONS */}
        <section className="sec-pad" style={{ maxWidth: 1200, margin: '0 auto' }} id="nations">
          <div style={secTag}>Three nations, one platform</div>
          <h2 style={secH2}>The only platform that covers<br/>all of UK landlord law.</h2>
          <p style={secSub}>England, Scotland and Wales have different legislation. Most platforms only cover England. Lettly covers all three.</p>
          <div className="grid-3">
            {[
              { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'England', act: 'Renters Rights Act 2026', desc: 'Section 21 abolished from 1 May 2026. All tenancies become periodic. PRS Database registration required. Every requirement tracked in Lettly.' },
              { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Scotland', act: 'Private Residential Tenancy', desc: 'No-fault evictions already abolished. PRT replaces AST. Mandatory landlord registration. Repairing Standard compliance tracked automatically.' },
              { flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', name: 'Wales', act: 'Renting Homes (Wales) Act', desc: 'Occupation Contracts replace ASTs. Rent Smart Wales registration required. 29 fitness standards, all tracked and flagged in Lettly.' },
            ].map(n => (
              <div key={n.name} style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 30, cursor: 'default', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = RBDR; e.currentTarget.style.background = '#1e1515' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#161010' }}>
                <span style={{ fontSize: 36, marginBottom: 14, display: 'block' }}>{n.flag}</span>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 5 }}>{n.name}</div>
                <div style={{ fontSize: 11, color: RL, fontWeight: 700, marginBottom: 11, textTransform: 'uppercase', letterSpacing: '.6px' }}>{n.act}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <div style={darkSection}>
          <section className="sec-pad" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={secTag}>What landlords say</div>
            <h2 style={secH2}>Built for landlords<br/>who manage their own.</h2>
            <div className="grid-3">
              {testimonials.map(t => (
                <div key={t.name} style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 26 }}>
                  <div style={{ color: R, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>★★★★★</div>
                  <div style={{ fontSize: 34, color: R, lineHeight: 1, marginBottom: 10, fontFamily: 'Georgia, serif' }}>"</div>
                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, marginBottom: 18, fontWeight: 300, fontStyle: 'italic' }}>{t.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: RDIM, border: '0.5px solid ' + RBDR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: RL, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>{t.initials}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* PRICING */}
        <PricingSection/>

        {/* FINAL CTA */}
        <div style={{ margin: '0 20px 80px', background: 'linear-gradient(140deg,#180d0d,#0d0a0a 50%,#180d0d)', border: '0.5px solid ' + RBDR, borderRadius: 24, padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,44px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(circle,rgba(224,123,123,0.07) 0%,transparent 70%)', pointerEvents: 'none' }}/>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px,5vw,68px)', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 18 }}>
            Stop paying your<br/>letting agent. <em style={{ fontStyle: 'normal', color: R }}>Start today.</em>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', marginBottom: 38, fontWeight: 300 }}>14-day free trial. No credit card. Cancel any time.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <RoseBtn href="#pricing" large>Start free trial →</RoseBtn>
            <GhostBtn href="/blog" large>Read the guides</GhostBtn>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 18 }}>Trusted by UK landlords across England, Scotland and Wales</p>
        </div>

        {/* FOOTER */}
        <footer style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', padding: 'clamp(32px,5vw,52px) clamp(20px,4vw,44px) 36px' }}>
          <div className="grid-footer" style={{ marginBottom: 0 }}>
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 34, height: 34, background: R, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: '#fff' }}>L</div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>Lettly</span>
              </Link>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '14px 0 18px', fontWeight: 300 }}>Property management software for UK private landlords. Replace your letting agent for a fraction of the cost.</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['🏴󠁧󠁢󠁥󠁮󠁧󠁿 England','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland','🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales'].map(n => (
                  <span key={n} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>{n}</span>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: [['Features','#features'],['Pricing','#pricing'],['Dashboard','/dashboard'],['Guides','/blog']] },
              { title: 'Legal', links: [['Terms of Service','/terms'],['Privacy Policy','/privacy'],['Security','/security']] },
              { title: 'Contact', links: [['hello@lettly.co','mailto:hello@lettly.co'],['WhatsApp support','https://wa.me/447700000000']] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: 13 }}>{col.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {col.links.map(([label, href]) => (
                    <Link key={label} href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="footer-bottom" style={{ marginTop: 32, paddingTop: 20, borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              © 2026 Lettly. ICO registered. Information only, not legal or financial advice.<br/>
              Lettly is not a letting agent and is not regulated by RICS or ARLA.
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Lettly.co · Made in the UK</div>
          </div>
        </footer>

      </div>
    </>
  )
}

export async function getServerSideProps() {
  return { props: {} }
}
