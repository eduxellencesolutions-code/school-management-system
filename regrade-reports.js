// regrade-reports.js
// Run locally: node regrade-reports.js --dry-run   (preview changes, writes nothing)
// Then:        node regrade-reports.js --apply     (writes the corrected report_data)
//
// Requires: npm install @supabase/supabase-js
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

// ============================================
// READ FROM ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Set them with:');
  console.error('   export NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DRY_RUN = !process.argv.includes('--apply');

// ── Global grading standard — the single source of truth going forward ──
const GLOBAL_GRADING_SYSTEM = [
  { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
  { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
  { min: 50, max: 59, grade: 'C', remark: 'Good' },
  { min: 45, max: 49, grade: 'D', remark: 'Pass' },
  { min: 40, max: 44, grade: 'E', remark: 'Below Pass' },
  { min: 0, max: 39, grade: 'F', remark: 'Fail' },
];

function gradeFor(percentage) {
  const band = GLOBAL_GRADING_SYSTEM.find((b) => percentage >= b.min && percentage <= b.max);
  return band ? { grade: band.grade, remark: band.remark } : { grade: 'F', remark: 'Fail' };
}

function regradeReportData(reportData) {
  if (!reportData || !Array.isArray(reportData.learners)) return null;

  let changedCount = 0;

  const newLearners = reportData.learners.map((learner) => {
    const newSubjectDetails = (learner.subject_details || []).map((subj) => {
      const { grade, remark } = gradeFor(subj.percentage);
      if (grade !== subj.grade || remark !== subj.remark) changedCount++;
      return { ...subj, grade, remark };
    });

    const overall = gradeFor(learner.average ?? learner.percentage);
    if (overall.grade !== learner.grade || overall.remark !== learner.remark) changedCount++;

    return {
      ...learner,
      grade: overall.grade,
      remark: overall.remark,
      subject_details: newSubjectDetails,
    };
  });

  return {
    changed: changedCount,
    data: {
      ...reportData,
      learners: newLearners,
      grading_system: GLOBAL_GRADING_SYSTEM.map((b) => ({
        min: b.min,
        max: b.max,
        grade: b.grade,
        remark: b.remark,
      })),
      regraded_at: new Date().toISOString(),
    },
  };
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no writes) ===' : '=== APPLYING CHANGES ===');
  console.log(`📡 Connected to: ${SUPABASE_URL}\n`);

  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, group_id, session_id, term_id, report_data, deleted')
    .eq('type', 'broadsheet')
    .not('report_data', 'is', null)
    .eq('deleted', false);

  if (error) {
    console.error('❌ Fetch error:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${reports.length} broadsheet reports to check.\n`);

  let totalChanged = 0;
  let reportsAffected = 0;

  for (const report of reports) {
    const result = regradeReportData(report.report_data);
    if (!result) {
      console.log(`[SKIP] Report ${report.id} — no learners array found`);
      continue;
    }

    if (result.changed === 0) {
      console.log(`[OK]   Report ${report.id} — already matches global standard`);
      continue;
    }

    reportsAffected++;
    totalChanged += result.changed;
    console.log(`[FIX]  Report ${report.id} — ${result.changed} grade/remark field(s) corrected`);

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ report_data: result.data })
        .eq('id', report.id);

      if (updateError) {
        console.error(`  ❌ ERROR updating ${report.id}:`, updateError.message);
      } else {
        console.log(`  ✅ Updated ${report.id}`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`📊 Reports checked:   ${reports.length}`);
  console.log(`📝 Reports affected:  ${reportsAffected}`);
  console.log(`✏️  Fields corrected:  ${totalChanged}`);
  console.log(DRY_RUN ? '\n⚠️  This was a dry run — nothing was written. Re-run with --apply to save changes.' : '\n✅ Changes applied successfully!');
}

main();
