// src/components/executive/ExecutiveOverview.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Users, UserPlus, UserMinus, GraduationCap, CalendarCheck, Wallet, AlertTriangle, BookOpen } from 'lucide-react'
import ClassHealthTable from './ClassHealthTable'
import DefaultersPanel from './DefaultersPanel'
import StudentMovement from './StudentMovement'
import AttendanceIntelligence from './AttendanceIntelligence'
import NeedsAttentionPanel from './NeedsAttentionPanel'
import WeeklyBrief from './WeeklyBrief'
import StudentDistribution from './StudentDistribution'

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

export default function ExecutiveOverview() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    fetch('/api/executive/overview')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" size={24} /></div>
  if (error) return <div className="card p-8 text-center text-sm text-ink-muted">{error}</div>
  if (!data) return null

  const collectionRate = data.fees_expected > 0 ? Math.round((data.fees_collected / data.fees_expected) * 100) : 0
  const outstanding = Math.max(data.fees_expected - data.fees_collected, 0)

  const cards = [
    { label: 'Total Students', value: data.total_students.toLocaleString('en-NG'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'New This Term', value: `+${data.new_this_term}`, icon: UserPlus, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Withdrawn/Transferred', value: data.withdrawn_this_term.toLocaleString('en-NG'), icon: UserMinus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Graduated', value: data.graduated_this_term.toLocaleString('en-NG'), icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Attendance Today', value: data.attendance_today !== null ? `${data.attendance_today}%` : 'No data', icon: CalendarCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Fees Collected', value: naira(data.fees_collected), icon: Wallet, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Outstanding Fees', value: naira(outstanding), icon: Wallet, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Classes', value: data.total_classes.toLocaleString('en-NG'), icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <NeedsAttentionPanel />
      <StudentDistribution />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-lg font-bold text-ink">{value}</div>
            <div className="text-xs text-ink-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-2">Fee Collection Rate</h2>
        <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-brand-500" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
        </div>
        <p className="text-xs text-ink-faint">{collectionRate}% of {naira(data.fees_expected)} expected this term</p>
      </div>

      {data.students_significant_absence > 0 && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>{data.students_significant_absence}</strong> student{data.students_significant_absence !== 1 ? 's' : ''} with 5+ absences in the last 30 days require attention.
          </p>
        </div>
      )}

      <ClassHealthTable onSelectClass={(id, name) => setSelectedGroup({ id, name })} />
      <DefaultersPanel 
        groupId={selectedGroup?.id ?? null} 
        className={selectedGroup?.name ?? null} 
        onClose={() => setSelectedGroup(null)} 
      />
      <StudentMovement />
      <AttendanceIntelligence />
      <WeeklyBrief />
    </div>
  )
}