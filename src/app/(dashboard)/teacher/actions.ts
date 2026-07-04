import { NextResponse } from 'next/server'

export async function GET() {
  const csv = `name,email,role,class_name,subject_name
John Doe,john@school.com,class_teacher,Primary 5,
Jane Smith,jane@school.com,subject_teacher,Primary 5,Mathematics
Mark Johnson,mark@school.com,subject_teacher,Primary 5,English
Sarah Williams,sarah@school.com,subject_teacher,Primary 6,Science
`
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=teachers_template.csv',
    },
  })
}
