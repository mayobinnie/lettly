import { getAuth } from '@clerk/nextjs/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

function parseDate(s) {
  if (!s) return null
  const p = s.split('/')
  if (p.length !== 3) return null
  return new Date(p[2], p[1]-1, p[0])
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return null
  return Math.ceil((d - new Date()) / (1000*60*60*24))
}

function fmt(n) {
  return new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP', maximumFractionDigits:0 }).format(n)
}

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data: row } = await sb.from('portfolios').select('data').eq('user_id', userId).single()
  const portfolio = row?.data || { properties: [] }
  const props = portfolio.properties || []
  const today = new Date()
  const sent = []
  const alerts = []

  // ─── Compliance reminders to landlord ────────────────────────────────────
  const landlordEmail = req.body?.landlordEmail || portfolio.ownerEmail
  if (landlordEmail) {
    const urgent = []
    props.forEach(p => {
      const checks = [
        { label: 'Gas Safety Certificate', due: p.gasDue, prop: p.shortName },
        { label: 'EICR', due: p.eicrDue, prop: p.shortName },
        { label: 'EPC', due: p.epcExpiry, prop: p.shortName },
        { label: 'Insurance renewal', due: p.insuranceRenewal, prop: p.shortName },
      ]
      checks.forEach(ch => {
        const days = daysUntil(ch.due)
        if (days !== null && days >= 0 && days <= 30) {
          urgent.push({ ...ch, days })
        }
      })
    })

    if (urgent.length > 0) {
      const rows = urgent.map(u =>
        '<tr><td style="padding:8px 12px;border-bottom:1px solid #f0ede8">' + u.prop +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #f0ede8">' + u.label +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #f0ede8;color:' +
        (u.days <= 7 ? '#c0392b' : '#b45309') + '">' + u.days + ' days</td></tr>'
      ).join('')

      try {
        await resend.emails.send({
          from: 'Lettly <reminders@lettly.co>',
          to: landlordEmail,
          subject: 'Lettly: ' + urgent.length + ' compliance deadline' + (urgent.length > 1 ? 's' : '') + ' coming up',
          html: '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">' +
            '<h2 style="color:#1b5e3b;margin-bottom:16px">Compliance reminders</h2>' +
            '<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #f0ede8">' +
            '<tr style="background:#f7f5f0"><th style="padding:8px 12px;text-align:left">Property</th><th style="padding:8px 12px;text-align:left">Certificate</th><th style="padding:8px 12px;text-align:left">Due in</th></tr>' +
            rows + '</table>' +
            '<p style="margin-top:16px;font-size:13px;color:#6b6860">Log in to Lettly to update your certificates: <a href="https://lettly.co/dashboard" style="color:#1b5e3b">lettly.co/dashboard</a></p>' +
            '</div>'
        })
        sent.push('landlord compliance email')
      } catch (e) { alerts.push('Landlord email failed: ' + e.message) }
    }
  }

  // ─── Rent reminders to tenants ────────────────────────────────────────────
  for (const p of props) {
    if (!p.tenantEmail || !p.rent) continue

    // Work out next rent due date (1st of next month by default, or tenancyStart day)
    const startDay = p.tenancyStart ? parseInt(p.tenancyStart.split('/')[0]) : 1
    const nextDue = new Date(today.getFullYear(), today.getMonth(), startDay)
    if (nextDue <= today) nextDue.setMonth(nextDue.getMonth() + 1)
    const daysToRent = Math.ceil((nextDue - today) / (1000*60*60*24))

    if (daysToRent === 5 || daysToRent === 1) {
      const tenants = p.tenantName || 'Tenant'
      const dueStr = nextDue.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
      try {
        await resend.emails.send({
          from: 'Lettly <reminders@lettly.co>',
          to: p.tenantEmail,
          subject: 'Rent reminder: ' + fmt(p.rent) + ' due ' + (daysToRent === 1 ? 'tomorrow' : 'in 5 days'),
          html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">' +
            '<h2 style="color:#1c1c1a;margin-bottom:8px">Rent reminder</h2>' +
            '<p style="color:#6b6860;margin-bottom:16px">Hi ' + tenants + ',</p>' +
            '<div style="background:#f7f5f0;border-radius:10px;padding:16px;margin-bottom:16px">' +
            '<div style="font-size:13px;color:#6b6860;margin-bottom:4px">Rent due ' + dueStr + '</div>' +
            '<div style="font-size:28px;font-weight:600;color:#1b5e3b">' + fmt(p.rent) + '</div>' +
            '<div style="font-size:12px;color:#a09d98">for ' + p.shortName + '</div>' +
            '</div>' +
            '<p style="font-size:13px;color:#6b6860">Please ensure payment reaches your landlord by the due date. If you have any questions, reply to this email.</p>' +
            '</div>'
        })
        sent.push('tenant reminder: ' + p.shortName)
      } catch (e) { alerts.push('Tenant email failed (' + p.shortName + '): ' + e.message) }
    }
  }

  return res.status(200).json({ ok: true, sent, alerts })
}
