import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export default function BlogIndex({ posts }) {
  return (
    <>
      <Head>
        <title>Landlord guides and news - Lettly</title>
        <meta name="description" content="Practical guides for UK private landlords. Legislation, compliance, finance and property management advice from Lettly."/>
        <link rel="canonical" href="https://lettly.co/blog"/>
      </Head>

      <div style={{ fontFamily: 'var(--font, system-ui, sans-serif)', background: '#f7f5f0', minHeight: '100vh' }}>
        {/* Nav */}
        <nav style={{ background: '#fff', borderBottom: '0.5px solid #e5e2db', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#1b5e3b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontSize: 19, fontWeight: 400, color: '#1a1a18' }}>Lettly</span>
          </Link>
          <div style={{ flex: 1 }}/>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#1b5e3b', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
        </nav>

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1b5e3b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Lettly guides</div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 400, color: '#1a1a18', marginBottom: 12, lineHeight: 1.2 }}>
              Practical advice for UK landlords
            </h1>
            <p style={{ fontSize: 15, color: '#6b6860', lineHeight: 1.7, maxWidth: 560 }}>
              Legislation changes, compliance guides, finance and property management tips for private landlords in England, Scotland and Wales.
            </p>
          </div>

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b6860', fontSize: 14 }}>
              No posts published yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {posts.map(post => (
                <Link key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
                  <article style={{ background: '#fff', border: '0.5px solid #e5e2db', borderRadius: 14, padding: '24px 28px', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <div style={{ fontSize: 11, color: '#1b5e3b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </div>
                    <h2 style={{ fontSize: 'clamp(17px,2.5vw,22px)', fontWeight: 500, color: '#1a1a18', marginBottom: 10, lineHeight: 1.35 }}>
                      {post.title}
                    </h2>
                    {post.meta_description && (
                      <p style={{ fontSize: 14, color: '#6b6860', lineHeight: 1.65, marginBottom: 16 }}>
                        {post.meta_description}
                      </p>
                    )}
                    <span style={{ fontSize: 13, color: '#1b5e3b', fontWeight: 500 }}>Read guide →</span>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>

        <footer style={{ borderTop: '0.5px solid #e5e2db', padding: '24px', textAlign: 'center', fontSize: 12, color: '#999', marginTop: 48 }}>
          © {new Date().getFullYear()} Lettly · <Link href="/terms" style={{ color: '#999' }}>Terms</Link> · <Link href="/privacy" style={{ color: '#999' }}>Privacy</Link>
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
