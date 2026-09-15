import { describe, it, expect, vi, beforeEach } from 'vitest'
import pool from '../src/config/db.js'
import * as revisionService from '../src/modules/revision/revision.service.js'
import * as reviewerService from '../src/modules/reviewer/reviewer.service.js'
import * as editorialService from '../src/modules/editorial/editorial.service.js'

vi.mock('../src/config/db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

vi.mock('../src/modules/notification/notification.service.js', () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ success: true, log_id: 'log-1' }),
}))

vi.mock('../src/modules/notification/manuscript-notification.service.js', () => ({
  sendEditorialAccepted: vi.fn().mockResolvedValue({ success: true }),
  sendEditorialRejected: vi.fn().mockResolvedValue({ success: true }),
  sendMinorRevisionRequested: vi.fn().mockResolvedValue({ success: true }),
  sendMajorRevisionRequested: vi.fn().mockResolvedValue({ success: true }),
}))

describe('Manuscript Revision Flow — Complete Verification', () => {
  let mockClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    }
    pool.connect.mockResolvedValue(mockClient)
    pool.query.mockReset()
  })

  describe('Author Revision Request & Response', () => {
    it('getRevisionsByUser filters pending vs completed revisions', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 'req-pending-1', manuscript_id: 'm-1', round_number: 2, current_status: 'revision_requested' }
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'req-completed-1', manuscript_id: 'm-1', round_number: 1, current_status: 'resubmitted' }
          ],
        })

      const pending = await revisionService.getRevisionsByUser('author-1', 'pending')
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe('req-pending-1')
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND m.current_status = 'revision_requested'"),
        ['author-1']
      )

      const completed = await revisionService.getRevisionsByUser('author-1', 'completed')
      expect(completed).toHaveLength(1)
      expect(completed[0].id).toBe('req-completed-1')
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE resp.revision_request_id = rr.id AND resp.status = 'submitted'"),
        ['author-1']
      )
    })

    it('getRevisionRequest loads reviews corresponding to the revision round (round_number)', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'req-1',
            manuscript_id: 'm-123',
            submission_number: 'IJIDCR-26-0001',
            title: 'Quantum Computing Advancements',
            submitted_by: 'author-1',
            round_number: 1,
            request_type: 'minor',
            instructions: 'Please clarify section 3.',
            due_at: new Date('2026-10-01'),
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rev-1',
              reviewer_name: 'Dr. Reviewer A',
              public_comments: 'Good paper, but expand section 3.',
              recommendation: 'minor_revision',
              score: { overall: 8 },
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'f-1', original_filename: 'manuscript_v1.pdf', file_size_bytes: 1048576 },
          ],
        })

      const data = await revisionService.getRevisionRequest('req-1', 'author-1')

      expect(data.id).toBe('req-1')
      expect(data.round_number).toBe(1)
      expect(data.reviews).toHaveLength(1)
      expect(data.reviews[0].public_comments).toBe('Good paper, but expand section 3.')
      expect(data.files).toHaveLength(1)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE r.manuscript_id = $1 AND r.round_number = $2'),
        ['m-123', 1]
      )
    })

    it('submitRevisionResponse increments manuscript version, preserves manuscript ID, and sets status to resubmitted', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // SELECT request
          rows: [{
            id: 'req-1',
            manuscript_id: 'm-123',
            current_version_id: 'v-1',
            submitted_by: 'author-1',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // existingResponse check
        .mockResolvedValueOnce({ rows: [{ version_number: 1 }] }) // previousVersion check
        .mockResolvedValueOnce({ rows: [{ id: 'v-2' }] }) // INSERT manuscript_versions
        .mockResolvedValueOnce({}) // UPDATE old version is_current
        .mockResolvedValueOnce({}) // UPDATE manuscripts current_version_id
        .mockResolvedValueOnce({}) // UPDATE file_ids version_id
        .mockResolvedValueOnce({ rows: [{ id: 'resp-1' }] }) // INSERT revision_responses
        .mockResolvedValueOnce({}) // INSERT reviewer_comment_responses
        .mockResolvedValueOnce({}) // UPDATE manuscripts status = 'resubmitted'
        .mockResolvedValueOnce({}) // INSERT status history
        .mockResolvedValueOnce({}) // INSERT user activity
        .mockResolvedValueOnce({}) // COMMIT

      const response = await revisionService.submitRevisionResponse('req-1', 'author-1', {
        cover_letter: 'Addressed all reviewer comments in section 3.',
        response_summary: 'Revised manuscript text and diagrams.',
        reviewer_responses: [
          {
            review_id: 'rev-1',
            author_response: 'Section 3 has been significantly expanded with new proofs.',
          },
        ],
        file_ids: ['f-new-1'],
      })

      expect(response.success).toBe(true)
      expect(response.new_version_id).toBe('v-2')
      expect(response.revision_response_id).toBe('resp-1')

      // Verify status changed to resubmitted
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE manuscripts SET current_status = 'resubmitted'"),
        ['m-123']
      )
    })
  })

  describe('Reviewer Multi-Round Capabilities', () => {
    it('Reviewer who reviewed Round 1 can be invited for Round 2 without exclusion', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ category_id: 'cat-1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rev-user-1',
              email: 'reviewer1@example.com',
              name: 'Dr. Reviewer 1',
              proficiency_level: 5,
            },
          ],
        })

      const eligible = await editorialService.getEligibleReviewers('m-123')
      expect(eligible).toHaveLength(1)
      expect(eligible[0].id).toBe('rev-user-1')
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ra.round_number = m.revision_round'),
        ['cat-1', 'm-123']
      )
    })

    it('Reviewer who completed Round 1 can submit a review for their Round 2 assignment', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // SELECT assignment
          rows: [{
            id: 'assign-round2',
            manuscript_id: 'm-123',
            reviewer_id: 'rev-user-1',
            round_number: 2,
            assignment_status: 'accepted',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // priorReview check for THIS assignment_id
        .mockResolvedValueOnce({ rows: [{ id: 'review-round2', round_number: 2, recommendation: 'minor_revision' }] }) // INSERT reviews
        .mockResolvedValueOnce({}) // UPDATE reviewer_assignments completed
        .mockResolvedValueOnce({}) // INSERT user activity
        .mockResolvedValueOnce({}) // COMMIT

      const result = await reviewerService.submitReview('assign-round2', 'rev-user-1', {
        recommendation: 'minor_revision',
        public_comments: 'Much improved, minor proofreading left.',
      })

      expect(result.id).toBe('review-round2')
      expect(result.round_number).toBe(2)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE assignment_id = $1 AND is_complete = true'),
        ['assign-round2']
      )
    })
  })

  describe('Editor Multi-Round Handling', () => {
    it('getPendingDecisions includes Round 2 resubmissions with completed reviews', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'm-123',
            submission_number: 'IJIDCR-26-0001',
            title: 'Quantum Computing Advancements',
            current_status: 'resubmitted',
            completed_reviews: 1,
            active_reviews: 0,
            next_due: null,
          },
        ],
      })

      const pending = await editorialService.getPendingDecisions('editor-1')
      expect(pending).toHaveLength(1)
      expect(pending[0].submission_number).toBe('IJIDCR-26-0001')
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.current_status IN (\'under_review\', \'resubmitted\')'),
        ['editor-1']
      )
    })

    it('submitDecision creates revision_requests with currentRound and increments revision_round to 3 for Round 2', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // SELECT manuscript
          rows: [{
            id: 'm-123',
            current_status: 'under_review',
            revision_round: 2,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ editor_id: 'editor-1' }] }) // editorial_assignment check
        .mockResolvedValueOnce({ rows: [{ id: 'ed-dec-2' }] }) // INSERT editorial_decisions
        .mockResolvedValueOnce({}) // INSERT revision_requests (round_number = 2)
        .mockResolvedValueOnce({}) // UPDATE manuscripts revision_round = 3
        .mockResolvedValueOnce({}) // UPDATE manuscripts current_status = 'revision_requested'
        .mockResolvedValueOnce({}) // INSERT status history
        .mockResolvedValueOnce({}) // COMMIT

      const decision = await editorialService.submitDecision('m-123', 'editor-1', {
        decision: 'minor_revision',
        comments_to_author: 'Minor corrections needed in bibliography.',
      })

      expect(decision.success).toBe(true)
      expect(decision.new_status).toBe('revision_requested')

      // Verify revision_requests was inserted with round 2
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO revision_requests'),
        expect.arrayContaining(['m-123', 'ed-dec-2', 2, 'minor'])
      )

      // Verify manuscript revision_round was updated to 3
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE manuscripts SET revision_round = $1 WHERE id = $2'),
        [3, 'm-123']
      )
    })
  })
})
