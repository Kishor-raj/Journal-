import crypto from 'crypto'
import pool from '../../config/db.js'
import cloudinary from '../../config/cloudinary.js'
import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { hashToken, buildAppUrl } from '../email/email.utils.js'
import { parseNameParts } from '../auth/auth.service.js'
import {
  sendEditorialApplicationReceivedEmail,
  sendEditorialApplicationAdminAlertEmail,
  sendEditorialApplicationClarificationEmail,
  sendEditorialApplicationApprovedEmail,
  sendEditorialRoleInvitationEmail,
  sendEditorialApplicationRejectedEmail,
} from '../email/email.templates.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ORCID_REGEX = /^(https?:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i
const URL_REGEX = /^https?:\/\/.+/i

export const EDITORIAL_SECTIONS = [
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

export const PREFERRED_ROLES = [
  'Editorial Board Member',
  'National Editorial Board',
  'International Editorial Board',
  'Reviewer',
]

export const REVIEW_CAPACITY_OPTIONS = [
  '1–2 manuscripts/month',
  '3–5 manuscripts/month',
  '6–10 manuscripts/month',
  '10+ manuscripts/month',
]

export const REVIEW_PERIOD_OPTIONS = [
  '7 days',
  '14 days',
  '21 days',
  'Flexible',
]

export const AVAILABILITY_OPTIONS = [
  'Available',
  'Limited',
  'Unavailable',
]

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function validateApplicationInput(body = {}) {
  const errors = []
  const data = {}

  // 1. Applicant Profile
  const fullName = String(body.full_name || body.fullName || '').trim()
  if (!fullName) errors.push('Full name is required.')
  else if (fullName.length > 200) errors.push('Full name must not exceed 200 characters.')
  data.full_name = fullName

  data.academic_title = String(body.academic_title || body.academicTitle || '').trim() || null

  const designation = String(body.designation || '').trim()
  if (!designation) errors.push('Designation is required.')
  else if (designation.length > 200) errors.push('Designation must not exceed 200 characters.')
  data.designation = designation

  const department = String(body.department || '').trim()
  if (!department) errors.push('Department is required.')
  else if (department.length > 200) errors.push('Department must not exceed 200 characters.')
  data.department = department

  const institution = String(body.institution || '').trim()
  if (!institution) errors.push('Institution / University is required.')
  else if (institution.length > 255) errors.push('Institution must not exceed 255 characters.')
  data.institution = institution

  const country = String(body.country || '').trim()
  if (!country) errors.push('Country is required.')
  else if (country.length > 100) errors.push('Country must not exceed 100 characters.')
  data.country = country

  const rawEmail = String(body.email || '').trim()
  if (!rawEmail) errors.push('Email address is required.')
  else if (!EMAIL_REGEX.test(rawEmail)) errors.push('Please provide a valid email address.')
  data.email = normalizeEmail(rawEmail)

  data.phone = String(body.phone || body.mobile_number || '').trim() || null

  data.profile_image_url = String(body.profile_image_url || body.profileImageUrl || '').trim() || null
  data.profile_image_public_id = String(body.profile_image_public_id || body.profileImagePublicId || '').trim() || null

  const orcid = String(body.orcid_id || body.orcidId || body.orcid || '').trim()
  if (orcid && !ORCID_REGEX.test(orcid)) {
    errors.push('ORCID iD format is invalid (expected 0000-0000-0000-0000 or orcid.org URL).')
  }
  data.orcid_id = orcid || null

  const googleScholarUrl = String(body.google_scholar_url || body.googleScholarUrl || '').trim()
  if (googleScholarUrl && !URL_REGEX.test(googleScholarUrl)) {
    errors.push('Google Scholar profile must be a valid URL.')
  }
  data.google_scholar_url = googleScholarUrl || null

  const hIndex = body.google_scholar_h_index !== undefined ? parseInt(body.google_scholar_h_index, 10) : 0
  if (isNaN(hIndex) || hIndex < 0) {
    errors.push('Google Scholar h-index must be a non-negative number.')
  }
  data.google_scholar_h_index = isNaN(hIndex) ? 0 : hIndex

  data.scopus_id = String(body.scopus_id || body.scopusId || '').trim() || null
  const scopusUrl = String(body.scopus_url || body.scopusUrl || '').trim()
  if (scopusUrl && !URL_REGEX.test(scopusUrl)) {
    errors.push('Scopus profile must be a valid URL.')
  }
  data.scopus_url = scopusUrl || null

  data.wos_researcher_id = String(body.wos_researcher_id || body.wosResearcherId || '').trim() || null
  const wosUrl = String(body.wos_profile_url || body.wosProfileUrl || '').trim()
  if (wosUrl && !URL_REGEX.test(wosUrl)) {
    errors.push('Web of Science profile must be a valid URL.')
  }
  data.wos_profile_url = wosUrl || null

  // 2. Academic Qualification
  const highestQualification = String(body.highest_qualification || body.highestQualification || '').trim()
  if (!highestQualification) errors.push('Highest qualification is required.')
  data.highest_qualification = highestQualification

  const specialization = String(body.specialization || '').trim()
  if (!specialization) errors.push('Specialization / Major is required.')
  data.specialization = specialization

  const university = String(body.university || '').trim()
  if (!university) errors.push('University / Institution for highest qualification is required.')
  data.university = university

  const currentYear = new Date().getFullYear()
  const yearOfCompletion = parseInt(body.year_of_completion || body.yearOfCompletion, 10)
  if (isNaN(yearOfCompletion) || yearOfCompletion < 1950 || yearOfCompletion > currentYear + 1) {
    errors.push(`Year of completion must be a valid year between 1950 and ${currentYear + 1}.`)
  }
  data.year_of_completion = yearOfCompletion

  data.phd_title = String(body.phd_title || body.phdTitle || '').trim() || null

  // 3. Research Expertise
  const primaryArea = String(body.primary_research_area || body.primaryResearchArea || '').trim()
  if (!primaryArea) errors.push('Primary research area is required.')
  data.primary_research_area = primaryArea

  let secondaryAreas = body.secondary_research_areas || body.secondaryResearchAreas || []
  if (typeof secondaryAreas === 'string') {
    secondaryAreas = secondaryAreas.split(',').map(s => s.trim()).filter(Boolean)
  }
  data.secondary_research_areas = Array.isArray(secondaryAreas) ? secondaryAreas : []

  let keywords = body.research_keywords || body.researchKeywords || []
  if (typeof keywords === 'string') {
    keywords = keywords.split(',').map(k => k.trim()).filter(Boolean)
  }
  if (!Array.isArray(keywords) || keywords.length < 3) {
    errors.push('Please provide at least 3 research keywords (5–10 recommended).')
  }
  data.research_keywords = Array.isArray(keywords) ? keywords : []

  const preferredSection = String(body.preferred_editorial_section || body.preferredEditorialSection || '').trim()
  if (!preferredSection) errors.push('Preferred IJIDCR Editorial Section is required.')
  data.preferred_editorial_section = preferredSection

  // 4. Research & Publication Profile
  const parseIntSafe = (v) => {
    const parsed = parseInt(v, 10)
    return isNaN(parsed) || parsed < 0 ? 0 : parsed
  }
  data.total_journal_publications = parseIntSafe(body.total_journal_publications ?? body.totalJournalPublications)
  data.total_conference_publications = parseIntSafe(body.total_conference_publications ?? body.totalConferencePublications)
  data.book_chapters_count = parseIntSafe(body.book_chapters_count ?? body.bookChaptersCount)
  data.patents_count = parseIntSafe(body.patents_count ?? body.patentsCount)

  // 5. Editorial / Reviewer Experience
  data.has_previous_editorial_experience = Boolean(body.has_previous_editorial_experience || body.hasPreviousEditorialExperience)
  let editorialExp = body.editorial_experiences || body.editorialExperiences || []
  if (typeof editorialExp === 'string') {
    try { editorialExp = JSON.parse(editorialExp) } catch { editorialExp = [] }
  }
  data.editorial_experiences = Array.isArray(editorialExp) ? editorialExp : []

  // 6. Preferred Role & Availability
  const preferredRole = String(body.preferred_role || body.preferredRole || '').trim()
  if (!preferredRole) errors.push('Preferred editorial role is required.')
  data.preferred_role = preferredRole

  data.review_capacity = String(body.review_capacity || body.reviewCapacity || '').trim() || '3–5 manuscripts/month'
  data.preferred_review_period = String(body.preferred_review_period || body.preferredReviewPeriod || '').trim() || '14 days'
  data.availability = String(body.availability || '').trim() || 'Available'

  // 7. CV & Documents
  const cvUrl = String(body.cv_file_url || body.cvFileUrl || '').trim()
  if (!cvUrl) errors.push('Updated Academic CV (PDF) is required.')
  data.cv_file_url = cvUrl
  data.cv_file_public_id = String(body.cv_file_public_id || body.cvFilePublicId || '').trim() || null
  data.cv_file_name = String(body.cv_file_name || body.cvFileName || 'academic_cv.pdf').trim()
  data.cv_file_size = parseIntSafe(body.cv_file_size || body.cvFileSize)
  data.cv_mime_type = String(body.cv_mime_type || body.cvMimeType || 'application/pdf').trim()

  let supportingDocs = body.supporting_documents || body.supportingDocuments || []
  if (typeof supportingDocs === 'string') {
    try { supportingDocs = JSON.parse(supportingDocs) } catch { supportingDocs = [] }
  }
  data.supporting_documents = Array.isArray(supportingDocs) ? supportingDocs : []

  // 8. Statements
  data.statement_of_interest = String(body.statement_of_interest || body.statementOfInterest || '').trim() || null
  data.contribution_statement = String(body.contribution_statement || body.contributionStatement || '').trim() || null

  // 9. Declarations (All 5 mandatory)
  const isDeclConfidentiality = Boolean(body.declaration_confidentiality || body.declarationConfidentiality)
  const isDeclCoi = Boolean(body.declaration_conflict_of_interest || body.declarationConflictOfInterest)
  const isDeclEthics = Boolean(body.declaration_ethics || body.declarationEthics)
  const isDeclAccuracy = Boolean(body.declaration_accuracy || body.declarationAccuracy)
  const isDeclPolicy = Boolean(body.declaration_editorial_policy || body.declarationEditorialPolicy)

  if (!isDeclConfidentiality || !isDeclCoi || !isDeclEthics || !isDeclAccuracy || !isDeclPolicy) {
    errors.push('All ethics and compliance declarations must be confirmed before submission.')
  }

  data.declaration_confidentiality = isDeclConfidentiality
  data.declaration_conflict_of_interest = isDeclCoi
  data.declaration_ethics = isDeclEthics
  data.declaration_accuracy = isDeclAccuracy
  data.declaration_editorial_policy = isDeclPolicy

  return {
    valid: errors.length === 0,
    errors,
    data,
  }
}

export async function generateApplicationNumber() {
  const year = new Date().getFullYear()
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM editorial_applications WHERE application_number LIKE $1`,
    [`EB-${year}-%`]
  )
  const count = parseInt(countResult.rows[0]?.total || 0, 10) + 1
  const baseNum = `EB-${year}-${String(count).padStart(4, '0')}`

  // Ensure uniqueness
  const exists = await pool.query('SELECT id FROM editorial_applications WHERE application_number = $1', [baseNum])
  if (exists.rows.length === 0) return baseNum

  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `EB-${year}-${String(count).padStart(4, '0')}-${randomSuffix}`
}

export async function generateEditorId(db = pool) {
  const res = await db.query(`
    SELECT MAX(num) as max_num FROM (
      SELECT NULLIF(SUBSTRING(editor_id FROM '^AIRJ([0-9]+)$'), '')::integer AS num FROM users WHERE editor_id IS NOT NULL
      UNION ALL
      SELECT NULLIF(SUBSTRING(editor_id FROM '^AIRJ([0-9]+)$'), '')::integer AS num FROM editorial_members WHERE editor_id IS NOT NULL
      UNION ALL
      SELECT NULLIF(SUBSTRING(editor_id FROM '^AIRJ([0-9]+)$'), '')::integer AS num FROM editorial_applications WHERE editor_id IS NOT NULL
    ) sub
  `)
  const maxNum = parseInt(res?.rows?.[0]?.max_num || 0, 10)
  let nextNum = isNaN(maxNum) ? 1 : maxNum + 1
  let editorId = `AIRJ${String(nextNum).padStart(4, '0')}`

  while (true) {
    const exists = await db.query(
      `SELECT 1 FROM users WHERE editor_id = $1 UNION SELECT 1 FROM editorial_members WHERE editor_id = $1`,
      [editorId]
    )
    if (!exists?.rows || exists.rows.length === 0) break
    nextNum++
    editorId = `AIRJ${String(nextNum).padStart(4, '0')}`
  }

  return editorId
}

export async function submitApplication(rawInput, ip, userAgent) {
  const validation = validateApplicationInput(rawInput)
  if (!validation.valid) {
    throw new AppError(validation.errors.join(' '), 400)
  }

  const { data } = validation

  // Check duplicate active applications
  const existingActive = await pool.query(
    `SELECT id, application_number, status, created_at
     FROM editorial_applications
     WHERE email = $1 AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION', 'CLARIFICATION_REQUIRED')
     ORDER BY created_at DESC LIMIT 1`,
    [data.email]
  )

  if (existingActive.rows.length > 0) {
    const prev = existingActive.rows[0]
    throw new AppError(
      `An active application (${prev.application_number}) is already pending review for this email address. Please check your application status.`,
      409
    )
  }

  const applicationNumber = await generateApplicationNumber()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check if user account already exists with this email
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [data.email])
    const existingUserId = userResult.rows[0]?.id || null

    const insertResult = await client.query(
      `INSERT INTO editorial_applications (
        application_number, email, full_name, academic_title, designation,
        department, institution, country, phone, profile_image_url,
        profile_image_public_id, orcid_id, google_scholar_url, google_scholar_h_index,
        scopus_id, scopus_url, wos_researcher_id, wos_profile_url,
        highest_qualification, specialization, university, year_of_completion,
        phd_title, primary_research_area, secondary_research_areas, research_keywords,
        preferred_editorial_section, total_journal_publications, total_conference_publications,
        book_chapters_count, patents_count, has_previous_editorial_experience,
        editorial_experiences, preferred_role, review_capacity, preferred_review_period,
        availability, cv_file_url, cv_file_public_id, cv_file_name, cv_file_size,
        cv_mime_type, supporting_documents, statement_of_interest, contribution_statement,
        declaration_confidentiality, declaration_conflict_of_interest, declaration_ethics,
        declaration_accuracy, declaration_editorial_policy, status, user_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31, $32,
        $33, $34, $35, $36,
        $37, $38, $39, $40, $41,
        $42, $43, $44, $45,
        $46, $47, $48,
        $49, $50, 'SUBMITTED', $51
      ) RETURNING *`,
      [
        applicationNumber, data.email, data.full_name, data.academic_title, data.designation,
        data.department, data.institution, data.country, data.phone, data.profile_image_url,
        data.profile_image_public_id, data.orcid_id, data.google_scholar_url, data.google_scholar_h_index,
        data.scopus_id, data.scopus_url, data.wos_researcher_id, data.wos_profile_url,
        data.highest_qualification, data.specialization, data.university, data.year_of_completion,
        data.phd_title, data.primary_research_area, data.secondary_research_areas, data.research_keywords,
        data.preferred_editorial_section, data.total_journal_publications, data.total_conference_publications,
        data.book_chapters_count, data.patents_count, data.has_previous_editorial_experience,
        JSON.stringify(data.editorial_experiences), data.preferred_role, data.review_capacity, data.preferred_review_period,
        data.availability, data.cv_file_url, data.cv_file_public_id, data.cv_file_name, data.cv_file_size,
        data.cv_mime_type, JSON.stringify(data.supporting_documents), data.statement_of_interest, data.contribution_statement,
        data.declaration_confidentiality, data.declaration_conflict_of_interest, data.declaration_ethics,
        data.declaration_accuracy, data.declaration_editorial_policy, existingUserId
      ]
    )

    const savedApp = insertResult.rows[0]

    if (existingUserId) {
      const nameParts = parseNameParts(data.full_name, data.academic_title)
      const inst = data.institution || data.university || 'Academic Institution'
      const dept = data.department || 'Academic Department'
      const ctry = data.country || 'International'
      const stateVal = data.country || 'N/A'
      const courseVal = data.specialization || data.highest_qualification || 'Editorial Member'
      const bioVal = data.statement_of_interest || [data.designation, data.department, data.institution].filter(Boolean).join(', ') || null

      await client.query(
        `UPDATE users
         SET first_name = COALESCE(NULLIF(first_name, ''), $1),
             last_name = COALESCE(NULLIF(last_name, ''), $2),
             display_name = COALESCE(NULLIF(display_name, ''), $3),
             phone = COALESCE(NULLIF(phone, ''), $4),
             institution = COALESCE(NULLIF(institution, ''), $5),
             college = COALESCE(NULLIF(college, ''), $6),
             department = COALESCE(NULLIF(department, ''), $7),
             state = COALESCE(NULLIF(state, ''), $8),
             country = COALESCE(NULLIF(country, ''), $9),
             course = COALESCE(NULLIF(course, ''), $10),
             bio = COALESCE(NULLIF(bio, ''), $11),
             orcid_id = COALESCE(NULLIF(orcid_id, ''), $12),
             profile_image_url = COALESCE(NULLIF(profile_image_url, ''), $13),
             updated_at = now()
         WHERE id = $14`,
        [
          nameParts.firstName,
          nameParts.lastName,
          data.full_name || nameParts.displayName,
          data.phone || null,
          inst,
          inst,
          dept,
          stateVal,
          ctry,
          courseVal,
          bioVal,
          data.orcid_id || null,
          data.profile_image_url || null,
          existingUserId,
        ]
      )
    }

    // Create Audit Log
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'editorial_application_submitted', 'editorial_application', $2, $3, $4, $5)`,
      [
        existingUserId,
        savedApp.id,
        JSON.stringify({
          application_number: applicationNumber,
          email: data.email,
          full_name: data.full_name,
          preferred_role: data.preferred_role,
          preferred_section: data.preferred_editorial_section,
        }),
        ip || null,
        userAgent || null,
      ]
    )

    await client.query('COMMIT')

    // Send emails asynchronously (non-blocking)
    const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const statusUrl = buildAppUrl('/editorial-board/status', { ref: applicationNumber })
    const adminReviewUrl = buildAppUrl('/admin/editorial-applications')

    sendEditorialApplicationReceivedEmail({
      to: data.email,
      applicantName: data.full_name,
      applicationNumber,
      submittedAt: formattedDate,
      preferredRole: data.preferred_role,
      preferredSection: data.preferred_editorial_section,
      statusUrl,
    }).catch(err => console.error('[EMAIL] Failed to send applicant acknowledgement:', err.message))

    sendEditorialApplicationAdminAlertEmail({
      applicantName: data.full_name,
      applicantEmail: data.email,
      institution: data.institution,
      designation: data.designation,
      country: data.country,
      preferredRole: data.preferred_role,
      preferredSection: data.preferred_editorial_section,
      primaryResearchArea: data.primary_research_area,
      applicationNumber,
      submittedAt: formattedDate,
      adminReviewUrl,
    }).catch(err => console.error('[EMAIL] Failed to send admin alert:', err.message))

    return {
      success: true,
      application_number: applicationNumber,
      status: 'SUBMITTED',
      message: 'Your Editorial Board application has been submitted successfully. A confirmation email has been sent to your email address.',
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export function generateUploadSignature({ fileType = 'cv' }) {
  const timestamp = Math.round(Date.now() / 1000)
  const randomSuffix = crypto.randomBytes(8).toString('hex')
  
  let folder = 'editorial-board/cv'
  let publicId = `cv_${timestamp}_${randomSuffix}`

  if (fileType === 'photo' || fileType === 'profile_photo') {
    folder = 'editorial-board/profile-photos'
    publicId = `photo_${timestamp}_${randomSuffix}`
  } else if (fileType === 'evidence' || fileType === 'document') {
    folder = 'editorial-board/documents'
    publicId = `doc_${timestamp}_${randomSuffix}`
  }

  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET)

  return {
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    public_id: publicId,
  }
}

export async function getApplicationStatus(reference, email) {
  if (!reference || !String(reference).trim()) {
    throw new AppError('Application reference number is required.', 400)
  }

  const cleanRef = String(reference).trim()
  let query = `
    SELECT id, application_number, full_name, email, status, preferred_role,
           preferred_editorial_section, primary_research_area, clarification_request,
           clarification_requested_at, clarification_response, clarification_responded_at,
           decision_reason, reviewed_at, created_at, updated_at
    FROM editorial_applications
    WHERE application_number = $1
  `
  const params = [cleanRef]

  if (email && String(email).trim()) {
    query += ` AND email = $2`
    params.push(normalizeEmail(email))
  }

  const result = await pool.query(query, params)
  const app = result.rows[0]
  if (!app) {
    throw new AppError('Application not found. Please check your reference number and email address.', 404)
  }

  return {
    application_number: app.application_number,
    full_name: app.full_name,
    status: app.status,
    preferred_role: app.preferred_role,
    preferred_editorial_section: app.preferred_editorial_section,
    primary_research_area: app.primary_research_area,
    clarification_request: app.clarification_request,
    clarification_requested_at: app.clarification_requested_at,
    clarification_response: app.clarification_response,
    clarification_responded_at: app.clarification_responded_at,
    decision_reason: ['APPROVED', 'REJECTED'].includes(app.status) ? app.decision_reason : null,
    submitted_at: app.created_at,
    updated_at: app.updated_at,
  }
}

export async function submitClarificationResponse(reference, email, responseText, ip, userAgent) {
  if (!reference || !email) {
    throw new AppError('Application reference and email are required.', 400)
  }
  const cleanResponse = String(responseText || '').trim()
  if (!cleanResponse) {
    throw new AppError('Clarification response message is required.', 400)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const appRes = await client.query(
      `SELECT * FROM editorial_applications WHERE application_number = $1 AND email = $2`,
      [String(reference).trim(), normalizeEmail(email)]
    )
    const app = appRes.rows[0]
    if (!app) {
      throw new AppError('Application not found matching the provided reference and email.', 404)
    }

    if (app.status !== 'CLARIFICATION_REQUIRED') {
      throw new AppError(`Clarification is not currently requested for this application (status: ${app.status}).`, 400)
    }

    const updateRes = await client.query(
      `UPDATE editorial_applications
       SET clarification_response = $1,
           clarification_responded_at = now(),
           status = 'UNDER_REVIEW',
           updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [cleanResponse, app.id]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'editorial_clarification_responded', 'editorial_application', $2, $3, $4, $5)`,
      [
        app.user_id || null,
        app.id,
        JSON.stringify({
          application_number: app.application_number,
          response_length: cleanResponse.length,
        }),
        ip || null,
        userAgent || null,
      ]
    )

    await client.query('COMMIT')

    return {
      success: true,
      status: 'UNDER_REVIEW',
      message: 'Your response has been submitted to the editorial administration team.',
      updated_at: updateRes.rows[0].updated_at,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getPublicEditorialBoard() {
  const result = await pool.query(`
    SELECT id, editor_id, name, academic_title, designation, department, institution,
           country, role_title, editorial_section, research_areas,
           profile_image_url, orcid, google_scholar, scopus, wos,
           profile_link, display_order, created_at
    FROM editorial_members
    WHERE is_published = true
    ORDER BY display_order ASC, created_at ASC
  `)

  return result.rows
}

// ─── ADMIN SERVICE METHODS ──────────────────────────────────────────────────

export async function getAdminApplications(filters = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    country,
    section,
    role,
    sort_by = 'created_at',
    order = 'DESC',
  } = filters

  let query = `
    SELECT ea.id, ea.application_number, COALESCE(ea.editor_id, u.editor_id) AS editor_id, ea.email, ea.full_name, ea.academic_title,
           ea.designation, ea.department, ea.institution, ea.country, ea.phone,
           ea.profile_image_url, ea.orcid_id, ea.google_scholar_h_index,
           ea.highest_qualification, ea.specialization, ea.primary_research_area,
           ea.preferred_editorial_section, ea.preferred_role, ea.status,
           ea.verification_status, ea.cv_file_url, ea.cv_file_name,
           ea.created_at, ea.updated_at, ea.reviewed_at,
           u.id AS existing_user_id, u.is_email_verified AS user_email_verified,
           u.editor_id AS user_editor_id,
           rg.status AS role_grant_status, rg.token_expires_at AS role_grant_expires_at
    FROM editorial_applications ea
    LEFT JOIN users u ON u.email = ea.email
    LEFT JOIN editorial_role_grants rg ON rg.application_id = ea.id AND rg.status = 'PENDING'
    WHERE 1=1
  `
  const params = []
  let paramIdx = 1

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`
    query += ` AND (
      ea.full_name ILIKE $${paramIdx} OR
      ea.email ILIKE $${paramIdx} OR
      ea.application_number ILIKE $${paramIdx} OR
      ea.editor_id ILIKE $${paramIdx} OR
      u.editor_id ILIKE $${paramIdx} OR
      ea.institution ILIKE $${paramIdx} OR
      ea.country ILIKE $${paramIdx} OR
      ea.primary_research_area ILIKE $${paramIdx}
    )`
    params.push(term)
    paramIdx++
  }

  if (status && String(status).trim() && status !== 'ALL') {
    query += ` AND ea.status = $${paramIdx}`
    params.push(String(status).trim())
    paramIdx++
  }

  if (country && String(country).trim()) {
    query += ` AND ea.country ILIKE $${paramIdx}`
    params.push(String(country).trim())
    paramIdx++
  }

  if (section && String(section).trim()) {
    query += ` AND ea.preferred_editorial_section ILIKE $${paramIdx}`
    params.push(String(section).trim())
    paramIdx++
  }

  if (role && String(role).trim()) {
    query += ` AND ea.preferred_role ILIKE $${paramIdx}`
    params.push(String(role).trim())
    paramIdx++
  }

  const allowedSorts = ['created_at', 'updated_at', 'full_name', 'application_number', 'status']
  const sortColumn = allowedSorts.includes(sort_by) ? `ea.${sort_by}` : 'ea.created_at'
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  query += ` ORDER BY ${sortColumn} ${sortOrder}`
  query += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`
  params.push(parseInt(limit, 10) || 20, ((parseInt(page, 10) || 1) - 1) * (parseInt(limit, 10) || 20))

  const result = await pool.query(query, params)

  // Count metrics query
  const metricsResult = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted,
      COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') AS under_review,
      COUNT(*) FILTER (WHERE status = 'VERIFICATION') AS verification,
      COUNT(*) FILTER (WHERE status = 'CLARIFICATION_REQUIRED') AS clarification_required,
      COUNT(*) FILTER (WHERE status IN ('APPROVED', 'APPOINTMENT_ISSUED', 'ACTIVE_MEMBER')) AS approved,
      COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
      COUNT(*) FILTER (WHERE status = 'HOLD') AS hold
    FROM editorial_applications
  `)

  const m = metricsResult.rows[0] || {}

  // Filtered count query
  let countQuery = `
    SELECT COUNT(*) as filtered_total
    FROM editorial_applications ea
    LEFT JOIN users u ON u.email = ea.email
    WHERE 1=1
  `
  const countParams = []
  let cIdx = 1

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`
    countQuery += ` AND (
      ea.full_name ILIKE $${cIdx} OR
      ea.email ILIKE $${cIdx} OR
      ea.application_number ILIKE $${cIdx} OR
      ea.editor_id ILIKE $${cIdx} OR
      u.editor_id ILIKE $${cIdx} OR
      ea.institution ILIKE $${cIdx} OR
      ea.country ILIKE $${cIdx} OR
      ea.primary_research_area ILIKE $${cIdx}
    )`
    countParams.push(term)
    cIdx++
  }
  if (status && String(status).trim() && status !== 'ALL') {
    countQuery += ` AND ea.status = $${cIdx}`
    countParams.push(String(status).trim())
    cIdx++
  }
  if (country && String(country).trim()) {
    countQuery += ` AND ea.country ILIKE $${cIdx}`
    countParams.push(String(country).trim())
    cIdx++
  }
  if (section && String(section).trim()) {
    countQuery += ` AND ea.preferred_editorial_section ILIKE $${cIdx}`
    countParams.push(String(section).trim())
    cIdx++
  }
  if (role && String(role).trim()) {
    countQuery += ` AND ea.preferred_role ILIKE $${cIdx}`
    countParams.push(String(role).trim())
    cIdx++
  }

  const countResult = await pool.query(countQuery, countParams)
  const filteredTotal = parseInt(countResult.rows[0]?.filtered_total || 0, 10)

  return {
    applications: result.rows,
    metrics: {
      total: parseInt(m.total || 0, 10),
      submitted: parseInt(m.submitted || 0, 10),
      under_review: parseInt(m.under_review || 0, 10),
      verification: parseInt(m.verification || 0, 10),
      clarification_required: parseInt(m.clarification_required || 0, 10),
      approved: parseInt(m.approved || 0, 10),
      rejected: parseInt(m.rejected || 0, 10),
      hold: parseInt(m.hold || 0, 10),
    },
    pagination: {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      total: filteredTotal,
      pages: Math.ceil(filteredTotal / (parseInt(limit, 10) || 20)),
    },
  }
}

export async function getAdminApplicationDetail(id) {
  const result = await pool.query(
    `SELECT ea.*,
            COALESCE(ea.editor_id, u.editor_id, em.editor_id) AS editor_id,
            u.id AS existing_user_id, u.display_name AS user_display_name,
            u.is_email_verified AS user_email_verified, u.account_status AS user_account_status,
            u.role_id AS user_role_id, u.editor_id AS user_editor_id,
            reviewer.display_name AS reviewer_name,
            rg.id AS role_grant_id, rg.status AS role_grant_status,
            rg.token_expires_at AS role_grant_expires_at, rg.granted_at AS role_grant_granted_at,
            rg.used_at AS role_grant_used_at,
            ap.id AS appointment_id, ap.status AS appointment_status,
            ap.position AS appointment_position, ap.section AS appointment_section,
            ap.appointment_date, ap.term_start_date, ap.term_end_date,
            em.id AS editorial_member_id, em.editor_id AS member_editor_id, em.is_published AS member_is_published,
            em.display_order AS member_display_order
     FROM editorial_applications ea
     LEFT JOIN users u ON u.email = ea.email
     LEFT JOIN users reviewer ON reviewer.id = ea.reviewed_by
     LEFT JOIN editorial_role_grants rg ON rg.application_id = ea.id AND rg.status = 'PENDING'
     LEFT JOIN editorial_appointments ap ON ap.application_id = ea.id
     LEFT JOIN editorial_members em ON em.application_id = ea.id
     WHERE ea.id = $1`,
    [id]
  )

  const app = result.rows[0]
  if (!app) throw new AppError('Application not found', 404)

  // Fetch Audit Logs for this application
  const auditResult = await pool.query(
    `SELECT al.*, u.display_name AS actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     WHERE al.entity_id = $1 AND al.entity_type = 'editorial_application'
     ORDER BY al.created_at DESC`,
    [id]
  )

  return {
    ...app,
    audit_logs: auditResult.rows,
  }
}

export async function updateApplicationVerification(id, { verification_status, verification_notes, admin_remarks }, adminUserId, ip, userAgent) {
  const current = await pool.query('SELECT * FROM editorial_applications WHERE id = $1', [id])
  if (current.rows.length === 0) throw new AppError('Application not found', 404)

  const app = current.rows[0]
  const newVerification = verification_status ? JSON.stringify(verification_status) : app.verification_status

  const updateRes = await pool.query(
    `UPDATE editorial_applications
     SET verification_status = $1,
         verification_notes = COALESCE($2, verification_notes),
         admin_remarks = COALESCE($3, admin_remarks),
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [newVerification, verification_notes || null, admin_remarks || null, id]
  )

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, 'editorial_verification_updated', 'editorial_application', $2, $3, $4, $5, $6)`,
    [
      adminUserId,
      id,
      JSON.stringify({ verification_status: app.verification_status, notes: app.verification_notes }),
      JSON.stringify({ verification_status, notes: verification_notes, admin_remarks }),
      ip || null,
      userAgent || null,
    ]
  )

  return updateRes.rows[0]
}

export async function requestClarification(id, { message }, adminUserId, ip, userAgent) {
  const cleanMessage = String(message || '').trim()
  if (!cleanMessage) throw new AppError('Clarification message is required.', 400)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const appRes = await client.query('SELECT * FROM editorial_applications WHERE id = $1', [id])
    if (appRes.rows.length === 0) throw new AppError('Application not found', 404)
    const app = appRes.rows[0]

    if (app.status === 'APPROVED' || app.status === 'ACTIVE_MEMBER') {
      throw new AppError('Accepted editorial board members cannot have clarification requested.', 400)
    }

    const updateRes = await client.query(
      `UPDATE editorial_applications
       SET status = 'CLARIFICATION_REQUIRED',
           clarification_request = $1,
           clarification_requested_at = now(),
           updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [cleanMessage, id]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'editorial_clarification_requested', 'editorial_application', $2, $3, $4, $5)`,
      [
        adminUserId,
        id,
        JSON.stringify({ clarification_request: cleanMessage }),
        ip || null,
        userAgent || null,
      ]
    )

    await client.query('COMMIT')

    const responseUrl = buildAppUrl('/editorial-board/status', { ref: app.application_number })
    sendEditorialApplicationClarificationEmail({
      to: app.email,
      applicantName: app.full_name,
      applicationNumber: app.application_number,
      clarificationRequest: cleanMessage,
      responseUrl,
    }).catch(err => console.error('[EMAIL] Failed to send clarification request:', err.message))

    return updateRes.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateApplicationStatus(id, newStatus, adminUserId, remarks, ip, userAgent) {
  const allowed = ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION', 'HOLD']
  if (!allowed.includes(newStatus)) {
    throw new AppError(`Invalid status change: ${newStatus}`, 400)
  }

  const current = await pool.query('SELECT * FROM editorial_applications WHERE id = $1', [id])
  if (current.rows.length === 0) throw new AppError('Application not found', 404)
  const app = current.rows[0]

  if (['APPROVED', 'ACTIVE_MEMBER'].includes(app.status)) {
    throw new AppError('Accepted editorial board members cannot have their status modified.', 400)
  }

  const updateRes = await pool.query(
    `UPDATE editorial_applications
     SET status = $1,
         admin_remarks = COALESCE($2, admin_remarks),
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [newStatus, remarks || null, id]
  )

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, 'editorial_status_changed', 'editorial_application', $2, $3, $4, $5, $6)`,
    [
      adminUserId,
      id,
      JSON.stringify({ status: app.status }),
      JSON.stringify({ status: newStatus, remarks }),
      ip || null,
      userAgent || null,
    ]
  )

  return updateRes.rows[0]
}

export async function approveApplication(id, approvalData = {}, adminUserId, ip, userAgent) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const appRes = await client.query('SELECT * FROM editorial_applications WHERE id = $1 FOR UPDATE', [id])
    if (appRes.rows.length === 0) throw new AppError('Application not found', 404)
    const app = appRes.rows[0]

    if (app.status === 'APPROVED' || app.status === 'ACTIVE_MEMBER') {
      throw new AppError('This application has already been approved.', 400)
    }

    const position = approvalData.position || app.preferred_role || 'Editorial Board Member'
    const section = approvalData.section || app.preferred_editorial_section || 'General'
    const appointmentDate = approvalData.appointment_date || new Date().toISOString().split('T')[0]
    const termStartDate = approvalData.term_start_date || appointmentDate
    const termEndDate = approvalData.term_end_date || null
    const isPublished = approvalData.is_published ?? true

    // Check if user account already exists by normalized email
    const userRes = await client.query('SELECT * FROM users WHERE email = $1', [app.email])
    const existingUser = userRes.rows[0]

    // Resolve or generate unique Editor ID (e.g. AIRJ0001)
    const editorId = existingUser?.editor_id || app.editor_id || await generateEditorId(client)

    // Find editor role ID
    const editorRoleRes = await client.query("SELECT id FROM roles WHERE name = 'editor'")
    const editorRoleId = editorRoleRes.rows[0]?.id

    let userId = null
    let roleGrantId = null
    let invitationToken = null

    if (existingUser) {
      userId = existingUser.id

      // 1. Promote user to editor and sync profile details
      if (editorRoleId) {
        const nameParts = parseNameParts(app.full_name, app.academic_title)
        const inst = app.institution || app.university || 'Academic Institution'
        const dept = app.department || 'Academic Department'
        const ctry = app.country || 'International'
        const stateVal = app.country || 'N/A'
        const courseVal = app.specialization || app.highest_qualification || 'Editorial Member'
        const bioVal = app.statement_of_interest || [app.designation, app.department, app.institution].filter(Boolean).join(', ') || null

        await client.query(
          `UPDATE users
           SET role_id = $1,
               editor_id = COALESCE(editor_id, $2),
               first_name = COALESCE(NULLIF(first_name, ''), $3),
               last_name = COALESCE(NULLIF(last_name, ''), $4),
               display_name = COALESCE(NULLIF(display_name, ''), $5),
               phone = COALESCE(NULLIF(phone, ''), $6),
               institution = COALESCE(NULLIF(institution, ''), $7),
               college = COALESCE(NULLIF(college, ''), $8),
               department = COALESCE(NULLIF(department, ''), $9),
               state = COALESCE(NULLIF(state, ''), $10),
               country = COALESCE(NULLIF(country, ''), $11),
               course = COALESCE(NULLIF(course, ''), $12),
               bio = COALESCE(NULLIF(bio, ''), $13),
               orcid_id = COALESCE(NULLIF(orcid_id, ''), $14),
               profile_image_url = COALESCE(profile_image_url, $15),
               updated_at = now()
           WHERE id = $16`,
          [
            editorRoleId,
            editorId,
            nameParts.firstName,
            nameParts.lastName,
            app.full_name || nameParts.displayName,
            app.phone || null,
            inst,
            inst,
            dept,
            stateVal,
            ctry,
            courseVal,
            bioVal,
            app.orcid_id || null,
            app.profile_image_url || null,
            userId,
          ]
        )

        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [userId, editorRoleId]
        )
      }

      // Mark application as ACTIVE_MEMBER (or APPROVED)
      await client.query(
        `UPDATE editorial_applications
         SET status = 'APPROVED',
             editor_id = COALESCE(editor_id, $1),
             user_id = $2,
             reviewed_by = $3,
             reviewed_at = now(),
             decision_reason = $4,
             updated_at = now()
         WHERE id = $5`,
        [editorId, userId, adminUserId, approvalData.notes || 'Application approved by editorial administration.', id]
      )

      await client.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
         VALUES ($1, 'user_promoted_to_editor', 'users', $2, $3, $4, $5)`,
        [
          adminUserId,
          userId,
          JSON.stringify({ previous_role: existingUser.role_id, new_role: 'editor', application_id: id, editor_id: editorId }),
          ip || null,
          userAgent || null,
        ]
      )
    } else {
      // User does not exist -> create editorial_role_grants
      invitationToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(invitationToken)
      const tokenExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days

      // Invalidate any prior pending grants for this application
      await client.query(
        `UPDATE editorial_role_grants SET status = 'REVOKED', updated_at = now() WHERE application_id = $1 AND status = 'PENDING'`,
        [id]
      )

      const grantRes = await client.query(
        `INSERT INTO editorial_role_grants (application_id, email, role, status, invitation_token_hash, token_expires_at)
         VALUES ($1, $2, 'editor', 'PENDING', $3, $4)
         RETURNING id`,
        [id, app.email, tokenHash, tokenExpiresAt]
      )
      roleGrantId = grantRes.rows[0].id

      await client.query(
        `UPDATE editorial_applications
         SET status = 'APPROVED',
             editor_id = COALESCE(editor_id, $1),
             reviewed_by = $2,
             reviewed_at = now(),
             decision_reason = $3,
             updated_at = now()
         WHERE id = $4`,
        [editorId, adminUserId, approvalData.notes || 'Application approved. Invitation sent to create editor account.', id]
      )

      await client.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
         VALUES ($1, 'editorial_role_grant_created', 'editorial_role_grants', $2, $3, $4, $5)`,
        [
          adminUserId,
          roleGrantId,
          JSON.stringify({ application_id: id, email: app.email, expires_at: tokenExpiresAt, editor_id: editorId }),
          ip || null,
          userAgent || null,
        ]
      )
    }

    // 2. Create / update appointment
    const appointmentRes = await client.query(
      `INSERT INTO editorial_appointments (
         application_id, user_id, editor_id, position, section, appointment_date, term_start_date, term_end_date, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
       RETURNING id`,
      [id, userId, editorId, position, section, appointmentDate, termStartDate, termEndDate]
    )
    const appointmentId = appointmentRes.rows[0].id

    // 3. Create / update public editorial_members profile
    await client.query(
      `INSERT INTO editorial_members (
         user_id, appointment_id, application_id, editor_id, name, academic_title,
         designation, department, institution, country, role_title,
         editorial_section, research_areas, profile_image_url,
         profile_image_public_id, orcid, google_scholar, scopus, wos,
         display_order, is_published
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13,
         $14, $15, $16, $17, $18,
         $19, $20, $21
       )`,
      [
        userId,
        appointmentId,
        id,
        editorId,
        app.full_name,
        app.academic_title,
        app.designation,
        app.department,
        app.institution,
        app.country,
        position,
        section,
        app.research_keywords || [],
        app.profile_image_url,
        app.profile_image_public_id,
        app.orcid_id,
        app.google_scholar_url,
        app.scopus_url || app.scopus_id,
        app.wos_profile_url || app.wos_researcher_id,
        approvalData.display_order || 0,
        isPublished,
      ]
    )

    // Audit approval action
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'editorial_application_approved', 'editorial_application', $2, $3, $4, $5)`,
      [
        adminUserId,
        id,
        JSON.stringify({
          position,
          section,
          user_exists: Boolean(existingUser),
          user_id: userId,
          role_grant_id: roleGrantId,
          editor_id: editorId,
        }),
        ip || null,
        userAgent || null,
      ]
    )

    await client.query('COMMIT')

    // Send emails
    if (existingUser) {
      sendEditorialApplicationApprovedEmail({
        to: app.email,
        applicantName: app.full_name,
        applicationNumber: app.application_number,
        position,
        section,
        appointmentDate,
        termStartDate,
        loginUrl: buildAppUrl('/login'),
      }).catch(err => console.error('[EMAIL] Failed to send approval notification:', err.message))
    } else if (invitationToken) {
      const invitationUrl = buildAppUrl('/register', { invitation: invitationToken, email: app.email })
      sendEditorialRoleInvitationEmail({
        to: app.email,
        applicantName: app.full_name,
        applicationNumber: app.application_number,
        position,
        section,
        invitationUrl,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        approvedEmail: app.email,
      }).catch(err => console.error('[EMAIL] Failed to send role invitation:', err.message))
    }

    return {
      success: true,
      message: existingUser
        ? 'Application approved and existing user account promoted to Editor.'
        : 'Application approved. Single-use invitation link sent to applicant email.',
      user_exists: Boolean(existingUser),
      user_id: userId,
      role_grant_id: roleGrantId,
      editor_id: editorId,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function rejectApplication(id, { reason, admin_remarks }, adminUserId, ip, userAgent) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const appRes = await client.query('SELECT * FROM editorial_applications WHERE id = $1 FOR UPDATE', [id])
    if (appRes.rows.length === 0) throw new AppError('Application not found', 404)
    const app = appRes.rows[0]

    if (app.status === 'APPROVED' || app.status === 'ACTIVE_MEMBER') {
      throw new AppError('Accepted editorial board members cannot be rejected.', 400)
    }

    const updateRes = await client.query(
      `UPDATE editorial_applications
       SET status = 'REJECTED',
           decision_reason = $1,
           admin_remarks = COALESCE($2, admin_remarks),
           reviewed_by = $3,
           reviewed_at = now(),
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [reason || 'Application does not meet current board criteria.', admin_remarks || null, adminUserId, id]
    )

    // Revoke any pending role grants
    await client.query(
      `UPDATE editorial_role_grants SET status = 'REVOKED', updated_at = now() WHERE application_id = $1 AND status = 'PENDING'`,
      [id]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'editorial_application_rejected', 'editorial_application', $2, $3, $4, $5)`,
      [
        adminUserId,
        id,
        JSON.stringify({ decision_reason: reason, admin_remarks }),
        ip || null,
        userAgent || null,
      ]
    )

    await client.query('COMMIT')

    sendEditorialApplicationRejectedEmail({
      to: app.email,
      applicantName: app.full_name,
      applicationNumber: app.application_number,
      decisionReason: reason,
    }).catch(err => console.error('[EMAIL] Failed to send rejection email:', err.message))

    return updateRes.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function resendRoleInvitation(id, adminUserId, ip, userAgent) {
  const grantRes = await pool.query(
    `SELECT rg.*, ea.full_name, ea.application_number, ea.preferred_role, ea.preferred_editorial_section
     FROM editorial_role_grants rg
     JOIN editorial_applications ea ON ea.id = rg.application_id
     WHERE rg.application_id = $1 AND rg.status = 'PENDING'
     ORDER BY rg.granted_at DESC LIMIT 1`,
    [id]
  )

  const grant = grantRes.rows[0]
  if (!grant) throw new AppError('No pending invitation grant found for this application.', 404)

  // Generate fresh token
  const newToken = crypto.randomBytes(32).toString('hex')
  const newTokenHash = hashToken(newToken)
  const newExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  await pool.query(
    `UPDATE editorial_role_grants
     SET invitation_token_hash = $1,
         token_expires_at = $2,
         updated_at = now()
     WHERE id = $3`,
    [newTokenHash, newExpiresAt, grant.id]
  )

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
     VALUES ($1, 'editorial_invitation_resent', 'editorial_role_grants', $2, $3, $4, $5)`,
    [
      adminUserId,
      grant.id,
      JSON.stringify({ application_id: id, email: grant.email }),
      ip || null,
      userAgent || null,
    ]
  )

  const invitationUrl = buildAppUrl('/register', { invitation: newToken, email: grant.email })
  await sendEditorialRoleInvitationEmail({
    to: grant.email,
    applicantName: grant.full_name,
    applicationNumber: grant.application_number,
    position: grant.preferred_role,
    section: grant.preferred_editorial_section,
    invitationUrl,
    expiresAt: newExpiresAt,
    approvedEmail: grant.email,
  })

  return { success: true, message: 'Invitation email resent successfully.' }
}

