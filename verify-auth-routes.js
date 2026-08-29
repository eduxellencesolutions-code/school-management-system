// Verification pass: the real question isn't "does this file mention
// Not authenticated" (that's just harmless response text) -- it's "does
// this file actually call getAuthenticatedUser yet". This resolves the
// false positives from pass 2's cruder text-based flagging.

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, 'src')

const genuinelyUnfixed = []
const confirmedFixed = []

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
  const content = fs.readFileSync(filePath, 'utf8')

  const mentionsNotAuthenticated = /Not authenticated/.test(content)
  if (!mentionsNotAuthenticated) return

  const usesHelper = content.includes('getAuthenticatedUser')

  if (usesHelper) {
    confirmedFixed.push(filePath)
  } else {
    genuinelyUnfixed.push(filePath)
  }
}

walk(ROOT)

console.log(`\n✅ Confirmed fixed: ${confirmedFixed.length} file(s) already using getAuthenticatedUser`)

console.log(`\n❌ Genuinely still unfixed: ${genuinelyUnfixed.length} file(s):`)
genuinelyUnfixed.forEach(f => console.log('  -', path.relative(__dirname, f)))
