import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export default function BlogIndex({ posts }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Lettly Landlord Guides',
    description: 'Practical guides for UK private landlords on legislation, compliance, finance and property management.',
    url: 'https://lettly.co/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Lettly',
      url: 'https://lettly.co',
      logo: { '@type': 'ImageObject', url: 'https://lettly.co/icon.svg' }
    },
    blogPost: posts.slice(0, 10).map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.meta_description || '',
      url: 'https://lettly.co/blog/' + p.slug,
      datePublished: p.published_at || '',
    }))
  }

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
        <meta property="og:site_name" content="Lettly"/>
        <meta name="twitter:card" content="summary"/>
        <meta name="twitter:title" content="Landlord guides - Lettly"/>
        <meta name="twitter:description" content="Practical guides for UK private landlords on legislation, compliance and property management."/>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
          <Link href="/blog" style={{ fontSize: 13, color: '#1b5e3b', textDecoration: 'none', fontWeight: 600 }}>Guides</Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#6b6860', textDecoration: 'none', marginLeft: 16 }}>Dashboard</Link>
        </nav>

        {/* Hero */}
        <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e2db', padding: '56px 24px 48px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1b5e3b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
              Lettly guides
            </div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 400, color: '#1a1a18', marginBottom: 16, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
              Practical advice for UK private landlords
            </h1>
            <p style={{ fontSize: 16, color: '#6b6860', lineHeight: 1.7, maxWidth: 600, marginBottom: 28 }}>
              Free guides on legislation, compliance and property management. Written for England, Scotland and Wales — covering everything from the Renters Rights Act to EPC requirements, Section 24 tax and deposit rules.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Renters Rights Act', 'Section 24', 'EPC rating', 'Deposit rules', 'HMO licence'].map(tag => (
                <span key={tag} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: '#eaf4ee', color: '#1b5e3b', fontWeight: 500 }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b6860', fontSize: 14 }}>
              No posts published yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {posts.map((post, i) => (
                <Link key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
                  <article
                    style={{ background: '#fff', border: '0.5px solid #e5e2db', borderRadius: 14, padding: '24px 28px', transition: 'all 0.15s', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = '#c8dfc8' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e2db' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#1b5e3b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Lettly'}
                      </div>
                      <h2 style={{ fontSize: 'clamp(16px,2vw,20px)', fontWeight: 500, color: '#1a1a18', marginBottom: 8, lineHeight: 1.35 }}>
                        {post.title}
                      </h2>
                      {post.meta_description && (
                        <p style={{ fontSize: 14, color: '#6b6860', lineHeight: 1.65, marginBottom: 12 }}>
                          {post.meta_description}
                        </p>
                      )}
                      <span style={{ fontSize: 13, color: '#1b5e3b', fontWeight: 600 }}>Read guide →</span>
                    </div>
                    {i === 0 && (
                      <div style={{ flexShrink: 0, background: '#eaf4ee', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#1b5e3b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Latest
                      </div>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ background: '#1b5e3b', borderRadius: 16, padding: '32px 36px', marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 6 }}>
                Manage your properties without a letting agent
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Lettly tracks compliance, rent, documents and legislation for UK landlords. From £10/month.
              </div>
            </div>
            <Link href="/#pricing" style={{ background: '#fff', color: '#1b5e3b', borderRadius: 9, padding: '12px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Start free trial
            </Link>
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

export async function getServerSideProps() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, title, meta_description, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50)

    return { props: { posts: posts || [] } }
  } catch (e) {
    return { props: { posts: [] } }
  }
}
