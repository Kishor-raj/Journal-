import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { uploadToCloudinary, submitEditorialApplication } from './services/editorialApplicationService'

const EDITORIAL_SECTIONS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Deep Learning',
  'Data Science',
  'Cyber Security',
  'Computer Vision',
  'Natural Language Processing (NLP)',
  'Cloud Computing & IoT',
  'Software Engineering',
  'Digital Computing',
  'Emerging Technologies & Quantum Computing',
]

const PREFERRED_ROLES = [
  'Editorial Board Member',
  'Associate Editor',
  'Section Editor',
  'Reviewer',
  'Executive Editor',
]

const REVIEW_CAPACITIES = [
  '1–2 manuscripts/month',
  '3–5 manuscripts/month',
  '6–10 manuscripts/month',
  '10+ manuscripts/month',
]

const REVIEW_PERIODS = [
  '7 days',
  '14 days',
  '21 days',
  'Flexible',
]

const ACADEMIC_TITLES = ['Dr.', 'Prof.', 'Prof. Dr.', 'Assoc. Prof.', 'Asst. Prof.', 'Mr.', 'Ms.', 'Other']

export default function EditorialApply() {
  const [formData, setFormData] = useState({
    academic_title: 'Dr.',
    full_name: '',
    designation: '',
    department: '',
    institution: '',
    country: '',
    email: '',
    phone: '',
    profile_image_url: '',
    profile_image_public_id: '',
    orcid_id: '',
    google_scholar_url: '',
    google_scholar_h_index: '',
    scopus_id: '',
    scopus_url: '',
    wos_researcher_id: '',
    wos_profile_url: '',
    highest_qualification: 'Ph.D. / Doctorate',
    specialization: '',
    university: '',
    year_of_completion: '',
    phd_title: '',
    primary_research_area: '',
    secondary_research_areas: '',
    research_keywords: '',
    preferred_editorial_section: EDITORIAL_SECTIONS[0],
    total_journal_publications: '0',
    total_conference_publications: '0',
    book_chapters_count: '0',
    patents_count: '0',
    has_previous_editorial_experience: false,
    editorial_experiences: [
      { journal_name: '', publisher: '', editorial_position: 'Reviewer', journal_website: '', manuscripts_reviewed: '', scopus_wos_experience: false },
    ],
    preferred_role: PREFERRED_ROLES[0],
    review_capacity: REVIEW_CAPACITIES[1],
    preferred_review_period: REVIEW_PERIODS[1],
    availability: 'Available',
    cv_file_url: '',
    cv_file_public_id: '',
    cv_file_name: '',
    cv_file_size: null,
    cv_mime_type: 'application/pdf',
    statement_of_interest: '',
    contribution_statement: '',
    declaration_confidentiality: false,
    declaration_conflict_of_interest: false,
    declaration_ethics: false,
    declaration_accuracy: false,
    declaration_editorial_policy: false,
  })

  const [keywordInput, setKeywordInput] = useState('')
  const [keywordList, setKeywordList] = useState([])
  const [uploadingCv, setUploadingCv] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [cvFileName, setCvFileName] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successData, setSuccessData] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Keywords management
  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim()
    if (!trimmed) return
    if (!keywordList.includes(trimmed)) {
      const updated = [...keywordList, trimmed]
      setKeywordList(updated)
      setFormData((prev) => ({ ...prev, research_keywords: updated }))
    }
    setKeywordInput('')
  }

  const handleRemoveKeyword = (index) => {
    const updated = keywordList.filter((_, idx) => idx !== index)
    setKeywordList(updated)
    setFormData((prev) => ({ ...prev, research_keywords: updated }))
  }

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  // Experience row management
  const handleExperienceChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.editorial_experiences]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, editorial_experiences: updated }
    })
  }

  const handleAddExperience = () => {
    setFormData((prev) => ({
      ...prev,
      editorial_experiences: [
        ...prev.editorial_experiences,
        { journal_name: '', publisher: '', editorial_position: 'Reviewer', journal_website: '', manuscripts_reviewed: '', scopus_wos_experience: false },
      ],
    }))
  }

  const handleRemoveExperience = (index) => {
    setFormData((prev) => ({
      ...prev,
      editorial_experiences: prev.editorial_experiences.filter((_, i) => i !== index),
    }))
  }

  // CV Upload
  const handleCvFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a valid PDF document for your Academic CV.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('CV file size exceeds 15 MB limit. Please upload a smaller PDF.')
      return
    }

    setErrorMsg('')
    setUploadingCv(true)
    try {
      const uploaded = await uploadToCloudinary(file, 'cv')
      setFormData((prev) => ({
        ...prev,
        cv_file_url: uploaded.url,
        cv_file_public_id: uploaded.public_id,
        cv_file_name: file.name,
        cv_file_size: file.size,
        cv_mime_type: 'application/pdf',
      }))
      setCvFileName(file.name)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload CV. Please try again.')
    } finally {
      setUploadingCv(false)
    }
  }

  // Photo Upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Please upload a JPG, PNG, or WebP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Profile photo must not exceed 5 MB.')
      return
    }

    setErrorMsg('')
    setUploadingPhoto(true)
    try {
      const uploaded = await uploadToCloudinary(file, 'photo')
      setFormData((prev) => ({
        ...prev,
        profile_image_url: uploaded.url,
        profile_image_public_id: uploaded.public_id,
      }))
      setPhotoPreview(uploaded.url)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload profile photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required'
    if (!formData.designation.trim()) errors.designation = 'Designation is required'
    if (!formData.department.trim()) errors.department = 'Department is required'
    if (!formData.institution.trim()) errors.institution = 'Institution is required'
    if (!formData.country.trim()) errors.country = 'Country is required'
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'A valid email address is required'
    }
    if (!formData.specialization.trim()) errors.specialization = 'Specialization is required'
    if (!formData.university.trim()) errors.university = 'University / Degree-granting institution is required'
    if (!formData.year_of_completion || parseInt(formData.year_of_completion, 10) < 1950) {
      errors.year_of_completion = 'Valid completion year is required'
    }
    if (!formData.primary_research_area.trim()) errors.primary_research_area = 'Primary research area is required'
    if (keywordList.length < 3) errors.research_keywords = 'Please add at least 3 research keywords (5–10 recommended)'
    if (!formData.cv_file_url) errors.cv_file_url = 'Please upload your Academic CV (PDF)'

    if (
      !formData.declaration_confidentiality ||
      !formData.declaration_conflict_of_interest ||
      !formData.declaration_ethics ||
      !formData.declaration_accuracy ||
      !formData.declaration_editorial_policy
    ) {
      errors.declarations = 'All 5 ethical and editorial declarations must be checked.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!validateForm()) {
      setErrorMsg('Please resolve the highlighted validation errors above.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        research_keywords: keywordList,
        secondary_research_areas: typeof formData.secondary_research_areas === 'string'
          ? formData.secondary_research_areas.split(',').map(s => s.trim()).filter(Boolean)
          : formData.secondary_research_areas,
      }

      const res = await submitEditorialApplication(payload)
      setSuccessData(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Application submission error:', err)
      setErrorMsg(err.message || 'Failed to submit application. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (successData) {
    return (
      <div style={{ maxWidth: '840px', margin: '40px auto 80px', padding: '0 20px' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #C4A24C',
          borderRadius: '4px',
          padding: 'clamp(32px, 5vw, 56px)',
          boxShadow: '0 8px 30px rgba(11, 27, 58, 0.08)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#F5FAEE',
            border: '2px solid #5B8A00',
            color: '#5B8A00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            margin: '0 auto 20px',
          }}>
            ✓
          </div>

          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '8px' }}>
            Application Submitted Successfully
          </div>

          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(26px, 4vw, 36px)', color: '#0B1B3A', margin: '0 0 16px' }}>
            Thank You for Applying
          </h2>

          <p style={{ fontSize: '16px', color: '#3A4157', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto 28px' }}>
            Your application to join the <strong>IJIDCR Editorial Board</strong> has been registered. An official confirmation email has been dispatched to <strong>{formData.email}</strong>.
          </p>

          <div style={{
            background: '#F8F9FC',
            border: '1px solid #E6E9F0',
            borderRadius: '4px',
            padding: '20px 24px',
            display: 'inline-block',
            margin: '0 auto 32px',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '13px', color: '#6A728A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Application Reference Number
            </div>
            <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '22px', fontWeight: 700, color: '#0B1B3A' }}>
              {successData.application_number}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to={`/editorial-board/status?ref=${encodeURIComponent(successData.application_number)}&email=${encodeURIComponent(formData.email)}`}
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: '#0B1B3A',
                color: '#FFFFFF',
                padding: '14px 28px',
                borderRadius: '2px',
                textDecoration: 'none',
              }}
            >
              Track Application Status →
            </Link>
            <Link
              to="/board"
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: '#F0ECE3',
                color: '#0B1B3A',
                padding: '14px 28px',
                borderRadius: '2px',
                textDecoration: 'none',
              }}
            >
              Return to Editorial Board
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header Banner */}
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(28px, 4vw, 44px) var(--layout-pad)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '12px' }}>
            IJIDCR Editorial Governance
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(28px, 4.5vw, 46px)', margin: '0 0 12px' }}>
            Join the Editorial Board
          </h1>
          <p style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', color: '#C3CBDC', maxWidth: '780px', margin: 0 }}>
            Distinguished scholars and active researchers are invited to submit their application to join the International Journal of Intelligent Digital Computing Research (IJIDCR) editorial team.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: 'clamp(24px, 4vw, 40px) var(--layout-pad) 80px' }}>
        
        {/* Navigation & Status track banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '28px',
          paddingBottom: '16px',
          borderBottom: '1px solid #E6E1D6',
        }}>
          <Link to="/board" style={{ color: '#0B1B3A', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Editorial Board
          </Link>
          <Link to="/editorial-board/status" style={{ color: '#9A7B23', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
            Already applied? Track status here ↗
          </Link>
        </div>

        {errorMsg && (
          <div style={{
            background: '#FDEDEC',
            border: '1px solid #E74C3C',
            color: '#C0392B',
            padding: '16px 20px',
            borderRadius: '4px',
            marginBottom: '28px',
            fontSize: '15px',
          }}>
            <strong>Application Note:</strong> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Section 1: Applicant Profile */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>1</span>
              <div>
                <h2 style={sectionTitleStyle}>Applicant Profile</h2>
                <p style={sectionSubtitleStyle}>Personal identity, institutional affiliation, and academic contact details</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginTop: '20px' }}>
              <div>
                <label style={labelStyle}>Academic Title</label>
                <select name="academic_title" value={formData.academic_title} onChange={handleChange} style={inputStyle}>
                  {ACADEMIC_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Alexander Vance"
                  style={{ ...inputStyle, borderColor: fieldErrors.full_name ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.full_name && <span style={errorTextStyle}>{fieldErrors.full_name}</span>}
              </div>

              <div>
                <label style={labelStyle}>Designation / Current Role *</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Associate Professor / Senior Scientist"
                  style={{ ...inputStyle, borderColor: fieldErrors.designation ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.designation && <span style={errorTextStyle}>{fieldErrors.designation}</span>}
              </div>

              <div>
                <label style={labelStyle}>Department *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Department of Computer Science & Engineering"
                  style={{ ...inputStyle, borderColor: fieldErrors.department ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.department && <span style={errorTextStyle}>{fieldErrors.department}</span>}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Institution / University *</label>
                <input
                  type="text"
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  placeholder="e.g. National University of Singapore"
                  style={{ ...inputStyle, borderColor: fieldErrors.institution ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.institution && <span style={errorTextStyle}>{fieldErrors.institution}</span>}
              </div>

              <div>
                <label style={labelStyle}>Country *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. India, United States, Germany..."
                  style={{ ...inputStyle, borderColor: fieldErrors.country ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.country && <span style={errorTextStyle}>{fieldErrors.country}</span>}
              </div>

              <div>
                <label style={labelStyle}>Email Address * (Used for account setup)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. alexander.vance@university.edu"
                  style={{ ...inputStyle, borderColor: fieldErrors.email ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.email && <span style={errorTextStyle}>{fieldErrors.email}</span>}
              </div>

              <div>
                <label style={labelStyle}>Contact Mobile / WhatsApp (Optional)</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 8900"
                  style={inputStyle}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label style={labelStyle}>Profile Photo (Optional, Portrait)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                  style={inputStyle}
                />
                {uploadingPhoto && <span style={{ fontSize: '13px', color: '#9A7B23' }}>Uploading photo...</span>}
                {photoPreview && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={photoPreview} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #C4A24C' }} />
                    <span style={{ fontSize: '12px', color: '#5B8A00' }}>Photo attached ✓</span>
                  </div>
                )}
              </div>
            </div>

            {/* Academic IDs */}
            <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid #F0ECE3', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label style={labelStyle}>ORCID iD (Recommended)</label>
                <input
                  type="text"
                  name="orcid_id"
                  value={formData.orcid_id}
                  onChange={handleChange}
                  placeholder="0000-0002-1825-0097"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Google Scholar Profile URL</label>
                <input
                  type="url"
                  name="google_scholar_url"
                  value={formData.google_scholar_url}
                  onChange={handleChange}
                  placeholder="https://scholar.google.com/citations?user=..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Google Scholar h-index</label>
                <input
                  type="number"
                  min="0"
                  name="google_scholar_h_index"
                  value={formData.google_scholar_h_index}
                  onChange={handleChange}
                  placeholder="e.g. 14"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Scopus Author ID / URL</label>
                <input
                  type="text"
                  name="scopus_url"
                  value={formData.scopus_url}
                  onChange={handleChange}
                  placeholder="Scopus URL or Author ID"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Web of Science Researcher ID / URL</label>
                <input
                  type="text"
                  name="wos_profile_url"
                  value={formData.wos_profile_url}
                  onChange={handleChange}
                  placeholder="WoS Researcher Profile URL"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Academic Qualification */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>2</span>
              <div>
                <h2 style={sectionTitleStyle}>Academic Qualification</h2>
                <p style={sectionSubtitleStyle}>Highest earned degree and doctoral details</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginTop: '20px' }}>
              <div>
                <label style={labelStyle}>Highest Qualification *</label>
                <select name="highest_qualification" value={formData.highest_qualification} onChange={handleChange} style={inputStyle}>
                  <option value="Ph.D. / Doctorate">Ph.D. / Doctorate</option>
                  <option value="Post-Doctoral">Post-Doctoral</option>
                  <option value="Master of Technology (M.Tech / M.E.)">Master of Technology (M.Tech / M.E.)</option>
                  <option value="Master of Science (M.S. / M.Sc.)">Master of Science (M.S. / M.Sc.)</option>
                  <option value="Doctor of Science (D.Sc.)">Doctor of Science (D.Sc.)</option>
                  <option value="Other Master Degree">Other Master Degree</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Specialization / Major *</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g. Machine Learning & Computer Vision"
                  style={{ ...inputStyle, borderColor: fieldErrors.specialization ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.specialization && <span style={errorTextStyle}>{fieldErrors.specialization}</span>}
              </div>

              <div>
                <label style={labelStyle}>University / Awarding Institution *</label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  placeholder="e.g. University of Cambridge"
                  style={{ ...inputStyle, borderColor: fieldErrors.university ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.university && <span style={errorTextStyle}>{fieldErrors.university}</span>}
              </div>

              <div>
                <label style={labelStyle}>Year of Completion *</label>
                <input
                  type="number"
                  name="year_of_completion"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  value={formData.year_of_completion}
                  onChange={handleChange}
                  placeholder="e.g. 2018"
                  style={{ ...inputStyle, borderColor: fieldErrors.year_of_completion ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.year_of_completion && <span style={errorTextStyle}>{fieldErrors.year_of_completion}</span>}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Ph.D. Thesis / Dissertation Title (If applicable)</label>
                <input
                  type="text"
                  name="phd_title"
                  value={formData.phd_title}
                  onChange={handleChange}
                  placeholder="e.g. Deep Neural Architectures for Real-time Edge Computing"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Research Expertise */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>3</span>
              <div>
                <h2 style={sectionTitleStyle}>Research Expertise &amp; Editorial Section</h2>
                <p style={sectionSubtitleStyle}>Primary domains, technical keywords, and preferred journal section</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginTop: '20px' }}>
              <div>
                <label style={labelStyle}>Primary Research Area *</label>
                <input
                  type="text"
                  name="primary_research_area"
                  value={formData.primary_research_area}
                  onChange={handleChange}
                  placeholder="e.g. Artificial Intelligence, Cryptography, etc."
                  style={{ ...inputStyle, borderColor: fieldErrors.primary_research_area ? '#E74C3C' : '#D1D5DB' }}
                />
                {fieldErrors.primary_research_area && <span style={errorTextStyle}>{fieldErrors.primary_research_area}</span>}
              </div>

              <div>
                <label style={labelStyle}>Preferred IJIDCR Editorial Section *</label>
                <select
                  name="preferred_editorial_section"
                  value={formData.preferred_editorial_section}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  {EDITORIAL_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Secondary Research Areas (Comma-separated)</label>
                <input
                  type="text"
                  name="secondary_research_areas"
                  value={formData.secondary_research_areas}
                  onChange={handleChange}
                  placeholder="e.g. Cloud Computing, Internet of Things, Cyber Defense"
                  style={inputStyle}
                />
              </div>

              {/* Tag Input for Keywords */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Research Keywords * (Type keyword and press Enter or comma — minimum 3, recommended 5–10)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="e.g. Deep Learning, Graph Neural Networks..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    style={{
                      background: '#0B1B3A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0 18px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    + Add
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px' }}>
                  {keywordList.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#F0ECE3',
                        color: '#0B1B3A',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        fontSize: '13px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(idx)}
                        style={{ border: 'none', background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {fieldErrors.research_keywords && <span style={errorTextStyle}>{fieldErrors.research_keywords}</span>}
              </div>
            </div>
          </div>

          {/* Section 4: Research & Publication Profile */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>4</span>
              <div>
                <h2 style={sectionTitleStyle}>Research &amp; Publication Record</h2>
                <p style={sectionSubtitleStyle}>Scholarly outputs and publication metrics</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginTop: '20px' }}>
              <div>
                <label style={labelStyle}>Total Journal Publications</label>
                <input
                  type="number"
                  min="0"
                  name="total_journal_publications"
                  value={formData.total_journal_publications}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Total Conference Publications</label>
                <input
                  type="number"
                  min="0"
                  name="total_conference_publications"
                  value={formData.total_conference_publications}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Book Chapters / Books</label>
                <input
                  type="number"
                  min="0"
                  name="book_chapters_count"
                  value={formData.book_chapters_count}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Patents Granted / Filed</label>
                <input
                  type="number"
                  min="0"
                  name="patents_count"
                  value={formData.patents_count}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Editorial Experience */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>5</span>
              <div>
                <h2 style={sectionTitleStyle}>Editorial &amp; Reviewer Experience</h2>
                <p style={sectionSubtitleStyle}>Prior engagement with scholarly journals and peer review</p>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#0B1B3A', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  name="has_previous_editorial_experience"
                  checked={formData.has_previous_editorial_experience}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: '#C4A24C' }}
                />
                Do you have previous Editorial Board or Journal Reviewer experience?
              </label>
            </div>

            {formData.has_previous_editorial_experience && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formData.editorial_experiences.map((exp, idx) => (
                  <div key={idx} style={{ background: '#F8F9FB', border: '1px solid #EAECEF', padding: '16px 18px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#9A7B23', textTransform: 'uppercase' }}>
                        Journal Entry #{idx + 1}
                      </span>
                      {formData.editorial_experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(idx)}
                          style={{ color: '#E74C3C', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>Journal Name *</label>
                        <input
                          type="text"
                          value={exp.journal_name}
                          onChange={(e) => handleExperienceChange(idx, 'journal_name', e.target.value)}
                          placeholder="e.g. IEEE Transactions on AI"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Publisher</label>
                        <input
                          type="text"
                          value={exp.publisher}
                          onChange={(e) => handleExperienceChange(idx, 'publisher', e.target.value)}
                          placeholder="e.g. IEEE, Springer, Elsevier"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Position Held</label>
                        <input
                          type="text"
                          value={exp.editorial_position}
                          onChange={(e) => handleExperienceChange(idx, 'editorial_position', e.target.value)}
                          placeholder="e.g. Associate Editor / Reviewer"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Approx Manuscripts Reviewed</label>
                        <input
                          type="text"
                          value={exp.manuscripts_reviewed}
                          onChange={(e) => handleExperienceChange(idx, 'manuscripts_reviewed', e.target.value)}
                          placeholder="e.g. 15+"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddExperience}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'transparent',
                    border: '1px dashed #C4A24C',
                    color: '#0B1B3A',
                    padding: '8px 16px',
                    borderRadius: '3px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add Another Journal
                </button>
              </div>
            )}
          </div>

          {/* Section 6: Preferred Role & Availability */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>6</span>
              <div>
                <h2 style={sectionTitleStyle}>Preferred Role &amp; Availability</h2>
                <p style={sectionSubtitleStyle}>Indicate your preferred level of participation and reviewing bandwidth</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginTop: '20px' }}>
              <div>
                <label style={labelStyle}>Preferred Editorial Role *</label>
                <select name="preferred_role" value={formData.preferred_role} onChange={handleChange} style={inputStyle}>
                  {PREFERRED_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Review Capacity</label>
                <select name="review_capacity" value={formData.review_capacity} onChange={handleChange} style={inputStyle}>
                  {REVIEW_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Preferred Review Turnaround Period</label>
                <select name="preferred_review_period" value={formData.preferred_review_period} onChange={handleChange} style={inputStyle}>
                  {REVIEW_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Current Availability Status</label>
                <select name="availability" value={formData.availability} onChange={handleChange} style={inputStyle}>
                  <option value="Available">Available</option>
                  <option value="Limited">Limited Bandwidth</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 7: Academic CV (PDF) */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>7</span>
              <div>
                <h2 style={sectionTitleStyle}>Academic CV &amp; Documents</h2>
                <p style={sectionSubtitleStyle}>Upload your detailed curriculum vitae in PDF format (Max 15 MB)</p>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={labelStyle}>Upload Updated Academic CV (PDF) *</label>
              <div style={{
                border: fieldErrors.cv_file_url ? '2px dashed #E74C3C' : '2px dashed #C4A24C',
                padding: '28px',
                textAlign: 'center',
                borderRadius: '4px',
                background: '#FCFBF8',
              }}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleCvFileChange}
                  disabled={uploadingCv}
                  style={{ display: 'none' }}
                  id="cv-upload-input"
                />
                <label
                  htmlFor="cv-upload-input"
                  style={{
                    display: 'inline-block',
                    background: '#0B1B3A',
                    color: '#FFFFFF',
                    padding: '10px 24px',
                    borderRadius: '2px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: uploadingCv ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {uploadingCv ? 'Uploading to Cloudinary...' : 'Select PDF File'}
                </label>
                <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#6A728A' }}>
                  {cvFileName ? `Attached: ${cvFileName}` : 'PDF format only. Maximum size 15 MB.'}
                </p>
                {formData.cv_file_url && (
                  <div style={{ marginTop: '8px', color: '#5B8A00', fontWeight: 600, fontSize: '13px' }}>
                    ✓ CV successfully uploaded and attached
                  </div>
                )}
              </div>
              {fieldErrors.cv_file_url && <span style={errorTextStyle}>{fieldErrors.cv_file_url}</span>}
            </div>
          </div>

          {/* Section 8: Statements of Interest */}
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>8</span>
              <div>
                <h2 style={sectionTitleStyle}>Statements of Interest (Optional)</h2>
                <p style={sectionSubtitleStyle}>Provide a brief overview of your motivations and proposed contributions</p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Why do you want to join the IJIDCR Editorial Board?</label>
                <textarea
                  name="statement_of_interest"
                  value={formData.statement_of_interest}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Share your goals and interest in IJIDCR scholarly publishing..."
                  style={textareaStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>How can you contribute to IJIDCR?</label>
                <textarea
                  name="contribution_statement"
                  value={formData.contribution_statement}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g. Special issue proposals, reviewer recommendations, editorial oversight..."
                  style={textareaStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 9: Ethics & Declarations */}
          <div style={{ ...sectionCardStyle, borderLeft: '4px solid #C4A24C' }}>
            <div style={sectionHeaderStyle}>
              <span style={sectionNumberStyle}>9</span>
              <div>
                <h2 style={sectionTitleStyle}>Ethics, Confidentiality &amp; Editorial Declarations</h2>
                <p style={sectionSubtitleStyle}>Please review and confirm each mandatory declaration</p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  name="declaration_confidentiality"
                  checked={formData.declaration_confidentiality}
                  onChange={handleChange}
                  style={checkboxInputStyle}
                />
                <span><strong>Confidentiality Agreement:</strong> I agree to maintain strict confidentiality regarding all submitted manuscripts and peer review communications.</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  name="declaration_conflict_of_interest"
                  checked={formData.declaration_conflict_of_interest}
                  onChange={handleChange}
                  style={checkboxInputStyle}
                />
                <span><strong>Conflict of Interest:</strong> I declare that I will recuse myself from handling or reviewing any manuscript where a conflict of interest exists.</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  name="declaration_ethics"
                  checked={formData.declaration_ethics}
                  onChange={handleChange}
                  style={checkboxInputStyle}
                />
                <span><strong>Publication Ethics:</strong> I commit to adhering to COPE guidelines and maintaining research integrity across all editorial evaluations.</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  name="declaration_accuracy"
                  checked={formData.declaration_accuracy}
                  onChange={handleChange}
                  style={checkboxInputStyle}
                />
                <span><strong>Accuracy of Information:</strong> I certify that all educational qualifications, publication metrics, and affiliations provided in this application are true and accurate.</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  name="declaration_editorial_policy"
                  checked={formData.declaration_editorial_policy}
                  onChange={handleChange}
                  style={checkboxInputStyle}
                />
                <span><strong>Journal Policies:</strong> I agree to comply with IJIDCR editorial policies, double-blind review criteria, and peer review turnaround timelines.</span>
              </label>

              {fieldErrors.declarations && (
                <div style={errorTextStyle}>{fieldErrors.declarations}</div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button
              type="submit"
              disabled={submitting || uploadingCv || uploadingPhoto}
              style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: submitting ? '#8C98A9' : '#C4A24C',
                color: '#071228',
                padding: '16px 36px',
                borderRadius: '2px',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                boxShadow: '0 4px 14px rgba(196,162,76,0.25)',
              }}
            >
              {submitting ? 'Submitting Application...' : 'Submit Application →'}
            </button>
          </div>

        </form>
      </div>
    </>
  )
}

const sectionCardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E6E1D6',
  borderRadius: '4px',
  padding: 'clamp(20px, 3.5vw, 32px)',
  marginBottom: '28px',
  boxShadow: '0 2px 8px rgba(11,27,58,0.03)',
}

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  borderBottom: '1px solid #F0ECE3',
  paddingBottom: '14px',
}

const sectionNumberStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: '#0B1B3A',
  color: '#C4A24C',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '14px',
  flexShrink: 0,
}

const sectionTitleStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 'clamp(20px, 2.4vw, 24px)',
  fontWeight: 600,
  color: '#0B1B3A',
  margin: 0,
}

const sectionSubtitleStyle = {
  fontSize: '13px',
  color: '#6A728A',
  margin: '2px 0 0',
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#3A4157',
  marginBottom: '6px',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '3px',
  fontSize: '14.5px',
  color: '#0B1B3A',
  boxSizing: 'border-box',
  outline: 'none',
}

const textareaStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '3px',
  fontSize: '14.5px',
  color: '#0B1B3A',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  resize: 'vertical',
  outline: 'none',
}

const errorTextStyle = {
  color: '#E74C3C',
  fontSize: '12.5px',
  marginTop: '4px',
  display: 'block',
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  fontSize: '14px',
  lineHeight: 1.6,
  color: '#3A4157',
  cursor: 'pointer',
}

const checkboxInputStyle = {
  width: '18px',
  height: '18px',
  marginTop: '3px',
  accentColor: '#C4A24C',
  flexShrink: 0,
}
