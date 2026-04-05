import { Html, Head, Main, NextScript } from 'next/document'

// NOTE: Google Analytics is now loaded conditionally via _app.js after cookie consent.
// Do NOT add the gtag script back here.

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
