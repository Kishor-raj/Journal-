export function errorHandler(err, req, res, _next) {
  // Postgres 22001 = value too long for column: that's bad input, not a server bug.
  const isValueTooLong = err.code === '22001'
  const statusCode = err.statusCode || (isValueTooLong ? 400 : 500)
  const message = err.isOperational
    ? err.message
    : isValueTooLong
      ? 'One of the submitted values is too long. Please shorten it and try again.'
      : 'Internal server error'

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
