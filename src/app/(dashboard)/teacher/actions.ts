'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'
import { checkPlanLimit } from '@/lib/subscription/checkPlanLimit'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// Get all teachers in an organization
export async function getTeachers() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

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
    .neq('role', 'admin')
    .order('name')

  return teachers || []
}

// Assign teacher to class/subject
export async function assignTeacher(formData: FormData) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  // Check subscription status gate
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

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
      organization_id: profile?.organization_id,
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
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

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

// Bulk upload teachers via CSV
export async function uploadTeachers(formData: FormData) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  // Check subscription status gate
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

  // Check plan limit gate (maxTeachers) - check before importing
  const limitCheck = await checkPlanLimit(supabase, user.id, 'maxTeachers')
  if (!limitCheck.allowed) {
    console.error('Plan limit reached:', limitCheck.message)
    return
  }

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  const file = formData.get('file') as File
  if (!file) {
    console.error('No file uploaded')
    return
  }

  try {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    // Parse headers
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
    
    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const name = values[nameIndex]
      const email = values[emailIndex]
      const role = values[roleIndex] || 'subject_teacher'
      const className = values[classIndex] || ''
      const subjectName = values[subjectIndex] || ''

      if (!name || !email) continue

      teachers.push({
        name,
        email,
        role,
        className,
        subjectName,
        organization_id: profile?.organization_id
      })
    }

    if (teachers.length === 0) {
      console.error('No valid teachers found in CSV')
      return
    }

    // Get current teacher count for limit checking
    const { count: currentTeacherCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile?.organization_id)
      .neq('role', 'admin')

    const planConfig = await checkPlanLimit(supabase, user.id, 'maxTeachers')
    if (!planConfig.allowed) {
      console.error('Plan limit reached:', planConfig.message)
      return
    }

    // Create users and assignments
    for (const teacher of teachers) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', teacher.email)
        .maybeSingle()

      let teacherId

      if (existingUser) {
        teacherId = existingUser.id
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
            organization_id: teacher.organization_id,
            is_active: true
          })
          .select('id')
          .single()

        if (userError) {
          console.error('Error creating user:', userError)
          continue
        }

        teacherId = newUser.id
      }

      // Find or create class
      let classId = null
      if (teacher.className) {
        const { data: existingClass } = await supabase
          .from('groups')
          .select('id')
          .eq('name', teacher.className)
          .eq('organization_id', profile?.organization_id)
          .maybeSingle()

        if (existingClass) {
          classId = existingClass.id
        } else {
          const { data: newClass, error: classError } = await supabase
            .from('groups')
            .insert({
              name: teacher.className,
              organization_id: profile?.organization_id,
              is_active: true
            })
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
      let subjectId = null
      if (teacher.subjectName && classId) {
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', teacher.subjectName)
          .eq('group_id', classId)
          .eq('organization_id', profile?.organization_id)
          .maybeSingle()

        if (existingSubject) {
          subjectId = existingSubject.id
        } else {
          const { data: newSubject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
              name: teacher.subjectName,
              group_id: classId,
              organization_id: profile?.organization_id,
              is_active: true
            })
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
            organization_id: profile?.organization_id,
            teacher_id: teacherId,
            class_id: classId,
            subject_id: subjectId,
            role: teacher.role,
            is_active: true
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

// Delete a teacher (soft delete or hard delete)
export async function deleteTeacher(formData: FormData) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

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

  // Delete the user (or soft delete by setting is_active false)
  await supabase
    .from('users')
    .delete()
    .eq('id', teacherId)

  revalidatePath('/settings/teachers')
}
