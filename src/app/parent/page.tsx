// src/app/parent/page.tsx
// The PIN-based login system (learner_pins, sessionStorage) was incomplete
// dead code -- it routed to /parent/results/[learnerId], which never
// existed anywhere in the app. The real, working, fully-tested parent login
// is the access-code system at /access (parent_accounts + a real Supabase
// auth session). Redirecting here rather than deleting the route outright,
// in case any old links, bookmarks, or printed materials point at /parent.
import { redirect } from 'next/navigation'

export default function ParentPage() {
  redirect('/access')
}