import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import TeacherManager from '@/components/settings/TeacherManager'

export default async function TeachersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  // Only institutions can access this page
  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  // Check if user is admin (only admins can manage teachers)
  if (profile?.role !== 'admin' && profile?.role !== 'school_admin') {
    redirect('/dashboard')
  }

  console.log('🔍 TEACHERS PAGE - Organization ID:', profile.organization_id)

  // ✅ Get all teachers in the organization with their assignments
  const { data: teachers, error: teachersError } = await supabase
    .from('users')
    .select(`
      id, 
      name, 
      email, 
      role,
      signature_url,
      teacher_assignments(
        id,
        class_id,
        subject_id,
        role,
        groups:class_id(id, name),
        subjects:subject_id(id, name)
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('role', 'teacher')
    .order('name')

  if (teachersError) {
    console.error('❌ Error fetching teachers:', teachersError)
  }

  console.log('👨‍🏫 Teachers found:', teachers?.length || 0)
  console.log('👨‍🏫 Teacher names:', teachers?.map(t => t.name) || [])

  // ✅ If no teachers, try to fetch all users to debug
  if (!teachers || teachers.length === 0) {
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('organization_id', profile.organization_id)
      .order('name')
    
    console.log('📊 All users in organization:', allUsers?.map(u => ({ 
      name: u.name, 
      role: u.role,
      email: u.email 
    })) || [])
  }

  // ✅ Transform the data to handle array cases from Supabase
  const transformedTeachers = (teachers || []).map(teacher => {
    // Create a clean teacher object
    const cleanTeacher = {
      id: teacher.id,
      name: teacher.name || '',
      email: teacher.email || '',
      role: teacher.role || 'teacher',
      signature_url: teacher.signature_url || null,
      teacher_assignments: [] as any[]
    }

    // Transform assignments if they exist
    if (teacher.teacher_assignments && Array.isArray(teacher.teacher_assignments)) {
      cleanTeacher.teacher_assignments = teacher.teacher_assignments.map((assignment: any) => {
        // Handle groups - Supabase returns array, extract first item
        let groups = assignment.groups
        if (Array.isArray(groups) && groups.length > 0) {
          groups = groups[0]
        } else if (Array.isArray(groups) && groups.length === 0) {
          groups = null
        }
        
        // Handle subjects - Supabase returns array, extract first item
        let subjects = assignment.subjects
        if (Array.isArray(subjects) && subjects.length > 0) {
          subjects = subjects[0]
        } else if (Array.isArray(subjects) && subjects.length === 0) {
          subjects = null
        }
        
        return {
          ...assignment,
          groups,
          subjects
        }
      })
    }

    return cleanTeacher
  })

  // Get all classes
  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('name')

  // Get all subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name, group_id,
      group:groups(name)
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('name')

  // ✅ Transform subjects to handle array case
  const transformedSubjects = (subjects || []).map(subject => {
    const groupArray = subject.group
    const extractedGroup = Array.isArray(groupArray) && groupArray.length > 0 
      ? groupArray[0] 
      : null
    
    return {
      ...subject,
      group: extractedGroup
    }
  })

  console.log('📋 Final data being passed to TeacherManager:')
  console.log('  - Teachers count:', transformedTeachers.length)
  console.log('  - Classes count:', classes?.length || 0)
  console.log('  - Subjects count:', transformedSubjects.length)

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Teacher Management</h1>
          <p className="page-subtitle">
            Manage teachers, assign them to classes and subjects. Teachers will only see what they're assigned to.
          </p>
        </div>
        <Link href="/settings/teachers/new" className="btn-primary btn shrink-0">
          <UserPlus size={14} /> Add Teacher
        </Link>
      </div>

      <TeacherManager 
        teachers={transformedTeachers} 
        classes={classes || []} 
        subjects={transformedSubjects || []} 
      />
    </div>
  )
}
