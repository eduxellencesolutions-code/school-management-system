import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function globalSetup() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await supabase.rpc('setup_e2e_domain_fixtures')
  if (error) throw new Error(`E2E fixture setup failed: ${error.message}`)

  const fs = await import('fs')
  fs.writeFileSync('tests/e2e/.fixtures.json', JSON.stringify(data, null, 2))
  console.log('E2E fixtures created:', data)
}

export default globalSetup