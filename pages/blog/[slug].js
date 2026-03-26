import Head from 'next/head'
import Link from 'next/link'
import { POSTS, getPost } from '../../lib/blog'

export async function getStaticPaths() {
  return {
    paths: POSTS.map(p => ({ params: { slug: p.slug } })),
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const post = getPost(params.slug)
  if (!post) return { notFound: true }
  return { props: { post } }
}

export default function BlogPost({ post }) {
  const related = POSTS.filter(p => p.slug !== post.slug).slice(0, 3)

  return (
    <>
      <Head>
        <title>{post.title} - Lettly</title>
        <meta name="description" content={post.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://lettly.co/blog/${post.slug}`} />
        <link rel="canonical" href={`https://lettly.co/blog/${post.slug}`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.description,
          "datePublished": post.date,
          "publisher": { "@type": "Organization", "name": "Lettly", "url": "https://lettly.co" }
        })}} />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
        <nav style={{ background: 'var(--surface)', borderBottom: '0.5px solid var(--border)', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--display)', fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--text)' }}>Lettly</span>
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/blog" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>All guides</Link>
            <a href="/sign-up" style={{ background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Start free</a>
          </div>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,4vw,48px)' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-3)', marginBottom: 28 }}>
            <Link href="/" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Guides</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-2)' }}>{post.category}</span>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: post.categoryColor, color: post.categoryFg }}>{post.category}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{post.readTime}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.15, marginBottom: 16 }}>{post.title}</h1>
            <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.8, borderLeft: '3px solid var(--brand)', paddingLeft: 16, margin: 0 }}>{post.hero}</p>
          </div>

          {/* Article body */}
          <div style={{ marginBottom: 48 }}>
            {post.sections.map((section, i) => (
              <div key={i} style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px,3vw,26px)', fontWeight: 400, color: 'var(--text)', marginBottom: 14, lineHeight: 1.25 }}>{section.heading}</h2>
                {section.body.split('\n\n').map((para, j) => (
                  <p key={j} style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.85, marginBottom: 16 }}>{para}</p>
                ))}
              </div>
            ))}
          </div>

          {/* CTA box */}
          <div style={{ background: 'var(--brand)', borderRadius: 16, padding: 28, marginBottom: 56, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 300, color: '#fff', marginBottom: 8 }}>{post.cta}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 20, lineHeight: 1.6 }}>14-day free trial - no credit card required. All features included from day one.</p>
            <a href="/sign-up" style={{ display: 'inline-block', background: '#fff', color: 'var(--brand)', fontSize: 14, fontWeight: 600, padding: '11px 28px', borderRadius: 10, textDecoration: 'none' }}>Get started free</a>
          </div>

          {/* Disclaimer */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', marginBottom: 40, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            This guide is for general information only and does not constitute legal advice. Landlord law changes frequently. Always verify current requirements with a qualified solicitor before acting.
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 16 }}>More guides</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {related.map(p => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none', padding: '14px 0', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: p.categoryColor, color: p.categoryFg, marginBottom: 5, display: 'inline-block' }}>{p.category}</span>
                      <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>{p.title}</div>
                    </div>
                    <span style={{ fontSize: 16, color: 'var(--text-3)', flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
