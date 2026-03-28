import Head from 'next/head'
import Link from 'next/link'

const LAST_UPDATED = '26 March 2026'

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 400, color: 'var(--text)', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.85 }}>{children}</div>
    </div>
  )
}

function P({ children }) { return <p style={{ marginBottom: 12 }}>{children}</p> }
function UL({ items }) { return <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{items.map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}</ul> }

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Lettly</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        {/* Nav */}
        <nav style={{ background: 'var(--surface)', borderBottom: '0.5px solid var(--border)', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--display)', fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--text)' }}>Lettly</span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>Back to home</Link>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,4vw,48px)' }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 300, color: 'var(--text)', marginBottom: 8 }}>Privacy Policy</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Last updated: {LAST_UPDATED} · Lettly is operated by Lettly Ltd, United Kingdom</p>
          </div>

          <div style={{ background: 'var(--brand-subtle)', border: '0.5px solid rgba(27,94,59,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 36, fontSize: 13, color: 'var(--brand)', lineHeight: 1.7 }}>
            The short version: we collect only what we need to run Lettly, we store it securely in the EU, we never sell it, and you can delete it any time.
          </div>

          <Section title="Who we are">
            <P>Lettly is a property portfolio management platform for UK landlords, operated by Lettly Ltd, United Kingdom. We are the data controller for personal data collected through lettly.co.</P>
            <P>Contact us about privacy: <strong>hello@lettly.co</strong></P>
          </Section>

          <Section title="What data we collect">
            <P>We collect the following categories of personal data:</P>
            <UL items={[
              'Account data: your name and email address, collected when you sign up via Clerk (our authentication provider)',
              'Portfolio data: property addresses, tenancy details, tenant names and contact information, financial figures, compliance certificate dates. All entered by you or extracted from documents you upload',
              'Documents: PDFs and images you upload for AI extraction. These are processed and then the extracted data is stored. Raw document files are not stored on our servers.',
              'Usage data: pages visited, features used, session information, collected anonymously via Vercel Analytics',
              'Payment data: handled entirely by Stripe. We never see or store your card details.',
            ]} />
          </Section>

          <Section title="How we use your data">
            <P>We use your data solely to provide the Lettly service:</P>
            <UL items={[
              'To create and manage your account',
              'To store and display your property portfolio',
              'To send compliance reminder emails you request',
              'To provide AI-powered document extraction and chat features',
              'To process your subscription payments via Stripe',
              'To improve Lettly: we may analyse anonymised, aggregated usage patterns',
            ]} />
            <P>We do not use your data for advertising. We do not sell your data to any third party. Ever.</P>
          </Section>

          <Section title="Who we share data with">
            <P>We use a small number of trusted third-party services to operate Lettly. Each acts as a data processor on our behalf:</P>
            <UL items={[
              'Supabase (supabase.com): database storage, hosted in EU West (Ireland). Your portfolio data lives here.',
              'Clerk (clerk.com): authentication and user accounts. Stores your name and email.',
              'Anthropic (anthropic.com): AI processing for document extraction and chat. Documents are processed transiently and not retained by Anthropic.',
              'Vercel (vercel.com): hosting and deployment. Based in the EU when possible.',
              'Resend (resend.com): email delivery for compliance reminders.',
              'Stripe (stripe.com): payment processing. We never see your card details.',
            ]} />
            <P>We do not share your data with any other third parties, including letting agents, mortgage brokers, insurance providers, or advertisers.</P>
          </Section>

          <Section title="Where your data is stored">
            <P>Your portfolio data is stored in Supabase, hosted on AWS EU West (Ireland). This is within the UK GDPR adequacy framework.</P>
            <P>Authentication data is stored with Clerk, which operates within EU data centres.</P>
            <P>All data in transit is encrypted using TLS. All data at rest is encrypted using AES-256.</P>
          </Section>

          <Section title="How long we keep your data">
            <UL items={[
              'Account and portfolio data: for as long as your account is active, plus 30 days after deletion to allow recovery',
              'After 30 days of account deletion: all personal data is permanently deleted from our systems',
              'Anonymised usage analytics: retained indefinitely (no personal data)',
              'Payment records: retained for 7 years as required by HMRC',
            ]} />
          </Section>

          <Section title="Your rights under UK GDPR">
            <P>You have the following rights regarding your personal data:</P>
            <UL items={[
              'Right to access: request a copy of all data we hold about you',
              'Right to rectification: correct inaccurate data',
              'Right to erasure: request deletion of your account and all associated data',
              'Right to portability: receive your data in a machine-readable format',
              'Right to object: object to processing of your data',
              'Right to restrict processing: limit how we use your data',
            ]} />
            <P>To exercise any of these rights, email <strong>hello@lettly.co</strong>. We will respond within 30 days.</P>
            <P>You have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe your data has been handled improperly.</P>
          </Section>

          <Section title="Cookies">
            <P>Lettly uses only essential cookies required for the service to function:</P>
            <UL items={[
              'Authentication cookies: set by Clerk to keep you logged in during a session',
              'Session cookies: set by Next.js for application state',
              'Analytics cookies: anonymised, set by Vercel Analytics, no personal data collected',
            ]} />
            <P>We do not use advertising cookies, tracking cookies, or third-party marketing cookies. You can disable cookies in your browser settings, but this will prevent you from logging in.</P>
          </Section>

          <Section title="Children">
            <P>Lettly is not intended for use by anyone under the age of 18. We do not knowingly collect data from children. If you believe a child has created an account, contact us at hello@lettly.co and we will delete it immediately.</P>
          </Section>

          <Section title="Changes to this policy">
            <P>We will notify active users by email if we make material changes to this privacy policy. The date at the top of this page shows when it was last updated.</P>
          </Section>

          <Section title="Contact">
            <P>For any privacy questions or requests: <strong>hello@lettly.co</strong></P>
            <P>Lettly Ltd, United Kingdom</P>
          </Section>
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
