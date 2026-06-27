import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pin } = body

    if (!pin || pin.length < 6) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('learner_pins')
      .select('learner_id, learners:learner_id(first_name, last_name, admission_number)')
      .eq('pin', pin.trim())
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      learnerId: data.learner_id,
      learner: data.learners 
    })
  } catch (error) {
    console.error('Parent API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
