// FILE: src/app/(student-portal)/portal/page.tsx
import { redirect } from 'next/navigation'

// This route duplicated /student and had no portal-host check. It now redirects.
export default function PortalRedirect() {
  redirect('/student')
}