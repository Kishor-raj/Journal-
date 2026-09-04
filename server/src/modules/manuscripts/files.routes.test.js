import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDelete = vi.fn()
const mockGetAccess = vi.fn()
const mockConfirm = vi.fn()
const mockSig = vi.fn()

vi.mock('../../middleware/authenticate.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { uid: 'user-1' }
    next()
  },
}))

vi.mock('./files.service.js', () => ({
  confirmUpload: (...a) => mockConfirm(...a),
  deleteManuscriptFile: (...a) => mockDelete(...a),
  generateSignature: (...a) => mockSig(...a),
  getFileAccess: (...a) => mockGetAccess(...a),
}))

import 'express-async-errors'
import request from 'supertest'
import express from 'express'
import filesRoutes from './files.routes.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/files', filesRoutes)
  // error handler mimicking the project's errorHandler
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ error: err.message })
  })
  // route-not-found fallback
  app.use((req, res) => res.status(404).json({ error: 'not found' }))
  return app
}

describe('files routes — manuscript file delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers DELETE /manuscripts/:manuscriptId/files/:fileId and returns success', async () => {
    mockDelete.mockResolvedValue({ success: true, message: 'File removed successfully', deleted_file_id: 'file-abc' })
    const app = makeApp()

    const res = await request(app)
      .delete('/api/files/manuscripts/manus-1/files/file-abc')

    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith('manus-1', 'file-abc', 'user-1')
    expect(res.body).toEqual({ success: true, message: 'File removed successfully', deleted_file_id: 'file-abc' })
  })

  it('propagates a not-found response (404) from the service', async () => {
    mockDelete.mockRejectedValue(
      Object.assign(new Error('File not found'), { statusCode: 404, isOperational: true })
    )
    const app = makeApp()

    const res = await request(app)
      .delete('/api/files/manuscripts/manus-1/files/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('File not found')
  })

  it('does not accidentally match DELETE against unrelated file routes', async () => {
    const app = makeApp()
    const res = await request(app).delete('/api/files/signature')
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
