import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function globalTeardown() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabase.rpc('teardown_e2e_domain_fixtures')
  if (error) console.error('E2E fixture teardown FAILED — check for leftover TEST_E2E_* data manually:', error.message)
  else console.log('E2E fixtures torn down.')

  const fs = await import('fs')
  if (fs.existsSync('tests/e2e/.fixtures.json')) fs.unlinkSync('tests/e2e/.fixtures.json')
}

export default globalTeardown