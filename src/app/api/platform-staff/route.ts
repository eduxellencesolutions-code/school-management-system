import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can manage platform staff' }, { status: 403 });

  const { data: staff, error } = await supabase
    .from('platform_staff')
    .select('id, email, full_name, status, role_id, invited_at, activated_at')
    .order('invited_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: roles } = await supabase.from('platform_roles').select('id, name');
  const roleMap = new Map((roles ?? []).map(r => [r.id, r.name]));

  return NextResponse.json({
    staff: (staff ?? []).map(s => ({ ...s, roleName: roleMap.get(s.role_id) ?? 'Unknown' })),
    roles: roles ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can invite platform staff' }, { status: 403 });

  const body = await request.json();
  const { email, fullName, roleId } = body;

  if (!email || !fullName || !roleId) {
    return NextResponse.json({ error: 'Missing email, fullName, or roleId' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Reuse existing auth user if this email already has an account; otherwise create one
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(u => u.email === email);
  let targetUserId = existingUser?.id;
  let isNewUser = false;
  let accessLink = 'https://admin.eduxellence.org'; // existing users just log in as normal

  if (!targetUserId) {
    isNewUser = true;
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: fullName },
    });
    if (createError || !newUser?.user) {
      return NextResponse.json({ error: `Failed to create staff account: ${createError?.message}` }, { status: 500 });
    }
    targetUserId = newUser.user.id;

    // Brand-new account has no password yet — generate a real invite link
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: 'https://admin.eduxellence.org/set-password' },
    });
    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: `Failed to generate invite link: ${linkError?.message}` }, { status: 500 });
    }
    accessLink = linkData.properties.action_link;
  }

  // Get role name for email
  const { data: roleData } = await supabase
    .from('platform_roles')
    .select('name')
    .eq('id', roleId)
    .single();

  const { error: insertError } = await admin
    .from('platform_staff')
    .insert({ user_id: targetUserId, email, full_name: fullName, role_id: roleId, invited_by: user.id, activated_at: new Date().toISOString() });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin.rpc('log_platform_action', {
    p_actor_id: user.id,
    p_action: 'invited_platform_staff',
    p_target_type: 'platform_staff',
    p_target_id: targetUserId,
    p_reason: null,
    p_metadata: { email, roleId },
  });

  // ── SEND PROFESSIONAL INVITE EMAIL ──
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const adminUrl = accessLink;
      const roleName = roleData?.name || 'team member';

      const roleDetails: Record<string, { title: string; duties: string[]; impact: string }> = {
        'Operations Manager': {
          title: 'Operations Manager',
          duties: [
            'Oversee day-to-day platform operations and service delivery',
            'Monitor system performance and escalate technical issues',
            'Lead and support the Support Agent team',
            'Ensure timely resolution of all support tickets',
            'Contribute to platform improvement initiatives',
            'Coordinate with cross-functional teams for seamless operations'
          ],
          impact: 'You will be the backbone of our platform operations, ensuring that schools and teachers across Nigeria experience reliable, high-quality service every day.'
        },
        'Support Agent': {
          title: 'Support Agent',
          duties: [
            'Respond to customer inquiries and support tickets promptly',
            'Assist schools and teachers with platform onboarding',
            'Troubleshoot and resolve technical issues',
            'Document common issues and contribute to the knowledge base',
            'Escalate complex issues to the Operations Manager',
            'Maintain high customer satisfaction ratings'
          ],
          impact: 'You will be the first point of contact for our users, making a direct impact on their experience and success with Eduxellence.'
        },
        'Finance Officer': {
          title: 'Finance Officer',
          duties: [
            'Manage payments, billing, and subscription processing',
            'Review and approve representative commissions',
            'Ensure accurate financial records and reconciliation',
            'Monitor subscription revenue and payment trends',
            'Handle refund requests and payment disputes',
            'Prepare financial reports for management'
          ],
          impact: 'You will ensure the financial integrity of Eduxellence, enabling us to grow sustainably and reward our representatives fairly.'
        },
        'Representative Manager': {
          title: 'Representative Manager',
          duties: [
            'Oversee the Eduxellence Growth Representative network',
            'Review and approve representative applications',
            'Monitor representative performance and commission payouts',
            'Provide training and support to representatives',
            'Develop strategies to grow the representative network',
            'Ensure compliance with representative program policies'
          ],
          impact: 'You will build and lead a nationwide network of education advocates, driving our growth across Nigeria.'
        },
        'Security Administrator': {
          title: 'Security Administrator',
          duties: [
            'Monitor audit logs and platform security events',
            'Investigate suspicious activities and security incidents',
            'Ensure compliance with data protection policies',
            'Manage user access and permissions',
            'Conduct regular security reviews and assessments',
            'Recommend security improvements and best practices'
          ],
          impact: 'You will protect the trust that schools and teachers place in Eduxellence, ensuring their data remains safe and secure.'
        }
      };

      const details = roleDetails[roleName] || {
        title: roleName,
        duties: ['Perform duties as assigned by the Super Admin'],
        impact: 'Your contribution will help Eduxellence deliver exceptional service to schools and teachers across Nigeria.'
      };

      const dutiesHtml = details.duties.map(d => `<li style="color: #475569; font-size: 14px; line-height: 1.8;">${d}</li>`).join('');

      const nextStepsHtml = isNewUser
        ? `<li>Click the button above to set your password</li>
           <li>Log in using your new Eduxellence credentials</li>
           <li>Familiarize yourself with your tools and team</li>
           <li>Your team lead will reach out to schedule an orientation</li>`
        : `<li>Click the button above and log in with your existing Eduxellence credentials</li>
           <li>You'll now see your new role available after login</li>
           <li>Familiarize yourself with your tools and team</li>
           <li>Your team lead will reach out to schedule an orientation</li>`;

      await resend.emails.send({
        from: 'Eduxellence Team <notifications@eduxellence.org>',
        to: email,
        subject: `Appointment: ${details.title} at Eduxellence`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
            <div style="background: #0B1829; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">Eduxellence</h1>
              <p style="color: #0FC9A0; margin: 0; font-size: 14px;">School Management System</p>
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #0B1829; margin-top: 0;">Appointment Notification</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Dear <strong>${fullName}</strong>,
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                We are pleased to inform you that you have been appointed as
                <strong style="color: #1E6BFF;">${details.title}</strong>
                on the Eduxellence Platform Team.
              </p>
              <div style="background: #F7F9FC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #0B1829; margin-top: 0;">Your Role</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  ${details.impact}
                </p>
              </div>
              <div style="margin: 20px 0;">
                <h3 style="color: #0B1829;">Key Responsibilities</h3>
                <ul style="padding-left: 20px; margin: 0;">
                  ${dutiesHtml}
                </ul>
              </div>
              <div style="background: #1E6BFF; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="color: #FFFFFF; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>Access the Admin Dashboard</strong>
                </p>
                <a href="${adminUrl}"
                   style="background: #FFFFFF; color: #1E6BFF; padding: 10px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Go to Admin Dashboard →
                </a>
              </div>
              <div style="border-top: 2px solid #0FC9A0; padding-top: 20px; margin-top: 20px;">
                <p style="color: #0B1829; font-size: 16px; font-weight: bold;">
                  Welcome to the Eduxellence Platform Team! 🎉
                </p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  We are excited to have you on board. Your expertise and dedication will be instrumental
                  in delivering exceptional service to schools and teachers across Nigeria.
                </p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  <strong>Next Steps:</strong>
                  <ol style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                    ${nextStepsHtml}
                  </ol>
                </p>
              </div>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
              <p style="color: #94A3B8; font-size: 12px; text-align: center;">
                This is an automated message from Eduxellence. Please do not reply to this email.<br>
                © 2026 Eduxellence. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
    }
  }

  return NextResponse.json({ success: true });
}