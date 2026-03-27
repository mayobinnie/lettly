import { createClient } from '@supabase/supabase-js'

// Public client - anon key (for client-side reads if needed)
let _anonClient = null
function getAnonClient() {
  if (_anonClient) return _anonClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _anonClient = createClient(url, key)
  return _anonClient
}

// Service client - bypasses RLS, server-side only
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('SUPABASE_SERVICE_KEY not set — saves will fail if RLS is active')
    return null
  }
  return createClient(url, key)
}

export async function getPortfolio(userId) {
  const client = getAnonClient()
  if (!client) return { properties: [] }
  try {
    const { data, error } = await client
      .from('portfolios')
      .select('data')
      .eq('user_id', userId)
      .single()
    if (error || !data) return { properties: [] }
    return data.data
  } catch { return { properties: [] } }
}

export async function savePortfolio(userId, portfolio) {
  // Try service key first (server-side), fall back to anon key (client-side)
  const client = getServiceClient() || getAnonClient()
  if (!client) return false
  try {
    const { error } = await client
      .from('portfolios')
      .upsert({ 
        user_id: userId, 
        data: portfolio, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'user_id' })
    if (error) {
      console.error('Supabase save error:', error.message)
      return false
    }
    return true
  } catch (e) { 
    console.error('Supabase save exception:', e.message)
    return false 
  }
}
