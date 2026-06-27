import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/ai/remarks
// Body: { learner_id, subject_id, percentage, grade, subject_name, learner_name }
// Returns: { remark: string, cached: boolean }

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  // Check plan — AI remarks require teacher plan or above
  const { data: org } = profile?.organization_id
    ? await supabase.from('organizations').select('subscription_plan').eq('id', profile.organization_id).single()
    : { data: null }

  const allowedPlans = ['teacher', 'small_school', 'standard_school', 'premium_school']
  if (org && !allowedPlans.includes(org.subscription_plan)) {
    return NextResponse.json(
      { error: 'AI remarks require Teacher plan or above', upgrade: true },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { learner_id, subject_id, percentage, grade, subject_name, learner_name } = body

  if (!learner_id || !subject_id || percentage === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── 1. Check cache in Supabase ──────────────────────────────────────────────
  // We cache by a stable key: learner + subject + percentage bucket (rounded to 5)
  const pctBucket = Math.round(percentage / 5) * 5
  const cacheKey = `remark:${learner_id}:${subject_id}:${pctBucket}`

  const { data: cached } = await supabase
    .from('scores')
    .select('remarks')
    .eq('learner_id', learner_id)
    .eq('subject_id', subject_id)
    .not('remarks', 'is', null)
    .limit(1)
    .single()

  if (cached?.remarks) {
    return NextResponse.json({ remark: cached.remarks, cached: true })
  }

  // ── 2. Generate via Hugging Face ────────────────────────────────────────────
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY
  const HF_MODEL   = process.env.HUGGINGFACE_MODEL ?? 'mistralai/Mistral-7B-Instruct-v0.2'

  if (!HF_API_KEY) {
    // Fallback to template-based remarks when no API key
    const remark = generateTemplateRemark(percentage, grade, subject_name)
    return NextResponse.json({ remark, cached: false, source: 'template' })
  }

  const prompt = buildPrompt({ learner_name, subject_name, percentage, grade })

  try {
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 80,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
        signal: AbortSignal.timeout(8000), // 8s timeout — free tier can be slow
      }
    )

    if (!hfRes.ok) {
      // Rate limited or model loading — fall back to template
      const remark = generateTemplateRemark(percentage, grade, subject_name)
      return NextResponse.json({ remark, cached: false, source: 'template_fallback' })
    }

    const hfData = await hfRes.json()
    const raw: string = hfData?.[0]?.generated_text ?? ''
    const remark = cleanRemark(raw) || generateTemplateRemark(percentage, grade, subject_name)

    // Cache the remark back to the score record
    await supabase
      .from('scores')
      .update({ remarks: remark })
      .eq('learner_id', learner_id)
      .eq('subject_id', subject_id)
      .is('remarks', null)

    return NextResponse.json({ remark, cached: false, source: 'ai' })
  } catch {
    const remark = generateTemplateRemark(percentage, grade, subject_name)
    return NextResponse.json({ remark, cached: false, source: 'template_error' })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt({
  learner_name, subject_name, percentage, grade,
}: {
  learner_name?: string
  subject_name: string
  percentage: number
  grade: string
}) {
  return `<s>[INST] Write a short, encouraging school report comment (2 sentences max) for a student's ${subject_name} performance. Score: ${percentage.toFixed(0)}% (Grade ${grade}). Be specific to the subject and appropriate for a Nigerian school report card. Do not use the student's name. Just write the comment directly. [/INST]`
}

function cleanRemark(raw: string): string {
  return raw
    .replace(/\[INST\].*?\[\/INST\]/gs, '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\n+/g, ' ')
    .slice(0, 300)
    .trim()
}

function generateTemplateRemark(percentage: number, grade: string, subject: string): string {
  if (percentage >= 85) {
    return `An outstanding performance in ${subject}. Keep up this excellent standard and continue to strive for the best.`
  }
  if (percentage >= 70) {
    return `A very good result in ${subject}. With continued effort and dedication, even greater heights can be achieved.`
  }
  if (percentage >= 60) {
    return `A good performance in ${subject}. More consistent study and practice will lead to significant improvement.`
  }
  if (percentage >= 50) {
    return `A fair result in ${subject}. Greater attention to classwork and regular revision will help improve the score.`
  }
  if (percentage >= 40) {
    return `Performance in ${subject} needs improvement. Extra effort and regular practice are strongly encouraged.`
  }
  return `More work is needed in ${subject}. Please seek additional help from the subject teacher and dedicate more time to study.`
}
