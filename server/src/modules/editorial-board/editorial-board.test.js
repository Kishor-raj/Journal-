import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateApplicationInput,
  normalizeEmail,
  generateApplicationNumber,
  submitApplication,
  getApplicationStatus,
  submitClarificationResponse,
  approveApplication,
  rejectApplication,
  getPublicEditorialBoard,
} from './editorial-board.service.js'
import { validateInvitationToken, syncUserProfileFromEditorialApplication, parseNameParts } from '../auth/auth.service.js'
import pool from '../../config/db.js'
import { hashToken } from '../email/email.utils.js'

vi.mock('../../config/db.js', () => {
  const mockPool = {
    query: vi.fn(),
    connect: vi.fn(),
  }
  return { default: mockPool }
})

vi.mock('../email/email.templates.js', () => ({
  sendEditorialApplicationReceivedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEditorialApplicationAdminAlertEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEditorialApplicationClarificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEditorialApplicationApprovedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEditorialRoleInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEditorialApplicationRejectedEmail: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Editorial Board Application Validation', () => {
  const validPayload = {
    full_name: 'Dr. Jane Smith',
    academic_title: 'Dr.',
    designation: 'Associate Professor',
    department: 'Computer Science and Engineering',
    institution: 'Stanford University',
    country: 'United States',
    email: 'jane.smith@stanford.edu',
    phone: '+1 650 123 4567',
    highest_qualification: 'Ph.D. / Doctorate',
    specialization: 'Artificial Intelligence & Machine Learning',
    university: 'MIT',
    year_of_completion: 2018,
    phd_title: 'Deep Learning for Multimodal Reasoning',
    primary_research_area: 'Artificial Intelligence',
    secondary_research_areas: ['Natural Language Processing', 'Computer Vision'],
    research_keywords: ['Neural Networks', 'Transformer Models', 'Explainable AI', 'Few-shot Learning', 'Multimodal Systems'],
    preferred_editorial_section: 'Artificial Intelligence',
    total_journal_publications: 18,
    total_conference_publications: 25,
    book_chapters_count: 3,
    patents_count: 1,
    google_scholar_url: 'https://scholar.google.com/citations?user=xyz123',
    google_scholar_h_index: 12,
    orcid_id: '0000-0002-1825-0097',
    preferred_role: 'National Editorial Board',
    review_capacity: '3–5 manuscripts/month',
    preferred_review_period: '14 days',
    availability: 'Available',
    cv_file_url: 'https://res.cloudinary.com/journal/raw/upload/v1/editorial-board/cv/jane_cv.pdf',
    cv_file_name: 'Jane_Smith_CV.pdf',
    statement_of_interest: 'Eager to support high quality open access publishing in digital computing.',
    contribution_statement: 'Can review 4 papers monthly in computer vision and machine learning.',
    declaration_confidentiality: true,
    declaration_conflict_of_interest: true,
    declaration_ethics: true,
    declaration_accuracy: true,
    declaration_editorial_policy: true,
  }

  it('accepts a fully valid application payload', () => {
    const result = validateApplicationInput(validPayload)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
    expect(result.data.email).toBe('jane.smith@stanford.edu')
    expect(result.data.full_name).toBe('Dr. Jane Smith')
    expect(result.data.research_keywords.length).toBe(5)
  })

  it('normalizes email to lowercase and trims whitespace', () => {
    expect(normalizeEmail('  Jane.Smith@Stanford.EDU  ')).toBe('jane.smith@stanford.edu')
  })

  it('rejects an application with missing required personal and academic fields', () => {
    const result = validateApplicationInput({})
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Full name is required.')
    expect(result.errors.join(' ')).toContain('Email address is required.')
    expect(result.errors.join(' ')).toContain('Designation is required.')
    expect(result.errors.join(' ')).toContain('Department is required.')
    expect(result.errors.join(' ')).toContain('Institution / University is required.')
    expect(result.errors.join(' ')).toContain('Country is required.')
    expect(result.errors.join(' ')).toContain('Highest qualification is required.')
    expect(result.errors.join(' ')).toContain('Primary research area is required.')
    expect(result.errors.join(' ')).toContain('Updated Academic CV (PDF) is required.')
    expect(result.errors.join(' ')).toContain('All ethics and compliance declarations must be confirmed')
  })

  it('rejects an invalid email format', () => {
    const result = validateApplicationInput({ ...validPayload, email: 'not-an-email' })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('valid email address')
  })

  it('rejects an invalid ORCID ID', () => {
    const result = validateApplicationInput({ ...validPayload, orcid_id: 'invalid-orcid-123' })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('ORCID iD format is invalid')
  })

  it('rejects an invalid Year of Completion', () => {
    const result = validateApplicationInput({ ...validPayload, year_of_completion: 1920 })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Year of completion must be a valid year')
  })

  it('rejects when less than 3 research keywords are provided', () => {
    const result = validateApplicationInput({ ...validPayload, research_keywords: ['AI'] })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('at least 3 research keywords')
  })

  it('rejects when any mandatory declaration checkbox is false', () => {
    const result = validateApplicationInput({
      ...validPayload,
      declaration_confidentiality: false,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('declarations must be confirmed')
  })
})

describe('Editorial Board Application Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generateApplicationNumber formats sequential year reference', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '5' }] }) // count
      .mockResolvedValueOnce({ rows: [] }) // uniqueness check

    const appNum = await generateApplicationNumber()
    const year = new Date().getFullYear()
    expect(appNum).toBe(`EB-${year}-0006`)
  })

  it('submitApplication checks for active duplicate application and creates record', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }
    pool.connect.mockResolvedValueOnce(mockClient)

    // Check duplicate: none
    pool.query.mockResolvedValueOnce({ rows: [] })
    // Application number count & uniqueness
    pool.query.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    pool.query.mockResolvedValueOnce({ rows: [] })

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // user lookup by email
      .mockResolvedValueOnce({ rows: [{ id: 'app-uuid-1', application_number: 'EB-2026-0001' }] }) // insert application
      .mockResolvedValueOnce({}) // insert audit log
      .mockResolvedValueOnce({}) // COMMIT

    const validPayload = {
      full_name: 'Dr. Jane Smith',
      designation: 'Professor',
      department: 'Computer Science',
      institution: 'Stanford University',
      country: 'United States',
      email: 'jane@stanford.edu',
      highest_qualification: 'Ph.D.',
      specialization: 'AI',
      university: 'MIT',
      year_of_completion: 2018,
      primary_research_area: 'Artificial Intelligence',
      research_keywords: ['AI', 'ML', 'DL'],
      preferred_editorial_section: 'Artificial Intelligence',
      preferred_role: 'National Editorial Board',
      cv_file_url: 'https://cloudinary.com/cv.pdf',
      declaration_confidentiality: true,
      declaration_conflict_of_interest: true,
      declaration_ethics: true,
      declaration_accuracy: true,
      declaration_editorial_policy: true,
    }

    const result = await submitApplication(validPayload, '127.0.0.1', 'Vitest')
    expect(result.success).toBe(true)
    expect(result.status).toBe('SUBMITTED')
    expect(result.application_number).toBeDefined()
  })

  it('getApplicationStatus returns safe fields without leaking internal admin remarks', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'app-1',
          application_number: 'EB-2026-0001',
          full_name: 'Dr. Jane Smith',
          email: 'jane@stanford.edu',
          status: 'UNDER_REVIEW',
          preferred_role: 'National Editorial Board',
          preferred_editorial_section: 'Artificial Intelligence',
          primary_research_area: 'AI',
          clarification_request: null,
          clarification_requested_at: null,
          clarification_response: null,
          clarification_responded_at: null,
          decision_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    })

    const status = await getApplicationStatus('EB-2026-0001', 'jane@stanford.edu')
    expect(status.application_number).toBe('EB-2026-0001')
    expect(status.status).toBe('UNDER_REVIEW')
    expect(status.admin_remarks).toBeUndefined()
  })

  it('approveApplication promotes existing account to editor role', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }
    pool.connect.mockResolvedValueOnce(mockClient)

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 'app-1',
          email: 'jane@stanford.edu',
          full_name: 'Dr. Jane Smith',
          preferred_role: 'National Editorial Board',
          preferred_editorial_section: 'Artificial Intelligence',
          status: 'UNDER_REVIEW',
        }],
      }) // SELECT application
      .mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'jane@stanford.edu', role_id: 'author-role-id' }] }) // SELECT user
      .mockResolvedValueOnce({ rows: [{ id: 'editor-role-id' }] }) // SELECT editor role
      .mockResolvedValueOnce({}) // UPDATE users SET role_id = editor
      .mockResolvedValueOnce({}) // INSERT user_roles
      .mockResolvedValueOnce({}) // UPDATE editorial_applications
      .mockResolvedValueOnce({}) // INSERT audit log user promoted
      .mockResolvedValueOnce({ rows: [{ id: 'appointment-1' }] }) // INSERT editorial_appointments
      .mockResolvedValueOnce({}) // INSERT editorial_members
      .mockResolvedValueOnce({}) // INSERT audit log approved
      .mockResolvedValueOnce({}) // COMMIT

    const result = await approveApplication('app-1', { position: 'National Editorial Board' }, 'admin-uuid', '127.0.0.1', 'Vitest')
    expect(result.success).toBe(true)
    expect(result.user_exists).toBe(true)
    expect(result.user_id).toBe('user-123')
  })

  it('approveApplication generates role grant for applicant without account', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }
    pool.connect.mockResolvedValueOnce(mockClient)

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 'app-2',
          email: 'newapplicant@oxford.edu',
          full_name: 'Dr. John Doe',
          preferred_role: 'Editorial Board Member',
          preferred_editorial_section: 'Data Science',
          status: 'UNDER_REVIEW',
        }],
      }) // SELECT application
      .mockResolvedValueOnce({ rows: [] }) // SELECT user (none exists)
      .mockResolvedValueOnce({ rows: [{ id: 'editor-role-id' }] }) // SELECT editor role
      .mockResolvedValueOnce({}) // UPDATE old role grants to REVOKED
      .mockResolvedValueOnce({ rows: [{ id: 'grant-123' }] }) // INSERT editorial_role_grants
      .mockResolvedValueOnce({}) // UPDATE editorial_applications
      .mockResolvedValueOnce({}) // INSERT audit log role grant
      .mockResolvedValueOnce({ rows: [{ id: 'appointment-2' }] }) // INSERT editorial_appointments
      .mockResolvedValueOnce({}) // INSERT editorial_members
      .mockResolvedValueOnce({}) // INSERT audit log approved
      .mockResolvedValueOnce({}) // COMMIT

    const result = await approveApplication('app-2', { position: 'Editorial Board Member' }, 'admin-uuid', '127.0.0.1', 'Vitest')
    expect(result.success).toBe(true)
    expect(result.user_exists).toBe(false)
    expect(result.role_grant_id).toBe('grant-123')
  })

  it('validateInvitationToken correctly validates active pending token', async () => {
    const rawToken = 'test-token-12345'
    const tokenHash = hashToken(rawToken)

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'grant-1',
          email: 'editor@example.com',
          role: 'editor',
          status: 'PENDING',
          token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          full_name: 'Dr. Alice',
          preferred_role: 'Editor',
          preferred_editorial_section: 'Cyber Security',
        },
      ],
    })

    const result = await validateInvitationToken(rawToken)
    expect(result.valid).toBe(true)
    expect(result.email).toBe('editor@example.com')
    expect(result.role).toBe('editor')
  })

  it('validateInvitationToken rejects expired or used token', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'grant-1',
          email: 'editor@example.com',
          status: 'USED',
        },
      ],
    })

    const result = await validateInvitationToken('used-token')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('already been used')
  })

  it('parseNameParts splits academic title and names properly', () => {
    const p1 = parseNameParts('Dr. Jane Doe', 'Dr.')
    expect(p1.firstName).toBe('Jane')
    expect(p1.lastName).toBe('Doe')
    expect(p1.displayName).toBe('Dr. Jane Doe')

    const p2 = parseNameParts('Prof. Dr. Dinesh Senduraja')
    expect(p2.firstName).toBe('Dinesh')
    expect(p2.lastName).toBe('Senduraja')
  })

  it('syncUserProfileFromEditorialApplication syncs application fields to users record', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'app-99',
            full_name: 'Dr. Robert Oppenheimer',
            academic_title: 'Dr.',
            institution: 'Institute for Advanced Study',
            department: 'Physics',
            country: 'United States',
            phone: '+1-555-0199',
            specialization: 'Theoretical Physics',
            orcid_id: '0000-0002-1825-0097',
            profile_image_url: 'https://cloudinary.com/photo.jpg',
            statement_of_interest: 'Quantum mechanics researcher.',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE users
      .mockResolvedValueOnce({ rows: [] }) // UPDATE editorial_applications

    const synced = await syncUserProfileFromEditorialApplication(pool, 'user-99', 'oppenheimer@ias.edu')
    expect(synced).toBeDefined()
    expect(synced.institution).toBe('Institute for Advanced Study')
  })

  it('rejectApplication throws an error if application is already approved/accepted', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }
    pool.connect.mockResolvedValueOnce(mockClient)

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 'app-approved-1',
          email: 'editor@example.com',
          status: 'APPROVED',
        }],
      }) // SELECT application
      .mockResolvedValueOnce({}) // ROLLBACK

    await expect(
      rejectApplication('app-approved-1', { reason: 'No longer needed' }, 'admin-1', '127.0.0.1', 'Vitest')
    ).rejects.toThrow('Accepted editorial board members cannot be rejected.')
  })

  it('approveApplication throws an error if application is already approved', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }
    pool.connect.mockResolvedValueOnce(mockClient)

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{
          id: 'app-approved-1',
          email: 'editor@example.com',
          status: 'APPROVED',
        }],
      }) // SELECT application
      .mockResolvedValueOnce({}) // ROLLBACK

    await expect(
      approveApplication('app-approved-1', {}, 'admin-1', '127.0.0.1', 'Vitest')
    ).rejects.toThrow('This application has already been approved.')
  })
})
