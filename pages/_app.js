import { ClerkProvider } from '@clerk/nextjs'
import '../styles/globals.css'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { Analytics } from '@vercel/analytics/next'

export default function App({ Component, pageProps }) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err)
      })
    }
    const handler = e => {
      e.preventDefault()
      setInstallPrompt(e)
      if (!localStorage.getItem('pwa-dismissed')) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setShowBanner(false)
    setInstallPrompt(null)
  }

  function dismissBanner() {
    setShowBanner(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <link rel="alternate icon" href="/favicon.svg"/>
        <link rel="apple-touch-icon" href="/icon.svg"/>
        <meta name="theme-color" content="#4a6741"/>
      </Head>
      <ClerkProvider {...pageProps}>
        <Component {...pageProps} />
        <Analytics />

        {/* PWA install banner */}
        {showBanner && (
          <div style={{
            position:'fixed', bottom:16, left:'50%', transform:'translateX(-50%)',
            background:'var(--surface)', border:'0.5px solid var(--border)',
            borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center',
            gap:12, boxShadow:'0 4px 24px rgba(0,0,0,0.12)', zIndex:999,
            maxWidth:'calc(100vw - 32px)', width:360,
          }}>
            <div style={{width:36,height:36,background:'var(--brand)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{color:'#fff',fontSize:18,fontWeight:700,fontStyle:'italic',fontFamily:'Georgia, serif'}}>L</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>Add Lettly to home screen</div>
              <div style={{fontSize:11,color:'var(--text-3)'}}>Quick access from your phone</div>
            </div>
            <button onClick={handleInstall} style={{background:'var(--brand)',color:'#fff',border:'none',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>Install</button>
            <button onClick={dismissBanner} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',fontSize:18,padding:'0 4px'}}>x</button>
          </div>
        )}

        {/* WhatsApp support button */}
        <a
          href="https://wa.me/447715668631?text=Hi%2C%20I%20have%20a%20question%20about%20Lettly"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          style={{
            position:'fixed', bottom:24, right:24, zIndex:999,
            width:54, height:54, borderRadius:'50%',
            background:'#25D366', display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(37,211,102,0.4)', textDecoration:'none',
            transition:'transform 0.2s',
          }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>

      </ClerkProvider>
    </>
  )
}
