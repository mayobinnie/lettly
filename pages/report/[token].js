import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

async function compressImage(file, maxW = 1200) {
  const b64 = await fileToBase64(file)
  return new Promise(res => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      res(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = b64
  })
}

const CATS = ['Plumbing', 'Electrical', 'Heating / Boiler', 'Damp / Mould', 'Structural', 'Roofing', 'Decoration', 'Garden', 'Security', 'Appliances', 'General maintenance', 'Other']

export default function TenantReport() {
  const router = useRouter()
  const { token } = router.query
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    tenantName: '', tenantContact: '', category: '', description: '', urgency: 'Normal',
  })
  const [photos, setPhotos] = useState([])
  const photoRef = useRef(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/tenant-report?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError('This link is invalid or has expired.')
        else setProperty(d.property)
        setLoading(false)
      })
      .catch(() => { setError('Could not load this page.'); setLoading(false) })
  }, [token])

  async function handlePhotos(files) {
    const compressed = await Promise.all(
      Array.from(files).slice(0, 6).map(f => compressImage(f))
    )
    setPhotos(prev => [...prev, ...compressed].slice(0, 6))
  }

  async function submit() {
    if (!form.description.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tenant-report?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photos }),
      })
      const data = await res.json()
      if (data.success) setSubmitted(true)
      else setError('Could not submit - please try again.')
    } catch {
      setError('Connection error - please try again.')
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f5f0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #1b5e3b', borderTopColor: 'transparent', animation: 'spin 0.75s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <>
      <Head>
        <title>Report an issue - Lettly</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #f7f5f0; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        input, select, textarea { font-family: inherit; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f7f5f0', padding: '24px 16px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, background: '#1b5e3b', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontStyle: 'italic' }}>L</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 500, color: '#1c1c1a' }}>Report an issue</div>
              {property && <div style={{ fontSize: 12, color: '#6b6860' }}>{property.address}</div>}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fce8e6', border: '0.5px solid #E24B4A', borderRadius: 12, padding: '14px 16px', color: '#791F1F', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          {submitted ? (
            <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center', border: '0.5px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eaf4ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1b5e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#1c1c1a', marginBottom: 8 }}>Report submitted</div>
              <div style={{ fontSize: 14, color: '#6b6860', lineHeight: 1.7 }}>
                Your landlord has been notified and will be in touch shortly. Please keep a note of your issue for your records.
              </div>
            </div>
          ) : property ? (
            <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 24, border: '0.5px solid rgba(0,0,0,0.08)' }}>

              {/* Property banner */}
              <div style={{ background: '#eaf4ee', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>🏠</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1b5e3b' }}>{property.shortName}</div>
                  <div style={{ fontSize: 11, color: '#4a7c5e' }}>{property.address}</div>
                </div>
              </div>

              {/* Tenant details */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Your details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                  {[
                    { label: 'Your name', key: 'tenantName', placeholder: 'Full name' },
                    { label: 'Phone / email', key: 'tenantContact', placeholder: 'Best way to reach you' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b6860', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</label>
                      <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                        style={{ width: '100%', background: '#f7f5f0', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1c1c1a', outline: 'none' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Issue details */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Issue details</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b6860', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    style={{ width: '100%', background: '#f7f5f0', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1c1c1a', outline: 'none' }}>
                    <option value="">Select type</option>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b6860', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Urgency</label>
                  <select value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))}
                    style={{ width: '100%', background: '#f7f5f0', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1c1c1a', outline: 'none' }}>
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b6860', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Description *</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the issue in as much detail as possible - where it is, when it started, how bad it is..."
                  rows={4} style={{ width: '100%', background: '#f7f5f0', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1c1c1a', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {/* Photo upload */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b6860', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Photos (optional - up to 6)</label>
                <input ref={photoRef} type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {photos.map((p, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                      <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>x</button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button onClick={() => photoRef.current.click()}
                      style={{ width: 72, height: 72, borderRadius: 8, border: '1.5px dashed rgba(0,0,0,0.2)', background: '#f7f5f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6860" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span style={{ fontSize: 10, color: '#6b6860' }}>Add photo</span>
                    </button>
                  )}
                </div>
                {form.urgency === 'Emergency' && (
                  <div style={{ marginTop: 10, background: '#fce8e6', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#791F1F', lineHeight: 1.6 }}>
                    For emergencies involving gas leaks, flooding or electrical danger - call 999 or the relevant emergency service immediately. Do not wait for a response from this form.
                  </div>
                )}
              </div>

              <button onClick={submit} disabled={submitting || !form.description.trim()}
                style={{ width: '100%', background: '#1b5e3b', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px', fontSize: 15, fontWeight: 500, cursor: (submitting || !form.description.trim()) ? 'not-allowed' : 'pointer', opacity: (submitting || !form.description.trim()) ? 0.6 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit report'}
              </button>

              <div style={{ fontSize: 11, color: '#a09d98', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
                Your report is sent directly to your landlord and stored securely. Powered by Lettly.
              </div>
            </div>
          ) : !error && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#6b6860' }}>Property not found. Please check your link.</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
