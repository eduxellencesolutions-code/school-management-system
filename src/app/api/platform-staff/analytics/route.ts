import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = createAdminClient();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();

  // ✅ FIX: Separate the usage query to avoid destructuring issues
  const [
    { data: orgsByPlan },
    { data: soloByPlan },
    { data: newOrgsThisMonth },
    { data: newOrgsLastMonth },
  ] = await Promise.all([
    admin.from('organizations').select('subscription_plan, subscription_status'),
    admin.from('users').select('subscription_plan, subscription_status').is('organization_id', null),
    admin.from('organizations').select('id').gte('created_at', startOfMonth),
    admin.from('organizations').select('id').gte('created_at', startOfLastMonth).lt('created_at', startOfMonth),
  ]);

  // ✅ Fetch usage counts separately
  const [
    { count: reportsCount },
    { count: attendanceCount },
    { count: homeworkCount },
    { count: feePaymentsCount },
  ] = await Promise.all([
    admin.from('reports').select('*', { count: 'exact', head: true }),
    admin.from('attendance_records').select('*', { count: 'exact', head: true }),
    admin.from('homework_submissions').select('*', { count: 'exact', head: true }),
    admin.from('fee_payments').select('*', { count: 'exact', head: true }),
  ]);

  const PLAN_PRICES: Record<string, number> = {
    small_school: 15000, standard_school: 35000, premium_school: 75000, solo_teacher_pro: 3000,
  };

  const activeOrgs = (orgsByPlan ?? []).filter(o => o.subscription_status === 'active');
  const activeSolo = (soloByPlan ?? []).filter(u => u.subscription_status === 'active');

  const revenueByPlan: Record<string, number> = {};
  activeOrgs.forEach(o => {
    if (o.subscription_plan && o.subscription_plan !== 'free') {
      revenueByPlan[o.subscription_plan] = (revenueByPlan[o.subscription_plan] ?? 0) + (PLAN_PRICES[o.subscription_plan] ?? 0);
    }
  });
  const soloRevenue = activeSolo.filter(u => u.subscription_plan === 'solo_teacher_pro').length * PLAN_PRICES.solo_teacher_pro;

  const totalPaidOrgs = activeOrgs.filter(o => o.subscription_plan !== 'free').length;
  const totalFreeOrgs = (orgsByPlan ?? []).filter(o => o.subscription_plan === 'free' || !o.subscription_plan).length;
  const freeToaidConversion = (orgsByPlan ?? []).length > 0 ? Math.round((totalPaidOrgs / (orgsByPlan ?? []).length) * 100) : 0;

  const growthRate = (newOrgsLastMonth ?? []).length > 0
    ? Math.round((((newOrgsThisMonth ?? []).length - (newOrgsLastMonth ?? []).length) / (newOrgsLastMonth ?? []).length) * 100)
    : null;

  return NextResponse.json({
    revenue: {
      byPlan: revenueByPlan,
      soloRevenue,
      total: Object.values(revenueByPlan).reduce((s, v) => s + v, 0) + soloRevenue,
    },
    growth: {
      newOrgsThisMonth: (newOrgsThisMonth ?? []).length,
      newOrgsLastMonth: (newOrgsLastMonth ?? []).length,
      growthRatePercent: growthRate,
    },
    conversion: {
      totalOrgs: (orgsByPlan ?? []).length,
      paidOrgs: totalPaidOrgs,
      freeOrgs: totalFreeOrgs,
      freeToPaidPercent: freeToaidConversion,
    },
    usage: {
      reportsGenerated: reportsCount ?? 0,
      attendanceRecords: attendanceCount ?? 0,
      homeworkSubmissions: homeworkCount ?? 0,
      feePayments: feePaymentsCount ?? 0,
    },
  });
}