'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { hasFeature, canAddTeacher } from '@/lib/plans/gating'
import { getPlanConfig } from '@/lib/plans/config'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'

// Check if user is an institution
async function checkInstitutionAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  // Only institutions can manage teachers
  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  return { user, profile }
}

// ✅ NEW: Create teacher function with subscription guard
interface CreateTeacherInput {
  name: string
  email: string
  phone: string
  role: 'teacher' | 'lecturer' | 'assistant'
  password: string
  signatureUrl: string | null
  selectedClasses: string[]
  selectedSubjects: string[]
  isClassTeacher: boolean
  classTeacherOf: string
  subjectGroupMap: Record<string, string>
}

export async function createTeacher(input: CreateTeacherInput) {
  const supabase = await createClient()
  
  // ✅ Get authenticated user
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  // ✅ SUBSCRIPTION GATE: Check active subscription before creating teacher
  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return { error: message }

  const { profile } = await checkInstitutionAccess()
  const orgId = profile?.organization_id

  if (!orgId) {
    return { error: 'Not authorized' }
  }

  // ✅ Check teacher management feature
  const { data: org } = await supabase
    .from('organizations').select('subscription_plan').eq('id', orgId).single()
  const plan = org?.subscription_plan ?? 'free'

  if (!hasFeature(plan, 'teacherManagement')) {
    return { error: 'Teacher management is not available on your current plan. Please upgrade to add teachers.' }
  }

  // ✅ GATE: Check numeric teacher limit before creating
  const gate = await canAddTeacher(plan, { type: 'org', orgId })
  if (!gate.allowed) {
    return { error: gate.reason }
  }

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name.trim(), role: input.role, organization_id: orgId },
  })

  if (createError || !newUser.user) {
    return { error: createError?.message ?? 'Failed to create teacher account' }
  }

  const userId = newUser.user.id

  const { error: updateError } = await adminClient
    .from('users')
    .update({
      name: input.name.trim(),
      phone: input.phone || null,
      signature_url: input.signatureUrl || null,
      organization_id: orgId,
      role: input.role,
    })
    .eq('id', userId)

  if (updateError) {
    console.error('User update error:', updateError)
  }

  const assignments: { teacher_id: string; class_id?: string; subject_id?: string; role: string; organization_id: string }[] = []

  if (input.isClassTeacher && input.classTeacherOf) {
    assignments.push({
      teacher_id: userId,
      class_id: input.classTeacherOf,
      role: 'class_teacher',
      organization_id: orgId,
    })
  }

  input.selectedSubjects.forEach(subjectId => {
    assignments.push({
      teacher_id: userId,
      class_id: input.subjectGroupMap[subjectId],
      subject_id: subjectId,
      role: 'subject_teacher',
      organization_id: orgId,
    })
  })

  if (assignments.length > 0) {
    const { error: assignError } = await adminClient
      .from('teacher_assignments')
      .insert(assignments)
    if (assignError) console.error('Assignment error:', assignError)
  }

  revalidatePath('/settings/teachers')
  return { success: true, teacherName: input.name }
}

// Get all teachers in an organization
export async function getTeachers() {
  const { profile } = await checkInstitutionAccess()
  const supabase = await createClient()

  const { data: teachers } = await supabase
    .from('users')
    .select(`
      id, name, email, role,
      teacher_assignments(
        id,
        class_id,
        subject_id,
        role,
        groups:class_id(id, name),
        subjects:subject_id(id, name)
      )
    `)
    .eq('organization_id', profile?.organization_id)
    .eq('role', 'teacher')
    .order('name')

  return teachers || []
}

// Assign teacher to class/subject
export async function assignTeacher(formData: FormData) {
  const supabase = await createClient()
  
  // ✅ Get authenticated user
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  // ✅ SUBSCRIPTION GATE: Check active subscription before assigning teacher
  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return { error: message }

  const { profile } = await checkInstitutionAccess()
  const orgId = profile?.organization_id

  const teacherId = formData.get('teacher_id') as string
  const classId = formData.get('class_id') as string || null
  const subjectId = formData.get('subject_id') as string || null
  const role = formData.get('role') as string || 'subject_teacher'

  if (!teacherId) {
    console.error('Teacher ID is required')
    return
  }

  if (!classId && !subjectId) {
    console.error('Must assign to at least one class or subject')
    return
  }

  // ✅ GATE: Check if teacher management is available on this plan
  const { data: org } = await supabase
    .from('organizations').select('subscription_plan').eq('id', orgId).single()
  const plan = org?.subscription_plan ?? 'free'

  if (!hasFeature(plan, 'teacherManagement')) {
    console.error('Teacher management not available on this plan')
    return
  }

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    console.error('Assignment already exists')
    return
  }

  // Insert the assignment
  const { error } = await supabase
    .from('teacher_assignments')
    .insert({
      organization_id: orgId,
      teacher_id: teacherId,
      class_id: classId,
      subject_id: subjectId,
      role: role,
      is_active: true,
    })

  if (error) {
    console.error('Assignment error:', error)
    return
  }

  // If assigning as class teacher, update the groups table
  if (role === 'class_teacher' && classId) {
    await supabase
      .from('groups')
      .update({ teacher_id: teacherId })
      .eq('id', classId)
  }
  
  // If assigning as subject teacher, update the subjects table
  if (role === 'subject_teacher' && subjectId) {
    await supabase
      .from('subjects')
      .update({ teacher_id: teacherId })
      .eq('id', subjectId)
  }

  revalidatePath('/settings/teachers')
}

