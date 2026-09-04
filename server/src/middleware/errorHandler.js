export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal server error'

  if (statusCode === 500) {
    console.error(`[ERROR] ${req.id || '-'} ${req.method} ${req.originalUrl}:`, err)
  }

  const body = { error: message }
  if (err.code) {
    body.code = err.code
    if (err.code === 'EMAIL_NOT_VERIFIED') body.resend = true
  }

  if (req.id) body.request_id = req.id

  res.status(statusCode).json(body)
}
