'use client'

import Link from 'next/link';

type Enrollment = {
  id: string;
  founding_slot_number: number;
  status: string;
  amount_paid: number;
  promo_expires_at: string | null;
  organization_id: string;
  organizations: { name: string; subscription_plan: string } | null;
  representatives: { full_name: string } | null;
};

export default function Founding500Client({
  campaign,
  enrollments,
  slotsRemaining,
  percentComplete,
  totalCommissionEarned,
  totalCommissionPaid,
}: {
  campaign: { slots_max: number; slots_claimed: number; is_active: boolean; promo_duration_days: number; qualifying_price: number } | null;
  enrollments: Enrollment[];
  slotsRemaining: number;
  percentComplete: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
}) {
  function exportCsv() {
    const headers = ['Slot', 'Organization', 'Plan', 'Amount Paid', 'Status', 'Expires', 'Rep'];
    const rows = enrollments.map((e) => [
      e.founding_slot_number,
      e.organizations?.name || 'Unknown',
      e.organizations?.subscription_plan || 'free',
      Number(e.amount_paid).toLocaleString(),
      e.status,
      e.promo_expires_at ? new Date(e.promo_expires_at).toLocaleDateString('en-NG') : '—',
      e.representatives?.full_name || '—',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'founding_500_enrollments.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Founding 500 Campaign</h1>
        <div className="flex gap-3">
          <button
            className="btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded text-sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          <Link
            href="/commissions"
            className="btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded text-sm"
          >
            View Commissions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Slots Claimed</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaign?.slots_claimed ?? 0} / {campaign?.slots_max ?? 500}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{percentComplete}% complete</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Status</p>
          <p className="text-2xl font-bold text-gray-900">
            {campaign?.is_active ? (
              <span className="text-green-600">Active</span>
            ) : (
              <span className="text-red-600">Inactive</span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {campaign?.is_active ? `${slotsRemaining} slots remaining` : 'Campaign is currently paused'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Commission Earned</p>
          <p className="text-2xl font-bold text-gray-900">₦{totalCommissionEarned.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">₦{totalCommissionPaid.toLocaleString()} paid</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Qualifying Price</p>
          <p className="text-2xl font-bold text-gray-900">
            ₦{campaign?.qualifying_price?.toLocaleString() ?? '2,000'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Promo duration: {campaign?.promo_duration_days ?? 90} days</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="font-medium text-gray-700">Enrollments</h2>
          <span className="text-sm text-gray-500">{enrollments.length} schools enrolled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Slot</th>
                <th className="px-4 py-2 text-left font-medium">Organization</th>
                <th className="px-4 py-2 text-left font-medium">Plan</th>
                <th className="px-4 py-2 text-left font-medium">Amount Paid</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Expires</th>
                <th className="px-4 py-2 text-left font-medium">Rep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No enrollments yet.
                  </td>
                </tr>
              ) : (
                enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">#{e.founding_slot_number}</td>
                    <td className="px-4 py-2">
                      <Link href={`/schools/${e.organization_id}`} className="text-blue-600 hover:underline">
                        {e.organizations?.name ?? 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {e.organizations?.subscription_plan ?? 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">₦{Number(e.amount_paid).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          e.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : e.status === 'expired'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {e.promo_expires_at ? new Date(e.promo_expires_at).toLocaleDateString('en-NG') : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{e.representatives?.full_name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          className="btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded text-sm"
          onClick={exportCsv}
        >
          📥 Export CSV
        </button>
        <Link
          href="/commissions"
          className="btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded text-sm"
        >
          View All Commissions
        </Link>
      </div>
    </div>
  );
}