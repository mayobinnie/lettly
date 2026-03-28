import { getAuth } from '@clerk/nextjs/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function dueSoonDays(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length < 3) return null
  const due = new Date(parts[2], parts[1] - 1, parts[0])
  return Math.round((due - Date.now()) / 86400000)
}

function buildReminderEmail(userEmail, userName, reminders) {
  const urgent   = reminders.filter(r => r.days !== null && r.days < 0)
  const soon     = reminders.filter(r => r.days !== null && r.days >= 0 && r.days <= 30)
  const upcoming = reminders.filter(r => r.days !== null && r.days > 30 && r.days <= 90)

  if (urgent.length === 0 && soon.length === 0 && upcoming.length === 0) return null

  const urgentHtml = urgent.map(r =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f2f0eb;color:#791F1F;font-weight:500">${r.property}</td><td style="padding:8px 0;border-bottom:1px solid #f2f0eb;color:#791F1F">${r.type}</td><td style="padding:8px 0;border-bottom:1px solid #f2f0eb;color:#791F1F;font-weight:600">Overdue</td></tr>`
  ).join('')

  const soonHtml = soon.map(r =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f2f0eb">${r.property}</td><td style="padding:8px 0;border-bottom:1px solid #f2f0eb">${r.type}</td><td style="padding:8px 0;border-bottom:1px solid #f2f0eb;color:#b45309;font-weight:500">${r.days === 0 ? 'Today' : `${r.days} days`}</td></tr>`
  ).join('')

  const upcomingHtml = upcoming.map(r =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f2f0eb">${r.property}</td><td style="padding:8px 0;border-bottom:1px solid #f2f0eb">${r.type}</td><td style="padding:8px 0;border-bottom:1px solid #f2f0eb;color:#6b6860">${r.days} days</td></tr>`
  ).join('')

  const totalUrgent = urgent.length + soon.length

  return {
    subject: totalUrgent > 0
      ? `⚠️ ${totalUrgent} compliance action${totalUrgent > 1 ? 's' : ''} needed - Lettly`
      : `📋 Upcoming compliance reminders - Lettly`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'DM Sans',system-ui,sans-serif;background:#f7f5f0;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:0.5px solid rgba(0,0,0,0.08)">

    <div style="background:#1b5e3b;padding:24px 28px;display:flex;align-items:center;gap:10px">
      <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:9px;display:flex;align-items:center;justify-content:center">
        <span style="color:#fff;font-size:18px;font-weight:700;font-style:italic">L</span>
      </div>
      <span style="color:#fff;font-size:20px;font-weight:400">Lettly</span>
    </div>

    <div style="padding:28px">
      <p style="color:#1c1c1a;font-size:15px;margin:0 0 6px">Hi ${userName || 'there'},</p>
      <p style="color:#6b6860;font-size:14px;margin:0 0 24px;line-height:1.6">
        Here's your property compliance summary from Lettly.
      </p>

      ${urgent.length > 0 ? `
      <div style="background:#fce8e6;border:0.5px solid #E24B4A;border-radius:10px;padding:14px 16px;margin-bottom:20px">
        <p style="color:#791F1F;font-weight:600;margin:0 0 4px;font-size:13px">⚠️ Overdue - action needed now</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">${urgentHtml}</table>
      </div>` : ''}

      ${soon.length > 0 ? `
      <div style="margin-bottom:20px">
        <p style="color:#b45309;font-weight:600;margin:0 0 10px;font-size:13px">🔔 Due within 30 days</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">${soonHtml}</table>
      </div>` : ''}

      ${upcoming.length > 0 ? `
      <div style="margin-bottom:20px">
        <p style="color:#6b6860;font-weight:600;margin:0 0 10px;font-size:13px">📅 Coming up (30–90 days)</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">${upcomingHtml}</table>
      </div>` : ''}

      <div style="background:#eaf4ee;border-radius:10px;padding:14px 16px;margin-bottom:24px">
        <p style="color:#1b5e3b;font-size:13px;margin:0;line-height:1.6">
          <strong>Renters' Rights Bill - Oct 2026:</strong> Section 21 no-fault evictions will be abolished.
          PRS Database registration will be mandatory before serving any notice.
        </p>
      </div>

      <a href="https://lettly.co/dashboard" style="display:inline-block;background:#1b5e3b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9px;font-size:14px;font-weight:500">
        View my portfolio →
      </a>
    </div>

    <div style="padding:16px 28px;border-top:0.5px solid #f2f0eb">
      <p style="color:#a09d98;font-size:11px;margin:0">
        Lettly · lettly.co · You're receiving this because you have a Lettly account.
      </p>
    </div>
  </div>
</body>
</html>`
  }
}

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userEmail, userName, portfolio } = req.body
  if (!userEmail || !portfolio) return res.status(400).json({ error: 'Missing data' })

  const props = portfolio.properties || []
  const reminders = []

  props.forEach(p => {
    const gasDays  = dueSoonDays(p.gasDue)
    const eicrDays = dueSoonDays(p.eicrDue)
    const insDays  = dueSoonDays(p.insuranceRenewal)
    const epcDays  = dueSoonDays(p.epcExpiry)

    if (gasDays !== null  && gasDays <= 90) reminders.push({ property: p.shortName, type: 'Gas certificate', days: gasDays, due: p.gasDue })
    if (eicrDays !== null && eicrDays <= 90) reminders.push({ property: p.shortName, type: 'EICR', days: eicrDays, due: p.eicrDue })
    if (insDays !== null  && insDays <= 90)  reminders.push({ property: p.shortName, type: 'Insurance renewal', days: insDays, due: p.insuranceRenewal })
    if (epcDays !== null  && epcDays <= 90)  reminders.push({ property: p.shortName, type: 'EPC expiry', days: epcDays, due: p.epcExpiry })
    if (p.insuranceType?.toLowerCase() === 'home') reminders.push({ property: p.shortName, type: 'Wrong insurance type', days: -1, due: null })
  })

  const email = buildReminderEmail(userEmail, userName, reminders)

  if (!email) return res.status(200).json({ sent: false, reason: 'No reminders due' })

  try {
    const result = await resend.emails.send({
      from: 'Lettly <reminders@lettly.co>',
      to: userEmail,
      subject: email.subject,
      html: email.html,
    })
    res.status(200).json({ sent: true, id: result.data?.id })
  } catch (err) {
    console.error('Email error:', err)
    res.status(500).json({ error: err.message })
  }
}
