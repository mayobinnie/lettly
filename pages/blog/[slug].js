import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

function estimateReadTime(body) {
  if (!body) return 3
  const words = body.trim().split(/\s+/).length
  return Math.max(2, Math.ceil(words / 200))
}

function renderBody(body) {
  if (!body) return []
  const lines = body.split('\n')
  const elements = []
  let key = 0
  let inList = false

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    if (!trimmed) {
      if (inList) { inList = false }
      return
    }

    if (trimmed.startsWith('## ')) {
      inList = false
      elements.push(
        <h2 key={key++} style={{ fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 600, color: '#1a1a18', margin: '40px 0 14px', lineHeight: 1.25, letterSpacing: '-0.2px' }}>
          {trimmed.slice(3)}
        </h2>
      )
      return
    }

    if (trimmed.startsWith('### ')) {
      inList = false
      elements.push(
        <h3 key={key++} style={{ fontSize: 'clamp(17px,2vw,20px)', fontWeight: 600, color: '#1a1a18', margin: '28px 0 10px', lineHeight: 1.3 }}>
          {trimmed.slice(4)}
        </h3>
      )
      return
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true
      elements.push(
        <li key={key++} style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.8, marginBottom: 8, paddingLeft: 4 }}>
          {trimmed.slice(2)}
        </li>
      )
      return
    }

    inList = false

    // Bold standalone line
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      elements.push(
        <p key={key++} style={{ fontSize: 15, color: '#1a1a18', fontWeight: 600, lineHeight: 1.75, margin: '16px 0 6px' }}>
          {trimmed.slice(2, -2)}
        </p>
      )
      return
    }

    // Inline bold: replace **text** within a paragraph
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    elements.push(
      <p key={key++} style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.9, margin: '14px 0' }}>
        {rendered}
      </p>
    )
  })

  return elements
}

