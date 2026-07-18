import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasFeature } from '@/lib/plans/gating'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('organization_id, subscription_plan, role').eq('id', user.id).single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Principal remarks are only available for institutions' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations').select('subscription_plan').eq('id', profile.organization_id).single()
  const plan = org?.subscription_plan ?? 'free'

  if (!hasFeature(plan, 'aiGeneratedRemarks')) {
    return NextResponse.json(
      { error: 'AI remarks are not available on your current plan. Please upgrade.', upgrade: true },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { learner_name, overall_percentage, grade, strongest_subject, weakest_subject, signatory_title } = body

  if (overall_percentage === undefined || !grade) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const title = signatory_title || 'Principal'

  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY
  const HF_MODEL = process.env.HUGGINGFACE_MODEL ?? 'mistralai/Mistral-7B-Instruct-v0.2'

  if (!HF_API_KEY) {
    return NextResponse.json({ remark: generateTemplatePrincipalRemark(overall_percentage, grade), cached: false, source: 'template' })
  }

  const prompt = buildPrincipalPrompt({ overall_percentage, grade, strongest_subject, weakest_subject, title })

  try {
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 90, temperature: 0.7, return_full_text: false },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!hfRes.ok) {
      return NextResponse.json({ remark: generateTemplatePrincipalRemark(overall_percentage, grade), cached: false, source: 'template_fallback' })
    }

    const hfData = await hfRes.json()
    const raw: string = hfData?.[0]?.generated_text ?? ''
    const remark = cleanRemark(raw) || generateTemplatePrincipalRemark(overall_percentage, grade)

    return NextResponse.json({ remark, cached: false, source: 'ai' })
  } catch {
    return NextResponse.json({ remark: generateTemplatePrincipalRemark(overall_percentage, grade), cached: false, source: 'template_error' })
  }
}

function buildPrincipalPrompt({
  overall_percentage, grade, strongest_subject, weakest_subject, title,
}: {
  overall_percentage: number
  grade: string
  strongest_subject?: string
  weakest_subject?: string
  title: string
}) {
  return `<s>[INST] Write a short, formal ${title.toLowerCase()}'s remark (2 sentences max) for a student's overall term performance on a school report card. Overall score: ${overall_percentage.toFixed(0)}% (Grade ${grade}).${strongest_subject ? ` Strongest subject: ${strongest_subject}.` : ''}${weakest_subject ? ` Weakest subject: ${weakest_subject}.` : ''} Be encouraging but authoritative, appropriate for a Nigerian school report card, addressed generally without using the student's name. Just write the comment directly. [/INST]`
}

function cleanRemark(raw: string): string {
  return raw.replace(/\[INST\].*?\[\/INST\]/gs, '').replace(/^["'\s]+|["'\s]+$/g, '').replace(/\n+/g, ' ').slice(0, 300).trim()
}

function generateTemplatePrincipalRemark(percentage: number, grade: string): string {
  if (percentage >= 85) return `An excellent overall result this term. This standard of academic performance is highly commendable.`
  if (percentage >= 70) return `A very good overall performance this term. Continued diligence will lead to even greater success.`
  if (percentage >= 60) return `A satisfactory overall performance this term. Consistent effort across all subjects is encouraged.`
  if (percentage >= 50) return `An average overall performance this term. Greater commitment to studies is advised for improved results.`
  return `This term's overall performance requires significant improvement. Closer attention and additional support are strongly recommended.`
}