'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Building, Upload, X, Camera, Save, FileText, Users as UsersIcon, Palette } from 'lucide-react'

interface Organization {
  id: string
  name: string
  school_name: string | null
  motto: string | null
  logo_url: string | null
  principal_name: string | null
  principal_signature_url: string | null
  teacher_signature_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  established_year: number | null
  colors: { primary: string; secondary: string } | null
  report_card_settings: {
    show_attendance: boolean
    show_remarks: boolean
    show_class_teacher_comment: boolean
    show_principal_signature: boolean
    show_school_seal: boolean
    grade_system: string
    pass_mark: number
  } | null
}

interface Props {
  organization: Organization
  userId: string
}

export default function InstitutionSettings({ organization, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    school_name: organization?.school_name || organization?.name || '',
    motto: organization?.motto || '',
    address: organization?.address || '',
    phone: organization?.phone || '',
    email: organization?.email || '',
    website: organization?.website || '',
    established_year: organization?.established_year || '',
    principal_name: organization?.principal_name || '',
    primary_color: organization?.colors?.primary || '#1a56db',
    secondary_color: organization?.colors?.secondary || '#0f766e',
    show_attendance: organization?.report_card_settings?.show_attendance ?? true,
    show_remarks: organization?.report_card_settings?.show_remarks ?? true,
    show_class_teacher_comment: organization?.report_card_settings?.show_class_teacher_comment ?? true,
    show_principal_signature: organization?.report_card_settings?.show_principal_signature ?? true,
    show_school_seal: organization?.report_card_settings?.show_school_seal ?? true,
    grade_system: organization?.report_card_settings?.grade_system || 'percentage',
    pass_mark: organization?.report_card_settings?.pass_mark || 40,
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(organization?.logo_url || null)
  const [principalSigFile, setPrincipalSigFile] = useState<File | null>(null)
  const [principalSigPreview, setPrincipalSigPreview] = useState<string | null>(organization?.principal_signature_url || null)
  const [teacherSigFile, setTeacherSigFile] = useState<File | null>(null)
  const [teacherSigPreview, setTeacherSigPreview] = useState<string | null>(organization?.teacher_signature_url || null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'principal_sig' | 'teacher_sig') => {
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`
      const filePath = `institutions/${organization.id}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('institution-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('institution-assets')
        .getPublicUrl(filePath)

      // Update organization
      const updateData: any = {}
      if (type === 'logo') {
        updateData.logo_url = publicUrl
        setLogoPreview(publicUrl)
      } else if (type === 'principal_sig') {
        updateData.principal_signature_url = publicUrl
        setPrincipalSigPreview(publicUrl)
      } else if (type === 'teacher_sig') {
        updateData.teacher_signature_url = publicUrl
        setTeacherSigPreview(publicUrl)
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id)

      if (updateError) throw updateError

      toast.success(`${type === 'logo' ? 'Logo' : 'Signature'} uploaded successfully!`)
      router.refresh()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData = {
        school_name: formData.school_name,
        motto: formData.motto,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        established_year: formData.established_year ? parseInt(formData.established_year as string) : null,
        principal_name: formData.principal_name,
        colors: {
          primary: formData.primary_color,
          secondary: formData.secondary_color
        },
        report_card_settings: {
          show_attendance: formData.show_attendance,
          show_remarks: formData.show_remarks,
          show_class_teacher_comment: formData.show_class_teacher_comment,
          show_principal_signature: formData.show_principal_signature,
          show_school_seal: formData.show_school_seal,
          grade_system: formData.grade_system,
          pass_mark: parseInt(formData.pass_mark as unknown as string) || 40
        }
      }

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id)

      if (error) throw error

      toast.success('Settings saved successfully!')
      router.refresh()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basic Information */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-4 flex items-center gap-2">
          <Building size={16} className="text-brand-500" />
          School Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-ink mb-1">School Name *</label>
            <input
              type="text"
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
              className="input"
              placeholder="e.g. Sunshine International School"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-ink mb-1">Motto</label>
            <input
              type="text"
              name="motto"
              value={formData.motto}
              onChange={handleChange}
              className="input"
              placeholder="e.g. Excellence Through Knowledge"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="input"
              placeholder="e.g. 123 Main Street, Lagos"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Established Year</label>
            <input
              type="number"
              name="established_year"
              value={formData.established_year}
              onChange={handleChange}
              className="input"
              placeholder="e.g. 2010"
              min={1900}
              max={new Date().getFullYear()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="e.g. 08012345678"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="e.g. school@email.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-ink mb-1">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="input"
              placeholder="e.g. https://school.com"
            />
          </div>
        </div>
      </div>

      {/* Branding & Colors */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-4 flex items-center gap-2">
          <Palette size={16} className="text-brand-500" />
          Branding & Colors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                name="primary_color"
                value={formData.primary_color}
                onChange={handleChange}
                className="w-12 h-12 rounded border border-surface-200 cursor-pointer"
              />
              <input
                type="text"
                name="primary_color"
                value={formData.primary_color}
                onChange={handleChange}
                className="input flex-1 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Secondary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                name="secondary_color"
                value={formData.secondary_color}
                onChange={handleChange}
                className="w-12 h-12 rounded border border-surface-200 cursor-pointer"
              />
              <input
                type="text"
                name="secondary_color"
                value={formData.secondary_color}
                onChange={handleChange}
                className="input flex-1 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-4 flex items-center gap-2">
          <Camera size={16} className="text-brand-500" />
          School Logo
        </h2>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-surface-300 flex items-center justify-center overflow-hidden bg-surface-50">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="School Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Building size={32} className="text-ink-faint" />
            )}
          </div>
          <div>
            <label className="btn-secondary btn-sm btn cursor-pointer">
              <Upload size={13} />
              Upload Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setLogoFile(file)
                    setLogoPreview(URL.createObjectURL(file))
                    handleFileUpload(file, 'logo')
                  }
                }}
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-ink-muted mt-2">
              Recommended: Square image, PNG or JPG, max 2MB
            </p>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-4 flex items-center gap-2">
          <PenTool size={16} className="text-brand-500" />
          Signatures
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Principal Signature */}
          <div>
            <label className="block text-xs font-medium text-ink mb-2">Principal's Signature</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 rounded border border-surface-200 flex items-center justify-center overflow-hidden bg-white">
                {principalSigPreview ? (
                  <img
                    src={principalSigPreview}
                    alt="Principal Signature"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-ink-faint">No signature</span>
                )}
              </div>
              <div>
                <label className="btn-secondary btn-sm btn cursor-pointer">
                  <Upload size={13} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPrincipalSigFile(file)
                        setPrincipalSigPreview(URL.createObjectURL(file))
                        handleFileUpload(file, 'principal_sig')
                      }
                    }}
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-ink-muted mt-1">
                  Upload principal's signature image
                </p>
              </div>
            </div>
          </div>

          {/* Teacher Signature */}
          <div>
            <label className="block text-xs font-medium text-ink mb-2">Teacher's Signature (Default)</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 rounded border border-surface-200 flex items-center justify-center overflow-hidden bg-white">
                {teacherSigPreview ? (
                  <img
                    src={teacherSigPreview}
                    alt="Teacher Signature"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-ink-faint">No signature</span>
                )}
              </div>
              <div>
                <label className="btn-secondary btn-sm btn cursor-pointer">
                  <Upload size={13} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setTeacherSigFile(file)
                        setTeacherSigPreview(URL.createObjectURL(file))
                        handleFileUpload(file, 'teacher_sig')
                      }
                    }}
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-ink-muted mt-1">
                  Default signature for all teachers
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-ink mb-1">Principal's Name (for reports)</label>
          <input
            type="text"
            name="principal_name"
            value={formData.principal_name}
            onChange={handleChange}
            className="input max-w-md"
            placeholder="e.g. Dr. John Doe"
          />
        </div>
      </div>

      {/* Report Card Settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-4 flex items-center gap-2">
          <FileText size={16} className="text-brand-500" />
          Report Card Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Grade System</label>
            <select
              name="grade_system"
              value={formData.grade_system}
              onChange={handleChange}
              className="input"
            >
              <option value="percentage">Percentage (0-100)</option>
              <option value="letter">Letter Grades (A-F)</option>
              <option value="gpa">GPA (0.0-5.0)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Pass Mark</label>
            <input
              type="number"
              name="pass_mark"
              value={formData.pass_mark}
              onChange={handleChange}
              className="input"
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-medium text-ink mb-2">Display Options</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_attendance"
                checked={formData.show_attendance}
                onChange={handleChange}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-ink">Show Attendance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_remarks"
                checked={formData.show_remarks}
                onChange={handleChange}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-ink">Show Teacher Remarks</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_class_teacher_comment"
                checked={formData.show_class_teacher_comment}
                onChange={handleChange}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-ink">Show Class Teacher Comment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_principal_signature"
                checked={formData.show_principal_signature}
                onChange={handleChange}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-ink">Show Principal Signature</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="show_school_seal"
                checked={formData.show_school_seal}
                onChange={handleChange}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-ink">Show School Seal</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || uploading}
          className="btn-primary btn flex items-center gap-2"
        >
          <Save size={15} />
          {loading ? 'Saving...' : 'Save All Settings'}
        </button>
        {uploading && (
          <span className="text-xs text-ink-muted flex items-center">Uploading files...</span>
        )}
      </div>
    </form>
  )
}
