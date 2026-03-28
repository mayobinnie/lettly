import Head from 'next/head'
import Link from 'next/link'

function TrustCard({ icon, title, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 400, color: 'var(--text)', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

function Provider({ name, role, location, cert }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{role}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 2 }}>{location}</div>
        {cert && <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>{cert}</div>}
      </div>
    </div>
  )
}

export default function Security() {
  return (
    <>
      <Head>
        <title>Security and Trust - Lettly</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <nav style={{ background: 'var(--surface)', borderBottom: '0.5px solid var(--border)', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--display)', fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--text)' }}>Lettly</span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>Back to home</Link>
        </nav>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,4vw,48px)' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--brand-light)', marginBottom: 20 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 300, color: 'var(--text)', marginBottom: 12 }}>Security and Trust</h1>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
              You are uploading sensitive financial documents and tenant data to Lettly. Here is exactly how we keep it safe.
            </p>
          </div>

          {/* Key trust stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 48 }}>
            {[
              { label: 'Data stored in', value: 'EU (Ireland)', sub: 'AWS eu-west-1' },
              { label: 'Encryption', value: 'AES-256', sub: 'At rest and in transit' },
              { label: 'Data sold to third parties', value: 'Never', sub: 'No advertising, ever' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--brand-subtle)', border: '0.5px solid rgba(27,94,59,0.15)', borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 400, color: 'var(--brand)', marginBottom: 3 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Trust cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 48 }}>
            <TrustCard icon="🔐" title="Encryption everywhere">
              All data transmitted between your browser and Lettly is encrypted using TLS 1.3. All data stored in our database is encrypted at rest using AES-256. Your documents never travel unencrypted.
            </TrustCard>
            <TrustCard icon="🇬🇧" title="UK GDPR compliant">
              Lettly is designed from the ground up for UK GDPR compliance. You own your data, you can export it, and you can delete it permanently at any time. We have a full Privacy Policy and respond to data requests within 30 days.
            </TrustCard>
            <TrustCard icon="🏦" title="Bank-grade authentication">
              Authentication is handled by Clerk, which uses the same security standards as enterprise financial applications. We never store your password. We support multi-factor authentication.
            </TrustCard>
            <TrustCard icon="🚫" title="No advertising. No data selling.">
              Lettly makes money from subscriptions only. We never sell your data, never share it with advertisers, and never use it for any purpose outside of providing the Lettly service.
            </TrustCard>
            <TrustCard icon="🤖" title="AI processing is transient">
              When you upload a document for AI extraction, the file is sent to Anthropic for processing and then discarded. Anthropic does not retain your documents or use them for model training under our API agreement.
            </TrustCard>
            <TrustCard icon="👤" title="Row-level security">
              Every piece of data in Lettly is locked to your account using row-level security in our database. It is technically impossible for another user to access your portfolio data, even if they tried.
            </TrustCard>
          </div>

          {/* Infrastructure providers */}
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 48 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--text)', marginBottom: 4 }}>Infrastructure providers</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>We use best-in-class providers trusted by thousands of enterprise companies.</div>
            <Provider name="Supabase" role="Database and storage" location="AWS eu-west-1, Ireland" cert="SOC 2 Type II"/>
            <Provider name="Vercel" role="Application hosting" location="Edge network, EU preference" cert="SOC 2 Type II"/>
            <Provider name="Clerk" role="Authentication" location="EU data centres" cert="SOC 2 Type II"/>
            <Provider name="Anthropic" role="AI document processing" location="API : data not retained" cert="Enterprise API agreement"/>
            <Provider name="Stripe" role="Payment processing" location="EU data centres" cert="PCI DSS Level 1"/>
            <Provider name="Resend" role="Email delivery" location="EU data centres" cert="SOC 2"/>
          </div>

          {/* Responsible disclosure */}
          <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: 24, marginBottom: 48 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--text)', marginBottom: 10 }}>Responsible disclosure</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
              If you discover a security vulnerability in Lettly, please report it responsibly by emailing <strong>security@lettly.co</strong>. Do not publish or share the vulnerability until we have had a chance to fix it. We take all security reports seriously and will respond within 48 hours.
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 20 }}>Common questions</h2>
            {[
              { q: 'What happens to my data if I cancel my account?', a: 'Your data remains accessible for 30 days after cancellation in case you change your mind. After 30 days, all your personal data is permanently and irreversibly deleted from our systems.' },
              { q: 'Can Lettly employees see my property data?', a: 'Access to production data is strictly limited to essential technical operations only, and only when required to resolve a support issue with your explicit consent. All access is logged.' },
              { q: 'Are my uploaded documents stored permanently?', a: 'No. Documents you upload are processed by our AI and the key data extracted. The raw document files are not stored on our servers after processing.' },
              { q: 'Is Lettly ICO registered?', a: 'Yes. Lettly Ltd is registered with the Information Commissioner\'s Office (ICO) as a data controller, as required for any UK company processing personal data.' },
              { q: 'What happens if there is a data breach?', a: 'In the unlikely event of a data breach, we will notify affected users and the ICO within 72 hours as required by UK GDPR. We will publish a transparent post-incident report.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '16px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>{item.q}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{item.a}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--brand-subtle)', border: '0.5px solid rgba(27,94,59,0.2)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--brand)', marginBottom: 6 }}>Questions about security?</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Email us at <strong>security@lettly.co</strong>. We respond to all security enquiries within 48 hours.</div>
          </div>
        </div>

        <footer style={{ background: 'var(--surface)', borderTop: '0.5px solid var(--border)', padding: '20px clamp(16px,4vw,48px)', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>© 2026 Lettly</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Security', '/security']].map(([l, h]) => (
              <Link key={l} href={h} style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
        </footer>
      </div>
    </>
  )
}
