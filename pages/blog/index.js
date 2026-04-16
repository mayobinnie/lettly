import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const R = '#e07b7b'
const RL = '#eca9a9'
const RDIM = 'rgba(224,123,123,0.11)'
const RBDR = 'rgba(224,123,123,0.26)'

export default function BlogIndex({ posts }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Lettly Landlord Guides',
    description: 'Practical guides for UK private landlords on legislation, compliance, finance and property management.',
    url: 'https://lettly.co/blog',
    publisher: { '@type': 'Organization', name: 'Lettly', url: 'https://lettly.co' },
    blogPost: posts.slice(0, 10).map(p => ({ '@type': 'BlogPosting', headline: p.title, description: p.meta_description || '', url: 'https://lettly.co/blog/' + p.slug, datePublished: p.published_at || '' }))
  }

  const navStyle = { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,10,10,0.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(255,255,255,0.08)', padding: '0 44px', height: 62, display: 'flex', alignItems: 'center', gap: 20 }
  const logoMark = { width: 32, height: 32, background: R, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, color: '#fff' }

  return (
    <>
      <Head>
        <title>Landlord guides and advice for UK private landlords - Lettly</title>
        <meta name="description" content="Free practical guides for UK private landlords. Legislation changes, compliance requirements, Section 24 tax, EPC rules, Renters Rights Act 2026 and property management advice."/>
        <meta name="robots" content="index, follow"/>
        <link rel="canonical" href="https://lettly.co/blog"/>
        <meta property="og:title" content="Landlord guides - Lettly"/>
        <meta property="og:description" content="Practical guides for UK private landlords on legislation, compliance and property management."/>
        <meta property="og:url" content="https://lettly.co/blog"/>
        <meta property="og:type" content="website"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet"/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/>
      </Head>

      <div style={{ background: '#0d0a0a', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh' }}>

        {/* Nav */}
        <nav style={navStyle}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={logoMark}>L</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 19, fontWeight: 700, color: '#fff' }}>Lettly</span>
          </Link>
          <div style={{ flex: 1 }}/>
          <Link href="/blog" style={{ fontSize: 13, color: R, textDecoration: 'none', fontWeight: 600 }}>Guides</Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginLeft: 20 }}>Dashboard</Link>
        </nav>

        {/* Hero */}
        <div style={{ background: '#111010', borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '64px 44px 56px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: R, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>Lettly guides</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(28px,4vw,52px)', fontWeight: 800, color: '#fff', marginBottom: 16, lineHeight: 1.1, letterSpacing: '-1.5px' }}>
              Practical advice for<br/>UK private landlords
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 580, marginBottom: 28, fontWeight: 300 }}>
              Free guides on legislation, compliance and property management. Covering England, Scotland and Wales — from the Renters Rights Act to EPC requirements, Section 24 tax and deposit rules.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Renters Rights Act', 'Section 24', 'EPC rating', 'Deposit rules', 'HMO licence', 'Right to Rent'].map(tag => (
                <span key={tag} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: RDIM, border: '0.5px solid ' + RBDR, color: RL, fontWeight: 500 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 44px 80px' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No posts published yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {posts.map((post, i) => (
                <Link key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
                  <article style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 28px', transition: 'all .15s', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = RBDR; e.currentTarget.style.background = '#1e1515' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#161010' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: R, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Lettly'}
                      </div>
                      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(16px,2vw,20px)', fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{post.title}</h2>
                      {post.meta_description && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 12 }}>{post.meta_description}</p>}
                      <span style={{ fontSize: 13, color: R, fontWeight: 600 }}>Read guide →</span>
                    </div>
                    {i === 0 && <div style={{ flexShrink: 0, background: RDIM, border: '0.5px solid ' + RBDR, borderRadius: 8, padding: '4px 10px', fontSize: 11, color: R, fontWeight: 600, whiteSpace: 'nowrap' }}>Latest</div>}
                  </article>
                </Link>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ background: 'linear-gradient(140deg,#180d0d,#0d0a0a)', border: '0.5px solid ' + RBDR, borderRadius: 16, padding: '32px 36px', marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Manage your properties without a letting agent</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>Compliance tracking, AI documents, rent management. From £10/month.</div>
            </div>
            <Link href="/#pricing" style={{ background: R, color: '#fff', borderRadius: 100, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Start free trial</Link>
          </div>
        </div>

        <footer style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '24px 44px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Lettly</Link>
          {' · '}
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Terms</Link>
          {' · '}
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy</Link>
          <br/>
          © {new Date().getFullYear()} Lettly. Information only, not legal advice.
        </footer>
      </div>
    </>
  )
}

export async function getServerSideProps() {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    const { data: posts } = await supabase.from('blog_posts').select('slug, title, meta_description, published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(50)
    return { props: { posts: posts || [] } }
  } catch (e) {
    return { props: { posts: [] } }
  }
}
