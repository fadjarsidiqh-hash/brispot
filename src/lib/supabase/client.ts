import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

// Module-level singleton — prevents "new client on every render" infinite-loop
let _client: ReturnType<typeof createBrowserClient<Database, 'brimos'>> | null = null

export function createClient() {
  if (!_client) {
    _client = createBrowserClient<Database, 'brimos'>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: 'brimos' } }
    )
  }
  return _client
}
