// Central source of truth for plan limits and features.
// Everything else in the app should read from here — never hardcode
// a limit or feature check anywhere else.

export type PlanKey = 'free' | 'small_school' | 'standard_school' | 'premium_school'

export type ApprovalWorkflow = 'none' | 'principal' | 'multi_level'
export type AuditLogLevel = 'none' | 'basic' | 'advanced' | 'full'
export type SupportLevel = 'community' | 'email' | 'priority' | 'dedicated'
export type ResultHistory = 'current_session' | 'unlimited'
export type BrandingLevel = 'basic' | 'full'

export interface PlanConfig {
  label: string
  limits: {
    maxStudents: number
    maxTeachers: number
    maxAdmins: number | 'unlimited'
    maxAcademicSessions: number | 'unlimited'
    maxClasses: number | 'unlimited'
    maxSubjects: number | 'unlimited'
    maxCustomTemplates: number | 'unlimited'
    maxTeacherSignatures: number | 'unlimited'
  }
  features: {
    studentRegistration: boolean
    teacherManagement: boolean
    studentPromotion: boolean
    automaticResultComputation: boolean
    pdfReportCards: boolean
    broadsheetGeneration: boolean
    excelImportExport: boolean
    attendanceManagement: boolean
    behaviouralPsychomotorAssessment: boolean
    aiGeneratedRemarks: boolean
    studentPortal: boolean
    parentPortal: boolean
    teacherPortal: boolean
    onlineResultChecker: boolean
    schoolBranding: BrandingLevel
    principalSignature: boolean
    resultApprovalWorkflow: ApprovalWorkflow
    publishLockResults: boolean
    archiveAcademicSessions: boolean
    restoreArchivedReports: boolean
    auditLogs: AuditLogLevel
    emailNotifications: boolean
    resultHistory: ResultHistory
    priorityProcessing: boolean
    prioritySupport: SupportLevel
  }
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  free: {
    label: 'Free',
    limits: {
      maxStudents: 30,
      maxTeachers: 1,
      maxAdmins: 1,
      maxAcademicSessions: 1,
      maxClasses: 1,
      maxSubjects: 10,
      maxCustomTemplates: 0,
      maxTeacherSignatures: 0,
    },
    features: {
      studentRegistration: true,
      teacherManagement: false,
      studentPromotion: false,
      automaticResultComputation: true,
      pdfReportCards: true,
      broadsheetGeneration: false,
      excelImportExport: true,
      attendanceManagement: false,
      behaviouralPsychomotorAssessment: false,
      aiGeneratedRemarks: false,
      studentPortal: false,
      parentPortal: false,
      teacherPortal: false,
      onlineResultChecker: false,
      schoolBranding: 'basic',
      principalSignature: false,
      resultApprovalWorkflow: 'none',
      publishLockResults: false,
      archiveAcademicSessions: false,
      restoreArchivedReports: false,
      auditLogs: 'none',
      emailNotifications: false,
      resultHistory: 'current_session',
      priorityProcessing: false,
      prioritySupport: 'community',
    },
  },
  small_school: {
    label: 'Small School',
    limits: {
      maxStudents: 500,
      maxTeachers: 25,
      maxAdmins: 2,
      maxAcademicSessions: 'unlimited',
      maxClasses: 'unlimited',
      maxSubjects: 'unlimited',
      maxCustomTemplates: 2,
      maxTeacherSignatures: 5,
    },
    features: {
      studentRegistration: true,
      teacherManagement: true,
      studentPromotion: true,
      automaticResultComputation: true,
      pdfReportCards: true,
      broadsheetGeneration: true,
      excelImportExport: true,
      attendanceManagement: true,
      behaviouralPsychomotorAssessment: true,
      aiGeneratedRemarks: true,
      studentPortal: true,
      parentPortal: true,
      teacherPortal: true,
      onlineResultChecker: true,
      schoolBranding: 'full',
      principalSignature: true,
      resultApprovalWorkflow: 'principal',
      publishLockResults: true,
      archiveAcademicSessions: true,
      restoreArchivedReports: true,
      auditLogs: 'basic',
      emailNotifications: true,
      resultHistory: 'unlimited',
      priorityProcessing: false,
      prioritySupport: 'email',
    },
  },
  standard_school: {
    label: 'Standard School',
    limits: {
      maxStudents: 2000,
      maxTeachers: 100,
      maxAdmins: 10,
      maxAcademicSessions: 'unlimited',
      maxClasses: 'unlimited',
      maxSubjects: 'unlimited',
      maxCustomTemplates: 5,
      maxTeacherSignatures: 'unlimited',
    },
    features: {
      studentRegistration: true,
      teacherManagement: true,
      studentPromotion: true,
      automaticResultComputation: true,
      pdfReportCards: true,
      broadsheetGeneration: true,
      excelImportExport: true,
      attendanceManagement: true,
      behaviouralPsychomotorAssessment: true,
      aiGeneratedRemarks: true,
      studentPortal: true,
      parentPortal: true,
      teacherPortal: true,
      onlineResultChecker: true,
      schoolBranding: 'full',
      principalSignature: true,
      resultApprovalWorkflow: 'multi_level',
      publishLockResults: true,
      archiveAcademicSessions: true,
      restoreArchivedReports: true,
      auditLogs: 'advanced',
      emailNotifications: true,
      resultHistory: 'unlimited',
      priorityProcessing: true,
      prioritySupport: 'priority',
    },
  },
  premium_school: {
    label: 'Premium School',
    limits: {
      maxStudents: 5000,
      maxTeachers: 300,
      maxAdmins: 'unlimited',
      maxAcademicSessions: 'unlimited',
      maxClasses: 'unlimited',
      maxSubjects: 'unlimited',
      maxCustomTemplates: 'unlimited',
      maxTeacherSignatures: 'unlimited',
    },
    features: {
      studentRegistration: true,
      teacherManagement: true,
      studentPromotion: true,
      automaticResultComputation: true,
      pdfReportCards: true,
      broadsheetGeneration: true,
      excelImportExport: true,
      attendanceManagement: true,
      behaviouralPsychomotorAssessment: true,
      aiGeneratedRemarks: true,
      studentPortal: true,
      parentPortal: true,
      teacherPortal: true,
      onlineResultChecker: true,
      schoolBranding: 'full',
      principalSignature: true,
      resultApprovalWorkflow: 'multi_level',
      publishLockResults: true,
      archiveAcademicSessions: true,
      restoreArchivedReports: true,
      auditLogs: 'full',
      emailNotifications: true,
      resultHistory: 'unlimited',
      priorityProcessing: true,
      prioritySupport: 'dedicated',
    },
  },
}

export function getPlanConfig(plan: string | null | undefined): PlanConfig {
  const key = (plan ?? 'free') as PlanKey
  return PLANS[key] ?? PLANS.free
}