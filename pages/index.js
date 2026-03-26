import Head from 'next/head'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Landing() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  return (
    <>
      <Head>
        <title>Lettly — AI property portfolio management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Drop your property documents — Lettly reads them and builds your compliance dashboard automatically." />
      </Head>

      <style>{`
        .hero-title { font-family: var(--display); font-size: clamp(32px, 6vw, 56px); font-weight: 300; line-height: 1.12; color: var(--text); margin-bottom: 20px; }
        .hero-sub { font-size: clamp(14px, 2vw, 17px); color: var(--text-2); line-height: 1.8; margin: 0 auto 44px; max-width: 520px; }
        .cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .cta-primary { font-size: 15px; font-weight: 500; color: #fff; background: var(--brand); padding: 14px 36px; border-radius: 12px; box-shadow: 0 6px 20px rgba(27,94,59,0.25); display: inline-block; }
        .cta-secondary { font-size: 15px; color: var(--text-2); background: var(--surface); border: 0.5px solid var(--border-strong); padding: 14px 28px; border-radius: 12px; display: inline-block; }
        .feature-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .doc-strip { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        @media (max-width: 768px) {
          .feature-grid { grid-template-columns: 1fr; }
          .cta-row a { width: 100%; text-align: center; box-sizing: border-box; }
          nav .nav-right a { display: none; }
          nav .nav-right a:last-child { display: inline-block; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <nav style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:58 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, background:'var(--brand)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontSize:17, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:19, fontWeight:400, color:'var(--text)' }}>Lettly</span>
            <span style={{ fontSize:10, color:'var(--brand)', background:'var(--brand-light)', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>beta</span>
          </div>
          <div className="nav-right" style={{ display:'flex', gap:10, alignItems:'center' }}>
            <a href="https://accounts.lettly.co/sign-in" style={{ fontSize:13, color:'var(--text-2)', padding:'8px 14px' }}>Sign in</a>
            <a href="https://accounts.lettly.co/sign-up" style={{ fontSize:13, fontWeight:500, color:'#fff', background:'var(--brand)', padding:'8px 18px', borderRadius:8, boxShadow:'0 2px 8px rgba(27,94,59,0.2)', whiteSpace:'nowrap' }}>
              Get started
            </a>
          </div>
        </nav>

        <div style={{ maxWidth:760, margin:'0 auto', padding:'clamp(40px,8vw,88px) 20px clamp(40px,6vw,72px)', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--brand-light)', border:'0.5px solid rgba(27,94,59,0.15)', borderRadius:20, padding:'5px 14px', fontSize:12, color:'var(--brand)', fontWeight:500, marginBottom:24 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--brand)', display:'inline-block', flexShrink:0 }} />
            Built for the Renters&#39; Rights Bill era
          </div>
          <h1 className="hero-title">
            Your property portfolio,<br />
            <em style={{ fontStyle:'italic', color:'var(--brand)' }}>understood in seconds.</em>
          </h1>
          <p className="hero-sub">
            Drop your certificates, tenancy agreements and mortgage offers. Lettly reads them all and builds your compliance dashboard automatically.
          </p>
          <div className="cta-row">
            <a href="https://accounts.lettly.co/sign-up" className="cta-primary">Start free — no card needed</a>
            <a href="https://accounts.lettly.co/sign-in" className="cta-secondary">Sign in</a>
          </div>
        </div>

        <div style={{ maxWidth:960, margin:'0 auto', padding:'0 20px 64px' }}>
          <div className="feature-grid">
            {[
              { icon:'📄', title:'Drop any document', body:'Gas certificates, EICRs, insurance policies, tenancy agreements, mortgage offers — Lettly reads them all instantly.' },
              { icon:'⚡', title:'Instant extraction', body:'AI reads every document in seconds, pulls out dates and figures, and populates your compliance dashboard automatically.' },
              { icon:'⚖️', title:'Stay compliant', body:"Never miss a gas cert renewal or EICR deadline. Lettly tracks the Renters' Rights Bill changes so you don't have to." },
            ].map(f => (
              <div key={f.title} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:16, padding:'22px 20px' }}>
                <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
                <div style={{ fontFamily:'var(--display)', fontSize:17, fontWeight:400, color:'var(--text)', marginBottom:7 }}>{f.title}</div>
                <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.75 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'var(--surface)', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', padding:'36px 20px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:16 }}>Reads these documents automatically</div>
          <div className="doc-strip">
            {[
              { icon:'🔥', label:'Gas certificate', bg:'#fff8e1', fg:'#633806' },
              { icon:'⚡', label:'EICR', bg:'#e3f2fd', fg:'#0C447C' },
              { icon:'🛡️', label:'Insurance', bg:'#f3e8ff', fg:'#6b21a8' },
              { icon:'📄', label:'Tenancy agreement', bg:'#eaf4ee', fg:'#1b5e3b' },
              { icon:'🏦', label:'Mortgage offer', bg:'#fce8e6', fg:'#791F1F' },
              { icon:'🏠', label:'Completion statement', bg:'#e8f5e9', fg:'#1e6e35' },
            ].map(d => (
              <span key={d.label} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, padding:'6px 14px', borderRadius:20, background:d.bg, color:d.fg, fontWeight:500 }}>
                <span style={{ fontSize:14 }}>{d.icon}</span>{d.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center', padding:'28px 20px', fontSize:12, color:'var(--text-3)' }}>
          Lettly · Built for UK landlords · lettly.co
        </div>
      </div>
    </>
  )
}
