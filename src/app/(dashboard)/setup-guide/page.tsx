'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import FoundingBadge from '@/components/dashboard/FoundingBadge';

// ── Institution response shape ──
type InstitutionStepStatus = 'completed' | 'not_started' | 'locked';

type InstitutionBackendStep = {
  key: string;
  status: InstitutionStepStatus;
  is_locked: boolean;
  feature_key: string | null;
  required_plan: string | null;
};

type InstitutionDashboardData = {
  account_type: 'institution';
  current_plan: string;
  steps: InstitutionBackendStep[];
  completed_steps: number;
  total_steps: number;
  percent: number;
  guide_started_at: string | null;
  last_step_viewed: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
};

// ── Solo teacher response shape — deliberately separate type, not
// forced into the institution array shape ──
type SoloSteps = {
  profile: boolean;
  classes: boolean;
  subjects: boolean;
  students: boolean;
  results_entered: boolean;
  reports_generated: boolean;
};

type SoloDashboardData = {
  account_type: 'solo_teacher';
  current_plan: string;
  steps: SoloSteps;
  completed_steps: number;
  total_steps: number;
  percent: number;
  guide_started_at: string | null;
  last_step_viewed: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
};

type DashboardData = InstitutionDashboardData | SoloDashboardData;

// ── Institution step config — unchanged from before ──
const STEP_CONFIG: Record<
  string,
  { title: string; description: string; actions: { label: string; route: string }[] }
> = {
  profile: {
    title: 'School Profile',
    description: 'Logo, motto, address, and contact information.',
    actions: [{ label: 'Set Up Now', route: '/settings/institution' }],
  },
  academic_term: {
    title: 'Academic Session & Term',
    description: 'Set your active session and term.',
    actions: [{ label: 'Set Up Now', route: '/settings/academic' }],
  },
  classes: {
    title: 'Classes',
    description: 'Create your classes and arms/sections.',
    actions: [{ label: 'Create Class', route: '/classes/new' }],
  },
  subjects: {
    title: 'Subjects',
    description: 'Create subjects and assign them to classes.',
    actions: [{ label: 'Add Subject', route: '/settings/subjects/new' }],
  },
  students: {
    title: 'Students',
    description: 'Add students individually or bulk-import via Excel/CSV.',
    actions: [{ label: 'Add / Import Students', route: '/students' }],
  },
  grading: {
    title: 'Grading',
    description: 'Configure your grading system — scale, boundaries, and remarks.',
    actions: [{ label: 'Configure Grading System', route: '/admin' }],
  },
  staff: {
    title: 'Staff & Permissions',
    description: 'Add teachers and staff, then assign the right roles.',
    actions: [
      { label: 'Add Staff', route: '/settings/teachers/new' },
      { label: 'Manage Roles', route: '/roles' },
    ],
  },
  results_entered: {
    title: 'Enter Results',
    description: 'Enter scores for your students.',
    actions: [{ label: 'Enter Scores', route: '/scores' }],
  },
  results_locked_or_published: {
    title: 'Publish / Lock Results',
    description: 'Finalize results so they can be viewed or printed.',
    actions: [{ label: 'Lock or Publish', route: '/reports/lock' }],
  },
  parent_access: {
    title: 'Parent Portal',
    description: 'Link parents to their children so they can view results.',
    actions: [{ label: 'Set Up Parent Access', route: '/parents' }],
  },
  attendance: {
    title: 'Attendance',
    description: 'Start marking daily attendance.',
    actions: [{ label: 'Open Attendance', route: '/attendance' }],
  },
  homework: {
    title: 'Homework',
    description: 'Create and assign homework to your classes.',
    actions: [{ label: 'Set Up Homework', route: '/homework' }],
  },
  fees: {
    title: 'Fees',
    description: 'Set up fee structures and start recording payments.',
    actions: [{ label: 'Set Up Fee Structures', route: '/fees/structures' }],
  },
};

const STEP_ORDER = [
  'profile', 'academic_term', 'classes', 'subjects', 'students', 'grading',
  'staff', 'results_entered', 'results_locked_or_published', 'parent_access',
  'attendance', 'homework', 'fees',
];

// First-10-Minutes fast path — subset of STEP_ORDER, reusing the exact same
// completion data. Not a second progress system — same source of truth.
const FAST_PATH_INSTITUTION_KEYS = [
  'profile', 'academic_term', 'classes', 'subjects', 'students', 'grading', 'results_entered',
];

