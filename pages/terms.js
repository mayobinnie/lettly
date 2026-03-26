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

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service - Lettly</title>
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

        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,4vw,48px)' }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 300, color: 'var(--text)', marginBottom: 8 }}>Terms of Service</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Last updated: {LAST_UPDATED} · By using Lettly you agree to these terms</p>
          </div>

          <div style={{ background: '#fff8e1', border: '0.5px solid #EF9F27', borderRadius: 12, padding: '14px 18px', marginBottom: 36, fontSize: 13, color: '#633806', lineHeight: 1.7 }}>
            Important: Lettly is an information and management tool, not a source of legal advice. Always consult a qualified solicitor for legal guidance specific to your situation.
          </div>

          <Section title="1. Who we are">
            <P>Lettly is operated by Lettly Ltd, United Kingdom ("Lettly", "we", "us"). By creating an account and using Lettly, you agree to these Terms of Service.</P>
          </Section>

          <Section title="2. What Lettly is">
            <P>Lettly is a property portfolio management tool that helps UK landlords organise compliance documents, track deadlines, manage maintenance, and understand landlord legislation.</P>
            <P>Lettly is not:</P>
            <UL items={[
              'A law firm or source of legal advice',
              'A financial adviser or source of financial advice',
              'A letting agent or property management company',
              'Responsible for the accuracy of legislation information (laws change - always verify with a qualified professional)',
            ]} />
          </Section>

          <Section title="3. Your account">
            <P>You are responsible for maintaining the security of your account credentials. You must not share your account with others. You must be 18 or over to use Lettly.</P>
            <P>You are responsible for ensuring that any data you enter about tenants is accurate and that you have the right to store and process that data in accordance with UK GDPR.</P>
          </Section>

          <Section title="4. Your data">
            <P>You own all data you enter into Lettly. We do not claim ownership of your portfolio data, documents, or property information.</P>
            <P>By using Lettly, you grant us a limited licence to process your data for the purpose of providing the service, including sending it to AI providers for document extraction and chat features.</P>
            <P>If you cancel your account, we will delete all your data within 30 days. See our Privacy Policy for full details.</P>
          </Section>

          <Section title="5. Subscription and payments">
            <P>Lettly offers paid subscription plans. All plans include a 14-day free trial. Payment is processed by Stripe. You can cancel at any time — cancellation takes effect at the end of your current billing period.</P>
            <P>We reserve the right to change pricing with 30 days notice to existing subscribers.</P>
            <P>Refunds are considered on a case-by-case basis. Contact hello@lettly.co.</P>
          </Section>

          <Section title="6. Acceptable use">
            <P>You must not use Lettly to:</P>
            <UL items={[
              'Upload unlawful content or content that infringes third-party rights',
              'Attempt to access other users accounts or data',
              'Use automated tools to scrape or extract data from Lettly',
              'Harass, intimidate or discriminate against tenants through the platform',
              'Circumvent any security or access controls',
              'Use Lettly for any purpose that is unlawful under UK law',
            ]} />
          </Section>

          <Section title="7. Not legal or financial advice">
            <P>All legislation information, compliance guidance, document templates, AI responses, and financial calculations provided by Lettly are for general information only. They do not constitute legal advice, financial advice, or any form of professional advice.</P>
            <P>Landlord law is complex and changes frequently. Always verify legal information with a qualified solicitor. Always verify financial information with a qualified accountant or financial adviser.</P>
            <P>Lettly Ltd accepts no liability for any loss or damage arising from reliance on information provided by Lettly, including AI-generated content.</P>
          </Section>

          <Section title="8. Service availability">
            <P>We aim for high availability but cannot guarantee 100% uptime. We may suspend the service for maintenance with reasonable notice. We are not liable for any loss caused by service downtime.</P>
          </Section>

          <Section title="9. Limitation of liability">
            <P>To the maximum extent permitted by law, Lettly Ltd shall not be liable for:</P>
            <UL items={[
              'Any indirect, incidental, or consequential loss',
              'Loss of data, profits, revenue, or business',
              'Any loss arising from reliance on AI-generated content or legislation information',
              'Any loss arising from third-party service failures (Supabase, Clerk, Vercel, Stripe, Anthropic)',
            ]} />
            <P>Our total liability to you in any 12-month period shall not exceed the amount you have paid us in that period.</P>
          </Section>

          <Section title="10. Governing law">
            <P>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
          </Section>

          <Section title="11. Changes to these terms">
            <P>We will notify active users by email of any material changes to these terms with at least 14 days notice. Continued use of Lettly after that notice period constitutes acceptance of the new terms.</P>
          </Section>

          <Section title="12. Contact">
            <P>For any questions about these terms: <strong>hello@lettly.co</strong></P>
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
