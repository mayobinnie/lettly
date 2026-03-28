import { ClerkProvider } from '@clerk/nextjs'
import '../styles/globals.css'
import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err)
      })
    }

    // Capture install prompt
    const handler = e => {
      e.preventDefault()
      setInstallPrompt(e)
      // Only show banner if not already installed and not dismissed
      if (!localStorage.getItem('pwa-dismissed')) {
        setShowBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
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
        <meta name="theme-color" content="#1b5e3b"/>
      </Head>
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
      {showBanner && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center',
          gap: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', zIndex: 999,
          maxWidth: 'calc(100vw - 32px)', width: 360,
        }}>
          <div style={{ width: 36, height: 36, background: 'var(--brand)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>L</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Add Lettly to home screen</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Quick access from your phone</div>
          </div>
          <button onClick={handleInstall} style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Install</button>
          <button onClick={dismissBanner} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>x</button>
        </div>
      )}
    </ClerkProvider>
    </>
  )
}
