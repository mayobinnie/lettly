import Head from 'next/head'
import Link from 'next/link'
import { POSTS } from '../../lib/blog'

export default function Blog() {
  return (
    <>
      <Head>
        <title>Landlord Guides and Resources - Lettly</title>
        <meta name="description" content="Practical guides for UK landlords covering the Renters Rights Act, EPC minimum C, deposit protection, Scottish landlord registration, and more." />
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
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/#pricing" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>Pricing</Link>
            <a href="https://accounts.lettly.co/sign-up" style={{ background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get started free</a>
          </div>
        </nav>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,4vw,48px)' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Landlord guides</div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 300, color: 'var(--text)', marginBottom: 12, lineHeight: 1.15 }}>Resources for UK landlords</h1>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 540 }}>Practical guides on the Renters Rights Act, EPC requirements, compliance, and landlord law in England, Scotland and Wales.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {POSTS.map((post, i) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block', padding: '24px 0', borderBottom: '0.5px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.querySelector('.post-title').style.color = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.querySelector('.post-title').style.color = 'var(--text)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 20, background: post.categoryColor, color: post.categoryFg }}>{post.category}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{post.readTime}</span>
                    </div>
                    <div className="post-title" style={{ fontFamily: 'var(--display)', fontSize: 'clamp(17px,2.5vw,21px)', fontWeight: 400, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3, transition: 'color 0.15s' }}>{post.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{post.description}</div>
                  </div>
                  <div style={{ fontSize: 20, color: 'var(--text-3)', flexShrink: 0, paddingTop: 4 }}>→</div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 56, background: 'var(--brand)', borderRadius: 16, padding: 'clamp(24px,4vw,40px)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 300, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>Track your compliance automatically</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 24, lineHeight: 1.7 }}>Drop your documents and Lettly builds your compliance dashboard instantly. Gas certs, EICRs, EPCs, tenancy agreements - all tracked with deadline reminders.</p>
            <a href="https://accounts.lettly.co/sign-up" style={{ display: 'inline-block', background: '#fff', color: 'var(--brand)', fontSize: 14, fontWeight: 600, padding: '12px 32px', borderRadius: 10, textDecoration: 'none' }}>Start free - no card needed</a>
          </div>
        </div>

        <footer style={{ background: 'var(--surface)', borderTop: '0.5px solid var(--border)', padding: '20px clamp(16px,4vw,48px)', display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>© 2026 Lettly Ltd</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Security', '/security'], ['Blog', '/blog']].map(([l, h]) => (
              <Link key={l} href={h} style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
        </footer>
      </div>
    </>
  )
}
