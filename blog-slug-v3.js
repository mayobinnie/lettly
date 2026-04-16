import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const R = '#e07b7b'
const RL = '#eca9a9'
const RDIM = 'rgba(224,123,123,0.11)'
const RBDR = 'rgba(224,123,123,0.26)'

function estimateReadTime(body) {
  if (!body) return 3
  return Math.max(2, Math.ceil(body.trim().split(/\s+/).length / 200))
}

function renderBody(body) {
  if (!body) return []
  const lines = body.split('\n')
  const elements = []
  let key = 0

  lines.forEach(line => {
    const t = line.trim()
    if (!t) return

    if (t.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 700, color: '#fff', margin: '40px 0 14px', lineHeight: 1.25, letterSpacing: '-0.3px' }}>{t.slice(3)}</h2>)
    } else if (t.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(17px,2vw,20px)', fontWeight: 700, color: '#fff', margin: '28px 0 10px', lineHeight: 1.3 }}>{t.slice(4)}</h3>)
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      elements.push(<li key={key++} style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: 8, paddingLeft: 4 }}>{t.slice(2)}</li>)
    } else {
      const parts = t.split(/(\*\*[^*]+\*\*)/)
      const rendered = parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i} style={{ color: '#fff', fontWeight: 600 }}>{p.slice(2, -2)}</strong> : p)
      elements.push(<p key={key++} style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.9, margin: '14px 0' }}>{rendered}</p>)
    }
  })
  return elements
}