// ── Solo teacher step config — exactly the 6 steps from the spec,
// no academic_term, reusing the same underlying pages as the
// institution flow (these pages already branch org vs solo internally) ──
const SOLO_STEP_CONFIG: {
  key: keyof SoloSteps;
  title: string;
  description: string;
  action: { label: string; route: string };
}[] = [
  {
    key: 'profile',
    title: 'Teacher Profile',
    description: 'Add your signature, phone number, and photo.',
    action: { label: 'Set Up Now', route: '/settings/profile' },
  },
  {
    key: 'classes',
    title: 'Classes',
    description: 'Create your first class.',
    action: { label: 'Create Class', route: '/classes/new' },
  },
  {
    key: 'subjects',
    title: 'Subjects',
    description: 'Create subjects for your class.',
    action: { label: 'Add Subject', route: '/settings/subjects/new' },
  },
  {
    key: 'students',
    title: 'Students',
    description: 'Add students individually or bulk-import via Excel/CSV.',
    action: { label: 'Add / Import Students', route: '/students' },
  },
  {
    key: 'results_entered',
    title: 'Results',
    description: 'Enter scores for your students.',
    action: { label: 'Enter Scores', route: '/scores' },
  },
  {
    key: 'reports_generated',
    title: 'Reports',
    description: 'Generate report cards for your students.',
    action: { label: 'Generate Report', route: '/reports/generate' },
  },
];

