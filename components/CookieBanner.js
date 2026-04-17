import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner({ onAccept, onDecline }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('lettly_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('lettly_cookie_consent', 'accepted')
    setVisible(false)
    if (onAccept) onAccept()
  }

  function decline() {
    localStorage.setItem('lettly_cookie_consent', 'declined')
    setVisible(false)
    if (onDecline) onDecline()
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, width: 'min(480px, calc(100vw - 32px))',
      background: '#161010',
      border: '0.5px solid rgba(224,123,123,0.26)',
      borderRadius: 16,
      padding: '20px 22px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36, height: 36, background: '#e07b7b', borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700,
          fontStyle: 'italic', color: '#fff',
        }}>L</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 5 }}>
            We use cookies
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
            We use analytics cookies to understand how you use Lettly so we can improve the experience. No advertising data is collected.{' '}
            <Link href="/privacy" style={{ color: '#eca9a9', textDecoration: 'underline' }}>
              Privacy policy
            </Link>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={decline} style={{
          padding: '8px 20px', borderRadius: 100, border: '0.5px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: 'rgba(255,255,255,0.7)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Decline
        </button>
        <button onClick={accept} style={{
          padding: '8px 20px', borderRadius: 100, border: 'none',
          background: '#e07b7b', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Accept cookies
        </button>
      </div>
    </div>
  )
}
