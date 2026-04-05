const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = 'Lettly <hello@lettly.co>'
const REPLY_TO = 'hello@lettly.co'
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@lettly.co'

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - email not sent')
    return { ok: false, error: 'No API key' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to, subject, html }),
  })
  const data = await res.json()
  if (!res.ok) console.error('Resend error:', data)
  return { ok: res.ok, data }
}

// ─── Welcome email ────────────────────────────────────────────────────────────
export async function sendAdminNewUserNotification({ email, name }) {
  if (!process.env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: ADMIN_EMAIL,
        subject: `New Lettly signup: ${name} (${email})`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <div style="background:#1b5e3b;borderRadius:8px;padding:16px 20px;margin-bottom:20px;">
              <span style="color:#fff;font-size:18px;font-weight:600;">New user signed up</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;width:120px;">Name</td><td style="padding:10px 0;font-weight:500;">${name || 'Not provided'}</td></tr>
              <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;color:#666;">Email</td><td style="padding:10px 0;font-weight:500;">${email}</td></tr>
              <tr><td style="padding:10px 0;color:#666;">Time</td><td style="padding:10px 0;">${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })} (UK)</td></tr>
            </table>
            <div style="margin-top:20px;padding:12px 16px;background:#f5f5f5;border-radius:8px;font-size:13px;color:#666;">
              View in Supabase or wait for them to get in touch. Reply to this email to contact them directly.
            </div>
          </div>
        `,
        reply_to: email,
      })
    })
  } catch (err) {
    console.error('Admin notification failed:', err?.message)
  }
}

export async function sendWelcomeEmail({ email, name }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr><td style="background:#1b5e3b;padding:32px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:rgba(255,255,255,0.15);border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;font-style:italic;font-family:Georgia,serif;">L</span>
        </td>
        <td style="padding-left:12px;"><span style="color:#ffffff;font-size:24px;font-family:Georgia,serif;font-weight:400;">Lettly</span></td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px;">
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1a1a18;margin:0 0 16px;">Welcome, ${name}.</h1>
    <p style="font-size:15px;color:#555;line-height:1.75;margin:0 0 20px;">You have taken the right step. Lettly keeps your portfolio compliant, your documents organised, and keeps you ahead of UK landlord legislation, covering England, Scotland and Wales.</p>

    <div style="background:#f7f5f0;border-radius:12px;padding:24px;margin:0 0 24px;">
      <p style="font-size:13px;font-weight:600;color:#1b5e3b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px;">Get started in 3 steps</p>
      ${[
        ['1', 'Drop a document', 'Drag your gas cert, EICR, insurance or tenancy agreement onto the dashboard. Lettly reads it instantly.'],
        ['2', 'Add your properties', 'Enter your property details or let Lettly extract them from your documents automatically.'],
        ['3', 'Check your compliance', 'See exactly what certificates are due, what legislation applies, and what needs attention.'],
      ].map(([n, title, body]) => `
      <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;width:100%;">
        <tr>
          <td style="width:32px;vertical-align:top;padding-top:2px;">
            <div style="width:24px;height:24px;background:#1b5e3b;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:600;">${n}</div>
          </td>
          <td style="padding-left:12px;">
            <div style="font-size:14px;font-weight:600;color:#1a1a18;margin-bottom:2px;">${title}</div>
            <div style="font-size:13px;color:#666;line-height:1.6;">${body}</div>
          </td>
        </tr>
      </table>`).join('')}
    </div>

    <div style="background:#fff8e1;border-radius:10px;padding:16px 20px;margin:0 0 28px;border-left:3px solid #EF9F27;">
      <p style="font-size:13px;color:#633806;margin:0;line-height:1.65;"><strong>Important:</strong> The Renters Rights Act comes into force on 1 May 2026. Section 21 no-fault evictions are abolished. If you have properties in England, check your compliance now.</p>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#1b5e3b;border-radius:10px;">
        <a href="https://lettly.co/dashboard" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Go to your dashboard →</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f7f5f0;padding:24px 40px;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#999;margin:0;line-height:1.7;">
      You are receiving this because you signed up to Lettly. Questions? Reply to this email or contact <a href="mailto:hello@lettly.co" style="color:#1b5e3b;">hello@lettly.co</a><br>
      <a href="https://lettly.co/privacy" style="color:#999;">Privacy policy</a> · <a href="https://lettly.co" style="color:#999;">lettly.co</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  return sendEmail({ to: email, subject: `Welcome to Lettly, ${name}`, html })
}

// ─── Maintenance notification (tenant submits issue) ──────────────────────────
export async function sendMaintenanceNotification({ landlordEmail, landlordName, propertyName, issue, tenantName, urgency }) {
  const urgencyColor = urgency === 'Emergency' ? '#E24B4A' : urgency === 'Urgent' ? '#EF9F27' : '#1b5e3b'
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">

  <tr><td style="background:#1b5e3b;padding:24px 40px;">
    <span style="color:#fff;font-size:20px;font-family:Georgia,serif;">Lettly</span>
    <span style="color:rgba(255,255,255,0.6);font-size:14px;margin-left:12px;">Maintenance alert</span>
  </td></tr>

  <tr><td style="padding:32px 40px;">
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1a1a18;margin:0 0 6px;">New issue reported</h2>
    <p style="font-size:14px;color:#888;margin:0 0 24px;">${propertyName}</p>

    <div style="background:#f7f5f0;border-radius:10px;padding:20px;margin:0 0 20px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        ${[
          ['Property', propertyName],
          ['Reported by', tenantName || 'Your tenant'],
          ['Issue', issue],
          urgency ? ['Urgency', `<span style="color:${urgencyColor};font-weight:600;">${urgency}</span>`] : null,
        ].filter(Boolean).map(([label, value]) => `
        <tr>
          <td style="font-size:12px;color:#888;padding:5px 0;width:100px;vertical-align:top;">${label}</td>
          <td style="font-size:13px;color:#1a1a18;padding:5px 0;">${value}</td>
        </tr>`).join('')}
      </table>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#1b5e3b;border-radius:8px;">
        <a href="https://lettly.co/dashboard" style="display:inline-block;padding:11px 24px;color:#fff;font-size:13px;font-weight:600;text-decoration:none;">View in Lettly →</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#f7f5f0;padding:20px 40px;border-top:1px solid #eee;">
    <p style="font-size:11px;color:#aaa;margin:0;">Lettly · <a href="https://lettly.co" style="color:#aaa;">lettly.co</a> · <a href="mailto:hello@lettly.co" style="color:#aaa;">hello@lettly.co</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  return sendEmail({
    to: landlordEmail,
    subject: `🔧 ${urgency === 'Emergency' ? '⚠️ URGENT: ' : ''}New maintenance issue: ${propertyName}`,
    html,
  })
}


// ─── Trial ending reminder (day 10) ──────────────────────────────────────────
export async function sendTrialReminderEmail({ email, name, daysLeft = 4 }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">

  <tr><td style="background:#1b5e3b;padding:32px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:rgba(255,255,255,0.15);border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;font-style:italic;font-family:Georgia,serif;">L</span>
        </td>
        <td style="padding-left:12px;"><span style="color:#ffffff;font-size:24px;font-family:Georgia,serif;font-weight:400;">Lettly</span></td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:40px;">
    <div style="background:#fff8e1;border-radius:10px;padding:14px 20px;margin:0 0 28px;border-left:3px solid #EF9F27;display:inline-block;width:100%;box-sizing:border-box;">
      <p style="font-size:13px;color:#633806;margin:0;font-weight:600;">Your free trial ends in ${daysLeft} days</p>
    </div>

    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;color:#1a1a18;margin:0 0 16px;">Don't lose access, ${name}.</h1>
    <p style="font-size:15px;color:#555;line-height:1.75;margin:0 0 24px;">Your Lettly trial has been running for 10 days. In ${daysLeft} days your access will be restricted unless you choose a plan.</p>

    <div style="background:#f7f5f0;border-radius:12px;padding:24px;margin:0 0 28px;">
      <p style="font-size:13px;font-weight:600;color:#1b5e3b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px;">What you will keep access to</p>
      ${[
        ['Gas cert, EICR and EPC tracking', 'With automatic reminders before they expire'],
        ['AI document reading', 'Drop any landlord document and Lettly extracts the data'],
        ['Compliance dashboard', 'Know instantly whether your properties are legally lettable'],
        ['Finance and rent tracking', 'Yield, equity, cashflow and tax export'],
        ['Renters Rights Act guidance', 'Stay ahead of the May 2026 legislation changes'],
      ].map(([title, body]) => `
      <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;width:100%;">
        <tr>
          <td style="width:20px;vertical-align:top;padding-top:3px;">
            <div style="width:16px;height:16px;background:#1b5e3b;border-radius:50%;text-align:center;line-height:16px;">
              <span style="color:#fff;font-size:10px;">✓</span>
            </div>
          </td>
          <td style="padding-left:10px;">
            <div style="font-size:13px;font-weight:600;color:#1a1a18;">${title}</div>
            <div style="font-size:12px;color:#888;line-height:1.5;">${body}</div>
          </td>
        </tr>
      </table>`).join('')}
    </div>

    <div style="background:#eaf4ee;border-radius:12px;padding:20px 24px;margin:0 0 28px;text-align:center;">
      <p style="font-size:13px;color:#1b5e3b;margin:0 0 4px;font-weight:600;">Starter plan from just</p>
      <p style="font-size:32px;font-weight:700;color:#1b5e3b;font-family:Georgia,serif;margin:0 0 4px;">£8<span style="font-size:16px;font-weight:400;">/month</span></p>
      <p style="font-size:12px;color:#2d8a5e;margin:0;">For 1–2 properties. All features included. No contract.</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:#1b5e3b;border-radius:10px;text-align:center;">
        <a href="https://lettly.co/dashboard" style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Choose a plan and keep access →</a>
      </td></tr>
    </table>

    <p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0;line-height:1.7;">
      Questions? Just reply to this email. We are a small British team and we read every message.<br>
      <span style="color:#1b5e3b;font-weight:500;">hello@lettly.co</span>
    </p>
  </td></tr>

  <tr><td style="background:#f7f5f0;padding:24px 40px;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#999;margin:0;line-height:1.7;">
      You are receiving this because you have a Lettly free trial account.<br>
      <a href="https://lettly.co/privacy" style="color:#999;">Privacy policy</a> · <a href="https://lettly.co" style="color:#999;">lettly.co</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  return sendEmail({ to: email, subject: `Your Lettly trial ends in ${daysLeft} days`, html })
}

// ─── Newsletter ───────────────────────────────────────────────────────────────
export async function sendNewsletter({ subscribers, subject, preheader, heroTitle, heroBody, articles, tip }) {
  const articlesHtml = articles?.map(a => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
      <a href="${a.url}" style="font-size:15px;font-weight:600;color:#1b5e3b;text-decoration:none;">${a.title}</a>
      <p style="font-size:13px;color:#666;margin:4px 0 0;line-height:1.6;">${a.summary}</p>
    </td></tr>`).join('') || ''

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">

  <tr><td style="background:#1b5e3b;padding:28px 40px;text-align:center;">
    <span style="color:#fff;font-size:22px;font-family:Georgia,serif;font-weight:400;">Lettly</span>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Landlord update</div>
  </td></tr>

  <tr><td style="padding:36px 40px 24px;">
    <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;color:#1a1a18;margin:0 0 12px;line-height:1.2;">${heroTitle}</h1>
    <p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 28px;">${heroBody}</p>

    ${articles?.length ? `
    <p style="font-size:12px;font-weight:600;color:#1b5e3b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Latest guides</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">${articlesHtml}</table>` : ''}

    ${tip ? `
    <div style="background:#f7f5f0;border-radius:10px;padding:20px;margin:0 0 28px;">
      <p style="font-size:12px;font-weight:600;color:#1b5e3b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Landlord tip</p>
      <p style="font-size:13px;color:#444;line-height:1.7;margin:0;">${tip}</p>
    </div>` : ''}

    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#1b5e3b;border-radius:8px;">
        <a href="https://lettly.co/dashboard" style="display:inline-block;padding:12px 28px;color:#fff;font-size:13px;font-weight:600;text-decoration:none;">Go to your dashboard →</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#f7f5f0;padding:20px 40px;border-top:1px solid #eee;">
    <p style="font-size:11px;color:#aaa;margin:0;line-height:1.8;">
      You are receiving this because you have a Lettly account.<br>
      <a href="https://lettly.co" style="color:#aaa;">lettly.co</a> · <a href="mailto:hello@lettly.co" style="color:#aaa;">hello@lettly.co</a> · <a href="https://lettly.co/privacy" style="color:#aaa;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  // Send to each subscriber (Resend handles up to 100 at once with bcc)
  // For simplicity, send individually - upgrade to batch for scale
  const results = await Promise.allSettled(
    subscribers.map(s => sendEmail({ to: s.email, subject, html }))
  )
  const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
  return { sent, total: subscribers.length }
}
