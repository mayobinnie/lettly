import Head from 'next/head'
import { useUser, SignInButton, SignUpButton } from '@clerk/nextjs'
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

      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <nav style={{ background:'var(--surface)', borderBottom:'0.5px solid var(--border)', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:62 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'var(--brand)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:18, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
            </div>
            <span style={{ fontFamily:'var(--display)', fontSize:21, fontWeight:400, color:'var(--text)' }}>Lettly</span>
            <span style={{ fontSize:10, color:'var(--brand)', background:'var(--brand-light)', padding:'2px 9px', borderRadius:20, fontWeight:500 }}>beta</span>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <SignInButton mode="redirect" redirectUrl="/dashboard">
              <button style={{ fontSize:13, color:'var(--text-2)', padding:'8px 16px', background:'none', border:'none', cursor:'pointer' }}>
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect" redirectUrl="/dashboard">
              <button style={{ fontSize:13, fontWeight:500, color:'#fff', background:'var(--brand)', padding:'9px 22px', borderRadius:9, boxShadow:'0 2px 8px rgba(27,94,59,0.2)', border:'none', cursor:'pointer' }}>
                Get started free
              </button>
            </SignUpButton>
          </div>
        </nav>

        <div style={{ maxWidth:760, margin:'0 auto', padding:'88px 24px 72px', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--brand-light)', border:'0.5px solid rgba(27,94,59,0.15)', borderRadius:20, padding:'5px 14px', fontSize:12, color:'var(--brand)', fontWeight:500, marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--brand)', display:'inline-block' }} />
            Built for the Renters&#39; Rights Bill era
          </div>
          <h1 style={{ fontFamily:'var(--display)', fontSize:56, fontWeight:300, lineHeight:1.12, color:'var(--text)', marginBottom:20 }}>
            Your property portfolio,<br />
            <em style={{ fontStyle:'italic', color:'var(--brand)' }}>understood in seconds.</em>
          </h1>
          <p style={{ fontSize:17, color:'var(--text-2)', lineHeight:1.8, marginBottom:44, maxWidth:520, margin:'0 auto 44px' }}>
            Drop your certificates, tenancy agreements and mortgage offers. Lettly reads them all and builds your compliance dashboard automatically.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <SignUpButton mode="redirect" redirectUrl="/dashboard">
              <button style={{ fontSize:15, fontWeight:500, color:'#fff', background:'var(--brand)', padding:'14px 36px', borderRadius:12, boxShadow:'0 6px 20px rgba(27,94,59,0.25)', border:'none', cursor:'pointer' }}>
                Start free — no card needed
              </button>
            </SignUpButton>
            <SignInButton mode="redirect" redirectUrl="/dashboard">
              <button style={{ fontSize:15, color:'var(--text-2)', background:'var(--surface)', border:'0.5px solid var(--border-strong)', padding:'14px 28px', borderRadius:12, cursor:'pointer' }}>
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>

        <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {[
            { icon:'📄', title:'Drop any document', body:'Gas certificates, EICRs, insurance policies, tenancy agreements, mortgage offers — Lettly reads them all instantly.' },
            { icon:'⚡', title:'Instant extraction', body:'AI reads every document in seconds, pulls out dates and figures, and populates your compliance dashboard automatically.' },
            { icon:'⚖️', title:'Stay compliant', body:"Never miss a gas cert renewal or EICR deadline. Lettly tracks the Renters' Rights Bill changes so you don't have to." },
          ].map(f => (
            <div key={f.title} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:18, padding:'26px 24px', boxShadow:'var(--shadow-sm)' }}>
              <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
              <div style={{ fontFamily:'var(--display)', fontSize:18, fontWeight:400, color:'var(--text)', marginBottom:8 }}>{f.title}</div>
              <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.75 }}>{f.body}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'var(--surface)', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', padding:'40px 24px', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:18 }}>Reads these documents automatically</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center' }}>
            {[
              { icon:'🔥', label:'Gas certificate',     bg:'#fff8e1', fg:'#633806' },
              { icon:'⚡', label:'EICR',                 bg:'#e3f2fd', fg:'#0C447C' },
              { icon:'🛡️', label:'Insurance policy',    bg:'#f3e8ff', fg:'#6b21a8' },
              { icon:'📄', label:'Tenancy agreement',    bg:'#eaf4ee', fg:'#1b5e3b' },
              { icon:'🏦', label:'Mortgage offer',       bg:'#fce8e6', fg:'#791F1F' },
              { icon:'🏠', label:'Completion statement', bg:'#e8f5e9', fg:'#1e6e35' },
            ].map(d => (
              <span key={d.label} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, padding:'7px 16px', borderRadius:24, background:d.bg, color:d.fg, fontWeight:500 }}>
                <span style={{ fontSize:15 }}>{d.icon}</span>{d.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center', padding:'32px 24px', fontSize:12, color:'var(--text-3)' }}>
          Lettly · Built for UK landlords · lettly.co
        </div>
      </div>
    </>
  )
}