export default function BlogPost({ post, relatedPosts }) {
  if (!post) {
    return (
      <div style={{ fontFamily: 'system-ui', minHeight: '100vh', background: '#f7f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
          <div style={{ fontSize: 16, color: '#6b6860', marginBottom: 24 }}>Post not found</div>
          <Link href="/blog" style={{ color: '#1b5e3b', textDecoration: 'none', fontWeight: 500 }}>Back to guides →</Link>
        </div>
      </div>
    )
  }

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

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
    author: {
      '@type': 'Organization',
      name: 'Lettly',
      url: 'https://lettly.co'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Lettly',
      url: 'https://lettly.co',
      logo: {
        '@type': 'ImageObject',
        url: 'https://lettly.co/icon.svg'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl
    },
    inLanguage: 'en-GB',
    keywords: 'UK landlord, buy to let, rental property, landlord compliance, ' + post.title,
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

  const faqSchema = null // reserved for future per-post FAQ blocks

  return (
    <>
      <Head>
        <title>{post.title} - Lettly landlord guides</title>
        {post.meta_description && <meta name="description" content={post.meta_description} />}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/>
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={post.title} />
        {post.meta_description && <meta property="og:description" content={post.meta_description} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Lettly" />
        <meta property="article:published_time" content={publishedISO} />
        <meta property="article:author" content="Lettly" />
        <meta property="article:section" content="Landlord Guides" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        {post.meta_description && <meta name="twitter:description" content={post.meta_description} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      </Head>

      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: '#f7f5f0', minHeight: '100vh' }}>

        {/* Nav */}
        <nav style={{ background: '#fff', borderBottom: '0.5px solid #e5e2db', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#1b5e3b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontSize: 19, fontWeight: 400, color: '#1a1a18' }}>Lettly</span>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/blog" style={{ fontSize: 13, color: '#6b6860', textDecoration: 'none' }}>All guides</Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#1b5e3b', textDecoration: 'none', fontWeight: 600, marginLeft: 16 }}>Dashboard</Link>
        </nav>

        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, paddingTop: 40, paddingBottom: 80, alignItems: 'start' }}>

            {/* Main content */}
            <main>
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: '#999', marginBottom: 28 }}>
                <Link href="/" style={{ color: '#999', textDecoration: 'none' }}>Home</Link>
                <span style={{ margin: '0 6px' }}>/</span>
                <Link href="/blog" style={{ color: '#999', textDecoration: 'none' }}>Guides</Link>
                <span style={{ margin: '0 6px' }}>/</span>
                <span style={{ color: '#6b6860' }}>{post.title}</span>
              </nav>

              {/* Header */}
              <header style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {publishedDate && (
                    <time dateTime={publishedISO} style={{ fontSize: 12, fontWeight: 600, color: '#1b5e3b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {publishedDate}
                    </time>
                  )}
                  <span style={{ fontSize: 12, color: '#bbb' }}>·</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{readTime} min read</span>
                  <span style={{ fontSize: 12, color: '#bbb' }}>·</span>
                  <span style={{ fontSize: 12, color: '#999' }}>By Lettly</span>
                </div>

                <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 500, color: '#1a1a18', lineHeight: 1.2, marginBottom: 18, letterSpacing: '-0.4px' }}>
                  {post.title}
                </h1>

                {post.meta_description && (
                  <p style={{ fontSize: 17, color: '#555', lineHeight: 1.7, borderLeft: '3px solid #1b5e3b', paddingLeft: 18, margin: '0 0 24px' }}>
                    {post.meta_description}
                  </p>
                )}
              </header>

              {/* Article body */}
              <article style={{ background: '#fff', border: '0.5px solid #e5e2db', borderRadius: 14, padding: 'clamp(24px,4vw,44px)' }}>
                {renderBody(post.body)}

                {/* Disclaimer inside article */}
                <div style={{ marginTop: 40, paddingTop: 20, borderTop: '0.5px solid #e5e2db', fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>
                  This guide is for general information only and does not constitute legal or financial advice. Laws and regulations change frequently. Always verify current requirements and consult a qualified solicitor or accountant before making decisions.
                </div>
              </article>

              {/* Related posts */}
              {relatedPosts && relatedPosts.length > 0 && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a18', marginBottom: 16 }}>More landlord guides</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {relatedPosts.map(rp => (
                      <Link key={rp.slug} href={'/blog/' + rp.slug} style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#fff', border: '0.5px solid #e5e2db', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#c8dfc8'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e2db'}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', lineHeight: 1.4 }}>{rp.title}</span>
                          <span style={{ fontSize: 12, color: '#1b5e3b', flexShrink: 0 }}>Read →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div style={{ marginTop: 32, textAlign: 'center' }}>
                <Link href="/blog" style={{ fontSize: 13, color: '#1b5e3b', textDecoration: 'none', fontWeight: 600 }}>
                  ← Back to all guides
                </Link>
              </div>
            </main>

            {/* Sidebar */}
            <aside style={{ position: 'sticky', top: 80 }}>
              {/* CTA card */}
              <div style={{ background: '#1b5e3b', borderRadius: 14, padding: '24px 22px', marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
                  Manage your properties without a letting agent
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, marginBottom: 18 }}>
                  Track compliance, rent, documents and legislation. From £10/month. Free 14-day trial.
                </div>
                <Link href="/#pricing" style={{ display: 'block', background: '#fff', color: '#1b5e3b', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                  Start free trial
                </Link>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 }}>
                  No credit card required
                </div>
              </div>

              {/* What Lettly does */}
              <div style={{ background: '#fff', border: '0.5px solid #e5e2db', borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginBottom: 14 }}>What Lettly does</div>
                {[
                  'Compliance tracking and alerts',
                  'AI document extraction',
                  'Rent tracker and ledger',
                  'Legislation updates by nation',
                  'Invoicing and expense tracking',
                  'Condition reports with photos',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f0ede8', fontSize: 13, color: '#3a3a38' }}>
                    <span style={{ color: '#1b5e3b', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>

              {/* Trust badge */}
              <div style={{ background: '#eaf4ee', border: '0.5px solid #c8dfc8', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#1b5e3b', lineHeight: 1.7 }}>
                <strong>England, Scotland and Wales</strong>
                <br />
                Lettly covers legislation in all three nations. No letting agent required.
              </div>
            </aside>
          </div>
        </div>

        <footer style={{ borderTop: '0.5px solid #e5e2db', padding: '24px', textAlign: 'center', fontSize: 12, color: '#aaa', lineHeight: 1.8 }}>
          <Link href="/" style={{ color: '#aaa', textDecoration: 'none' }}>Lettly</Link>
          {' · '}
          <Link href="/blog" style={{ color: '#aaa', textDecoration: 'none' }}>Guides</Link>
          {' · '}
          <Link href="/terms" style={{ color: '#aaa', textDecoration: 'none' }}>Terms</Link>
          {' · '}
          <Link href="/privacy" style={{ color: '#aaa', textDecoration: 'none' }}>Privacy</Link>
          <br />
          © {new Date().getFullYear()} Lettly. Information only, not legal advice.
        </footer>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Fetch main post
    const { data: post } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (!post) return { notFound: true }

    // Fetch related posts (latest 4 excluding current)
    const { data: relatedPosts } = await supabase
      .from('blog_posts')
      .select('slug, title')
      .eq('status', 'published')
      .neq('slug', params.slug)
      .order('published_at', { ascending: false })
      .limit(4)

    return {
      props: {
        post,
        relatedPosts: relatedPosts || [],
      }
    }
  } catch (e) {
    return { notFound: true }
  }
}
