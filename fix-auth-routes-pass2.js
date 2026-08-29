// Second-pass codemod: handles the variant pattern where the error is
// also destructured and checked alongside !user, e.g.:
//
//   const { data: { user }, error: authError } = await supabase.auth.getUser();
//   if (authError || !user) {
//     return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
//   }
//
// becomes:
//
//   const { user } = await getAuthenticatedUser(supabase);
//   if (!user) {
//     return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
//   }
//
// Same safety model as pass 1: only touches exact matches, everything else
// is left untouched and listed for manual review.
//
// Usage:
//   1. Commit pass 1's changes first (so this is a separate, reviewable diff)
//   2. node fix-auth-routes-pass2.js
//   3. git diff  -->  npm run build  -->  commit

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, 'src')
const IMPORT_LINE = `import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'`

// Group 1: optional user rename (": adminUser")
// Group 2: error variable name (e.g. authError)
// Group 3: supabase client variable name
// Group 4: the variable name actually checked in the if (!x) part -- should
//          match the (possibly renamed) user variable
const PATTERN = /const\s*\{\s*data:\s*\{\s*user(\s*:\s*\w+)?\s*\}\s*,\s*error:\s*(\w+)\s*\}\s*=\s*await\s+(\w+)\.auth\.getUser\(\)\s*;?\s*\r?\n\s*if\s*\(\s*\2\s*\|\|\s*!\s*(\w+)\s*\)\s*\{\s*\r?\n\s*return\s+NextResponse\.json\(\s*\{\s*error:\s*'Not authenticated'\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)\s*;?\s*\r?\n\s*\}/g

const modifiedFiles = []
const stillFlaggedFiles = []

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

  const matchesPattern = PATTERN.test(original)
  PATTERN.lastIndex = 0

  const mentionsNotAuthenticated = /Not authenticated/.test(original)

  if (!matchesPattern) {
    if (mentionsNotAuthenticated) stillFlaggedFiles.push(filePath)
    return
  }

  let newContent = original.replace(PATTERN, (match, rename, errVar, client, userVar) => {
    const destructure = rename ? `user: ${userVar}` : 'user'
    return `const { ${destructure} } = await getAuthenticatedUser(${client});\n  if (!${userVar}) {\n    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });\n  }`
  })

  if (newContent === original) {
    stillFlaggedFiles.push(filePath)
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

console.log(`\n⚠️  Still flagged ${stillFlaggedFiles.length} file(s) -- yet another pattern, need manual review:`)
stillFlaggedFiles.forEach(f => console.log('  -', path.relative(__dirname, f)))

console.log(`\nNext steps: git diff, then npm run build, then commit.`)