// Remove teacher assignment
export async function removeAssignment(formData: FormData) {
  const supabase = await createClient()
  
  // ✅ Get authenticated user
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  // ✅ SUBSCRIPTION GATE: Check active subscription before removing assignment
  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return { error: message }

  await checkInstitutionAccess()

  const assignmentId = formData.get('assignment_id') as string
  if (!assignmentId) return

  // Get the assignment details first
  const { data: assignment } = await supabase
    .from('teacher_assignments')
    .select('class_id, subject_id, role')
    .eq('id', assignmentId)
    .single()

  // Delete the assignment
  await supabase
    .from('teacher_assignments')
    .delete()
    .eq('id', assignmentId)

  // If it was a class teacher assignment, remove from groups
  if (assignment?.role === 'class_teacher' && assignment.class_id) {
    await supabase
      .from('groups')
      .update({ teacher_id: null })
      .eq('id', assignment.class_id)
  }

  // If it was a subject teacher assignment, remove from subjects
  if (assignment?.role === 'subject_teacher' && assignment.subject_id) {
    await supabase
      .from('subjects')
      .update({ teacher_id: null })
      .eq('id', assignment.subject_id)
  }

  revalidatePath('/settings/teachers')
}

// ✅ UPDATED: Bulk upload teachers via CSV with proper auth creation and gate checks
export async function uploadTeachers(formData: FormData) {
  const supabase = await createClient()
  
  // ✅ Get authenticated user
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  // ✅ SUBSCRIPTION GATE: Check active subscription before uploading teachers
  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return { error: message }

  const { profile } = await checkInstitutionAccess()
  const orgId = profile?.organization_id

  // ✅ GATE: Check teacher management feature availability
  const { data: org } = await supabase
    .from('organizations').select('subscription_plan').eq('id', orgId).single()
  const plan = org?.subscription_plan ?? 'free'

  if (!hasFeature(plan, 'teacherManagement')) {
    console.error('Teacher management not available on this plan')
    return
  }

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const file = formData.get('file') as File
  if (!file) {
    console.error('No file uploaded')
    return
  }

  try {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIndex = headers.indexOf('name')
    const emailIndex = headers.indexOf('email')
    const roleIndex = headers.indexOf('role')
    const classIndex = headers.indexOf('class_name')
    const subjectIndex = headers.indexOf('subject_name')

    if (nameIndex === -1 || emailIndex === -1) {
      console.error('CSV must have name and email columns')
      return
    }

    const teachers = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const name = values[nameIndex]
      const email = values[emailIndex]
      const role = values[roleIndex] || 'subject_teacher'
      const className = values[classIndex] || ''
      const subjectName = values[subjectIndex] || ''

      if (!name || !email) continue

      teachers.push({ name, email, role, className, subjectName })
    }

    if (teachers.length === 0) {
      console.error('No valid teachers found in CSV')
      return
    }

    // ✅ Gate: Check teacher limit before creating any accounts
    const config = getPlanConfig(plan)
    const { count: currentTeacherCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('role', 'teacher')

    // Check how many of these are genuinely NEW users (existing emails don't count against the limit)
    const emails = teachers.map(t => t.email)
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .in('email', emails)
    const existingEmails = new Set((existingUsers ?? []).map(u => u.email))
    const newTeacherCount = teachers.filter(t => !existingEmails.has(t.email)).length

    const projectedTotal = (currentTeacherCount ?? 0) + newTeacherCount
    
    // ✅ FIXED: Use a type guard to handle 'unlimited' properly
    const maxTeachers = config.limits.maxTeachers
    const maxTeachersValue = typeof maxTeachers === 'number' ? maxTeachers : Infinity
    if (projectedTotal > maxTeachersValue) {
      console.error(`Upload would exceed teacher limit: ${projectedTotal} > ${maxTeachers}`)
      return
    }

    for (const teacher of teachers) {
      // ✅ Check if a users profile already exists for this email
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', teacher.email)
        .maybeSingle()

      let teacherId: string

      if (existingUser) {
        teacherId = existingUser.id
      } else {
        // ✅ Create a real Supabase Auth account via admin API,
        // and send the teacher an email invite to set their own password.
        // This does NOT touch the admin's browser session — service-role
        // client is fully separate from the cookie-based client.
        const { data: newAuthUser, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(teacher.email, {
            data: { name: teacher.name, role: teacher.role, organization_id: orgId },
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`,
          })

        if (inviteError || !newAuthUser.user) {
          console.error(`Error inviting ${teacher.email}:`, inviteError)
          continue
        }

        teacherId = newAuthUser.user.id

        // ✅ Create/update the corresponding profile row
        const { error: profileError } = await adminClient
          .from('users')
          .update({
            name: teacher.name,
            role: teacher.role,
            organization_id: orgId,
          })
          .eq('id', teacherId)

        if (profileError) {
          console.error(`Error updating profile for ${teacher.email}:`, profileError)
        }
      }

      // Find or create class
      let classId: string | null = null
      if (teacher.className) {
        const { data: existingClass } = await supabase
          .from('groups')
          .select('id')
          .eq('name', teacher.className)
          .eq('organization_id', orgId)
          .maybeSingle()

        if (existingClass) {
          classId = existingClass.id
        } else {
          const { data: newClass, error: classError } = await supabase
            .from('groups')
            .insert({ name: teacher.className, organization_id: orgId, is_active: true })
            .select('id')
            .single()

          if (classError) {
            console.error('Error creating class:', classError)
          } else {
            classId = newClass.id
          }
        }
      }

      // Find or create subject
      let subjectId: string | null = null
      if (teacher.subjectName && classId) {
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', teacher.subjectName)
          .eq('group_id', classId)
          .eq('organization_id', orgId)
          .maybeSingle()

        if (existingSubject) {
          subjectId = existingSubject.id
        } else {
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({ name: teacher.subjectName, group_id: classId, organization_id: orgId, is_active: true })
            .select('id')
            .single()

          if (subjectError) {
            console.error('Error creating subject:', subjectError)
          } else {
            subjectId = newSubject.id
          }
        }
      }

      // Create assignment
      if (teacherId && (classId || subjectId)) {
        const { error: assignError } = await supabase
          .from('teacher_assignments')
          .insert({
            organization_id: orgId,
            teacher_id: teacherId,
            class_id: classId,
            subject_id: subjectId,
            role: teacher.role,
            is_active: true,
          })

        if (assignError) {
          console.error('Error creating assignment:', assignError)
        }
      }
    }

    revalidatePath('/settings/teachers')
  } catch (error) {
    console.error('Error processing CSV:', error)
  }
}

// Download teacher template CSV
export async function downloadTeacherTemplate() {
  const csv = `name,email,role,class_name,subject_name
John Doe,john@school.com,class_teacher,Primary 5,
Jane Smith,jane@school.com,subject_teacher,Primary 5,Mathematics
Mark Johnson,mark@school.com,subject_teacher,Primary 5,English
Sarah Williams,sarah@school.com,subject_teacher,Primary 6,Science
`
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=teachers_template.csv',
    },
  })
}

// Delete a teacher
export async function deleteTeacher(formData: FormData) {
  const supabase = await createClient()
  
  // ✅ Get authenticated user
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  // ✅ SUBSCRIPTION GATE: Check active subscription before deleting teacher
  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return { error: message }

  await checkInstitutionAccess()

  const teacherId = formData.get('teacher_id') as string
  if (!teacherId) return

  // Delete all assignments first
  await supabase
    .from('teacher_assignments')
    .delete()
    .eq('teacher_id', teacherId)

  // Remove from groups where they're class teacher
  await supabase
    .from('groups')
    .update({ teacher_id: null })
    .eq('teacher_id', teacherId)

  // Remove from subjects where they're subject teacher
  await supabase
    .from('subjects')
    .update({ teacher_id: null })
    .eq('teacher_id', teacherId)

  // Delete the user
  await supabase
    .from('users')
    .delete()
    .eq('id', teacherId)

  revalidatePath('/settings/teachers')
}

// ✅ NEW: Update teacher signature
export async function updateTeacherSignature(formData: FormData) {
  const supabase = await createClient()
  
  // ✅ Get authenticated user
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return { error: 'Not authenticated' }

  // ✅ SUBSCRIPTION GATE: Check active subscription before updating signature
  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return { error: message }

  await checkInstitutionAccess()

  const teacherId = formData.get('teacher_id') as string
  const signatureUrl = formData.get('signature_url') as string

  if (!teacherId || !signatureUrl) return

  const { error } = await supabase
    .from('users')
    .update({ signature_url: signatureUrl })
    .eq('id', teacherId)

  if (error) {
    console.error('Error updating signature:', error)
    return
  }

  revalidatePath('/settings/teachers')
}
