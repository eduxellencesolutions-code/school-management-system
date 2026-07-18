'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { hasFeature } from '@/lib/plans/gating'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface GenerateRemarkInput {
  learnerFirstName: string
  percentage: number
  grade: string
  subjectBreakdown: { name: string; percentage: number }[]
  tone?: 'encouraging' | 'neutral' | 'formal'
}

export async function generateAIRemark(input: GenerateRemarkInput): Promise<{ success: boolean; remark?: string; error?: string }> {
  // Check API key first
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, subscription_plan').eq('id', user.id).single()

  let plan: string
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations').select('subscription_plan').eq('id', profile.organization_id).single()
    plan = org?.subscription_plan ?? 'free'
  } else {
    plan = profile?.subscription_plan ?? 'free'
  }

  // ✅ GATE: Check if AI remarks are available on this plan
  if (!hasFeature(plan, 'aiGeneratedRemarks')) {
    return { success: false, error: 'AI-generated remarks are not available on your current plan. Please upgrade to unlock.' }
  }

  // Find strongest and weakest subjects
  const sorted = [...input.subjectBreakdown].sort((a, b) => b.percentage - a.percentage)
  const strongestSubject = sorted[0]
  const weakestSubject = sorted[sorted.length - 1]

  const tone = input.tone ?? 'encouraging'

  try {
    // ✅ FIX: Use gemini-2.5-flash - official production model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Write a short, ${tone} school report card remark (2-3 sentences, no headings, no markdown) for a student named ${input.learnerFirstName}.
Overall performance: ${input.percentage}% (Grade ${input.grade}).
Strongest subject: ${strongestSubject?.name ?? 'N/A'} (${strongestSubject?.percentage ?? '-'}%).
Needs improvement: ${weakestSubject?.name ?? 'N/A'} (${weakestSubject?.percentage ?? '-'}%).
Write it as a teacher would, addressing the student directly or by name, suitable to print on an official report card. Do not include a greeting or sign-off.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const remark = response.text().trim()

    if (!remark) {
      return { success: false, error: 'AI did not return a usable remark. Please try again.' }
    }

    return { success: true, remark }
  } catch (err: any) {
    console.error('AI remark generation error:', err)
    return { success: false, error: err.message || 'Failed to generate remark. Please try again or write manually.' }
  }
}
