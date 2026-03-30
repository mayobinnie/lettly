import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateInvoiceNumber(existing) {
  const year = new Date().getFullYear()
  const count = (existing || 0) + 1
  return `INV-${year}-${String(count).padStart(4, '0')}`
}

function buildInvoiceHTML(inv, landlord, property) {
  const dateStr = new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const dueStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'On receipt'
  const fmt = n => '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const totalNet = (inv.items || []).reduce((s, i) => s + Number(i.amount), 0)
  const vatAmt = inv.vatRate ? totalNet * (Number(inv.vatRate) / 100) : 0
  const totalGross = totalNet + vatAmt

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;color:#1c1c1a;background:#fff;padding:48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;padding-bottom:24px;border-bottom:2px solid #1b5e3b}
  .logo{display:flex;align-items:center;gap:10}
  .logo-box{width:36px;height:36px;background:#1b5e3b;border-radius:8px;display:flex;align-items:center;justify-content:center}
  .logo-l{color:#fff;font-size:18px;font-weight:700;font-style:italic;font-family:Georgia,serif}
  .logo-name{font-size:20px;font-family:Georgia,serif;color:#1c1c1a}
  .invoice-meta{text-align:right}
  .invoice-title{font-size:28px;font-weight:300;font-family:Georgia,serif;color:#1b5e3b;margin-bottom:4px}
  .invoice-num{font-size:14px;color:#6b6860;font-family:monospace}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px}
  .party-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b6860;margin-bottom:8px}
  .party-name{font-size:15px;font-weight:600;color:#1c1c1a;margin-bottom:4px}
  .party-detail{font-size:13px;color:#6b6860;line-height:1.7}
  .dates{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;background:#f7f5f0;border-radius:10px;padding:16px;margin-bottom:32px}
  .date-label{font-size:11px;color:#6b6860;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
  .date-val{font-size:14px;font-weight:600;color:#1c1c1a}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1b5e3b;color:#fff;padding:10px 14px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:12px 14px;border-bottom:0.5px solid #e8e5e0;font-size:13px}
  .amount{text-align:right;font-family:monospace}
  .totals{display:flex;justify-content:flex-end;margin-bottom:32px}
  .totals-box{width:280px}
  .total-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #e8e5e0;font-size:13px}
  .total-final{display:flex;justify-content:space-between;padding:12px 0;font-size:16px;font-weight:700;color:#1b5e3b;border-top:2px solid #1b5e3b}
  .footer{border-top:0.5px solid #e8e5e0;padding-top:20px;font-size:11px;color:#a09d98;line-height:1.8}
  .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
  .status-paid{background:#eaf3de;color:#1b5e3b}
  .status-unpaid{background:#fce8e6;color:#c0392b}
  .status-pending{background:#fff8e1;color:#633806}
  @media print{body{padding:24px}.no-print{display:none}}
</style></head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-box"><span class="logo-l">L</span></div>
      <span class="logo-name">Lettly</span>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-num">${inv.invoiceNumber}</div>
      <div style="margin-top:8px">
        <span class="status-badge ${inv.status === 'paid' ? 'status-paid' : inv.status === 'pending' ? 'status-pending' : 'status-unpaid'}">${(inv.status || 'unpaid').toUpperCase()}</span>
      </div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From (Landlord)</div>
      <div class="party-name">${landlord.name || 'Landlord'}</div>
      <div class="party-detail">${(landlord.address || '').replace(/\n/g, '<br>')}${landlord.email ? '<br>' + landlord.email : ''}${landlord.phone ? '<br>' + landlord.phone : ''}${landlord.utr ? '<br>UTR: ' + landlord.utr : ''}${landlord.company ? '<br>' + landlord.company : ''}</div>
    </div>
    <div>
      <div class="party-label">To (${inv.type === 'rent' ? 'Tenant' : 'Contractor'})</div>
      <div class="party-name">${inv.recipientName || ''}</div>
      <div class="party-detail">${(inv.recipientAddress || '').replace(/\n/g, '<br>')}${inv.recipientEmail ? '<br>' + inv.recipientEmail : ''}</div>
    </div>
  </div>

  <div style="margin-bottom:24px;font-size:13px;color:#6b6860">Property: <strong style="color:#1c1c1a">${property?.shortName || ''} — ${property?.address || ''}</strong></div>

  <div class="dates">
    <div><div class="date-label">Invoice date</div><div class="date-val">${dateStr}</div></div>
    <div><div class="date-label">Due date</div><div class="date-val">${dueStr}</div></div>
    <div><div class="date-label">Period</div><div class="date-val">${inv.period || ''}</div></div>
  </div>

  <table>
    <thead><tr><th style="width:50%">Description</th><th>Qty</th><th style="text-align:right">Unit price</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${(inv.items || []).map(item => `<tr>
        <td>${item.description}</td>
        <td>${item.qty || 1}</td>
        <td class="amount">${fmt(item.unitPrice || item.amount)}</td>
        <td class="amount">${fmt(Number(item.amount))}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>${fmt(totalNet)}</span></div>
      ${inv.vatRate ? `<div class="total-row"><span>VAT (${inv.vatRate}%)</span><span>${fmt(vatAmt)}</span></div>` : ''}
      <div class="total-final"><span>Total due</span><span>${fmt(totalGross)}</span></div>
    </div>
  </div>

  ${inv.paymentTerms ? `<div style="background:#f7f5f0;border-radius:10px;padding:16px;margin-bottom:24px;font-size:13px"><strong>Payment terms:</strong> ${inv.paymentTerms}</div>` : ''}
  ${inv.bankDetails ? `<div style="background:#f7f5f0;border-radius:10px;padding:16px;margin-bottom:24px;font-size:13px"><strong>Bank details:</strong><br>${inv.bankDetails.replace(/\n/g, '<br>')}</div>` : ''}
  ${inv.notes ? `<div style="font-size:13px;color:#6b6860;margin-bottom:24px"><strong>Notes:</strong> ${inv.notes}</div>` : ''}

  <div class="footer">
    Generated by Lettly (lettly.co) · ${dateStr} · This invoice is for record-keeping purposes. Lettly is not a financial services provider. VAT is shown for informational purposes only — landlords are not required to be VAT registered unless income exceeds the VAT threshold.
  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorised' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  if (req.method === 'GET') {
    const { data, error } = await sb.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ invoices: data || [] })
  }

  if (req.method === 'POST') {
    const { action, invoice, landlord, property } = req.body

    // Get invoice count for numbering
    const { count } = await sb.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    const invoiceNumber = generateInvoiceNumber(count)

    const inv = { ...invoice, invoiceNumber, user_id: userId, created_at: new Date().toISOString() }

    if (action === 'save' || action === 'send') {
      const { data, error } = await sb.from('invoices').insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        type: inv.type,
        prop_id: inv.propId,
        recipient_name: inv.recipientName,
        recipient_email: inv.recipientEmail,
        amount: (inv.items || []).reduce((s, i) => s + Number(i.amount), 0),
        status: action === 'send' ? 'sent' : 'draft',
        date: inv.date,
        due_date: inv.dueDate,
        period: inv.period,
        data: inv,
      }).select().single()
      if (error) return res.status(500).json({ error: error.message })

      // Send email if requested
      if (action === 'send' && inv.recipientEmail) {
        const html = buildInvoiceHTML(inv, landlord || {}, property || {})
        try {
          await resend.emails.send({
            from: 'Lettly <hello@lettly.co>',
            replyTo: landlord?.email || 'hello@lettly.co',
            to: inv.recipientEmail,
            subject: `Invoice ${invoiceNumber} from ${landlord?.name || 'your landlord'} — ${inv.period || ''}`,
            html,
          })
        } catch (e) {
          console.error('Invoice email failed:', e.message)
        }
      }

      return res.status(200).json({ invoice: data, invoiceNumber, html: buildInvoiceHTML(inv, landlord || {}, property || {}) })
    }

    if (action === 'preview') {
      const html = buildInvoiceHTML({ ...invoice, invoiceNumber }, landlord || {}, property || {})
      return res.status(200).json({ html, invoiceNumber })
    }

    return res.status(400).json({ error: 'Unknown action' })
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body
    const { error } = await sb.from('invoices').update({ status }).eq('id', id).eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    const { error } = await sb.from('invoices').delete().eq('id', id).eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
