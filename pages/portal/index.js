import Head from 'next/head'

export default function TenantPortal() {
  return (
    <>
      <Head>
        <title>Tenant Portal - Lettly</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
      </Head>
      <div style={{ minHeight:'100vh', background:'#f7f5f0', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'#fff', borderRadius:20, padding:'40px 36px', maxWidth:420, width:'100%', textAlign:'center', border:'0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ width:48, height:48, background:'#1b5e3b', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <span style={{ color:'#fff', fontSize:22, fontWeight:700, fontFamily:'Georgia, serif', fontStyle:'italic' }}>L</span>
          </div>
          <h1 style={{ fontFamily:'Georgia, serif', fontSize:24, fontWeight:300, marginBottom:8, color:'#1c1c1a' }}>Tenant Portal</h1>
          <p style={{ fontSize:14, color:'#6b6860', marginBottom:28, lineHeight:1.6 }}>View your tenancy documents, report maintenance issues, and see your rent account.</p>
          <a href="https://accounts.lettly.co/sign-in" style={{ display:'block', background:'#1b5e3b', color:'#fff', borderRadius:10, padding:'13px 24px', fontSize:15, fontWeight:600, textDecoration:'none', marginBottom:12 }}>Sign in as tenant</a>
          <p style={{ fontSize:12, color:'#a09d98' }}>No account? Ask your landlord for an invitation link.</p>
        </div>
      </div>
    </>
  )
}
