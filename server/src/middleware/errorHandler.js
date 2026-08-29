export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal server error'

  if (statusCode === 500) {
    console.error('Unexpected error:', err)
  }

  res.status(statusCode).json({ error: message })
}