export async function listAllEditorialMembers() {
  const result = await pool.query(`
    SELECT em.*, ea.application_number, COALESCE(em.editor_id, u.editor_id, ea.editor_id) AS editor_id, u.email AS user_email, u.display_name AS user_name
    FROM editorial_members em
    LEFT JOIN editorial_applications ea ON ea.id = em.application_id
    LEFT JOIN users u ON u.id = em.user_id
    ORDER BY em.display_order ASC, em.created_at ASC
  `)
  return result.rows
}

export async function updateEditorialMember(memberId, updateData, adminUserId, ip, userAgent) {
  const current = await pool.query('SELECT * FROM editorial_members WHERE id = $1', [memberId])
  if (current.rows.length === 0) throw new AppError('Editorial member not found', 404)

  const allowedFields = [
    'name', 'academic_title', 'designation', 'department', 'institution',
    'country', 'role_title', 'editorial_section', 'research_areas',
    'profile_image_url', 'orcid', 'google_scholar', 'scopus', 'wos',
    'profile_link', 'display_order', 'is_published', 'editor_id',
  ]

  const sets = []
  const params = []
  let pIdx = 1

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sets.push(`${field} = $${pIdx++}`)
      params.push(updateData[field])
    }
  }

  if (sets.length === 0) return current.rows[0]

  sets.push(`updated_at = now()`)
  params.push(memberId)

  const query = `UPDATE editorial_members SET ${sets.join(', ')} WHERE id = $${pIdx} RETURNING *`
  const result = await pool.query(query, params)

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
     VALUES ($1, 'editorial_member_updated', 'editorial_members', $2, $3, $4, $5)`,
    [
      adminUserId,
      memberId,
      JSON.stringify(updateData),
      ip || null,
      userAgent || null,
    ]
  )

  return result.rows[0]
}

export async function deleteEditorialMember(memberId, adminUserId, ip, userAgent) {
  const current = await pool.query('SELECT * FROM editorial_members WHERE id = $1', [memberId])
  if (current.rows.length === 0) throw new AppError('Editorial member not found', 404)

  await pool.query('DELETE FROM editorial_members WHERE id = $1', [memberId])

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, ip_address, user_agent)
     VALUES ($1, 'editorial_member_deleted', 'editorial_members', $2, $3, $4, $5)`,
    [
      adminUserId,
      memberId,
      JSON.stringify(current.rows[0]),
      ip || null,
      userAgent || null,
    ]
  )

  return { success: true }
}
