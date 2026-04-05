import { useEffect } from 'react'
import CookieBanner from '../components/CookieBanner'

const GA_ID = 'G-F07HEN1RNJ'

function loadGA() {
  if (typeof window === 'undefined') return
  if (window._gaLoaded) return
  window._gaLoaded = true

  const script = document.createElement('script')
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID
  script.async = true
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID)
}

export default function App({ Component, pageProps }) {

  // If user already accepted in a previous visit, load GA immediately
  useEffect(() => {
    const consent = localStorage.getItem('lettly_cookie_consent')
    if (consent === 'accepted') loadGA()
  }, [])

  return (
    <>
      <Component {...pageProps} />
      <CookieBanner
        onAccept={loadGA}
        onDecline={() => {
          // GA never loads — nothing to do
        }}
      />
    </>
  )
}
