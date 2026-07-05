import { createClient } from '@/lib/supabase/server'

export interface TeacherAssignment {
  id: string
  teacher_id: string
  class_id: string | null
  subject_id: string | null
  role: 'class_teacher' | 'subject_teacher' | 'assistant'
  groups?: { id: string; name: string } | null
  subjects?: { id: string; name: string } | null
}

export interface TeacherContext {
  teacherId: string
  isClassTeacher: boolean
  isSubjectTeacher: boolean
  assignedClassIds: string[]
  assignedSubjectIds: string[]
  classTeacherOf: string | null // The class they're class teacher of
  subjectTeacherOf: string[] // Subjects they teach
  allAssignments: TeacherAssignment[]
}

// Get complete teacher context
export async function getTeacherContext(teacherId: string): Promise<TeacherContext> {
  const supabase = await createClient()
  
  // Get all assignments for this teacher
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select(`
      id,
      teacher_id,
      class_id,
      subject_id,
      role,
      groups:class_id(id, name),
      subjects:subject_id(id, name)
    `)
    .eq('teacher_id', teacherId)
    .eq('is_active', true)

  if (!assignments) {
    return {
      teacherId,
      isClassTeacher: false,
      isSubjectTeacher: false,
      assignedClassIds: [],
      assignedSubjectIds: [],
      classTeacherOf: null,
      subjectTeacherOf: [],
      allAssignments: []
    }
  }

  // Find class teacher assignment (should be only one)
  const classTeacherAssignment = assignments.find(a => a.role === 'class_teacher')
  const classTeacherOf = classTeacherAssignment?.class_id || null

  // Find all subject teacher assignments
  const subjectTeacherAssignments = assignments.filter(a => a.role === 'subject_teacher')
  const subjectTeacherOf = subjectTeacherAssignments
    .map(a => a.subject_id)
    .filter(id => id !== null) as string[]

  // Get all assigned class IDs (from both class teacher and subject teacher roles)
  const assignedClassIds = assignments
    .map(a => a.class_id)
    .filter(id => id !== null) as string[]

  // Get all assigned subject IDs
  const assignedSubjectIds = assignments
    .map(a => a.subject_id)
    .filter(id => id !== null) as string[]

  return {
    teacherId,
    isClassTeacher: !!classTeacherOf,
    isSubjectTeacher: subjectTeacherOf.length > 0,
    assignedClassIds,
    assignedSubjectIds,
    classTeacherOf,
    subjectTeacherOf,
    allAssignments: assignments as TeacherAssignment[]
  }
}

// Get classes and subjects for a teacher's dashboard
export async function getTeacherDashboardData(teacherId: string) {
  const supabase = await createClient()
  const context = await getTeacherContext(teacherId)
  
  // Get classes the teacher has access to
  let classesQuery = supabase
    .from('groups')
    .select('id, name, code, teacher_id, learner_count:learners(count)')
    .eq('is_active', true)

  if (context.assignedClassIds.length > 0) {
    // Teacher has specific class assignments
    classesQuery = classesQuery.in('id', context.assignedClassIds)
  } else if (context.classTeacherOf) {
    // Teacher is a class teacher
    classesQuery = classesQuery.eq('id', context.classTeacherOf)
  }

  const { data: classes } = await classesQuery.order('name')

  // Get subjects the teacher teaches
  let subjectsQuery = supabase
    .from('subjects')
    .select('id, name, code, group_id, teacher_id, group:groups(name)')
    .eq('is_active', true)

  if (context.subjectTeacherOf.length > 0) {
    // Teacher has specific subject assignments
    subjectsQuery = subjectsQuery.in('id', context.subjectTeacherOf)
  } else if (context.classTeacherOf) {
    // If class teacher, they might teach all subjects in their class
    subjectsQuery = subjectsQuery.eq('group_id', context.classTeacherOf)
  }

  const { data: subjects } = await subjectsQuery.order('name')

  // ✅ Transform subjects to handle array case from Supabase
  const transformedSubjects = (subjects || []).map(s => ({
    ...s,
    group: Array.isArray(s.group) ? (s.group[0] ?? null) : (s.group || null)
  }))

  return {
    context,
    classes: classes || [],
    subjects: transformedSubjects
  }
}

// Check if a teacher has access to a specific class
export async function teacherHasClassAccess(teacherId: string, classId: string): Promise<boolean> {
  const context = await getTeacherContext(teacherId)
  
  // Check if they're the class teacher of this class
  if (context.classTeacherOf === classId) return true
  
  // Check if they're assigned to this class as a subject teacher
  return context.assignedClassIds.includes(classId)
}

// Check if a teacher has access to a specific subject
export async function teacherHasSubjectAccess(teacherId: string, subjectId: string): Promise<boolean> {
  const context = await getTeacherContext(teacherId)
  
  // Check if they're assigned to this subject
  if (context.subjectTeacherOf.includes(subjectId)) return true
  
  // Check if they're the class teacher of the class this subject belongs to
  const supabase = await createClient()
  const { data: subject } = await supabase
    .from('subjects')
    .select('group_id')
    .eq('id', subjectId)
    .single()
  
  if (subject?.group_id && context.classTeacherOf === subject.group_id) {
    return true
  }
  
  return false
}

// Get all students in a teacher's class (if they're a class teacher)
export async function getTeacherClassStudents(teacherId: string) {
  const context = await getTeacherContext(teacherId)
  
  if (!context.classTeacherOf) {
    return []
  }
  
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .eq('group_id', context.classTeacherOf)
    .eq('is_active', true)
    .order('last_name')
  
  return students || []
}

// Get students a teacher teaches (all students in classes where they teach subjects)
export async function getTeacherSubjectStudents(teacherId: string) {
  const context = await getTeacherContext(teacherId)
  
  if (context.subjectTeacherOf.length === 0 && !context.classTeacherOf) {
    return []
  }
  
  const supabase = await createClient()
  
  // Get all class IDs where this teacher teaches
  const classIds = [...context.assignedClassIds]
  
  // If they're a class teacher, include their class
  if (context.classTeacherOf && !classIds.includes(context.classTeacherOf)) {
    classIds.push(context.classTeacherOf)
  }
  
  if (classIds.length === 0) {
    return []
  }
  
  const { data: students } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, group:groups(name)')
    .in('group_id', classIds)
    .eq('is_active', true)
    .order('last_name')
  
  return students || []
}
