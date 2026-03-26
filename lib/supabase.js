import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getPortfolio(userId) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('data')
    .eq('user_id', userId)
    .single()

  if (error || !data) return { properties: [] }
  return data.data
}

export async function savePortfolio(userId, portfolio) {
  const { error } = await supabase
    .from('portfolios')
    .upsert({ user_id: userId, data: portfolio, updated_at: new Date().toISOString() })

  if (error) console.error('Save portfolio error:', error)
  return !error
}
