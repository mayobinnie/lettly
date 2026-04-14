import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { POSTS } from '../../lib/blog'

export async function getStaticPaths() {
  // Include all hardcoded slugs
  const paths = POSTS.map(p => ({ params: { slug: p.slug } }))
  return { paths, fallback: 'blocking' } // blocking = SSR for new DB posts
}

export async function getStaticProps({ params }) {
  const { slug } = params

  // Try Supabase first (for AI-published posts)
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
    const { data: dbPost } = await sb
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single()

    if (dbPost) {
      // Fetch related from DB
      const { data: relatedDB } = await sb
        .from('blog_posts')
        .select('slug,title,meta_description,tags,published_at')
        .neq('slug', slug)
        .order('published_at', { ascending: false })
        .limit(3)

      const related = (relatedDB || []).map(p => ({
        slug: p.slug,
        title: p.title,
        description: p.meta_description,
        category: p.tags?.[0] || 'Guides',
        date: p.published_at,
      }))

      return {
        props: {
          post: {
            slug: dbPost.slug,
            title: dbPost.title,
            description: dbPost.meta_description,
            date: dbPost.published_at,
            category: dbPost.category || dbPost.tags?.[0] || 'Guides',
            categoryColor: '#fff8e1',
            categoryFg: '#633806',
            body: dbPost.body, // markdown
            isMarkdown: true,
          },
          related,
        },
        revalidate: 3600,
      }
    }
  } catch (e) {
    console.warn('Blog slug: DB lookup failed', e.message)
  }

  // Fall back to static POSTS
  const post = POSTS.find(p => p.slug === slug)
  if (!post) return { notFound: true }

  const related = POSTS.filter(p => p.slug !== slug).slice(0, 3).map(p => ({
    slug: p.slug, title: p.title, description: p.description,
    category: p.category, date: p.date,
  }))

  return { props: { post: { ...post, isMarkdown: false }, related }, revalidate: 3600 }
}

function renderMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3 style="font-family:var(--display);font-size:clamp(17px,2vw,21px);font-weight:400;margin:28px 0 10px;color:var(--text)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:var(--display);font-size:clamp(20px,2.5vw,26px);font-weight:300;margin:36px 0 12px;color:var(--text)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:var(--display);font-size:clamp(24px,3vw,32px);font-weight:300;margin:0 0 16px;color:var(--text)">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:8px">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:8px">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:24px;margin:12px 0">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;line-height:1.8;font-size:16px;color:var(--text-2)">')
    .replace(/^/, '<p style="margin:0 0 16px;line-height:1.8;font-size:16px;color:var(--text-2)">')
    .replace(/$/, '</p>')
}

export default function BlogPost({ post, related }) {
  const dateStr = post.date
    ? new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
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
        <nav style={{ background: 'var(--surface)', borderBottom: '0.5px solid var(--border)', padding: '0 clamp(16px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--display)', fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400, color: 'var(--text)' }}>Lettly</span>
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/blog" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>All guides</Link>
            <a href="https://accounts.lettly.co/sign-up" style={{ background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 500, padding: '7px 18px', borderRadius: 8, textDecoration: 'none' }}>Get started free</a>
          </div>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,4vw,48px)' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: post.categoryColor || '#fff8e1', color: post.categoryFg || '#633806' }}>{post.category}</span>
              {dateStr && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{dateStr}</span>}
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,4vw,40px)', fontWeight: 300, color: 'var(--text)', marginBottom: 16, lineHeight: 1.15 }}>{post.title}</h1>
            <p style={{ fontSize: 17, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{post.description}</p>
          </div>

          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 32 }}>
            {post.isMarkdown
              ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}/>
              : post.sections?.map((s, i) => (
                <div key={i} style={{ marginBottom: 32 }}>
                  <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 300, marginBottom: 12, color: 'var(--text)' }}>{s.heading}</h2>
                  {s.body.split('\n\n').map((para, j) => (
                    <p key={j} style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 16 }}>{para}</p>
                  ))}
                </div>
              ))
            }
          </div>

          {post.cta && (
            <div style={{ background: 'var(--brand-light)', border: '0.5px solid rgba(74,103,65,0.2)', borderRadius: 12, padding: '20px 24px', margin: '32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 15, color: 'var(--brand)', margin: 0, fontWeight: 500, flex: 1 }}>{post.cta}</p>
              <a href="https://accounts.lettly.co/sign-up" style={{ background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 24px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>Try Lettly free</a>
            </div>
          )}
        </div>

        {related.length > 0 && (
          <div style={{ background: 'var(--surface)', borderTop: '0.5px solid var(--border)', padding: 'clamp(32px,5vw,48px) clamp(20px,4vw,48px)' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>More guides</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
                {related.map(r => (
                  <Link key={r.slug} href={`/blog/${r.slug}`} style={{ textDecoration: 'none', background: 'var(--bg)', borderRadius: 10, padding: '16px', border: '0.5px solid var(--border)', display: 'block' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6, lineHeight: 1.4 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.category}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'var(--brand)', padding: 'clamp(40px,5vw,64px) clamp(20px,4vw,48px)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px,3vw,32px)', fontWeight: 300, color: '#fff', marginBottom: 12 }}>Manage your rental portfolio with Lettly</div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>Track compliance, read documents automatically and stay ahead of legislation. From £10/month.</p>
          <a href="https://accounts.lettly.co/sign-up" style={{ display: 'inline-block', background: '#fff', color: 'var(--brand)', fontWeight: 600, fontSize: 15, padding: '12px 32px', borderRadius: 10, textDecoration: 'none' }}>Try free for 14 days</a>
        </div>
      </div>
    </>
  )
}
