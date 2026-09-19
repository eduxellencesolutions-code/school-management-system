require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ORG_IDS = [
  'a3bde471-3bac-47a7-a7e7-b7fa24d2cffb', // Elibas
  '63b79d0a-4af0-4a31-a19a-63f3f3aa64a7', // Future Solutions
  'de338959-c3c3-435e-8a0c-6a9ccb666ec2', // New Era
]

async function main() {
  for (const orgId of ORG_IDS) {
    const { data: files, error } = await admin.storage.from('institution-assets').list(orgId)
    if (error) { console.error(`Error listing ${orgId}:`, error.message); continue }
    const signatureFiles = (files ?? []).filter((f) => /principal_sig|teacher_sig/i.test(f.name))
    if (signatureFiles.length > 0) {
      console.log(`${orgId}:`)
      signatureFiles.forEach((f) => console.log(`  - ${f.name} (created: ${f.created_at})`))
    }
  }
}
main()