export default function BlogPost({ post, relatedPosts }) {
  if (!post) {
    return (
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh', background: '#0d0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 64, fontWeight: 800, color: R, marginBottom: 16 }}>404</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>Post not found</div>
          <Link href="/blog" style={{ color: R, textDecoration: 'none', fontWeight: 600 }}>Back to guides →</Link>
        </div>
      </div>
    )
  }

  const publishedDate = post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const publishedISO = post.published_at || new Date().toISOString()
  const readTime = estimateReadTime(post.body)
  const pageUrl = 'https://lettly.co/blog/' + post.slug

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || '',
    url: pageUrl,
    datePublished: publishedISO,
    dateModified: publishedISO,
    author: { '@type': 'Organization', name: 'Lettly', url: 'https://lettly.co' },
    publisher: { '@type': 'Organization', name: 'Lettly', url: 'https://lettly.co', logo: { '@type': 'ImageObject', url: 'https://lettly.co/icon.svg' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    inLanguage: 'en-GB',
    keywords: 'UK landlord, buy to let, landlord compliance, ' + post.title,
    articleSection: 'Landlord Guides',
    wordCount: post.body ? post.body.split(/\s+/).length : 0,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lettly.co' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://lettly.co/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl },
    ]
  }

  const logoMark = { width: 32, height: 32, background: R, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, color: '#fff' }

  return (
    <>
      <Head>
        <title>{post.title} - Lettly landlord guides</title>
        {post.meta_description && <meta name="description" content={post.meta_description}/>}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/>
        <link rel="canonical" href={pageUrl}/>
        <meta property="og:title" content={post.title}/>
        {post.meta_description && <meta property="og:description" content={post.meta_description}/>}
        <meta property="og:url" content={pageUrl}/>
        <meta property="og:type" content="article"/>
        <meta property="og:site_name" content="Lettly"/>
        <meta property="article:published_time" content={publishedISO}/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content={post.title}/>
        {post.meta_description && <meta name="twitter:description" content={post.meta_description}/>}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet"/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}/>
      </Head>

      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#0d0a0a', color: '#fff', minHeight: '100vh' }}>

        {/* Nav */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,10,10,0.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(255,255,255,0.08)', padding: '0 44px', height: 62, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={logoMark}>L</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 19, fontWeight: 700, color: '#fff' }}>Lettly</span>
          </Link>
          <div style={{ flex: 1 }}/>
          <Link href="/blog" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>All guides</Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: R, textDecoration: 'none', fontWeight: 600, marginLeft: 20 }}>Dashboard</Link>
        </nav>

        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 44px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 40, paddingTop: 48, paddingBottom: 80, alignItems: 'start' }}>

            {/* Main */}
            <main>
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
                <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link>
                <span style={{ margin: '0 6px' }}>/</span>
                <Link href="/blog" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Guides</Link>
                <span style={{ margin: '0 6px' }}>/</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{post.title}</span>
              </nav>

              {/* Header */}
              <header style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {publishedDate && <time dateTime={publishedISO} style={{ fontSize: 12, fontWeight: 600, color: R, textTransform: 'uppercase', letterSpacing: '.5px' }}>{publishedDate}</time>}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{readTime} min read</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>By Lettly</span>
                </div>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 18, letterSpacing: '-0.5px' }}>
                  {post.title}
                </h1>
                {post.meta_description && (
                  <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, borderLeft: '3px solid ' + R, paddingLeft: 18, margin: '0 0 24px', fontWeight: 300 }}>
                    {post.meta_description}
                  </p>
                )}
              </header>

              {/* Body */}
              <article style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 'clamp(24px,4vw,44px)' }}>
                {renderBody(post.body)}
                <div style={{ marginTop: 40, paddingTop: 20, borderTop: '0.5px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                  This guide is for general information only and does not constitute legal or financial advice. Laws change frequently. Always verify current requirements and consult a qualified solicitor or accountant before making decisions.
                </div>
              </article>

              {/* Related */}
              {relatedPosts && relatedPosts.length > 0 && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 14 }}>More landlord guides</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {relatedPosts.map(rp => (
                      <Link key={rp.slug} href={'/blog/' + rp.slug} style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = RBDR; e.currentTarget.style.background = '#1e1515' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#161010' }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', lineHeight: 1.4 }}>{rp.title}</span>
                          <span style={{ fontSize: 12, color: R, flexShrink: 0 }}>Read →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div style={{ marginTop: 32, textAlign: 'center' }}>
                <Link href="/blog" style={{ fontSize: 13, color: R, textDecoration: 'none', fontWeight: 600 }}>← Back to all guides</Link>
              </div>
            </main>

            {/* Sidebar */}
            <aside style={{ position: 'sticky', top: 80 }}>
              {/* CTA */}
              <div style={{ background: 'linear-gradient(145deg,#1a0d0d,#150a0a)', border: '0.5px solid ' + RBDR, borderRadius: 14, padding: '24px 22px', marginBottom: 16 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>Manage your properties without a letting agent</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, marginBottom: 18, fontWeight: 300 }}>Compliance tracking, AI documents, rent management. From £10/month. Free 14-day trial.</div>
                <Link href="/#pricing" style={{ display: 'block', background: R, color: '#fff', borderRadius: 100, padding: '11px 0', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>Start free trial</Link>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8 }}>No credit card required</div>
              </div>

              {/* Features */}
              <div style={{ background: '#161010', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>What Lettly does</div>
                {['Compliance tracking and alerts', 'AI document extraction', 'Rent tracker and ledger', 'Legislation updates by nation', 'Invoicing and expenses', 'Condition reports with photos'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: R, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>

              {/* Nations */}
              <div style={{ background: RDIM, border: '0.5px solid ' + RBDR, borderRadius: 10, padding: '14px 16px', fontSize: 12, color: RL, lineHeight: 1.7 }}>
                <strong style={{ fontFamily: "'Syne', sans-serif" }}>England, Scotland and Wales</strong><br/>
                Lettly covers legislation in all three nations. No letting agent required.
              </div>
            </aside>
          </div>
        </div>

        <footer style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '24px 44px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Lettly</Link>
          {' · '}
          <Link href="/blog" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Guides</Link>
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

export async function getServerSideProps({ params }) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    const { data: post } = await supabase.from('blog_posts').select('*').eq('slug', params.slug).eq('status', 'published').single()
    if (!post) return { notFound: true }
    const { data: relatedPosts } = await supabase.from('blog_posts').select('slug, title').eq('status', 'published').neq('slug', params.slug).order('published_at', { ascending: false }).limit(4)
    return { props: { post, relatedPosts: relatedPosts || [] } }
  } catch (e) {
    return { notFound: true }
  }
}
