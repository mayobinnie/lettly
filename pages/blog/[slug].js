import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

// Convert markdown-style content to readable HTML paragraphs
function renderBody(body) {
  if (!body) return []
  const lines = body.split('\n')
  const elements = []
  let key = 0

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={key++} style={{ fontSize: 'clamp(16px,2vw,19px)', fontWeight: 600, color: '#1a1a18', margin: '28px 0 10px', lineHeight: 1.3 }}>
          {trimmed.slice(4)}
        </h3>
      )
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={key++} style={{ fontSize: 'clamp(19px,2.5vw,24px)', fontWeight: 500, color: '#1a1a18', margin: '36px 0 12px', lineHeight: 1.3 }}>
          {trimmed.slice(3)}
        </h2>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={key++} style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.75, marginBottom: 6, marginLeft: 20 }}>
          {trimmed.slice(2)}
        </li>
      )
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <p key={key++} style={{ fontSize: 15, color: '#1a1a18', fontWeight: 600, lineHeight: 1.75, margin: '12px 0' }}>
          {trimmed.slice(2, -2)}
        </p>
      )
    } else {
      elements.push(
        <p key={key++} style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.85, margin: '14px 0' }}>
          {trimmed}
        </p>
      )
    }
  })

  return elements
}

export default function BlogPost({ post }) {
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

  return (
    <>
      <Head>
        <title>{post.title} - Lettly</title>
        {post.meta_description && <meta name="description" content={post.meta_description}/>}
        <link rel="canonical" href={'https://lettly.co/blog/' + post.slug}/>
        <meta property="og:title" content={post.title}/>
        {post.meta_description && <meta property="og:description" content={post.meta_description}/>}
        <meta property="og:url" content={'https://lettly.co/blog/' + post.slug}/>
        <meta property="og:type" content="article"/>
      </Head>

      <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f7f5f0', minHeight: '100vh' }}>
        {/* Nav */}
        <nav style={{ background: '#fff', borderBottom: '0.5px solid #e5e2db', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#1b5e3b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontStyle: 'italic' }}>L</span>
            </div>
            <span style={{ fontSize: 19, fontWeight: 400, color: '#1a1a18' }}>Lettly</span>
          </Link>
          <div style={{ flex: 1 }}/>
          <Link href="/blog" style={{ fontSize: 13, color: '#6b6860', textDecoration: 'none' }}>All guides</Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#1b5e3b', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
        </nav>

        {/* Article */}
        <div style={{ maxWidth: 740, margin: '0 auto', padding: '48px 24px 80px' }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: 12, color: '#999', marginBottom: 28 }}>
            <Link href="/blog" style={{ color: '#999', textDecoration: 'none' }}>Guides</Link>
            {' / '}
            <span>{post.title}</span>
          </div>

          {/* Header */}
          <header style={{ marginBottom: 40 }}>
            {publishedDate && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1b5e3b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                {publishedDate}
              </div>
            )}
            <h1 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 400, color: '#1a1a18', lineHeight: 1.2, marginBottom: 16 }}>
              {post.title}
            </h1>
            {post.meta_description && (
              <p style={{ fontSize: 16, color: '#6b6860', lineHeight: 1.65, borderLeft: '3px solid #1b5e3b', paddingLeft: 16 }}>
                {post.meta_description}
              </p>
            )}
          </header>

          {/* Body */}
          <article style={{ background: '#fff', border: '0.5px solid #e5e2db', borderRadius: 14, padding: 'clamp(24px,4vw,40px)' }}>
            {renderBody(post.body)}
          </article>

          {/* CTA */}
          <div style={{ background: '#1b5e3b', borderRadius: 14, padding: '28px 32px', marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: '#fff', marginBottom: 6 }}>
                Manage your properties without a letting agent
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                Lettly tracks compliance, rent, documents and legislation for UK landlords. Free 14-day trial.
              </div>
            </div>
            <Link href="/#pricing" style={{ background: '#fff', color: '#1b5e3b', borderRadius: 9, padding: '11px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Start free trial
            </Link>
          </div>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Link href="/blog" style={{ fontSize: 13, color: '#1b5e3b', textDecoration: 'none', fontWeight: 500 }}>
              ← Back to all guides
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ borderTop: '0.5px solid #e5e2db', padding: '20px 24px', fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 1.7 }}>
          This article is for general information only and does not constitute legal or financial advice. Always consult a qualified solicitor or accountant before making decisions.
          <br/>
          © {new Date().getFullYear()} Lettly · <Link href="/terms" style={{ color: '#aaa' }}>Terms</Link>
        </div>
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
    const { data: post } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (!post) return { notFound: true }

    return { props: { post } }
  } catch (e) {
    return { notFound: true }
  }
}
