import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

const ADMIN_EMAIL = 'j.sylvester@eduxellence.org'
const ADMIN_SITE = 'https://admin.eduxellence.org'

type AdminClient = ReturnType<typeof createAdminClient>

export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json()
  if (payload.type !== 'INSERT') {
    return NextResponse.json({ ignored: true }, { status: 200 })
  }

  const admin = createAdminClient()

  switch (payload.table) {
    case 'organizations':
      return handleInstitutionSignup(admin, payload.record)
    case 'users':
      return handleSoloTeacherSignup(admin, payload.record)
    case 'representatives':
      return handleRepresentativeSignup(admin, payload.record)
    default:
      return NextResponse.json({ ignored: true }, { status: 200 })
  }
}

async function claimOrSkip(admin: AdminClient, table: string, id: string, selectCols: string) {
  const { data, error } = await admin
    .from(table)
    .update({ admin_signup_notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('admin_signup_notified_at', null)
    .select(selectCols)
    .single()

  if (error || !data) return null
  return data as any
}

function escapeHtml(str: string) {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function getReferralCode(admin: AdminClient, authUserId: string) {
  const { data } = await admin
    .from('referrals')
    .select('referral_code')
    .eq('referred_user_id', authUserId)
    .maybeSingle()
  return data?.referral_code ?? null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
}

async function handleInstitutionSignup(admin: AdminClient, org: any) {
  const claimed = await claimOrSkip(admin, 'organizations', org.id, 'id, name, type, created_at')
  if (!claimed) return NextResponse.json({ skipped: true }, { status: 200 })

  try {
    const { data: adminUser } = await admin
      .from('users')
      .select('id, email, name')
      .eq('organization_id', claimed.id)
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const referralCode = adminUser ? await getReferralCode(admin, adminUser.id) : null

    const html = `
      <h2>New Institution Signup</h2>
      <p><strong>School/Institution name:</strong> ${escapeHtml(claimed.name)}</p>
      <p><strong>Institution type:</strong> ${escapeHtml(claimed.type)}</p>
      <p><strong>Admin name:</strong> ${escapeHtml(adminUser?.name || 'Unknown')}</p>
      <p><strong>Admin email:</strong> ${escapeHtml(adminUser?.email || 'Unknown')}</p>
      <p><strong>Referral code used:</strong> ${referralCode ? escapeHtml(referralCode) : 'None'}</p>
      <p><strong>Registered:</strong> ${formatDate(claimed.created_at)}</p>
      <p><strong>Organization ID:</strong> ${claimed.id}</p>
      <p><a href="${ADMIN_SITE}/schools/${claimed.id}">View this school in Super Admin</a></p>
    `

    await sendEmail({ to: ADMIN_EMAIL, subject: `New Institution Signup: ${claimed.name}`, html })
  } catch (err) {
    console.error('Failed to send institution signup notification email:', {
      organizationId: claimed.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}

async function handleSoloTeacherSignup(admin: AdminClient, userRow: any) {
  const claimed = await claimOrSkip(admin, 'users', userRow.id, 'id, email, name, created_at')
  if (!claimed) return NextResponse.json({ skipped: true }, { status: 200 })

  try {
    const referralCode = await getReferralCode(admin, claimed.id)

    const html = `
      <h2>New Solo Teacher Signup</h2>
      <p><strong>Name:</strong> ${escapeHtml(claimed.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(claimed.email)}</p>
      <p><strong>Referral code used:</strong> ${referralCode ? escapeHtml(referralCode) : 'None'}</p>
      <p><strong>Registered:</strong> ${formatDate(claimed.created_at)}</p>
      <p><strong>User ID:</strong> ${claimed.id}</p>
      <p><a href="${ADMIN_SITE}/solo-teachers/${claimed.id}">View this teacher in Super Admin</a></p>
    `

    await sendEmail({ to: ADMIN_EMAIL, subject: `New Solo Teacher Signup: ${claimed.name}`, html })
  } catch (err) {
    console.error('Failed to send solo teacher signup notification email:', {
      userId: claimed.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}

async function handleRepresentativeSignup(admin: AdminClient, rep: any) {
  const claimed = await claimOrSkip(
    admin,
    'representatives',
    rep.id,
    'id, full_name, email, phone, referral_code, territory_state, created_at'
  )
  if (!claimed) return NextResponse.json({ skipped: true }, { status: 200 })

  try {
    const html = `
      <h2>New Representative Signup</h2>
      <p><strong>Name:</strong> ${escapeHtml(claimed.full_name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(claimed.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(claimed.phone || 'Not provided')}</p>
      <p><strong>State/territory:</strong> ${escapeHtml(claimed.territory_state || 'Not provided')}</p>
      <p><strong>Their new referral code:</strong> ${escapeHtml(claimed.referral_code)}</p>
      <p><strong>Registered:</strong> ${formatDate(claimed.created_at)}</p>
      <p><strong>Representative ID:</strong> ${claimed.id}</p>
      <p><a href="${ADMIN_SITE}/representatives/${claimed.id}">View this representative in Super Admin</a></p>
    `

    await sendEmail({ to: ADMIN_EMAIL, subject: `New Representative Signup: ${claimed.full_name}`, html })
  } catch (err) {
    console.error('Failed to send representative signup notification email:', {
      representativeId: claimed.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}