import { SignIn } from '@clerk/nextjs'
import Head from 'next/head'

export default function SignInPage() {
  return (
    <>
      <Head><title>Sign in — Lettly</title></Head>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:40 }}>
          <div style={{ width:42, height:42, background:'var(--brand)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontSize:22, fontWeight:700, fontFamily:'var(--display)', fontStyle:'italic' }}>L</span>
          </div>
          <span style={{ fontFamily:'var(--display)', fontSize:26, fontWeight:400, color:'var(--text)' }}>Lettly</span>
        </div>

        <div style={{ marginBottom: 24, textAlign:'center' }}>
          <h1 style={{ fontFamily:'var(--display)', fontSize:28, fontWeight:300, color:'var(--text)', marginBottom:8 }}>
            Welcome back
          </h1>
          <p style={{ fontSize:14, color:'var(--text-2)' }}>Sign in to your portfolio</p>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#1b5e3b',
              colorBackground: '#ffffff',
              colorInputBackground: '#f7f5f0',
              colorInputText: '#1c1c1a',
              borderRadius: '10px',
              fontFamily: 'DM Sans, system-ui, sans-serif',
            },
            elements: {
              card: { boxShadow: '0 2px 16px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.05)', border: 'none' },
              formButtonPrimary: { backgroundColor: '#1b5e3b', fontSize: '13px' },
            },
          }}
          redirectUrl="/dashboard"
          signUpUrl="/sign-up"
        />
      </div>
    </>
  )
}
