import { Webhook } from 'svix'
import { sendWelcomeEmail } from '../../lib/emails'

// Clerk webhook - fires on user.created
// Setup: Clerk Dashboard → Webhooks → Add endpoint
// URL: https://lettly.co/api/webhooks/clerk
// Events: user.created
// Copy the signing secret to CLERK_WEBHOOK_SECRET in Vercel env vars

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('CLERK_WEBHOOK_SECRET not set - skipping verification')
  }

  const rawBody = await getRawBody(req)

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const svix = new Webhook(webhookSecret)
    try {
      svix.verify(rawBody, {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      })
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return res.status(400).json({ error: 'Invalid signature' })
    }
  }

  const event = JSON.parse(rawBody.toString())

  if (event.type === 'user.created') {
    const { first_name, last_name, email_addresses } = event.data
    const email = email_addresses?.[0]?.email_address
    const name = first_name || email?.split('@')[0] || 'there'

    if (email) {
      try {
        // Send welcome email
        await sendWelcomeEmail({ email, name: first_name || name })
        console.log('Welcome email sent to:', email)

        // Add to newsletter subscribers
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
          await supabase.from('newsletter_subscribers').upsert({
            email,
            name: `${first_name || ''} ${last_name || ''}`.trim() || null,
            source: 'signup',
          }, { onConflict: 'email' })
        }
      } catch (err) {
        console.error('Welcome email / subscriber add failed:', err)
      }
    }
  }

  return res.status(200).json({ received: true })
}