export default function SetupGuidePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [founding, setFounding] = useState<{ founding_slot_number: number; promo_expires_at: string } | null>(null);
  const [foundingEligible, setFoundingEligible] = useState<{ eligible: boolean } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_onboarding_dashboard');
      if (error) setError(error.message);
      else setData(data as DashboardData);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadFounding() {
      if (!data || data.account_type !== 'institution') return;
      const { data: enrollment } = await supabase
        .from('founding500_enrollments')
        .select('founding_slot_number, promo_expires_at')
        .eq('status', 'active')
        .maybeSingle();
      setFounding(enrollment);

      // Only check eligibility if not already enrolled — avoids a
      // redundant fetch, and status route already treats "enrolled"
      // as eligible:false anyway.
      if (!enrollment) {
        const res = await fetch('/api/founding-500/status');
        const statusData = await res.json();
        setFoundingEligible(statusData.eligible ? statusData : null);
      }
    }
    loadFounding();
  }, [data]);

  async function handleStepClick(stepKey: string) {
    supabase.rpc('mark_onboarding_step_viewed', { p_step_key: stepKey });
  }

  async function handleDismiss() {
    const { data: updated } = await supabase.rpc('dismiss_onboarding_guide');
    if (data) {
      setData({ ...data, dismissed: true, dismissed_at: updated?.dismissed_at ?? new Date().toISOString() });
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading your setup guide…</div>;
  if (error || !data) {
    return (
      <div className="p-8 text-red-600">
        Couldn't load your setup progress. {error ?? 'Please try again.'}
      </div>
    );
  }

  const allComplete = data.completed_steps === data.total_steps;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome to Eduxellence Results 👋</h1>
        <p className="text-gray-600 mt-1">
          {data.account_type === 'solo_teacher'
            ? "Let's get your classroom ready. Follow these steps to get started."
            : "Let's get your school ready. Follow these steps and you'll be ready to start managing results."}
        </p>
      </div>

      <div className="mb-4 text-xs text-gray-500">
        Current plan: <span className="font-medium text-gray-700">{data.current_plan}</span>
      </div>

      {founding && (
        <FoundingBadge
          slotNumber={founding.founding_slot_number}
          promoExpiresAt={founding.promo_expires_at}
        />
      )}

      {!founding && foundingEligible && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-900">🏆 Founding 500 — Activation Pending</p>
            <p className="text-sm text-amber-700 mt-0.5">Activate for ₦2,000 to unlock full Premium access this term.</p>
          </div>
          <Link
            href="/founding-500/enroll"
            className="flex-shrink-0 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-4 py-2 whitespace-nowrap ml-4"
          >
            Activate Founding 500
          </Link>
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-medium text-gray-700">
            {data.account_type === 'solo_teacher' ? 'Classroom Setup' : 'School Setup'} — {data.percent}% Complete
          </span>
          <span className="text-sm text-gray-500">
            {data.completed_steps} of {data.total_steps} steps
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${data.percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">Estimated setup time: 15–30 minutes</p>
      </div>

      {allComplete && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-800">
            {data.account_type === 'solo_teacher' ? '🎉 Your Classroom Is Ready!' : '🎉 Your School Is Ready!'}
          </p>
          <p className="text-sm text-green-700 mt-1">
            Congratulations! Your Eduxellence Results account is fully configured.
          </p>
        </div>
      )}

      {data.account_type === 'institution' && (
        <FastPathInstitution data={data} onStepClick={handleStepClick} />
      )}

      {data.account_type === 'institution' ? (
        <InstitutionChecklist data={data} onStepClick={handleStepClick} />
      ) : (
        <SoloChecklist data={data} onStepClick={handleStepClick} />
      )}

      {!data.dismissed && (
        <button onClick={handleDismiss} className="mt-6 text-sm text-gray-400 hover:text-gray-600">
          Hide this guide
        </button>
      )}
    </div>
  );
}

function FastPathInstitution({
  data,
  onStepClick,
}: {
  data: InstitutionDashboardData;
  onStepClick: (key: string) => void;
}) {
  const stepsByKey = Object.fromEntries(data.steps.map((s) => [s.key, s]));
  const fastSteps = FAST_PATH_INSTITUTION_KEYS
    .map((key) => ({ backend: stepsByKey[key], config: STEP_CONFIG[key] }))
    .filter((s) => s.backend && s.config);

  const trackedDone = fastSteps.filter((s) => s.backend.status === 'completed').length;

  return (
    <div className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-indigo-900">⚡ First 10 Minutes</span>
        <span className="text-xs text-indigo-600">{trackedDone} of {fastSteps.length} done</span>
      </div>
      <p className="text-xs text-indigo-700 mb-4">Let's get your account ready for real work.</p>

      <div className="space-y-2">
        {fastSteps.map(({ backend, config }) => {
          const isDone = backend.status === 'completed';
          const isLocked = backend.status === 'locked';

          return (
            <div key={backend.key} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-indigo-100">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                  isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'
                }`}>✓</span>
                <span className="text-sm text-gray-800">{config.title}</span>
              </div>
              {isLocked ? (
                <Link href="/settings#billing" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  View Plans →
                </Link>
              ) : (
                !isDone && (
                  <Link
                    href={config.actions[0].route}
                    onClick={() => onStepClick(backend.key)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Set Up Now →
                  </Link>
                )
              )}
            </div>
          );
        })}

        {/* Action-only step — no completion tracking exists for this yet, see note above */}
        <div className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-indigo-100">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border border-gray-300" />
            <span className="text-sm text-gray-800">Generate / Preview a Report</span>
          </div>
          <Link href="/reports/generate" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            Try It →
          </Link>
        </div>
      </div>
    </div>
  );
}

function InstitutionChecklist({
  data,
  onStepClick,
}: {
  data: InstitutionDashboardData;
  onStepClick: (key: string) => void;
}) {
  const stepsByKey = Object.fromEntries(data.steps.map((s) => [s.key, s]));
  const orderedSteps = STEP_ORDER.map((key) => ({ backend: stepsByKey[key], config: STEP_CONFIG[key] }))
    .filter((s) => s.backend && s.config);

  return (
    <div className="space-y-3">
      {orderedSteps.map(({ backend, config }) => {
        const isDone = backend.status === 'completed';
        const isLocked = backend.status === 'locked';

        return (
          <div
            key={backend.key}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              isLocked ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isLocked
                    ? 'bg-gray-200 border-gray-300 text-gray-400'
                    : 'border-gray-300 text-transparent'
                }`}
              >
                {isLocked ? '🔒' : '✓'}
              </span>
              <div>
                <p className={`font-medium ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{config.title}</p>
                <p className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isLocked ? `Available on ${backend.required_plan}` : config.description}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 ml-4">
              {isLocked ? (
                <Link href="/settings#billing" className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">
                  View Plans →
                </Link>
              ) : (
                !isDone &&
                config.actions.map((action) => (
                  <Link
                    key={action.route}
                    href={action.route}
                    onClick={() => onStepClick(backend.key)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                  >
                    {action.label} →
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SoloChecklist({
  data,
  onStepClick,
}: {
  data: SoloDashboardData;
  onStepClick: (key: string) => void;
}) {
  return (
    <>
      <div className="mb-3">
        <span className="text-sm font-bold text-indigo-900">⚡ First 10 Minutes</span>
        <p className="text-xs text-indigo-700">Let's get your account ready for real work.</p>
      </div>
      <div className="space-y-3">
        {SOLO_STEP_CONFIG.map((step) => {
          const isDone = data.steps[step.key];

          return (
            <div key={step.key} className="flex items-center justify-between p-4 border rounded-lg bg-white border-gray-200">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                    isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <div>
                  <p className="font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>

              {!isDone && (
                <Link
                  href={step.action.route}
                  onClick={() => onStepClick(step.key)}
                  className="flex-shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap ml-4"
                >
                  {step.action.label} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}