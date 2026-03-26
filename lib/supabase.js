let _client = null

function getClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const { createClient } = require('@supabase/supabase-js')
  _client = createClient(url, key)
  return _client
}

export async function getPortfolio(userId) {
  const client = getClient()
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
  const client = getClient()
  if (!client) return false
  try {
    const { error } = await client
      .from('portfolios')
      .upsert({ user_id: userId, data: portfolio, updated_at: new Date().toISOString() })
    return !error
  } catch { return false }
}
