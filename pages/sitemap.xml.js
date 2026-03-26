import { POSTS } from '../lib/blog'

function generateSiteMap(posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://lettly.co</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://lettly.co/blog</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://lettly.co/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://lettly.co/terms</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://lettly.co/security</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  ${posts.map(post => `
  <url>
    <loc>https://lettly.co/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`
}

export async function getServerSideProps({ res }) {
  const sitemap = generateSiteMap(POSTS)
  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()
  return { props: {} }
}

export default function SiteMap() { return null }
