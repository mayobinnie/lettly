import { useState, useEffect } from 'react'

export default function CookieBanner({ onAccept, onDecline }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('lettly_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const handleAccept = () => {
    localStorage.setItem('lettly_cookie_consent', 'accepted')
    setVisible(false)
    if (onAccept) onAccept()
  }

  const handleDecline = () => {
    localStorage.setItem('lettly_cookie_consent', 'declined')
    setVisible(false)
    if (onDecline) onDecline()
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        .cookie-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: calc(100% - 48px);
          max-width: 560px;
          background: #ffffff;
          border: 0.5px solid rgba(27, 94, 59, 0.25);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(27, 94, 59, 0.12), 0 2px 8px rgba(0,0,0,0.06);
          padding: 20px 24px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .cookie-inner {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .cookie-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          background: #f0f7f3;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          margin-top: 1px;
        }

        .cookie-text {
          flex: 1;
        }

        .cookie-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }

        .cookie-body {
          font-size: 12.5px;
          color: #5a5a5a;
          line-height: 1.55;
          margin: 0;
        }

        .cookie-body a {
          color: #1b5e3b;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .cookie-actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          justify-content: flex-end;
        }

        .cookie-btn-decline {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          color: #6b6b6b;
          background: transparent;
          border: 0.5px solid #d8d8d8;
          border-radius: 7px;
          padding: 7px 16px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .cookie-btn-decline:hover {
          border-color: #aaa;
          color: #333;
        }

        .cookie-btn-accept {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          color: #ffffff;
          background: #1b5e3b;
          border: none;
          border-radius: 7px;
          padding: 7px 18px;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: -0.01em;
        }

        .cookie-btn-accept:hover {
          background: #164d30;
        }

        @media (max-width: 480px) {
          .cookie-banner {
            bottom: 16px;
            left: 16px;
            right: 16px;
            width: auto;
            transform: none;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>

      <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
        <div className="cookie-inner">
          <div className="cookie-icon">🍪</div>
          <div className="cookie-text">
            <p className="cookie-title">We use cookies</p>
            <p className="cookie-body">
              We use analytics cookies to understand how you use Lettly so we can improve the experience.
              No advertising data is collected.{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>
            </p>
          </div>
        </div>
        <div className="cookie-actions">
          <button className="cookie-btn-decline" onClick={handleDecline}>
            Decline
          </button>
          <button className="cookie-btn-accept" onClick={handleAccept}>
            Accept cookies
          </button>
        </div>
      </div>
    </>
  )
}
