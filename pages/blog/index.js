import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { POSTS } from '../../lib/blog'

export async function getStaticProps() {
  // Load hardcoded posts + any published from Supabase
  let dbPosts = []
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
    const { data } = await sb
      .from('blog_posts')
      .select('slug,title,meta_description,tags,category,published_at')
      .order('published_at', { ascending: false })
    dbPosts = data || []
  } catch (e) {
    console.warn('Blog index: could not load DB posts', e.message)
  }

  // Merge: DB posts first, then hardcoded (de-dupe by slug)
  const dbSlugs = new Set(dbPosts.map(p => p.slug))
  const staticPosts = POSTS.filter(p => !dbSlugs.has(p.slug)).map(p => ({
    slug: p.slug,
    title: p.title,
    meta_description: p.description,
    tags: [p.category],
    category: p.category,
    published_at: p.date,
  }))

  const allPosts = [...dbPosts, ...staticPosts]

  return {
    props: { posts: allPosts },
    revalidate: 3600, // rebuild every hour
  }
}

const CATEGORY_COLORS = {
  Legislation: { bg: '#fce8e6', fg: '#791F1F' },
  Compliance: { bg: '#eaf4ee', fg: '#1b5e3b' },
  Finance: { bg: '#e3f2fd', fg: '#0C447C' },
  Guides: { bg: '#fff8e1', fg: '#633806' },
  default: { bg: '#f2f0eb', fg: '#6b6860' },
}

export default function Blog({ posts }) {
  return (
    <>
      <Head>
        <title>Landlord Guides and Resources - Lettly</title>
        <meta name="description" content="Practical guides for UK landlords covering the Renters Rights Act, EPC requirements, deposit protection, compliance and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <link rel="canonical" href="https://lettly.co/blog" />
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
            <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 560 }}>
              Practical guides on compliance, legislation and finance for private landlords in England, Scotland and Wales.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {posts.map(post => {
              const cat = post.tags?.[0] || post.category || 'Guides'
              const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.default
              const dateStr = post.published_at
                ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : ''
              return (
                <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '24px 0', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: colors.bg, color: colors.fg }}>{cat}</span>
                        {dateStr && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{dateStr}</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(17px,2vw,21px)', fontWeight: 400, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{post.title}</div>
                      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.meta_description}</p>
                    </div>
                    <div style={{ fontSize: 20, color: 'var(--text-3)', flexShrink: 0 }}>→</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div style={{ background: 'var(--brand)', padding: 'clamp(40px,5vw,64px) clamp(20px,4vw,48px)', textAlign: 'center', marginTop: 48 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#fff', marginBottom: 12 }}>Stay compliant automatically</div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>Track certificates, legislation and finances for your rental portfolio. From £10/month.</p>
          <a href="https://accounts.lettly.co/sign-up" style={{ display: 'inline-block', background: '#fff', color: 'var(--brand)', fontWeight: 600, fontSize: 15, padding: '12px 32px', borderRadius: 10, textDecoration: 'none' }}>Try free for 14 days</a>
        </div>
      </div>
    </>
  )
}
