import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

async function globalTeardown() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase.rpc('teardown_e2e_domain_fixtures')
  if (error) {
    console.error(
      'E2E fixture teardown FAILED. Test data is still in the database. ' +
      'Run `select teardown_e2e_domain_fixtures();` in the SQL editor once the cause is fixed. ' +
      'Cause: ' + error.message
    )
  } else {
    console.log('E2E fixtures torn down. Extra rows removed:', JSON.stringify(data))
  }

  if (fs.existsSync('tests/e2e/.fixtures.json')) fs.unlinkSync('tests/e2e/.fixtures.json')
}

export default globalTeardown