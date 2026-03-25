import { SignIn } from '@clerk/nextjs'
import Head from 'next/head'

export default function SignInPage() {
  return (
    <>
      <Head><title>Sign in — Lettly</title></Head>
      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
          <div style={{ width:42, height:42, background:'var(--brand)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontSize:22, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
          </div>
          <span style={{ fontFamily:'var(--display)', fontSize:26, fontWeight:400, color:'var(--text)' }}>Lettly</span>
        </div>
        <SignIn afterSignInUrl="/dashboard" />
      </div>
    </>
  )
}
