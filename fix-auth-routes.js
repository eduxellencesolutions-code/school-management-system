// One-time codemod: replaces every
//   const { data: { user } } = await supabase.auth.getUser()
// (including renamed variants like `user: adminUser`) with
//   const { user } = await getAuthenticatedUser(supabase)
// across the whole project, and adds the import where needed.
//
// SAFE BY DESIGN: only touches files that match the exact known pattern.
// Anything that doesn't match is left completely untouched and listed
// separately for manual review.
//
// Usage:
//   1. Commit or stash any pending changes first (so this is easy to diff/revert)
//   2. node fix-auth-routes.js
//   3. git diff   -- review every change before committing
//   4. npm run build   -- confirm nothing broke
//   5. git commit

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, 'src')
const IMPORT_LINE = `import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'`

// Matches: const { data: { user } } = await supabase.auth.getUser()
// and:     const { data: { user: adminUser } } = await supabase.auth.getUser()
const GET_USER_REGEX =
  /const\s*\{\s*data:\s*\{\s*user(\s*:\s*\w+)?\s*\}\s*\}\s*=\s*await\s+(\w+)\.auth\.getUser\(\)/g

const modifiedFiles = []
const flaggedFiles = [] // contain "Not authenticated" but weren't auto-modified

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walk(full)
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      processFile(full)
    }
  }
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')

  const hasGetUserCall = GET_USER_REGEX.test(original)
  GET_USER_REGEX.lastIndex = 0 // reset .test() side effect before reuse

  const mentionsNotAuthenticated = /Not authenticated/.test(original)

  if (!hasGetUserCall) {
    if (mentionsNotAuthenticated) flaggedFiles.push(filePath)
    return
  }

  let newContent = original.replace(GET_USER_REGEX, (match, rename, clientVar) => {
    const varName = rename ? rename.replace(/\s*:\s*/, '') : 'user'
    const destructure = rename ? `user: ${varName}` : 'user'
    return `const { ${destructure} } = await getAuthenticatedUser(${clientVar})`
  })

  if (newContent === original) {
    // Matched the test but replace produced no change -- shouldn't happen,
    // but skip rather than risk a no-op write.
    flaggedFiles.push(filePath)
    return
  }

  if (!newContent.includes(IMPORT_LINE)) {
    const importMatches = [...newContent.matchAll(/^import .*$/gm)]
    if (importMatches.length > 0) {
      const lastImport = importMatches[importMatches.length - 1]
      const insertPos = lastImport.index + lastImport[0].length
      newContent = newContent.slice(0, insertPos) + `\n${IMPORT_LINE}` + newContent.slice(insertPos)
    } else {
      newContent = `${IMPORT_LINE}\n` + newContent
    }
  }

  fs.writeFileSync(filePath, newContent, 'utf8')
  modifiedFiles.push(filePath)
}

walk(ROOT)

console.log(`\n✅ Modified ${modifiedFiles.length} file(s):`)
modifiedFiles.forEach(f => console.log('  -', path.relative(__dirname, f)))

console.log(`\n⚠️  Flagged ${flaggedFiles.length} file(s) mentioning "Not authenticated" that were NOT auto-modified (different pattern -- review manually):`)
flaggedFiles.forEach(f => console.log('  -', path.relative(__dirname, f)))

console.log(`\nNext steps: git diff, then npm run build, then commit.`)
