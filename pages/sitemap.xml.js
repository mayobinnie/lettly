import { createClient } from '@supabase/supabase-js'

const STATIC_PAGES = [
  { url: 'https://lettly.co', priority: '1.0', changefreq: 'weekly' },
  { url: 'https://lettly.co/blog', priority: '0.9', changefreq: 'daily' },
  { url: 'https://lettly.co/terms', priority: '0.3', changefreq: 'monthly' },
  { url: 'https://lettly.co/privacy', priority: '0.3', changefreq: 'monthly' },
]

function generateSitemapXml(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(page => `  <url>
    <loc>${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
    <changefreq>${page.changefreq || 'monthly'}</changefreq>
    <priority>${page.priority || '0.5'}</priority>
  </url>`).join('\n')}
</urlset>`
}

export default function Sitemap() {
  return null
}

export async function getServerSideProps({ res }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, published_at, title')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(500)

    const blogPages = (posts || []).map(post => ({
      url: 'https://lettly.co/blog/' + post.slug,
      lastmod: post.published_at ? post.published_at.split('T')[0] : new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.8',
    }))

    const allPages = [...STATIC_PAGES, ...blogPages]
    const xml = generateSitemapXml(allPages)

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.write(xml)
    res.end()

    return { props: {} }
  } catch (e) {
    res.setHeader('Content-Type', 'application/xml')
    res.write(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`)
    res.end()
    return { props: {} }
  }
}
