import Head from 'next/head'
import Link from 'next/link'

const LAST_UPDATED = '28 March 2026'

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

          <div style={{ background: '#fce8e6', border: '1px solid #E24B4A', borderRadius: 12, padding: '18px 20px', marginBottom: 36, lineHeight: 1.75 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#791F1F', marginBottom: 8 }}>Important: Lettly is a management tool, not a legal adviser</div>
            <div style={{ fontSize: 13, color: '#791F1F' }}>Nothing in Lettly constitutes legal advice, financial advice, or professional compliance advice. You remain solely responsible for complying with all landlord obligations under English, Scottish, and Welsh law. Always consult a qualified solicitor for legal guidance and a qualified accountant for financial guidance before acting on any information provided by Lettly.</div>
          </div>

          <Section title="1. Who we are">
            <P>Lettly is operated by Lettly Ltd, United Kingdom ("Lettly", "we", "us"). By creating an account and using Lettly, you agree to these Terms of Service.</P>
          </Section>

          <Section title="2. What Lettly is">
            <P>Lettly is a property portfolio management and information tool. It helps UK landlords organise compliance documents, track deadlines, manage maintenance, understand landlord legislation, and generate draft documents.</P>
            <P>Lettly is not, and does not hold itself out to be:</P>
            <UL items={[
              'A law firm, solicitor, or regulated legal services provider',
              'A financial adviser, accountant, or regulated financial services provider',
              'A letting agent or property management company',
              'An authorised compliance adviser',
              'A substitute for professional legal or financial advice',
            ]} />
            <P>All information, guidance, legislation summaries, AI responses, document templates, and financial calculations provided by Lettly are for general informational purposes only. They reflect our understanding at the time of writing and may not reflect the most recent legislative changes. Laws change frequently. You must verify all information with a qualified professional before acting on it.</P>
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
            <P>Lettly offers paid subscription plans. All plans include a 14-day free trial. Payment is processed by Stripe. You can cancel at any time. Cancellation takes effect at the end of your current billing period.</P>
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

          <Section title="7. No legal or financial advice — landlord responsibility">
            <P><strong>Lettly provides information and tools. It does not provide legal or financial advice.</strong></P>
            <P>Specifically:</P>
            <UL items={[
              'Legislation summaries and compliance checklists are for general guidance only. They do not constitute legal advice and may not reflect the most current law. Always verify with a qualified solicitor.',
              'Document templates (including tenancy agreements, Section 8 notices, and all other generated documents) are draft starting points only. They must be reviewed by a qualified solicitor before use. Lettly does not warrant that any generated document is legally valid, complete, or appropriate for your specific circumstances.',
              'AI-generated responses and advice are generated by a language model and may contain errors, inaccuracies, or outdated information. Never rely solely on AI-generated content for legal or compliance decisions.',
              'Financial calculations (yield, P&L, Section 24 tax estimates, valuation estimates) are indicative only. They are not professional financial advice. Always consult a qualified accountant or financial adviser.',
              'Compliance reminders and deadline tracking are provided as a convenience. You remain solely responsible for meeting all legal compliance deadlines. Missing a reminder notification from Lettly does not transfer any legal responsibility to Lettly.',
              'Land Registry valuation estimates are based on comparable sold prices and are indicative only. They are not a formal valuation and should not be used for mortgage, insurance, or legal purposes.',
              'Legislation monitoring alerts are provided on a best-efforts basis. Lettly does not warrant that all legislative changes will be detected or communicated to you promptly.',
            ]} />
            <P>You, as the landlord, are solely and entirely responsible for:</P>
            <UL items={[
              'Complying with all applicable landlord legislation in England, Scotland, and Wales',
              'Ensuring all tenancy documents are legally valid and appropriate for your circumstances',
              'Meeting all compliance deadlines (gas certificates, EICRs, EPCs, deposit protection, etc.)',
              'Verifying the immigration status of all tenants (Right to Rent)',
              'Registering with all relevant authorities (Rent Smart Wales, Scottish Landlord Register, PRS Database)',
              'Declaring all rental income to HMRC and complying with your tax obligations',
              'Maintaining your property in a safe and habitable condition',
              'Any consequences arising from non-compliance with landlord law',
            ]} />
            <P>Using Lettly does not discharge, reduce, or transfer any of your legal obligations as a landlord.</P>
            <P>Lettly Ltd accepts no liability for any loss, damage, penalty, fine, prosecution, or other consequence arising from your reliance on any information, document, reminder, or guidance provided by Lettly.</P>
          </Section>

          <Section title="8. Service availability">
            <P>We aim for high availability but cannot guarantee 100% uptime. We may suspend the service for maintenance with reasonable notice. We are not liable for any loss caused by service downtime.</P>
          </Section>

          <Section title="9. Limitation of liability">
            <P>To the maximum extent permitted by applicable law, Lettly Ltd shall not be liable for:</P>
            <UL items={[
              'Any indirect, incidental, special, or consequential loss or damage',
              'Loss of data, profits, revenue, business, goodwill, or anticipated savings',
              'Any loss arising from reliance on AI-generated content, legislation information, compliance guidance, or document templates',
              'Any loss arising from a failure to comply with landlord legislation, whether or not Lettly provided information about that legislation',
              'Any loss arising from missed deadlines, even where Lettly provides compliance reminders',
              'Any loss arising from inaccurate, incomplete, or outdated information provided by Lettly',
              'Any loss arising from third-party service failures (including Supabase, Clerk, Vercel, Stripe, and Anthropic)',
              'Any fines, penalties, or enforcement action taken against you as a landlord',
              'Any claims brought by tenants against you',
            ]} />
            <P>Our total aggregate liability to you under or in connection with these terms shall not exceed the greater of: (a) the total amount you have paid to Lettly in the 12 months preceding the claim; or (b) £100.</P>
            <P>Nothing in these terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded or limited by English law.</P>
          </Section>

          <Section title="10. AI-generated content">
            <P>Lettly uses artificial intelligence (Claude by Anthropic) for document extraction, document generation, legislative chat, and compliance guidance. You acknowledge that:</P>
            <UL items={[
              'AI-generated content may contain errors, inaccuracies, hallucinations, or outdated information',
              'AI document extraction may miss information or extract it incorrectly — always verify extracted data against the original document',
              'AI-generated tenancy agreements, notices, and letters are drafts only — they require review by a qualified solicitor before use',
              'AI chat responses are not legal advice and should not be treated as such',
              'Anthropic processes documents transiently for AI extraction — see our Privacy Policy for details',
            ]} />
            <P>You use AI-generated content entirely at your own risk. Lettly Ltd accepts no liability for any consequence of relying on AI-generated content.</P>
          </Section>

          <Section title="11. Governing law">
            <P>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
          </Section>

          <Section title="12. Changes to these terms">
            <P>We will notify active users by email of any material changes to these terms with at least 14 days notice. Continued use of Lettly after that notice period constitutes acceptance of the new terms.</P>
          </Section>

          <Section title="13. Contact">
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
