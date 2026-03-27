import { createClient } from '@supabase/supabase-js'

// DIAGNOSTIC ONLY - visit /api/test-save in browser to test Supabase connection
// DELETE THIS FILE after save is working
export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const results = {
    env: {
      hasUrl: !!url,
      urlPreview: url ? url.slice(0, 30) + '...' : 'MISSING',
      hasServiceKey: !!serviceKey,
      serviceKeyPreview: serviceKey ? serviceKey.slice(0, 20) + '...' : 'MISSING - will use anon',
      hasAnonKey: !!anonKey,
      anonKeyPreview: anonKey ? anonKey.slice(0, 20) + '...' : 'MISSING',
    },
    anonTest: null,
    serviceTest: null,
  }

  // Test with anon key
  if (url && anonKey) {
    try {
      const anon = createClient(url, anonKey)
      const { error } = await anon
        .from('portfolios')
        .upsert({ user_id: 'test_diagnostic_delete_me', data: { test: true }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      results.anonTest = error ? { ok: false, error: error.message, code: error.code, hint: error.hint } : { ok: true }
    } catch(e) { results.anonTest = { ok: false, error: e.message } }
  } else {
    results.anonTest = { ok: false, error: 'Missing url or anonKey' }
  }

  // Test with service key
  if (url && serviceKey) {
    try {
      const svc = createClient(url, serviceKey)
      const { error } = await svc
        .from('portfolios')
        .upsert({ user_id: 'test_diagnostic_delete_me', data: { test: true }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      results.serviceTest = error ? { ok: false, error: error.message, code: error.code, hint: error.hint } : { ok: true }
    } catch(e) { results.serviceTest = { ok: false, error: e.message } }
  } else {
    results.serviceTest = { ok: false, error: 'SUPABASE_SERVICE_KEY not set' }
  }

  res.status(200).json(results)
}
